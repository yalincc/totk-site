<template>
  <main class="container" style="padding-top: 24px;">
    <div class="search-box" style="max-width: 560px;">
      <input v-model="q" placeholder="搜索任务名 / 委托人…" aria-label="搜索任务" />
    </div>

    <div class="tabs">
      <button :class="{ on: !region }" @click="region = null">
        全部 {{ quests.length }}
      </button>
      <button
        v-for="r in regionList"
        :key="r"
        :class="{ on: region === r }"
        @click="region = region === r ? null : r"
      >
        {{ r }} {{ counts[r] }}
      </button>
    </div>

    <p v-if="!filtered.length" style="color: var(--faint); text-align: center; padding: 48px 0;">
      没有匹配的任务
    </p>

    <div class="quest-list">
      <div v-for="t in filtered" :key="t.id" class="card quest-card">
        <div class="quest-head" @click="toggle(t.id)">
          <div class="quest-title">
            <span class="quest-name">{{ t.zh || t.id }}</span>
            <span v-if="!t.zh" class="nozh">暂无中文译名</span>
          </div>
          <div class="quest-meta">
            <span v-if="t.region" class="chip-region">{{ t.region }}</span>
            <span v-if="t.npc" class="chip-npc">{{ t.npc }}</span>
            <span class="arrow" :class="{ open: open.has(t.id) }">▾</span>
          </div>
        </div>
        <div v-if="open.has(t.id)" class="quest-body">
          <div v-for="(s, i) in t.steps" :key="i" class="step">
            <span class="step-no">{{ i + 1 }}</span>
            <p>{{ s.text }}</p>
          </div>
          <div v-if="t.complete" class="complete">
            <span class="step-no done">✓</span>
            <p>{{ t.complete }}</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { loadQuests } from '../data'

const quests = ref([])
const q = ref('')
const region = ref(null)
const open = ref(new Set())

loadQuests().then((d) => (quests.value = d))

const counts = computed(() => {
  const c = {}
  for (const t of quests.value) if (t.region) c[t.region] = (c[t.region] || 0) + 1
  return c
})

const regionList = computed(() =>
  Object.keys(counts.value)
    .sort((a, b) => counts.value[b] - counts.value[a])
    .slice(0, 14)
)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return quests.value.filter((t) => {
    if (region.value && t.region !== region.value) return false
    if (!kw) return true
    return (
      (t.zh && t.zh.toLowerCase().includes(kw)) ||
      t.id.toLowerCase().includes(kw) ||
      (t.npc && t.npc.toLowerCase().includes(kw))
    )
  })
})

function toggle(id) {
  const s = new Set(open.value)
  s.has(id) ? s.delete(id) : s.add(id)
  open.value = s
}
</script>

<style scoped>
.quest-list { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.quest-head {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  cursor: pointer; flex-wrap: wrap;
}
.quest-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.quest-name { font-weight: 600; font-size: 14.5px; }
.nozh { color: var(--faint); font-size: 12px; }
.quest-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.chip-region {
  background: var(--teal-bg); color: var(--teal-deep); border-radius: 999px;
  padding: 2px 10px; font-size: 12px;
}
.chip-npc {
  background: var(--amber-bg); color: var(--amber); border-radius: 999px;
  padding: 2px 10px; font-size: 12px;
}
.arrow { color: var(--faint); transition: transform 0.15s; }
.arrow.open { transform: rotate(180deg); }
.quest-body { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); }
.step { display: flex; gap: 10px; padding: 4px 0; }
.step p { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.65; }
.step-no {
  flex: none; width: 20px; height: 20px; border-radius: 50%;
  background: var(--teal-bg); color: var(--teal-deep);
  font-size: 11.5px; display: flex; align-items: center; justify-content: center;
  margin-top: 2px;
}
.step-no.done { background: #e3f3ea; color: var(--teal); }
.complete .step p { color: var(--text); }
</style>
