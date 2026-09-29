<template>
  <main class="container" style="padding-top: 48px; padding-bottom: 24px;">
    <div style="text-align: center; margin-bottom: 36px;">
      <h1 style="font-size: 30px; font-weight: 500; margin: 0 0 10px;">
        超级<span style="color: var(--teal);">全能</span>互动地图
      </h1>
      <p style="color: var(--muted); margin: 0 0 4px;">塞尔达传说 王国之泪 · 数据型图鉴与互动地图</p>
      <p style="color: var(--faint); font-size: 12.5px; margin: 0;">
        romfs 直出 · 100% 游戏真实数据 · 简中 · 无广告
      </p>
    </div>

    <form class="search-box" style="max-width: 640px; margin: 0 auto 40px;" @submit.prevent="go">
      <input
        v-model="q"
        placeholder="搜索物品 / 装备 / 料理，如：大师之剑、黄玉、妖精秘药…"
        aria-label="搜索物品"
      />
    </form>

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

    <div style="margin-top: 44px; text-align: center; color: var(--faint); font-size: 12.5px;">
      图鉴 {{ total }} 条 · 料理配方 {{ recipes }} 道 · 任务 285 个 ·
      <a :href="mapUrl" target="_blank" rel="noopener" style="color: var(--teal);">互动地图 ↗</a>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadItemsVisible, loadRecipes, GROUP_ORDER } from '../data'
import { MAP_URL } from '../mapLink'

const router = useRouter()
const mapUrl = MAP_URL
const q = ref('')
const items = ref([])
const recipeCount = ref(0)

loadItemsVisible().then((d) => (items.value = d))
loadRecipes().then((d) => (recipeCount.value = d.length))

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

function go() {
  if (q.value.trim()) router.push({ path: '/items', query: { q: q.value.trim() } })
  else router.push('/items')
}
</script>

<style scoped>
.cat-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px;
  max-width: 760px; margin: 0 auto;
}
.cat-card {
  padding: 16px 8px; text-align: center; color: var(--text);
}
.cat-card:hover { border-color: var(--teal); text-decoration: none; }
.cat-card .cnt { font-size: 22px; font-weight: 500; color: var(--teal); }
.cat-card .nm { font-size: 13px; color: var(--muted); margin-top: 2px; }

@media (max-width: 720px) {
  .cat-grid { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; }
  .cat-card { padding: 12px 6px; }
  h1 { font-size: 24px !important; }
}
</style>
