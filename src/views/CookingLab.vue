<template>
  <main class="container lab-page" style="padding-top: 24px;">
    <div class="lab-head">
      <h1 class="page-head" style="margin-bottom: 6px;">
        <span class="ph-icon">◈</span>模拟料理
      </h1>
      <p class="lab-sub">
        选 1~5 个材料下锅，按游戏内置的 158 条配方与效果规则实时演算。
        规则引擎经 446 组组合回归验证，与图鉴 228 道锅煮菜判定 100% 一致。
      </p>
    </div>

    <div class="lab-grid">
      <!-- 左：食材库 -->
      <section class="card lab-col shelf-col">
        <h3>食材库 <span class="col-sub">{{ shelf.length }} 种</span></h3>
        <div class="search-box" style="margin-bottom: 8px;">
          <input v-model="q" placeholder="搜索材料…" aria-label="搜索材料" />
        </div>
        <div class="cat-tabs">
          <button
            v-for="c in cats"
            :key="c.key"
            :class="{ on: cat === c.key }"
            @click="cat = cat === c.key ? 'Cook' : c.key"
          >{{ c.label }}</button>
        </div>
        <div class="mat-list">
          <div
            v-for="m in shelf"
            :key="m.id"
            class="mat-row"
            :title="m.id"
          >
            <img v-if="m.icon" :src="'/icons/' + m.icon" loading="lazy" :alt="m.zh" />
            <div v-else class="mat-ph">{{ (m.zh || m.id)[0] }}</div>
            <div class="mat-info">
              <div class="mat-zh">{{ m.zh || m.id }}</div>
              <div class="mat-eff">
                <span v-if="m.eff">{{ m.eff }}<template v-if="m.effMin"> · {{ fmtMin(m.effMin) }}</template></span>
                <span v-else-if="m.hp">回复 {{ m.hp / 2 }} 心</span>
                <span v-else>—</span>
              </div>
            </div>
            <button
              class="add-btn"
              :disabled="potIds.length >= 5"
              @click="add(m.id)"
              aria-label="加入锅中"
            >＋</button>
          </div>
          <p v-if="!shelf.length" class="empty-tip">没有匹配的材料</p>
        </div>
      </section>

      <!-- 右：工作台（锅 + 结果） -->
      <div class="bench">
        <!-- 锅：圆形主视觉 -->
        <section class="card pot-card">
          <div class="pot-stage">
            <div class="pot-ring" :class="{ boiling: potIds.length }">
              <div class="pot-inner">
                <div
                  v-for="i in 5"
                  :key="i"
                  class="slot"
                  :class="{ filled: potIds[i - 1] }"
                  @click="potIds[i - 1] && remove(i - 1)"
                >
                  <template v-if="potIds[i - 1]">
                    <img
                      v-if="matOf(potIds[i - 1]).icon"
                      :src="'/icons/' + matOf(potIds[i - 1]).icon"
                      :alt="matOf(potIds[i - 1]).zh"
                    />
                    <span v-else class="slot-ph">{{ (matOf(potIds[i - 1]).zh || '?')[0] }}</span>
                    <span class="slot-zh">{{ matOf(potIds[i - 1]).zh }}</span>
                  </template>
                  <span v-else class="slot-plus">＋</span>
                </div>
              </div>
            </div>
            <!-- 灶火 -->
            <div class="fire-wrap" aria-hidden="true">
              <div class="fire" :class="{ lit: potIds.length }"></div>
            </div>
          </div>
          <div class="pot-ops">
            <span class="pot-count">{{ potIds.length }} / 5</span>
            <button class="clear-btn" :disabled="!potIds.length" @click="potIds = []">清空</button>
          </div>
          <p class="pot-tip">点击锅里的材料可移除 · 同名材料可重复加入</p>
        </section>

        <!-- 结果：紧贴锅下方，实时更新 -->
        <section class="card result-col">
          <h3>料理结果</h3>

          <div v-if="result.path === 'empty'" class="result-empty">
            <span class="re-icon">🍲</span>
            <p>从左侧选择材料下锅，这里会实时给出料理结果</p>
          </div>

          <template v-else>
            <div class="result-head">
              <img v-if="result.icon" :src="'/icons/' + result.icon" :alt="result.zh" class="result-icon" />
              <div v-else class="result-icon result-ph">{{ (result.zh || '?')[0] }}</div>
              <div class="rh-text">
                <div class="result-zh">
                  {{ result.zh || '…' }}
                  <span v-if="result.crit" class="crit-star">★ 大成功</span>
                </div>
                <span class="path-badge" :class="result.path">{{ pathLabel(result) }}</span>
              </div>
            </div>

            <!-- 三项关键指标 -->
            <div class="metrics">
              <div class="metric">
                <div class="mv" :class="{ zero: !result.hp }">
                  {{ result.hp ? (result.hp / 2) + ' ♥' : '—' }}
                </div>
                <div class="mk">生命恢复</div>
              </div>
              <div class="metric">
                <div class="mv" :class="{ bad: result.conflict }">
                  <template v-if="result.conflict">✕ 抵消</template>
                  <template v-else-if="result.eff">{{ result.eff }}<template v-if="result.effLv"> Lv{{ result.effLv }}</template></template>
                  <template v-else>无</template>
                </div>
                <div class="mk">效果强度</div>
              </div>
              <div class="metric">
                <div class="mv" :class="{ zero: !result.effMin }">
                  {{ result.effMin ? fmtMin(result.effMin) : '—' }}
                </div>
                <div class="mk">持续时间</div>
              </div>
            </div>

            <div v-if="result.conflict" class="warn-box">
              加入的效果材料种类不同，加成会被抵消，只保留回血。
            </div>

            <div class="sub-rows">
              <span class="rk">卖出价格</span>
              <span class="rv">{{ result.price }} 卢比</span>
            </div>

            <div class="note-box">{{ pathNote(result) }}</div>

            <div class="result-links" v-if="result.actor">
              <RouterLink :to="'/items/' + result.actor" class="mini-link">图鉴详情 →</RouterLink>
              <RouterLink :to="{ path: '/cooking', query: { q: result.zh } }" class="mini-link">料理页配方 →</RouterLink>
            </div>

            <button class="fav-btn" @click="toggleFav" :disabled="!result.actor">
              {{ isFav ? '★ 已收藏' : '☆ 收藏当前配方' }}
            </button>
          </template>

          <!-- 收藏的配方 -->
          <div v-if="favs.length" class="fav-list">
            <h4>收藏的配方</h4>
            <div v-for="(f, i) in favs" :key="i" class="fav-row">
              <button class="fav-apply" @click="applyFav(f)">
                {{ f.zh }}<span class="fav-n">×{{ f.ids.length }}</span>
              </button>
              <button class="fav-del" @click="removeFav(i)" aria-label="删除">×</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cook } from '../lib/cookingEngine.js'
import { loadCookingLab } from '../data.js'

const route = useRoute()
const router = useRouter()

const lab = ref(null)
const potIds = ref([...(route.query.m ? String(route.query.m).split(',') : [])].filter(Boolean).slice(0, 5))
const q = ref('')
const cat = ref('Cook')
const favs = ref(JSON.parse(localStorage.getItem('cooklab-favs') || '[]'))

loadCookingLab().then((d) => (lab.value = d))

// 分类（CookResult/CookFailure 是产物不进食材架）
const CATS = [
  { key: 'CookMeat', label: '肉类' },
  { key: 'CookFish', label: '鱼蟹' },
  { key: 'CookFruit', label: '水果' },
  { key: 'CookMushroom', label: '蘑菇' },
  { key: 'CookPlant', label: '野菜' },
  { key: 'CookOre', label: '矿物' },
  { key: 'CookInsect', label: '昆虫' },
  { key: 'CookEnemy', label: '怪物' },
  { key: 'CookSpice', label: '香料' },
  { key: 'other', label: '稀有' },
]
const EXCLUDE = new Set(['CookResult', 'CookFailure'])
const OTHER_TAGS = new Set(['CookForeign', 'CookGolem', 'CookEMedicine', 'CookOther', 'CookLowPrice', 'CookValue1'])

function mainTag(m) {
  const ts = (m.tags || []).filter((t) => t !== 'Cook')
  for (const t of ts) if (CATS.some((c) => c.key === t)) return t
  for (const t of ts) if (OTHER_TAGS.has(t)) return 'other'
  return 'other'
}

const shelf = computed(() => {
  if (!lab.value) return []
  const kw = q.value.trim().toLowerCase()
  return Object.entries(lab.value.materials)
    .map(([id, m]) => ({ id, ...m, _cat: mainTag(m) }))
    .filter((m) => !EXCLUDE.has(m._cat) && !(m.tags || []).some((t) => EXCLUDE.has(t)))
    .filter((m) => (cat.value === 'Cook' ? true : m._cat === cat.value))
    .filter((m) => !kw || (m.zh && m.zh.toLowerCase().includes(kw)) || m.id.toLowerCase().includes(kw))
    .sort((a, b) => (a.zh || a.id).localeCompare(b.zh || b.id, 'zh'))
})

const result = computed(() =>
  lab.value ? cook(potIds.value, lab.value) : { path: 'empty' }
)

function matOf(id) {
  return (lab.value && lab.value.materials[id]) || { zh: id, icon: null }
}

function add(id) {
  if (potIds.value.length < 5) potIds.value = [...potIds.value, id]
}
function remove(i) {
  potIds.value = potIds.value.filter((_, j) => j !== i)
}

function fmtMin(sec) {
  if (sec >= 60 * 60) return Math.floor(sec / 60) + ' 分钟'
  const m = Math.floor(sec / 60), s = sec % 60
  return m + ':' + String(s).padStart(2, '0')
}

const PATH_LABEL = {
  fixed: '固定配方', elixir: '药剂', generic: '组合推导', fail: '失败的菜肴', empty: '',
}
function pathLabel(r) { return PATH_LABEL[r.path] || r.path }
function pathNote(r) {
  switch (r.path) {
    case 'fixed': return '材料组合命中游戏内置的「' + (r.recipeZh || r.zh) + '」配方。'
    case 'elixir': return '昆虫 + 怪物材料 → 药剂，效果取自昆虫，怪物材料延长持续时间。'
    case 'generic': return '未命中固定配方，按材料组合推导出常见做法。'
    case 'fail': return '这些材料煮不出任何可食用的料理。'
    default: return ''
  }
}

// 收藏（localStorage）
const isFav = computed(() =>
  favs.value.some((f) => f.ids.join() === potIds.value.join())
)
function toggleFav() {
  if (isFav.value) {
    favs.value = favs.value.filter((f) => f.ids.join() !== potIds.value.join())
  } else {
    favs.value = [...favs.value, { ids: [...potIds.value], zh: result.value.zh }]
  }
  localStorage.setItem('cooklab-favs', JSON.stringify(favs.value))
}
function removeFav(i) {
  favs.value = favs.value.filter((_, j) => j !== i)
  localStorage.setItem('cooklab-favs', JSON.stringify(favs.value))
}
function applyFav(f) {
  potIds.value = [...f.ids]
}

// 锅内材料写入 URL，刷新/分享不丢
watch(potIds, (v) => {
  router.replace({
    query: { ...route.query, m: v.length ? v.join(',') : undefined },
  })
})
</script>

<style scoped>
.lab-sub { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0 0 16px; }
.col-sub { font-size: 11.5px; color: var(--faint); font-weight: 400; }

.lab-grid {
  display: grid; grid-template-columns: 340px minmax(0, 1fr);
  gap: 14px; align-items: start;
}
.lab-col { padding: 14px; }
.lab-col h3 { font-size: 14px; font-weight: 600; margin: 0 0 10px; color: var(--gold); letter-spacing: 1px; }

.cat-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.cat-tabs button {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 3px 10px; font-size: 11.5px; color: var(--muted); cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.cat-tabs button.on { border-color: var(--gold); color: var(--gold); background: var(--gold-bg); }

.mat-list { max-height: 560px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.mat-row {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); border-radius: 10px; padding: 5px 8px;
  transition: border-color 0.15s, background 0.15s;
}
.mat-row:hover { border-color: var(--gold); background: var(--card2); }
.mat-row img, .mat-ph {
  width: 36px; height: 36px; object-fit: contain; flex: none;
}
.mat-row img {
  background: var(--bg2); border-radius: 9px; padding: 2px;
}
.mat-ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border-radius: 8px; color: var(--faint); font-size: 14px;
}
.mat-info { flex: 1; min-width: 0; }
.mat-zh { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mat-eff { font-size: 11px; color: var(--teal); }
.add-btn {
  flex: none; width: 26px; height: 26px; border-radius: 50%;
  border: 1px solid var(--teal); background: var(--teal-bg); color: var(--teal);
  font-size: 15px; line-height: 1; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.add-btn:hover:not(:disabled) { background: var(--teal); color: #fff; }
.add-btn:disabled { opacity: 0.35; cursor: default; }
.empty-tip { color: var(--faint); font-size: 12.5px; text-align: center; margin: 12px 0; }

/* ============ 工作台：锅 ============ */
.bench { display: flex; flex-direction: column; gap: 14px; }

.pot-card { padding: 18px 18px 12px; }
.pot-stage { position: relative; padding-bottom: 10px; }

/* 圆形锅体：奶油锅面 + 灰褐锅沿 */
.pot-ring {
  width: 264px; height: 264px; margin: 0 auto; border-radius: 50%;
  background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f6f2e8 46%, #e9e2d1 100%);
  border: 7px solid #d8cfb9;
  box-shadow:
    inset 0 10px 26px rgba(46, 50, 54, 0.09),
    inset 0 -6px 18px rgba(255, 255, 255, 0.7),
    0 10px 24px rgba(46, 50, 54, 0.09);
  transition: background 0.35s, border-color 0.35s;
  position: relative; z-index: 1;
}
/* 下锅后：汤色变暖 */
.pot-ring.boiling {
  background: radial-gradient(circle at 50% 44%, #fffdf6 0%, #fdf2d8 48%, #f4e2b4 100%);
  border-color: #d4c49c;
}
.pot-inner {
  position: absolute; inset: 16px;
  display: flex; flex-wrap: wrap; align-content: center; justify-content: center;
  gap: 8px;
}
.slot {
  width: 66px; height: 66px; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 1.5px dashed rgba(46, 50, 54, 0.16); color: var(--faint);
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  cursor: default; overflow: hidden;
}
.slot:not(.filled):last-child { border-color: rgba(46, 50, 54, 0.1); }
.slot.filled {
  border: 1px solid var(--line2); background: rgba(255, 255, 255, 0.86);
  cursor: pointer; box-shadow: 0 2px 8px rgba(46, 50, 54, 0.08);
}
.slot.filled:hover { border-color: var(--red); transform: translateY(-1px); }
.slot img { width: 34px; height: 34px; object-fit: contain; }
.slot-ph {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border-radius: 8px; font-size: 14px;
}
.slot-zh {
  font-size: 9.5px; margin-top: 1px; max-width: 60px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted);
}
.slot-plus { font-size: 17px; opacity: 0.5; }

/* 灶火：三层火苗 + 点燃态 */
.fire-wrap { position: relative; height: 46px; margin-top: -14px; text-align: center; z-index: 0; }
.fire { position: relative; width: 46px; height: 52px; margin: 0 auto; opacity: 0.45; transition: opacity 0.3s; }
.fire.lit { opacity: 1; }
.fire::before {
  content: ""; position: absolute; inset: 0;
  border-radius: 50% 50% 46% 46% / 62% 62% 38% 38%;
  background: linear-gradient(180deg, #ffd982 0%, #f2952f 58%, #d9661f 100%);
  filter: blur(1.5px);
  animation: flicker 1.7s ease-in-out infinite;
}
.fire::after {
  content: ""; position: absolute; left: 50%; bottom: 5px; width: 18px; height: 26px;
  transform: translateX(-50%);
  border-radius: 50% 50% 44% 44% / 60% 60% 40% 40%;
  background: linear-gradient(180deg, #fff6cf, #ffc247);
  animation: flicker 1.15s ease-in-out infinite reverse;
}
.fire:not(.lit)::before, .fire:not(.lit)::after { animation-play-state: paused; }
@keyframes flicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  50% { transform: scaleY(1.14) scaleX(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .fire::before, .fire::after { animation: none; }
}

.pot-ops {
  display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4px;
}
.pot-count {
  font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums;
}
.clear-btn {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 5px 18px; font-size: 12.5px; color: var(--muted); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.clear-btn:hover:not(:disabled) { border-color: var(--red); color: var(--red); }
.clear-btn:disabled { opacity: 0.4; cursor: default; }
.pot-tip { color: var(--faint); font-size: 11.5px; margin: 8px 0 0; text-align: center; }

/* ============ 结果卡 ============ */
.result-col { padding: 16px 18px; }
.result-col h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--gold); letter-spacing: 1px; }
.result-empty { text-align: center; padding: 22px 0 14px; }
.result-empty .re-icon { font-size: 30px; opacity: 0.5; }
.result-empty p { color: var(--faint); font-size: 13px; margin: 8px 0 0; }

.result-head { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.result-icon { width: 64px; height: 64px; object-fit: contain; flex: none; }
.result-ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border: 1px solid var(--line); border-radius: 12px; color: var(--faint); font-size: 24px;
}
.rh-text { min-width: 0; }
.result-zh { font-size: 17px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.crit-star {
  font-size: 11px; font-weight: 600; color: var(--amber);
  background: var(--amber-bg); border-radius: 999px; padding: 1px 8px;
}
.path-badge {
  display: inline-block; font-size: 11px; border-radius: 999px; padding: 2px 10px;
  background: var(--bg2); color: var(--muted); margin-top: 5px;
}
.path-badge.fixed { background: var(--teal-bg); color: var(--teal); }
.path-badge.elixir { background: var(--blue-bg); color: var(--blue); }
.path-badge.fail { background: var(--red-bg); color: var(--red); }

.metrics {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  border: 1px solid var(--line); border-radius: 12px; padding: 12px 6px;
  background: var(--card2);
}
.metric { text-align: center; }
.metric + .metric { border-left: 1px dashed var(--line); }
.mv {
  font-size: 17px; font-weight: 700; color: var(--gold);
  font-variant-numeric: tabular-nums; line-height: 1.25;
}
.mv.zero { color: var(--faint); font-weight: 400; }
.mv.bad { color: var(--red); font-size: 13px; }
.mk { font-size: 11.5px; color: var(--muted); margin-top: 3px; }

.sub-rows {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; font-size: 13px;
}
.rk { color: var(--muted); }
.rv { color: var(--text); font-weight: 600; }

.warn-box {
  background: var(--red-bg); color: var(--red); border-radius: 10px;
  padding: 8px 12px; font-size: 12.5px; margin-top: 12px;
}
.note-box {
  border-top: 1px dashed var(--line); padding-top: 10px; margin-top: 12px;
  font-size: 12px; color: var(--muted); line-height: 1.65;
}
.result-links { display: flex; gap: 14px; margin-top: 10px; }
.mini-link { font-size: 12.5px; color: var(--teal); }
.mini-link:hover { color: var(--gold); text-decoration: none; }

.fav-btn {
  width: 100%; margin-top: 12px;
  border: 1px solid var(--gold); background: var(--gold-bg); color: var(--gold);
  border-radius: 10px; padding: 9px 0; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.fav-btn:hover:not(:disabled) { background: var(--gold); color: #fff; }
.fav-btn:disabled { opacity: 0.4; cursor: default; }

.fav-list { margin-top: 16px; border-top: 1px dashed var(--line); padding-top: 12px; }
.fav-list h4 { font-size: 12.5px; color: var(--gold); margin: 0 0 8px; letter-spacing: 1px; }
.fav-row { display: flex; gap: 6px; margin-bottom: 6px; }
.fav-apply {
  flex: 1; text-align: left; border: 1px solid var(--line2); background: var(--card);
  border-radius: 8px; padding: 6px 10px; font-size: 12.5px; color: var(--text); cursor: pointer;
  transition: border-color 0.15s;
}
.fav-apply:hover { border-color: var(--gold); }
.fav-n { color: var(--faint); font-size: 11px; margin-left: 6px; }
.fav-del {
  flex: none; width: 28px; border: 1px solid var(--line2); background: var(--card);
  border-radius: 8px; color: var(--faint); cursor: pointer;
}
.fav-del:hover { color: var(--red); border-color: var(--red); }

@media (max-width: 900px) {
  .lab-grid { grid-template-columns: 1fr; }
  .mat-list { max-height: 300px; }
  .pot-ring { width: 232px; height: 232px; }
  .slot { width: 58px; height: 58px; }
  .slot img { width: 30px; height: 30px; }
}
</style>
