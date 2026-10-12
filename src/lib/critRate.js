/**
 * 暴击（大成功）概率 —— 《塞尔达传说 王国之泪》机制（纯函数，前端与回归脚本可共用）
 *
 * 依据：ZeldaPedia「Cooking in Tears of the Kingdom」数据挖掘口径
 *   基础      5% × 锅内「不同材料种类数」（1 种=5% / 5 种=25%）
 *   材料加成  只取最高一项、不叠加：
 *               100%  龙素材（鳞片/爪子/牙/角/龙岩石…）· 星星碎片 · 金苹果 · 吉波得的肝脏
 *               30%   蔗糖 · 高级怪物素材
 *               10%   禽蛋 · 山羊黄油 · 鼓隆的调味粉 · 哈特诺起司 · 油壶 · 尖刺碎片 · 中级怪物素材
 *   血月夜    23:30–00:30 烹饪 → 100%
 *   封顶      100%；每道菜最多 1 个暴击效果
 *   不能暴击  含「怪物精华」或产物为不明料理/硬邦邦的食物
 *
 * 站点数据缺口（游戏内存在、cooking_lab.json 未收录单一道具）：
 *   高级怪物素材 / 中级怪物素材（游戏中按怪物部位分等级，非单一道具）、尖刺碎片
 *   —— 若后续数据补入，只需往下面三个集合加 id。
 */

/** 100% 暴击材料（龙素材从数据动态并入） */
export const CRIT_100_IDS = ['Item_Ore_J', 'Item_Fruit_P', 'Item_Enemy_121']; // 星星碎片 / 金苹果 / 吉波得的肝脏
/** 30% 暴击材料 */
export const CRIT_30_IDS = ['Item_Material_01']; // 蔗糖
/** 10% 暴击材料 */
export const CRIT_10_IDS = [
  'Item_Material_04', // 禽蛋
  'Item_Material_06', // 山羊黄油
  'Item_Material_02', // 鼓隆的调味粉
  'Item_Material_10', // 哈特诺起司
  'Item_Material_09', // 油壶
];

/** 使暴击失效的材料（怪物精华） */
export const CRIT_BLOCK_IDS = ['Item_Material_08'];

/**
 * 计算暴击率
 * @param {string[]} potIds  锅内材料 id 列表（可重复）
 * @param {object}   data    cooking_lab.json
 * @param {boolean}  bloodMoon 是否模拟血月夜
 * @returns {{rate:number, parts:Array<{k:string,v:number,replace?:boolean}>, blocked:boolean}}
 */
export function critRate(potIds, data, bloodMoon = false) {
  if (!potIds.length) return { rate: 0, parts: [], blocked: false };

  const dragon = new Set((data.special && data.special.dragonParts) || []);
  const c100 = new Set([...CRIT_100_IDS, ...dragon]);
  const c30 = new Set(CRIT_30_IDS);
  const c10 = new Set(CRIT_10_IDS);
  const mats = (data.materials) || {};
  const zh = (id) => (mats[id] && mats[id].zh) || id;
  const extras = (data.special && data.special.critGuaranteed) || [];

  const unique = new Set(potIds).size;
  let rate = 5 * unique;
  const parts = [{ k: `基础（5% × ${unique} 种材料）`, v: rate }];

  // 材料加成：只取最高一项
  let bonus = 0;
  let who = '';
  for (const id of potIds) {
    let b = 0;
    if (c100.has(id) || extras.includes(id)) b = 100;
    else if (c30.has(id)) b = 30;
    else if (c10.has(id)) b = 10;
    if (b > bonus) { bonus = b; who = zh(id); }
  }
  if (bonus) {
    rate = bonus;
    parts.push({ k: `材料加成（${who}，只取最高一项）`, v: bonus, replace: true });
  }

  if (bloodMoon) {
    rate = 100;
    parts.push({ k: '血月夜（23:30–00:30）', v: 100, replace: true });
  }

  let blocked = false;
  if (potIds.some((id) => CRIT_BLOCK_IDS.includes(id))) {
    rate = 0; blocked = true;
    parts.push({ k: '含怪物精华（无法暴击）', v: 0, replace: true });
  }

  return { rate: Math.max(0, Math.min(100, rate)), parts, blocked };
}

/** 按概率掷一次暴击判定 */
export function rollCrit(rate, rng = Math.random) {
  return rng() * 100 < rate;
}

/** 暴击效果池（每道菜最多一个，且只在「适用」的效果里等概率抽） */
export function rollCritEffect(res) {
  const pool = [];
  if (res.eff && !res.conflict) pool.push({ type: 'level', label: '效果等级 +1' });
  if (res.effMin > 0) pool.push({ type: 'time', label: '持续时长 +5 分钟' });
  if (res.hp > 0) pool.push({ type: 'heart', label: '额外回复 +3 心' });
  if (!pool.length) pool.push({ type: 'temp', label: '临时心心 +1' });
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 把暴击效果应用到结果（页面展示用，不修改原始判定） */
export function applyCrit(res, effect) {
  const out = { ...res };
  if (effect.type === 'level' && out.effLv != null) out.effLv = Math.min(3, out.effLv + 1);
  if (effect.type === 'time' && out.effMin) out.effMin = out.effMin + 300;
  if (effect.type === 'heart') out.hp = (out.hp || 0) + 6; // +3 心（站点 hp 以半心为单位）
  return out;
}
