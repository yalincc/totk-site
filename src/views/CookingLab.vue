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
      <section class="card lab-col">
        <h3>食材库</h3>
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
                <span v-if="m.eff">{{ m.eff }}<template v-if="m.effMin"> {{ fmtMin(m.effMin) }}</template></span>
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

      <!-- 中：锅 -->
      <section class="card lab-col pot-col">
        <h3>锅</h3>
        <div class="pot-slots">
          <div
            v-for="i in 5"
            :key="i"
            class="pot-slot"
            :class="{ filled: potIds[i - 1] }"
            @click="potIds[i - 1] && remove(i - 1)"
          >
            <template v-if="potIds[i - 1]">
              <img v-if="matOf(potIds[i - 1]).icon" :src="'/icons/' + matOf(potIds[i - 1]).icon" :alt="matOf(potIds[i - 1]).zh" />
              <span v-else class="slot-ph">{{ (matOf(potIds[i - 1]).zh || '?')[0] }}</span>
              <span class="slot-zh">{{ matOf(potIds[i - 1]).zh }}</span>
            </template>
            <span v-else class="slot-empty">＋</span>
          </div>
        </div>
        <div class="pot-fire" aria-hidden="true">
          <div class="fire"></div>
        </div>
        <button class="clear-btn" :disabled="!potIds.length" @click="potIds = []">清空材料</button>
        <p class="pot-tip">点击锅里的材料可移除；同名材料可重复加入</p>
      </section>

      <!-- 右：结果 -->
      <section class="card lab-col result-col">
        <h3>料理结果</h3>

        <template v-if="result.path === 'empty'">
          <p class="empty-tip" style="padding: 32px 0;">从左侧加入材料开始模拟</p>
        </template>

        <template v-else>
          <div class="result-head">
            <img v-if="result.icon" :src="'/icons/' + result.icon" :alt="result.zh" class="result-icon" />
            <div v-else class="result-icon result-ph">{{ (result.zh || '?')[0] }}</div>
            <div>
              <div class="result-zh">{{ result.zh || '…' }}</div>
              <span class="path-badge" :class="result.path">{{ pathLabel(result) }}</span>
            </div>
          </div>

          <div class="result-rows">
            <div class="rrow">
              <span class="rk">生命恢复</span>
              <span class="rv">{{ result.hp ? (result.hp / 2) + ' 颗心' : '无' }}</span>
            </div>
            <div class="rrow">
              <span class="rk">效果强度</span>
              <span class="rv">
                <template v-if="result.conflict">✕ 两种效果相互抵消</template>
                <template v-else-if="result.eff">{{ result.eff }}<template v-if="result.effLv"> Lv{{ result.effLv }}</template></template>
                <template v-else>无</template>
              </span>
            </div>
            <div class="rrow">
              <span class="rk">持续时间</span>
              <span class="rv">{{ result.effMin ? fmtMin(result.effMin) : '—' }}</span>
            </div>
            <div class="rrow">
              <span class="rk">卖出价格</span>
              <span class="rv">{{ result.price }} 卢比</span>
            </div>
          </div>

          <div v-if="result.crit" class="crit-box">★ 必定大成功（稀有材料入锅）</div>
          <div v-if="result.conflict" class="warn-box">加入的效果材料种类不同，加成会被抵消，只保留回血。</div>

          <div class="note-box">
            <b>{{ pathLabel(result) }}</b> —— {{ pathNote(result) }}
          </div>

          <div class="result-links" v-if="result.actor">
            <RouterLink :to="'/items/' + result.actor" class="mini-link">图鉴详情 →</RouterLink>
            <RouterLink :to="{ path: '/cooking', query: { q: result.zh } }" class="mini-link">料理页配方 →</RouterLink>
          </div>

          <button class="fav-btn" @click="toggleFav" :disabled="!result.actor">
            {{ isFav ? '★ 已收藏' : '☆ 收藏当前配方' }}
          </button>
        </template>

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
.lab-head h2 { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.lab-sub { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0 0 16px; }

.lab-grid {
  display: grid; grid-template-columns: 250px 1fr 300px;
  gap: 14px; align-items: start;
}
.lab-col { padding: 14px; }
.lab-col h3 { font-size: 14px; font-weight: 600; margin: 0 0 10px; color: var(--gold); letter-spacing: 1px; }

.cat-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.cat-tabs button {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 3px 10px; font-size: 11.5px; color: var(--muted); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.cat-tabs button.on { border-color: var(--gold); color: var(--gold); background: var(--gold-bg); }

.mat-list { max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.mat-row {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); border-radius: 10px; padding: 5px 8px;
  transition: border-color 0.15s;
}
.mat-row:hover { border-color: var(--gold); }
.mat-row img, .mat-ph {
  width: 30px; height: 30px; object-fit: contain; flex: none;
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
.add-btn:hover:not(:disabled) { background: var(--teal); color: #10231b; }
.add-btn:disabled { opacity: 0.35; cursor: default; }
.empty-tip { color: var(--faint); font-size: 12.5px; text-align: center; margin: 12px 0; }

.pot-col { text-align: center; }
.pot-slots { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.pot-slot {
  height: 52px; border: 1.5px dashed var(--line2); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--faint); font-size: 12px; cursor: pointer;
}
.pot-slot.filled { border: 1px solid var(--teal); background: var(--teal-bg); color: var(--text); }
.pot-slot img { width: 34px; height: 34px; object-fit: contain; }
.slot-zh { font-size: 12.5px; font-weight: 600; }
.slot-ph {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--card); border-radius: 8px; font-size: 14px;
}
.pot-fire { margin: 4px 0 12px; }
.fire {
  width: 46px; height: 46px; margin: 0 auto; border-radius: 50% 50% 45% 45%;
  background: var(--amber-bg); border: 1.5px solid var(--amber);
  position: relative;
}
.fire::after {
  content: ''; position: absolute; inset: 12px; border-radius: 50%;
  background: var(--amber);
}
.clear-btn {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 7px 22px; font-size: 12.5px; color: var(--muted); cursor: pointer;
}
.clear-btn:hover:not(:disabled) { border-color: var(--red); color: var(--red); }
.clear-btn:disabled { opacity: 0.4; cursor: default; }
.pot-tip { color: var(--faint); font-size: 11.5px; margin: 10px 0 0; }

.result-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.result-icon { width: 60px; height: 60px; object-fit: contain; flex: none; }
.result-ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border: 1px solid var(--line); border-radius: 12px; color: var(--faint); font-size: 24px;
}
.result-zh { font-size: 16px; font-weight: 600; margin-bottom: 5px; }
.path-badge {
  font-size: 11px; border-radius: 999px; padding: 2px 10px;
  background: var(--bg2); color: var(--muted);
}
.path-badge.fixed { background: var(--teal-bg); color: var(--teal); }
.path-badge.elixir { background: var(--blue-bg); color: var(--blue); }
.path-badge.fail { background: var(--red-bg); color: var(--red); }

.result-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.rrow { display: flex; justify-content: space-between; font-size: 13px; }
.rk { color: var(--muted); }
.rv { font-weight: 600; color: var(--gold); }

.crit-box {
  background: var(--amber-bg); color: var(--amber); border-radius: 10px;
  padding: 8px 12px; font-size: 12.5px; margin-bottom: 8px;
}
.warn-box {
  background: var(--red-bg); color: var(--red); border-radius: 10px;
  padding: 8px 12px; font-size: 12.5px; margin-bottom: 8px;
}
.note-box {
  border-top: 1px dashed var(--line); padding-top: 10px;
  font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 10px;
}
.result-links { display: flex; gap: 12px; margin-bottom: 10px; }
.mini-link { font-size: 12.5px; color: var(--blue); text-decoration: none; }
.mini-link:hover { text-decoration: underline; }
.fav-btn {
  width: 100%; border: 1px solid var(--amber); background: var(--amber-bg);
  color: var(--amber); border-radius: 10px; padding: 9px 0; font-size: 13px;
  cursor: pointer;
}
.fav-btn:hover:not(:disabled) { background: var(--amber); color: #241a08; }
.fav-btn:disabled { opacity: 0.4; cursor: default; }

.fav-list { margin-top: 16px; border-top: 1px dashed var(--line); padding-top: 12px; }
.fav-list h4 { font-size: 12.5px; color: var(--muted); margin: 0 0 8px; }
.fav-row { display: flex; gap: 6px; margin-bottom: 6px; }
.fav-apply {
  flex: 1; text-align: left; border: 1px solid var(--line2); background: var(--card);
  border-radius: 8px; padding: 6px 10px; font-size: 12.5px; color: var(--text); cursor: pointer;
}
.fav-apply:hover { border-color: var(--teal); }
.fav-n { color: var(--faint); font-size: 11px; margin-left: 6px; }
.fav-del {
  flex: none; width: 28px; border: 1px solid var(--line2); background: var(--card);
  border-radius: 8px; color: var(--faint); cursor: pointer;
}
.fav-del:hover { color: var(--red); border-color: var(--red); }

@media (max-width: 900px) {
  .lab-grid { grid-template-columns: 1fr; }
  .mat-list { max-height: 300px; }
}
</style>
