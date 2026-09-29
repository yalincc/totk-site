<template>
  <main class="container" style="padding-top: 24px;">
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

    <div v-if="filtered.length" class="item-grid">
      <div
        v-for="it in filtered.slice(0, 600)"
        :key="it.id"
        class="item-cell"
        @click="goDetail(it.id)"
      >
        <img v-if="it.icon" :src="'/icons/' + it.icon" loading="lazy" :alt="it.zh" />
        <div v-else class="ph">{{ (it.zh || it.id)[0] }}</div>
        <div class="nm" :title="it.zh">{{ it.zh || it.id }}</div>
      </div>
    </div>
    <p v-else style="color: var(--faint); text-align: center; padding: 48px 0;">
      没有匹配的条目
    </p>
    <p v-if="filtered.length > 600" style="color: var(--faint); font-size: 12.5px; text-align: center;">
      仅显示前 600 条，请用搜索或分类缩小范围
    </p>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadItems, GROUP_ORDER } from '../data'

const route = useRoute()
const router = useRouter()
const items = ref([])
const q = ref(route.query.q || '')
const group = ref(route.query.g || null)

loadItems().then((d) => (items.value = d))

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

function setGroup(g) {
  router.push({ query: { ...route.query, g: g || undefined } })
}
function goDetail(id) {
  router.push('/items/' + id)
}
</script>
