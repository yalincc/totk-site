<template>
  <main class="container" style="padding-top: 24px;">
    <h1 class="page-head">
      <span class="ph-icon">◈</span>任务挑战
      <span class="ph-sub">{{ quests.length }} 个任务 · 攻略步骤与坐标</span>
    </h1>

    <div class="search-box" style="max-width: 560px;">
      <input
        v-model="q"
        placeholder="搜索任务名 / 委托人 / 地区…"
        aria-label="搜索任务"
      />
    </div>

    <!-- 类型筛选 -->
    <div class="tabs">
      <button :class="{ on: !cat }" @click="cat = null">全部 {{ quests.length }}</button>
      <button
        v-for="c in catList"
        :key="c"
        :class="{ on: cat === c }"
        @click="cat = cat === c ? null : c"
      >
        {{ c }} {{ catCounts[c] }}
      </button>
    </div>

    <!-- 大区筛选（图层） -->
    <div class="tabs sub">
      <button :class="{ on: !layer }" @click="layer = null">全部图层</button>
      <button
        v-for="l in layerList"
        :key="l"
        :class="{ on: layer === l }"
        @click="layer = layer === c ? null : l"
      >
        {{ l }} {{ layerCounts[l] }}
      </button>
    </div>

    <!-- 地区筛选（下拉，列出全部地区而非 Top N） -->
    <div class="filter-row">
      <select v-model="region" aria-label="按地区筛选">
        <option :value="null">全部地区（{{ regionCounts.__all }}）</option>
        <option v-for="r in regionList" :key="r" :value="r">
          {{ r }}（{{ regionCounts[r] }}）
        </option>
      </select>
      <button v-if="hasFilter" class="btn-clear" @click="resetFilter">清空筛选</button>
      <span class="result-count">已显示 {{ filtered.length }} / 共 {{ quests.length }}</span>
    </div>

    <p v-if="!filtered.length" class="empty-tip">
      没有匹配的任务
    </p>

    <div class="quest-list">
      <div
        v-for="t in filtered"
        :key="t.id"
        class="card quest-card"
        @click="openById(t.id)"
      >
        <div class="q-side" :class="'lv-' + layerKey(t)" aria-hidden="true" />
        <div class="q-main">
          <div class="quest-title">
            <span class="quest-name">{{ t.zh && t.zh !== t.id ? t.zh : '暂无中文译名' }}</span>
            <span v-if="!t.zh || t.zh === t.id" class="nozh">{{ t.id }}</span>
          </div>
          <div class="quest-meta">
            <span class="chip-cat">{{ t.cat }}</span>
            <span v-if="t.region && t.region !== '未标注'" class="chip-region">{{ t.region }}</span>
            <span v-else class="chip-region dim">地区未标注</span>
            <span v-if="t.npcCn" class="chip-npc">{{ t.npcCn }}</span>
            <span v-if="t.layer" class="chip-layer" :class="'lv-' + layerKey(t)">{{ t.layer }}</span>
            <span v-if="t.nStep" class="chip-step">{{ t.nStep }} 步</span>
          </div>
        </div>
        <span class="q-arrow" aria-hidden="true">›</span>
      </div>
    </div>

    <!-- 详情弹层 -->
    <Teleport to="body">
      <div v-if="sel" class="modal-mask" @click.self="close">
        <div class="modal quest-detail" role="dialog" aria-modal="true">
          <button class="close" @click="close" aria-label="关闭">×</button>

          <div class="modal-top">
            <button class="arrow" :disabled="selIdx <= 0" @click="prev">‹</button>
            <span class="pos">{{ selIdx + 1 }} / {{ filtered.length }}</span>
            <button class="arrow" :disabled="selIdx >= filtered.length - 1" @click="next">›</button>
          </div>

          <h2 class="q-title">{{ sel.zh && sel.zh !== sel.id ? sel.zh : '暂无中文译名' }}</h2>
          <div class="badges">
            <span class="chip-cat">{{ sel.cat }}</span>
            <span v-if="sel.region && sel.region !== '未标注'" class="chip-region">{{ sel.region }}</span>
            <span v-if="sel.layer" class="chip-layer" :class="'lv-' + layerKey(sel)">{{ sel.layer }}</span>
            <span v-if="sel.npcCn" class="chip-npc">委托人：{{ sel.npcCn }}</span>
            <span class="chip plain mono">{{ sel.id }}</span>
          </div>

          <a :href="mapUrl" target="_blank" rel="noopener" class="map-btn">
            在地图上查看
            <span class="map-sub">
              {{ sel.pos ? `坐标 ${sel.pos.x} / ${sel.pos.y}` : 'TOTKmap 关键词定位' }}
            </span>
          </a>

          <!-- 任务流程（站点自有口径） -->
          <section v-if="sel.flow && sel.flow.length">
            <h3>任务流程</h3>
            <div v-for="(s, i) in sel.flow" :key="'f' + i" class="step">
              <span class="step-no">{{ i + 1 }}</span>
              <p>{{ s.text }}</p>
            </div>
          </section>

          <!-- 攻略步骤（TOTKmap 口径，带坐标） -->
          <section v-if="sel.steps && sel.steps.length">
            <h3>
              攻略步骤
              <span class="src-tag">来源 TOTKmap</span>
            </h3>
            <div v-for="(s, i) in sel.steps" :key="'s' + i" class="step">
              <span class="step-no">{{ i + 1 }}</span>
              <div class="step-body">
                <p v-if="s.text">{{ s.text }}</p>
                <p v-else class="step-pt">前往目标地点</p>
                <div v-if="s.pts && s.pts.length" class="pts">
                  <span v-for="(p, j) in s.pts" :key="j" class="pt">
                    📍 {{ p.x }} / {{ p.y }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- 完成文本 -->
          <section v-if="sel.complete">
            <h3>完成文本</h3>
            <div class="step">
              <span class="step-no done">✓</span>
              <p>{{ sel.complete }}</p>
            </div>
          </section>

          <!-- 攻略：开启方式 / 注意事项 / 奖励 -->
          <section v-if="guideRows.length">
            <h3>攻略要点<span class="src-tag">来源 TOTKmap</span></h3>
            <div v-for="(r, i) in guideRows" :key="'g' + i" class="guide-row">
              <span class="guide-k">{{ r.k }}</span>
              <span class="guide-v">{{ r.v }}</span>
            </div>
          </section>

          <!-- 任务链 -->
          <section v-if="sel.reqs && sel.reqs.length">
            <h3>前置任务</h3>
            <div class="chain">
              <button
                v-for="(r, i) in sel.reqs"
                :key="'r' + i"
                class="chain-item"
                :class="{ link: r.link, dim: !r.link }"
                :disabled="!r.link"
                @click="r.link && openById(r.key)"
              >
                {{ r.name || r.key }}
                <span v-if="!r.link" class="chain-flag">前置条件</span>
              </button>
            </div>
          </section>

          <section v-if="sel.unlocks && sel.unlocks.length">
            <h3>后续任务</h3>
            <div class="chain">
              <button
                v-for="(u, i) in sel.unlocks"
                :key="'u' + i"
                class="chain-item"
                :class="{ link: u.link, dim: !u.link }"
                :disabled="!u.link"
                @click="u.link && openById(u.key)"
              >
                {{ u.name || u.key }}
              </button>
            </div>
          </section>

          <p v-if="!hasBody" class="no-detail">该任务暂无详细步骤数据</p>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadQuests } from '../data'
import { mapQuestUrl } from '../mapLink'

const route = useRoute()
const router = useRouter()

const quests = ref([])
const q = ref(route.query.q || '')
const cat = ref(route.query.cat || null)
const layer = ref(route.query.layer || null)
const region = ref(route.query.region || null)
const selIdx = ref(-1)

loadQuests().then((d) => (quests.value = d))

// 分类展示顺序（主剧情优先，与游戏内难度递进一致）
const CAT_ORDER = [
  '主剧情挑战', '情节挑战', '神庙挑战', '迷你挑战', '迷你游戏', '重要支线', '其他',
]

// 图层 → 视觉 key（天空/地表/地底 三色）
function layerKey(t) {
  if (t.layer === '天空') return 'sky'
  if (t.layer === '地底') return 'depth'
  return 'surface'
}

function countBy(fn) {
  const c = {}
  for (const t of quests.value) {
    const k = fn(t)
    if (k) c[k] = (c[k] || 0) + 1
  }
  return c
}

const catCounts = computed(() => countBy((t) => t.cat))
const catList = computed(() => {
  const keys = Object.keys(catCounts.value)
  return keys.sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return catCounts.value[b] - catCounts.value[a]
  })
})

const layerCounts = computed(() => countBy((t) => t.layer))
const layerList = computed(() => {
  const order = ['天空', '地表', '地底']
  return Object.keys(layerCounts.value).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return layerCounts.value[b] - layerCounts.value[a]
  })
})

const regionCounts = computed(() => {
  const c = { __all: quests.value.length }
  for (const t of quests.value) {
    if (t.region) c[t.region] = (c[t.region] || 0) + 1
  }
  return c
})
const regionList = computed(() =>
  Object.keys(regionCounts.value)
    .filter((k) => k !== '__all')
    .sort((a, b) => regionCounts.value[b] - regionCounts.value[a])
)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return quests.value
    .filter((t) => {
      if (cat.value && t.cat !== cat.value) return false
      if (layer.value && t.layer !== layer.value) return false
      if (region.value && t.region !== region.value) return false
      if (!kw) return true
      return (
        (t.zh && t.zh.toLowerCase().includes(kw)) ||
        t.id.toLowerCase().includes(kw) ||
        (t.region && t.region.toLowerCase().includes(kw)) ||
        (t.npcCn && t.npcCn.toLowerCase().includes(kw)) ||
        (t.npc && t.npc.toLowerCase().includes(kw))
      )
    })
    .sort((a, b) => {
      // 展示排序：有官方中文名的优先；其余按分类难度序，最后按名称
      const az = a.zh && a.zh !== a.id ? 0 : 1
      const bz = b.zh && b.zh !== b.id ? 0 : 1
      if (az !== bz) return az - bz
      const ia = CAT_ORDER.indexOf(a.cat), ib = CAT_ORDER.indexOf(b.cat)
      if (ia >= 0 && ib >= 0 && ia !== ib) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return (a.zh || a.id).localeCompare(b.zh || b.id, 'zh')
    })
})

const sel = computed(() =>
  selIdx.value >= 0 ? filtered.value[selIdx.value] || null : null
)

const mapUrl = computed(() => (sel.value ? mapQuestUrl(sel.value) : '#'))

const guideRows = computed(() => {
  const g = sel.value && sel.value.guide
  if (!g) return []
  const rows = []
  if (g.start) rows.push({ k: '开启方式', v: g.start })
  if (g.note) rows.push({ k: '注意事项', v: g.note })
  if (g.reward && g.reward.length) rows.push({ k: '奖励', v: g.reward.join('、') })
  return rows
})

const hasBody = computed(() => {
  const s = sel.value
  if (!s) return false
  return (
    (s.flow && s.flow.length) ||
    (s.steps && s.steps.length) ||
    !!s.complete ||
    guideRows.value.length
  )
})

const hasFilter = computed(
  () => !!(q.value || cat.value || layer.value || region.value)
)

function resetFilter() {
  q.value = ''
  cat.value = null
  layer.value = null
  region.value = null
}

function openIdx(i) {
  selIdx.value = i >= 0 && i < filtered.value.length ? i : -1
}
function prev() { if (selIdx.value > 0) selIdx.value-- }
function next() { if (selIdx.value < filtered.value.length - 1) selIdx.value++ }
function close() { selIdx.value = -1 }

// 从任务链跳转：目标不在当前筛选结果里时，先清空筛选再打开
async function openById(id) {
  let i = filtered.value.findIndex((t) => t.id === id)
  if (i < 0) {
    resetFilter()
    await nextTick()
    i = filtered.value.findIndex((t) => t.id === id)
  }
  if (i >= 0) openIdx(i)
}

// 筛选变化后，当前打开的任务若已不在结果中则关闭，避免 idx 错位
watch(filtered, () => {
  if (selIdx.value >= filtered.value.length) selIdx.value = -1
})

// 筛选状态写回 URL，刷新不丢
watch([q, cat, layer, region], () => {
  router.replace({
    query: {
      ...route.query,
      q: q.value || undefined,
      cat: cat.value || undefined,
      layer: layer.value || undefined,
      region: region.value || undefined,
    },
  })
})

function onKey(e) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

// 打开时锁 body 滚动；组件卸载务必恢复，否则整页滚不动
watch(sel, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* 页头：金菱形 + 标题 + 副标题（各页统一） */
.page-head {
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  font-size: 20px; font-weight: 700; margin: 0 0 16px; color: var(--text);
}
.page-head .ph-icon {
  color: var(--gold); font-size: 15px;
  text-shadow: 0 0 8px rgba(154, 123, 28, 0.3);
}
.page-head .ph-sub { font-size: 12.5px; color: var(--faint); font-weight: 400; }

.tabs.sub { margin-top: 8px; }
.filter-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 12px 0 6px;
}
.filter-row select {
  border: 1px solid var(--line2); border-radius: 10px; padding: 8px 12px;
  background: var(--bg2); color: var(--text); font-size: 13px; max-width: 320px;
}
.btn-clear {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 6px 14px; font-size: 12.5px; color: var(--muted); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-clear:hover { border-color: var(--gold); color: var(--gold); }
.result-count { font-size: 12.5px; color: var(--faint); margin-left: auto; }
.empty-tip { color: var(--faint); text-align: center; padding: 48px 0; margin: 0; }

/* ============ 任务卡片化 ============ */
.quest-list { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.quest-card {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 16px; cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.quest-card:hover {
  border-color: var(--gold); transform: translateX(3px);
  box-shadow: 0 8px 20px rgba(46, 50, 54, 0.1);
}
/* 左侧图层色条：天空荧绿 / 地表金 / 地底橙红 */
.q-side {
  flex: none; width: 4px; align-self: stretch; border-radius: 999px;
  background: var(--line2);
}
.q-side.lv-sky { background: var(--teal); }
.q-side.lv-surface { background: var(--gold); }
.q-side.lv-depth { background: var(--red); }

.q-main { flex: 1; min-width: 0; }
.quest-title { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.quest-name {
  font-weight: 600; font-size: 14.5px; color: var(--text);
  transition: color 0.15s;
}
.quest-card:hover .quest-name { color: var(--gold); }
.nozh { color: var(--faint); font-size: 11.5px; font-family: ui-monospace, Consolas, monospace; }
.quest-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 5px; }

.q-arrow { flex: none; color: var(--faint); font-size: 18px; transition: color 0.15s, transform 0.15s; }
.quest-card:hover .q-arrow { color: var(--gold); transform: translateX(3px); }

.chip-cat {
  background: var(--teal-bg); color: var(--teal);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.chip-region {
  background: var(--blue-bg); color: var(--blue);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.chip-region.dim { background: var(--bg2); color: var(--faint); }
.chip-npc {
  background: var(--amber-bg); color: var(--amber);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.chip-layer {
  background: var(--bg2); color: var(--muted);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.chip-layer.lv-sky { background: var(--teal-bg); color: var(--teal); }
.chip-layer.lv-surface { background: var(--gold-bg); color: var(--gold); }
.chip-layer.lv-depth { background: var(--red-bg); color: var(--red); }
.chip-step { color: var(--faint); font-size: 12px; }

/* 弹层：暗底 + 羊皮纸卡 */
.modal-mask {
  position: fixed; inset: 0; background: rgba(46, 50, 54, 0.42);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  z-index: 60; padding: 24px;
}
.modal {
  background:
    radial-gradient(400px 200px at 50% 0%, rgba(154, 123, 28, 0.05), transparent 70%),
    var(--paper-tex), var(--card);
  background-size: auto, 160px 160px, auto;
  border: 1px solid var(--line2); border-radius: 16px; padding: 24px 26px;
  max-width: 640px; width: 100%; max-height: 86vh; overflow-y: auto;
  position: relative; box-shadow: 0 24px 60px rgba(46, 50, 54, 0.2);
}
.modal .close {
  position: absolute; top: 12px; right: 14px; border: none; background: none;
  font-size: 24px; line-height: 1; color: var(--faint); cursor: pointer;
}
.modal .close:hover { color: var(--gold); }
.modal-top {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-bottom: 10px; padding-right: 32px;
}
.modal-top .pos { font-size: 12.5px; color: var(--muted); min-width: 60px; text-align: center; }
.modal-top .arrow {
  border: 1px solid var(--line2); background: var(--bg2); border-radius: 8px;
  width: 30px; height: 30px; cursor: pointer; color: var(--muted); font-size: 16px;
  transition: border-color 0.15s, color 0.15s;
}
.modal-top .arrow:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
.modal-top .arrow:disabled { opacity: 0.35; cursor: default; }

.q-title { font-size: 18px; font-weight: 700; margin: 0 0 10px; color: var(--gold); }
.badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }

.map-btn {
  display: block; border: 1px solid var(--gold); border-radius: 10px;
  padding: 11px 14px; text-decoration: none; color: var(--gold);
  font-size: 13.5px; font-weight: 600; margin-bottom: 16px;
  background: linear-gradient(180deg, rgba(154, 123, 28, 0.09), rgba(154, 123, 28, 0.03));
  transition: box-shadow 0.15s;
}
.map-btn:hover { color: var(--gold); box-shadow: 0 2px 12px rgba(154, 123, 28, 0.16); }
.map-btn .map-sub { display: block; margin-top: 3px; font-size: 11.5px; color: var(--muted); font-weight: 400; }

section { margin-bottom: 18px; }
section h3 {
  font-size: 13px; font-weight: 600; color: var(--gold);
  margin: 0 0 8px; display: flex; align-items: center; gap: 8px; letter-spacing: 1px;
}
.src-tag {
  font-weight: 400; font-size: 11px; color: var(--faint);
  border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px;
  letter-spacing: 0;
}
.step { display: flex; gap: 10px; padding: 4px 0; }
.step p { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.65; white-space: pre-line; }
.step-pt { color: var(--faint) !important; font-style: italic; }
.step-body { flex: 1; min-width: 0; }
.step-no {
  flex: none; width: 20px; height: 20px; border-radius: 50%;
  background: var(--gold-bg); color: var(--gold);
  font-size: 11.5px; display: flex; align-items: center; justify-content: center; margin-top: 3px;
}
.step-no.done { background: var(--teal-bg); color: var(--teal); }
.pts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.pt { font-size: 11.5px; color: var(--faint); }

.guide-row { display: flex; gap: 10px; padding: 4px 0; font-size: 13.5px; }
.guide-k { flex: none; width: 62px; color: var(--muted); }
.guide-v { color: var(--text); line-height: 1.6; }

.chain { display: flex; gap: 8px; flex-wrap: wrap; }
.chain-item {
  border: 1px solid var(--line2); background: var(--bg2); border-radius: 999px;
  padding: 5px 14px; font-size: 13px; color: var(--teal); cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.chain-item.link:hover { border-color: var(--teal); background: var(--teal-bg); }
.chain-item.dim { color: var(--faint); cursor: default; }
.chain-flag { font-size: 11px; color: var(--faint); margin-left: 4px; }
.no-detail { color: var(--faint); font-size: 13px; text-align: center; padding: 8px 0; }

@media (max-width: 720px) {
  .filter-row { gap: 8px; }
  .filter-row select { max-width: 100%; flex: 1; }
  .result-count { margin-left: 0; width: 100%; }
  .modal-mask { padding: 0; align-items: flex-end; }
  .modal {
    max-width: 100%; border-radius: 16px 16px 0 0; max-height: 88vh; padding: 20px 18px;
  }
  .q-title { font-size: 16px; }
  .quest-card { padding: 11px 13px; gap: 10px; }
}
</style>
