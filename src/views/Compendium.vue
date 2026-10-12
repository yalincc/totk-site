<template>
  <main class="container" style="padding-top: 24px;">
    <h1 class="page-head">
      <span class="ph-icon">◈</span>图鉴全览
      <span class="ph-sub">{{ items.length }} 条 romfs 直出条目</span>
    </h1>

    <div class="search-box" style="max-width: 560px;">
      <input v-model="q" placeholder="搜索名称或 ID…" aria-label="搜索图鉴" />
    </div>

    <div class="tabs">
      <button :class="{ on: !group }" @click="setGroup(null)">全部 {{ items.length }}</button>
      <button
        v-for="g in groupList"
        :key="g.name"
        :class="{ on: group === g.name }"
        @click="setGroup(g.name)"
      >
        {{ g.name }} {{ g.count }}
      </button>
    </div>

    <p class="counter" v-if="filtered.length">
      已显示 {{ displayed.length }} / 共 {{ filtered.length }} 条
    </p>

    <div v-if="filtered.length" class="item-grid">
      <div
        v-for="it in displayed"
        :key="it.id"
        class="item-cell"
        @click="goDetail(it.id)"
      >
        <img v-if="it.icon" :src="'/icons/' + it.icon" loading="lazy" :alt="it.zh" />
        <div v-else class="ph">{{ (it.zh || it.id)[0] }}</div>
        <div class="nm" :title="it.zh">{{ it.zh || it.id }}</div>
        <!-- 统一卡片语言：关键属性一行 -->
        <div v-if="kv(it)" class="kv-row">
          <span class="k">{{ kv(it)[0] }}</span><b>{{ kv(it)[1] }}</b>
        </div>
      </div>
    </div>
    <p v-else class="empty-tip">
      没有匹配的条目
    </p>

    <div v-if="shown < filtered.length" ref="sentinel" class="load-more">
      向下滚动加载更多…
    </div>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadItemsVisible, GROUP_ORDER } from '../data'

const PAGE = 120

const route = useRoute()
const router = useRouter()
const items = ref([])
const q = ref(route.query.q || '')
const group = ref(route.query.g || null)
const shown = ref(PAGE)
const sentinel = ref(null)

loadItemsVisible().then((d) => (items.value = d))

watch(
  () => route.query,
  (v) => {
    q.value = v.q || ''
    group.value = v.g || null
  }
)

const groupList = computed(() => {
  const counts = {}
  for (const it of items.value) counts[it.g] = (counts[it.g] || 0) + 1
  const known = GROUP_ORDER.filter((g) => counts[g]).map((g) => ({ name: g, count: counts[g] }))
  const rest = Object.keys(counts)
    .filter((g) => !GROUP_ORDER.includes(g))
    .map((g) => ({ name: g, count: counts[g] }))
  return [...known, ...rest]
})

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return items.value.filter((it) => {
    if (group.value && it.g !== group.value) return false
    if (!kw) return true
    return (
      (it.zh && it.zh.toLowerCase().includes(kw)) ||
      it.id.toLowerCase().includes(kw) ||
      (it.en && it.en.toLowerCase().includes(kw))
    )
  })
})

const displayed = computed(() => filtered.value.slice(0, shown.value))

// 统一卡片语言的关键属性：按品类取最有信息量的一项
function kv(it) {
  if (it.cat === 'Armor' || it.cat === 'Shield')
    return it.perf != null ? ['防御', it.perf] : null
  if (it.cat === 'Weapon' || it.cat === 'Bow')
    return it.perf != null ? ['攻击', it.perf] : null
  if (it.hp != null) return ['回复', (it.hp / 4) + ' ♥']
  if (it.eff) return [it.effLv ? '效果 ' + it.effLv + ' 级' : '效果', it.eff]
  if (it.buy != null) return ['', it.buy + ' 卢比']
  return null
}

watch(filtered, () => {
  shown.value = PAGE
})

// keep filling until the sentinel is pushed out of the viewport
watch(shown, async () => {
  await nextTick()
  const el = sentinel.value
  if (!el || shown.value >= filtered.value.length) return
  if (el.getBoundingClientRect().top < window.innerHeight + 400) shown.value += PAGE
})

let io = null
function observeSentinel(el) {
  if (io) {
    io.disconnect()
    io = null
  }
  if (!el) return
  io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && shown.value < filtered.value.length) {
        shown.value += PAGE
      }
    },
    { rootMargin: '400px' }
  )
  io.observe(el)
}

onMounted(() => {
  watch(sentinel, observeSentinel, { immediate: true })
})
onUnmounted(() => {
  if (io) io.disconnect()
})

function setGroup(g) {
  router.push({ query: { ...route.query, g: g || undefined } })
}
function goDetail(id) {
  router.push('/items/' + id)
}
</script>

<style scoped>
/* 页头：金菱形 + 标题 + 副标题（各页统一） */
.page-head {
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  font-size: 20px; font-weight: 700; margin: 0 0 16px; color: var(--text);
}
.page-head .ph-icon {
  color: var(--gold); font-size: 15px;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}
.page-head .ph-sub { font-size: 12.5px; color: var(--faint); font-weight: 400; }

.counter {
  margin: 0 0 10px;
  font-size: 12.5px;
  color: var(--faint);
  font-variant-numeric: tabular-nums;
}
.empty-tip { color: var(--faint); text-align: center; padding: 48px 0; margin: 0; }
.load-more {
  padding: 20px 0 8px;
  text-align: center;
  font-size: 12.5px;
  color: var(--faint);
}
</style>
