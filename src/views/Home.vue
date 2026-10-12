<template>
  <main class="container" style="padding-top: 32px; padding-bottom: 24px;">
    <!-- ============ HERO：夜空 + 希卡符文环 + 官方美术图标拼贴 ============ -->
    <section class="hero">
      <!-- 中央希卡符文环（纯 SVG，金绿双色） -->
      <svg class="hero-ring" viewBox="0 0 340 340" fill="none" aria-hidden="true">
        <circle cx="170" cy="170" r="160" stroke="#c9a227" stroke-width="1.5" opacity="0.55" />
        <circle cx="170" cy="170" r="140" stroke="#0e8a7d" stroke-width="1" opacity="0.4"
          stroke-dasharray="4 10" />
        <circle cx="170" cy="170" r="118" stroke="#c9a227" stroke-width="1" opacity="0.3" />
        <!-- 12 刻度（数据在 script 算好，模板零表达式） -->
        <g stroke="#c9a227" stroke-width="1.5" opacity="0.6">
          <line v-for="(t, i) in ringTicks" :key="i" v-bind="t" />
        </g>
        <!-- 中心希卡之眼 -->
        <g opacity="0.85">
          <path d="M170 132 L196 170 L170 208 L144 170 Z" stroke="#0e8a7d" stroke-width="2" fill="none" />
          <circle cx="170" cy="170" r="14" stroke="#c9a227" stroke-width="2" fill="none" />
          <circle cx="170" cy="170" r="4" fill="#c9a227" />
        </g>
      </svg>

      <!-- 官方 romfs 美术拼贴：核心水印 + 漂浮图标 -->
      <div class="hero-art" aria-hidden="true">
        <img class="ficon core" :src="'/icons/weapon/Weapon_Sword_070.png'" alt="" />
        <img v-for="(f, i) in heroIcons" :key="f.src" class="ficon"
          :src="'/icons/' + f.src" :style="f.style" alt="" loading="eager" />
      </div>

      <div class="hero-inner">
        <div class="hero-kicker">The Legend of Zelda · Tears of the Kingdom</div>
        <h1 class="hero-title">超级全能互动地图</h1>
        <p class="hero-sub">塞尔达传说 王国之泪 · 数据型图鉴与互动地图</p>
        <p class="hero-tags">
          romfs 直出 · <b>100% 游戏真实数据</b> · 简中 · 无广告 · 与互动地图双向联动
        </p>
        <form class="search-box hero-search" @submit.prevent="go">
          <input
            v-model="q"
            placeholder="搜索物品 / 装备 / 料理，如：大师之剑、黄玉、妖精秘药…"
            aria-label="搜索物品"
          />
        </form>
      </div>
    </section>

    <!-- ============ 数据总览条 ============ -->
    <div class="stat-strip">
      <div class="stat-cell"><div class="v">{{ total }}</div><div class="k">图鉴条目</div></div>
      <div class="stat-cell"><div class="v">{{ recipeCount }}</div><div class="k">料理配方</div></div>
      <div class="stat-cell"><div class="v">{{ questCount }}</div><div class="k">任务挑战</div></div>
      <div class="stat-cell"><div class="v">{{ armorCount }}</div><div class="k">防具套装件</div></div>
      <div class="stat-cell">
        <div class="v">{{ iconCount }}</div><div class="k">官方图标</div>
      </div>
    </div>

    <!-- ============ 分类入口 ============ -->
    <h2 class="sec-head">按分类浏览图鉴</h2>
    <div class="cat-grid">
      <RouterLink
        v-for="g in groups"
        :key="g.name"
        class="card cat-card"
        :to="{ path: '/items', query: { g: g.name } }"
      >
        <div class="cnt">{{ g.count }}</div>
        <div class="nm">{{ g.name }}</div>
      </RouterLink>
    </div>

    <!-- ============ 特色板块入口 ============ -->
    <h2 class="sec-head">特色板块</h2>
    <div class="feat-grid">
      <RouterLink to="/cooking-lab" class="card feat-card">
        <img class="ficon" :src="'/icons/cook/Item_Cook_I_08.png'" alt="" />
        <div>
          <div class="feat-t">模拟料理</div>
          <div class="feat-d">自由组合材料下锅，按游戏内置配方规则实时演算产物与效果</div>
        </div>
      </RouterLink>
      <RouterLink to="/armors" class="card feat-card">
        <img class="ficon" :src="'/icons/armor/Armor_025_Head.png'" alt="" />
        <div>
          <div class="feat-t">防具图鉴</div>
          <div class="feat-d">{{ armorCount }} 件防具 · 67 套装 · 四星强化阶梯 · 材料直达图鉴</div>
        </div>
      </RouterLink>
      <RouterLink to="/quests" class="card feat-card">
        <img class="ficon" :src="'/icons/weapon/Weapon_Shield_030.png'" alt="" />
        <div>
          <div class="feat-t">任务挑战</div>
          <div class="feat-d">{{ questCount }} 个任务 · 分类 / 图层 / 地区筛选 · 攻略步骤与坐标</div>
        </div>
      </RouterLink>
      <a :href="mapUrl" target="_blank" rel="noopener" class="card feat-card">
        <img class="ficon" :src="'/icons/weapon/Weapon_Sword_070.png'" alt="" />
        <div>
          <div class="feat-t">互动地图 ↗</div>
          <div class="feat-d">姊妹站 TOTKmap：全物品刷点定位 / 任务坐标导航，两站数据同源互通</div>
        </div>
      </a>
    </div>

    <div class="foot-note">
      图鉴 {{ total }} 条 · 料理配方 {{ recipeCount }} 道 · 任务 {{ questCount }} 个 · 防具 {{ armorCount }} 件 ·
      图标 {{ iconCount }} 张 · 全部提取自游戏 romfs
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadItemsVisible, loadRecipes, loadQuests, loadArmors, GROUP_ORDER } from '../data'
import { MAP_URL } from '../mapLink'

const router = useRouter()
const mapUrl = MAP_URL
const q = ref('')
const items = ref([])
const recipeCount = ref(0)
const questCount = ref(0)
const armorCount = ref(0)

// 官方图标总数（icons/ 下 romfs 提取的 BNTX 美术）
const iconCount = ref(1537)

loadItemsVisible().then((d) => (items.value = d))
loadRecipes().then((d) => (recipeCount.value = d.length))
loadQuests().then((d) => (questCount.value = d.length))
loadArmors().then((d) => (armorCount.value = d.length))

const total = computed(() => items.value.length)

const groups = computed(() => {
  const counts = {}
  for (const it of items.value) counts[it.g] = (counts[it.g] || 0) + 1
  const known = GROUP_ORDER.filter((g) => counts[g]).map((g) => ({ name: g, count: counts[g] }))
  const rest = Object.keys(counts)
    .filter((g) => !GROUP_ORDER.includes(g))
    .map((g) => ({ name: g, count: counts[g] }))
  return [...known, ...rest]
})

// hero 符文环 12 刻度坐标（script 侧计算，避免模板内复杂表达式）
const ringTicks = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6
  const f = (n) => n.toFixed(1)
  return {
    x1: f(170 + 152 * Math.cos(a)),
    y1: f(170 + 152 * Math.sin(a)),
    x2: f(170 + 168 * Math.cos(a)),
    y2: f(170 + 168 * Math.sin(a)),
  }
})

// hero 漂浮图标：全部来自 public/icons/（romfs BNTX 官方美术）
// 定位用 % 避开中央文字区（横向 30%~70% / 纵向 25%~75% 不放）
const heroIcons = [
  { src: 'misc/Obj_UltraHand.png', style: { left: '6%', top: '16%', width: '46px', animationDelay: '0s' } },
  { src: 'energy/Energy_Material_01.png', style: { left: '18%', top: '62%', width: '34px', animationDelay: '1.2s' } },
  { src: 'weapon/Weapon_Bow_166.png', style: { left: '30%', top: '10%', width: '52px', animationDelay: '2.4s' } },
  { src: 'insect/Animal_Insect_E.png', style: { left: '13%', top: '38%', width: '28px', animationDelay: '0.6s' } },
  { src: 'fruit/BombFruit.png', style: { left: '82%', top: '18%', width: '38px', animationDelay: '1.8s' } },
  { src: 'zonai/SpObj_Rocket_Capsule_A_01.png', style: { left: '72%', top: '66%', width: '36px', animationDelay: '3s' } },
  { src: 'enemy/Item_Enemy_158.png', style: { left: '88%', top: '44%', width: '40px', animationDelay: '2.1s' } },
  { src: 'misc/BeeHome.png', style: { left: '60%', top: '8%', width: '32px', animationDelay: '0.9s' } },
  { src: 'insect/Animal_Insect_T.png', style: { left: '40%', top: '70%', width: '30px', animationDelay: '3.6s' } },
  { src: 'armor/Armor_025_Head.png', style: { left: '8%', top: '78%', width: '36px', animationDelay: '1.5s' } },
  { src: 'ore/Item_Ore_G.png', style: { left: '90%', top: '76%', width: '30px', animationDelay: '2.7s' } },
  { src: 'weapon/Weapon_Shield_030.png', style: { left: '52%', top: '76%', width: '42px', animationDelay: '0.3s' } },
]

function go() {
  if (q.value.trim()) router.push({ path: '/items', query: { q: q.value.trim() } })
  else router.push('/items')
}
</script>

<style scoped>
/* 分区标题：金线 + 小符文点 */
.sec-head {
  display: flex; align-items: center; gap: 10px;
  font-size: 15px; font-weight: 600; color: var(--text);
  margin: 40px 0 14px;
}
.sec-head::before {
  content: ""; width: 8px; height: 8px; flex: none;
  background: var(--gold); transform: rotate(45deg);
  box-shadow: 0 0 7px rgba(154, 123, 28, 0.35);
}
.sec-head::after {
  content: ""; flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--line2), transparent);
}

.cat-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px;
}
.cat-card {
  padding: 16px 8px; text-align: center; color: var(--text);
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.cat-card:hover {
  border-color: var(--gold); transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(46, 50, 54, 0.1); color: var(--text);
}
.cat-card .cnt {
  font-size: 24px; font-weight: 700; color: var(--gold);
  font-variant-numeric: tabular-nums;
}
.cat-card .nm { font-size: 13px; color: var(--muted); margin-top: 2px; }
.cat-card:hover .nm { color: var(--text); }

.foot-note {
  margin-top: 44px; text-align: center; color: var(--faint);
  font-size: 12.5px; line-height: 1.8;
}

@media (max-width: 720px) {
  .cat-grid { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; }
  .cat-card { padding: 12px 6px; }
  .sec-head { margin: 28px 0 12px; }
}
</style>
