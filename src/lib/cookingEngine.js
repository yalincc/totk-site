/**
 * 模拟料理规则引擎（L2 加工层，纯函数）。
 *
 * 站点前端（CookingLab.vue）与上层回归脚本共用同一份实现，避免双实现漂移。
 * 数据输入 = cooking_lab.json（L3 派生件）：
 *   materials     材料表 {id: {zh, icon, hp, eff, effLv, effMin, sell, tags[]}}
 *   fixedRecipes  romfs Recipe 表 158 条（slots 支持 actor / tag 匹配）
 *   special       特殊规则 {critGuaranteed[], dragonParts[], failResult…}
 *   elixirByEff   效果名 → 药剂产物（从 items Food 条目提取）
 *
 * 判定顺序：固定配方 → 药剂 → 通用（tag 组合）→ 失败
 */

// ---------- 内部工具 ----------

function materialTag(m, tags) {
  for (const t of m.tags || []) {
    if (t !== 'Cook' && tags.has(t)) return t;
  }
  return (m.tags || [])[0] || 'Cook';
}

/**
 * 固定配方匹配：材料多重集能否**全部**分配到 slots（每槽消费一个非空子集、
 * 材料不可复用）。「全部消费」是关键约束：蘑菇+肉 不允许命中「烤蘑菇串」；
 * 同槽允许多个同类材料（蘑菇×3 → 烤蘑菇串）；「4 种不同」由数据里 4 个
 * 独立同 tag 槽表达（每槽 1 个，自然要求 4 种材料）。
 * 回溯 + 子集枚举；材料 ≤5，穷举可行。
 */
function matchFixedRecipe(matIds, recipe, tagMembers) {
  const slots = recipe.slots || [];
  if (matIds.length < slots.length) return false;
  const candidates = slots.map((s) => {
    if (s.type === 'tag') return new Set(tagMembers[s.name] || []);
    return new Set([s.id]);
  });
  const used = new Array(matIds.length).fill(false);
  const compat = matIds.map((id) =>
    candidates.map((set) => (set.has(id) ? 1 : 0))
  );
  const n = matIds.length;

  function dfs(si) {
    if (si === slots.length) return used.every(Boolean); // 全部材料必须被消费
    // 枚举「分配给本槽」的非空子集（剩余未用材料中全部 compat[si] 的组合）
    const avail = [];
    for (let j = 0; j < n; j++) if (!used[j]) avail.push(j);
    const total = 1 << avail.length;
    for (let mask = 1; mask < total; mask++) {
      let ok = true;
      for (let b = 0; b < avail.length && ok; b++) {
        if (mask & (1 << b)) { if (!compat[avail[b]][si]) ok = false; }
      }
      if (!ok) continue;
      for (let b = 0; b < avail.length; b++) if (mask & (1 << b)) used[avail[b]] = true;
      if (dfs(si + 1)) return true;
      for (let b = 0; b < avail.length; b++) if (mask & (1 << b)) used[avail[b]] = false;
    }
    return false;
  }
  return dfs(0);
}

// ---------- 效果计算 ----------

/**
 * 效果等级阈值（点数制）—— Zelda Wiki「Cooking」效果点数表
 *   攻击/防御/速度 1/5/7 · 防热·防寒 1/6 · 耐火 1/7 · 防雷 1/4/6 · 潜行 1/6/9
 * 材料点数 = 数据里的 effLv（如大剑鲤鱼 ★★=2、大剑鲷鱼 ★★★=3）
 */
const EFF_THRESHOLDS = {
  力量: [1, 5, 7],   // Mighty 攻击
  坚硬: [1, 5, 7],   // Tough 防御
  速速: [1, 5, 7],   // Hasty 速度
  辛辣: [1, 6],      // Spicy 防热
  冰冷: [1, 6],      // Chilly 防寒
  电麻: [1, 4, 6],   // Electro 防雷
  防火: [1, 7],      // Fireproof 耐火
  潜行: [1, 6, 9],   // Sneaky 潜行
  光亮: [1, 5, 7],   // TotK：光亮（阈值按攻击类近似）
  除魔: [1, 5, 7],   // TotK：除魔
  刺麻: [1, 4, 6],   // 同防雷
  炙热: [1, 6],      // 同防热
  冷凉: [1, 6],      // 同防寒
  防滑: [1, 5, 7],
  水润: [1, 5, 7],
};

function levelFromPoints(eff, points) {
  const th = EFF_THRESHOLDS[eff];
  if (!th) return points > 0 ? 1 : 0;
  let lv = 0;
  for (let i = 0; i < th.length; i++) if (points >= th[i]) lv = i + 1;
  return lv;
}

/**
 * 龙素材时长（Zelda Wiki / 攻略实测）：
 *   龙鳞 +90s · 龙爪 +3:30 · 龙牙 +10:30 · 龙岩石 +80s · 龙角 → 锁 30 分钟（标记 -1）
 * 重复的同一龙素材只 +30 秒（不同龙的同名部位算不同材料）
 */
function dragonPartTime(zh) {
  if (!zh) return 0;
  if (zh.includes('鳞片')) return 90;
  if (zh.includes('爪子')) return 210;
  if (zh.includes('牙齿')) return 630;
  if (zh.includes('龙岩石')) return 80;
  if (zh.includes('犄角')) return -1;   // 龙角：时长锁定 30 分钟
  return 0;
}

/**
 * 效果聚合。返回 {hp, eff, effLv, effMin, conflict}。
 * 规则（Zelda Wiki / 社区验证）：
 *   - 回血 = Σ 材料 hp × 2（生命类见 UI 说明）
 *   - 效果：材料 eff 只允许一种，两种以上 → 抵消，仅回血
 *   - 等级：**点数制** —— Σ 材料点数（effLv）对照各效果的阈值表
 *   - 时长：效果材料「每个都加全长」（重复不衰减）；
 *           **中性材料**才是「第 1 个全长、同名后续降为 30 秒」（游戏里仅中性材料如此）
 *   - 龙素材：按部位加时（鳞 90 / 爪 210 / 牙 630 / 龙岩石 80），同名重复只 +30；
 *            **龙角**把总时长锁在 30 分钟
 */
function aggregateEffect(mats, dragonTouched) {
  let hp = 0;
  const effSet = new Set();
  let points = 0;
  let minSum = 0;
  const neutralSeen = new Map(); // 中性/龙素材 id → 出现次数（第 2 个起降为 30 秒）
  let dragonHorn = false;
  for (const m of mats) {
    if (m.hp != null) hp += m.hp;
    if (m.eff) {
      effSet.add(m.eff);
      points += m.effLv || 0;          // effLv = 该材料的点数（★）
      minSum += m.effMin || 0;          // 效果材料重复不衰减
      continue;
    }
    // 无效果材料：龙素材优先按部位加时，其余走中性材料规则
    const dz = dragonPartTime(m.zh);
    if (dz === -1) { dragonHorn = true; continue; }
    const n = neutralSeen.get(m.id) || 0;
    if (dz > 0) {
      minSum += n === 0 ? dz : 30;
      neutralSeen.set(m.id, n + 1);
    } else if (m.effMin) {
      minSum += n === 0 ? m.effMin : 30;
      neutralSeen.set(m.id, n + 1);
    }
  }
  hp = hp * 2;
  const conflict = effSet.size > 1;
  let eff = null;
  let effLv = 0;
  let effMin = 0;
  if (effSet.size === 1) {
    eff = [...effSet][0];
    effLv = levelFromPoints(eff, points);
    effMin = minSum;
    // 龙角：时长锁定 30 分钟（上限）；其余龙素材已在上面按部位加时
    if (dragonHorn && effMin > 0) effMin = 30 * 60;
    else if (dragonTouched && effMin > 30 * 60) effMin = 30 * 60; // 通用上限 30 分钟
  }
  return { hp, eff: conflict ? null : eff, effLv, effMin, conflict };
}

/** 卖出价 = Σ 材料 sell × 数量倍率（1~5 个材料 → 1.2/1.3/1.4/1.6/1.8） */
function sellPrice(mats) {
  const mult = [1.2, 1.3, 1.4, 1.6, 1.8][Math.min(mats.length, 5) - 1] || 1.2;
  const base = mats.reduce((a, m) => a + (m.sell || 0), 0);
  return Math.max(1, Math.round((base * mult) / 10) * 10 - 1);
}

// ---------- 主入口 ----------

/**
 * cook(materialIds, data) → 判定结果
 * materialIds: ['Item_Meat', 'Item_Meat', ...]（≤5，可重复）
 */
export function cook(materialIds, data) {
  const { materials, fixedRecipes, tagMembers, special, elixirByEff, dishByActor } = data;
  const ids = materialIds.filter(Boolean).slice(0, 5);
  const empty = {
    path: 'empty', actor: null, zh: null, icon: null,
    hp: 0, eff: null, effLv: 0, effMin: 0, conflict: false,
    price: 0, crit: null, recipeZh: null,
  };
  if (!ids.length) return empty;

  const mats = ids.map((id) => {
    const m = materials[id] || { zh: id, icon: null, tags: ['Cook'] };
    return { id, ...m };
  });
  const matIds = mats.map((m) => m.id);
  const dragonTouched = mats.some((m) => special.dragonParts.includes(m.id));
  const agg = aggregateEffect(mats, dragonTouched);
  const crit = dragonTouched || mats.some((m) => special.critGuaranteed.includes(m.id))
    ? 'guaranteed' : null;

  const base = {
    hp: agg.hp, eff: agg.eff, effLv: agg.effLv, effMin: agg.effMin,
    conflict: agg.conflict, price: sellPrice(mats), crit,
    mats: mats.map((m) => ({ id: m.id, zh: m.zh, icon: m.icon })),
  };

  // ---- 0) 单料特判：材料只有 1 个时，先查 generic 的单 actor 槽规则
  // （炒暖暖草果=Item_Fruit_I / 原烧=精力草 / 炖番茄=海拉鲁番茄）。
  // 这些特化菜必须精确匹配材料 id，且优先于 fixed 的 tag 大类（炖水果等）。
  if (ids.length === 1) {
    const only = mats[0];
    for (const rule of data.genericRules || []) {
      if (!rule.slots || rule.slots.length !== 1) continue;
      const s = rule.slots[0];
      if (s.type === 'actor' && s.id === only.id) {
        return {
          ...base, path: 'generic', actor: rule.actor, zh: rule.zh,
          icon: rule.icon || null, recipeZh: rule.zh,
        };
      }
    }
  }

  // ---- 1) 固定配方（按表序，第一条命中的胜出）----
  for (const r of fixedRecipes) {
    if (!r.result) continue; // 空产物条目跳过
    if (matchFixedRecipe(matIds, r, tagMembers)) {
      // 万能药剂条目（Item_Cook_C_17 基础形态，result_zh=null）：
      // 游戏在命中后按材料效果细分秘药，这里同样细分
      if (r.result === 'Item_Cook_C_17' && agg.eff && elixirByEff[agg.eff]) {
        const e = elixirByEff[agg.eff];
        const dish = dishByActor[e.actor] || {};
        return {
          ...base, path: 'elixir', actor: e.actor, zh: e.zh,
          icon: dish.icon || null, recipeZh: e.zh,
        };
      }
      const dish = dishByActor[r.result] || {};
      return {
        ...base, path: 'fixed', actor: r.result, zh: r.result_zh,
        icon: dish.icon || null, recipeZh: r.result_zh,
      };
    }
  }

  // ---- 2) 药剂：虫 ≥1 且 怪物材料 ≥1，且无食材类材料 ----
  const FOOD_TAGS = new Set(['CookMeat', 'CookFish', 'CookFruit', 'CookMushroom', 'CookPlant', 'CookOre']);
  const hasInsect = mats.some((m) => (m.tags || []).includes('CookInsect'));
  const hasEnemy = mats.some((m) => (m.tags || []).includes('CookEnemy'));
  const hasFood = mats.some((m) => (m.tags || []).some((t) => FOOD_TAGS.has(t)));
  if (hasInsect && hasEnemy && !hasFood) {
    if (agg.eff && elixirByEff[agg.eff]) {
      const e = elixirByEff[agg.eff];
      const dish = dishByActor[e.actor] || {};
      return {
        ...base, path: 'elixir', actor: e.actor, zh: e.zh,
        icon: dish.icon || null, recipeZh: e.zh,
      };
    }
    // 有效果但效果表缺产物 → 兜底"药剂"
    return { ...base, path: 'elixir', actor: null, zh: '药剂', icon: null, recipeZh: null };
  }

  // ---- 3) 通用（tag 组合推产物）：取主料 tag 查通用产物表 ----
  const generic = genericDish(mats, data);
  if (generic) {
    return { ...base, path: 'generic', actor: generic.actor, zh: generic.zh, icon: generic.icon, recipeZh: generic.zh };
  }

  // ---- 4) 失败 ----
  return {
    ...base, path: 'fail', actor: special.failResult || null,
    zh: '怪物料理', icon: null, recipeZh: null,
  };
}

/**
 * 通用产物推导：没有命中固定配方、也不是药剂的食材组合。
 * 依据：dishes.json 中无固定配方的菜，其 recipes 槽就是组合规则；
 * 这里用「主料 tag 签名 → 菜」的匹配（每道菜的每个 recipe 都试）。
 */
function genericDish(mats, data) {
  const { genericRules } = data;
  const tags = mats.map((m) => m.tag || 'Cook');
  const distinct = new Set(mats.map((m) => m.id)).size;
  for (const rule of genericRules || []) {
    if (matchSlots(tags, distinct, rule)) return rule;
  }
  return null;
}

function matchSlots(tags, distinct, rule) {
  // rule.slots: [{tag, minDistinct}]（genericRules 在数据构建期已把固定配方剔除）
  const slots = rule.slots || [];
  if (tags.length < slots.length) return false;
  if (rule.minDistinct && distinct < rule.minDistinct) return false;
  const used = new Array(tags.length).fill(false);
  function dfs(si) {
    if (si === slots.length) return true;
    const want = slots[si].tag;
    for (let j = 0; j < tags.length; j++) {
      if (used[j] || tags[j] !== want) continue;
      used[j] = true;
      if (dfs(si + 1)) return true;
      used[j] = false;
    }
    return false;
  }
  return dfs(0);
}
