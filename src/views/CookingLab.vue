<template>
  <main class="container lab-page" style="padding-top: 24px;">
    <div class="lab-head">
      <h1 class="page-head" style="margin-bottom: 6px;">
        <span class="ph-icon">◈</span>模拟料理
      </h1>
      <div class="head-orn" aria-hidden="true"><i></i><b>✦</b><i></i></div>
      <p class="lab-sub">
        选 1~5 份材料下锅，按游戏内置规则实时演算产物、效果与暴击。
        规则引擎经 446 组组合回归验证，与图鉴 228 道锅煮菜判定 100% 一致。
      </p>
    </div>

    <div class="mode-row">
      <div class="modes">
        <button :class="{ on: mode === 'mix' }" @click="mode = 'mix'">自由搭配</button>
        <button :class="{ on: mode === 'saved' }" @click="mode = 'saved'">
          我的配方<template v-if="recipes.length"> {{ recipes.length }}</template>
        </button>
      </div>
      <button class="bloodmoon" :class="{ on: bloodMoon }" @click="bloodMoon = !bloodMoon"
        title="血月夜（23:30–00:30）烹饪必定暴击">
        🌕 血月（必定暴击）
      </button>
    </div>
    <!-- ============ 自由搭配 ============ -->
    <div v-show="mode === 'mix'" class="lab-grid">
      <!-- 左：材料库 -->
      <section class="card lab-col shelf-col">
        <h3>材料库 <span class="col-sub">{{ shelfTotal }} 种</span></h3>
        <div class="search-box" style="margin-bottom: 8px;">
          <input v-model="q" placeholder="搜索材料…" aria-label="搜索材料" />
        </div>
        <div class="cat-tabs">
          <button
            v-for="c in catTabs"
            :key="c.key"
            :class="{ on: cat === c.key }"
            @click="cat = cat === c.key ? 'Cook' : c.key"
          >{{ c.label }}</button>
        </div>
        <div ref="gridRef" class="mat-grid">
          <div
            v-for="m in shelf"
            :key="m.id"
            class="mat-cell"
            :class="{ inpot: nOf(m.id) > 0, dim: full && nOf(m.id) === 0 }"
            :title="m.zh || m.id"
            @click="nOf(m.id) > 0 || !full ? add(m.id) : null"
          >
            <span v-if="isCrit(m.id)" class="crit-flag">必暴击</span>
            <span v-if="nOf(m.id) > 0" class="cnt">×{{ nOf(m.id) }}</span>
            <img v-if="m.icon" :src="'/icons/' + m.icon" loading="lazy" :alt="m.zh" />
            <div v-else class="mat-ph">{{ (m.zh || m.id)[0] }}</div>
            <div class="mn">{{ m.zh || m.id }}</div>
            <div class="me">
              <span v-if="m.eff">{{ m.eff }}<template v-if="m.effLv"> {{ m.effLv }}</template></span>
              <span v-else-if="m.hp">♥{{ m.hp / 2 }}</span>
            </div>
          </div>
          <p v-if="!shelf.length" class="empty-tip">没有匹配的材料</p>
        </div>
      </section>

      <!-- 右：工作台 + 结果 -->
      <div ref="benchRef" class="bench">
        <section class="card lab-col ornate">
          <h3>配方工作台 <span class="col-sub">点左侧材料即入锅 · 同名自动叠加</span></h3>
          <div class="slots">
            <div
              v-for="i in 5"
              :key="i"
              class="slot"
              :class="{ filled: pot[i - 1] }"
              :title="pot[i - 1] ? `${matOf(pot[i - 1].id).zh} ×${pot[i - 1].n}　（点击 −1 份，右上角 × 移除整种）` : ''"
            >
              <template v-if="pot[i - 1]">
                <button class="slot-del" @click.stop="del(pot[i - 1].id)" title="移除这种材料">×</button>
                <img
                  v-if="matOf(pot[i - 1].id).icon"
                  :src="'/icons/' + matOf(pot[i - 1].id).icon"
                  :alt="matOf(pot[i - 1].id).zh"
                  @click="dec(pot[i - 1].id)"
                />
                <div v-else class="slot-ph" @click="dec(pot[i - 1].id)">{{ (matOf(pot[i - 1].id).zh || '?')[0] }}</div>
                <span class="mul">×{{ pot[i - 1].n }}</span>
              </template>
              <span v-else class="slot-empty"><i></i>空位</span>
            </div>
          </div>

          <div class="ops">
            <button class="btn" :disabled="!undoStack.length" @click="undo">↶ 撤销</button>
            <button class="btn" :disabled="!pot.length" @click="clearPot">清空</button>
            <span class="count">已放 <b>{{ totalN }}</b> / 5 份</span>
          </div>

          <!-- 暴击率 -->
          <div class="critbox">
            <div class="crow">
              <span class="clabel">暴击率</span>
              <span class="cval" :class="{ hi: crit.rate >= 100, zero: !pot.length }">
                {{ pot.length ? crit.rate + '%' : '—' }}
              </span>
              <span class="critbar"><i :class="{ hi: crit.rate >= 100 }" :style="{ width: crit.rate + '%' }"></i></span>
              <button class="btn tiny" @click="showCritDetail = !showCritDetail">明细</button>
            </div>
            <div v-if="showCritDetail" class="critdetail">
              <template v-if="crit.parts.length">
                <div v-for="(p, i) in crit.parts" :key="i">
                  · {{ p.k }} → <code>{{ p.v }}%</code>{{ p.replace ? '（覆盖前值）' : '' }}
                </div>
              </template>
              <div v-else>放入材料后显示暴击率构成</div>
            </div>
          </div>
        </section>

        <!-- 结果卡 -->
        <section class="card lab-col result-col ornate">
          <h3>料理结果 <span class="col-sub">实时演算</span></h3>

          <div v-if="result.path === 'empty'" class="result-empty">
            <div class="re-icon">🍲</div>
            <p>从左侧选择材料下锅，这里实时给出料理结果</p>
          </div>

          <template v-else>
            <!-- 左右两栏：左「大图 + 名称」，右「四项数据竖排」 -->
            <div class="result-body">
              <div class="res-left">
                <div class="res-art">
                  <span class="art-halo" aria-hidden="true"></span>
                  <img v-if="shown.icon" :src="'/icons/' + shown.icon" :alt="shown.zh" class="result-icon" />
                  <div v-else class="result-icon ph">{{ (shown.zh || '?')[0] }}</div>
                </div>
                <div class="rname">{{ shown.zh || '…' }}</div>
                <div class="rbadges">
                  <span class="pbadge" :class="result.path">{{ pathLabel(result) }}</span>
                  <span v-if="guaranteedCrit" class="pbadge gold">★ 必定大成功</span>
                </div>
              </div>

              <div class="res-stats">
                <div class="stat-row">
                  <span class="sk">生命恢复</span>
                  <span class="sv" :class="{ zero: !shown.hp }">{{ shown.hp ? (shown.hp / 2) + ' ♥' : '—' }}</span>
                </div>
                <div class="stat-row">
                  <span class="sk">效果强度</span>
                  <span class="sv" :class="{ bad: shown.conflict, zero: !shown.eff && !shown.conflict }">
                    <template v-if="shown.conflict">✕ 抵消</template>
                    <template v-else-if="shown.eff">{{ shown.eff }}<template v-if="shown.effLv"> Lv{{ shown.effLv }}</template></template>
                    <template v-else>—</template>
                  </span>
                </div>
                <div class="stat-row">
                  <span class="sk">持续时间</span>
                  <span class="sv" :class="{ zero: !shown.effMin }">{{ shown.effMin ? fmtMin(shown.effMin) : '—' }}</span>
                </div>
                <div class="stat-row">
                  <span class="sk">卖出价</span>
                  <span class="sv rupee" :class="{ zero: result.price == null }">
                    <template v-if="result.price != null">{{ result.price }}<em>◆</em></template>
                    <template v-else>—</template>
                  </span>
                </div>
              </div>
            </div>

            <div v-if="shown.conflict" class="warnbox">
              加入的效果材料种类不同，加成会互相抵消，只保留回血。
            </div>

            <div v-if="result.path === 'elixir'" class="note">昆虫 + 怪物素材 → 药剂，效果取自昆虫，怪物素材延长持续时间。</div>
            <div v-else-if="result.path === 'generic'" class="note">未命中固定配方，按材料组合推导出常见做法。</div>
            <div v-else-if="result.path === 'fail'" class="note">这些材料煮不出任何可食用的料理。</div>

            <div class="result-ops">
              <RouterLink v-if="shown.actor" :to="'/items/' + shown.actor" class="btn">图鉴详情</RouterLink>
              <RouterLink v-if="shown.zh" :to="{ path: '/cooking', query: { q: shown.zh } }" class="btn">料理页配方</RouterLink>
              <button class="btn primary" :disabled="!pot.length" @click="showSaveBar = !showSaveBar">
                ★ 保存配方
              </button>
            </div>

            <div v-if="showSaveBar" class="savebar">
              <input v-model="saveName" placeholder="给配方起个名字，如：攻击力Lv3 30分钟"
                @keyup.enter="saveRecipe" />
              <button class="btn primary" @click="saveRecipe">保存</button>
              <button class="btn" @click="showSaveBar = false">取消</button>
            </div>
          </template>
        </section>
      </div>
    </div>

    <!-- ============ 我的配方 ============ -->
    <section v-show="mode === 'saved'" class="card lab-col">
      <h3>我的配方 <span class="col-sub">保存在本机浏览器 · 可一键载入</span></h3>
      <div v-if="recipes.length" class="saved-grid">
        <div v-for="(r, i) in recipes" :key="i" class="saved-card">
          <div class="sc-top">
            <img v-if="recipeResult(r).icon" :src="'/icons/' + recipeResult(r).icon" :alt="r.name" />
            <div v-else class="sc-ph">{{ (recipeResult(r).zh || '?')[0] }}</div>
            <div class="sc-name" :title="r.name">{{ r.name }}</div>
          </div>
          <div class="sc-ings">
            <span v-for="p in r.pot" :key="p.id" class="ingmini">
              <img v-if="matOf(p.id).icon" :src="'/icons/' + matOf(p.id).icon" :alt="matOf(p.id).zh" />
              {{ matOf(p.id).zh }}<template v-if="p.n > 1"> ×{{ p.n }}</template>
            </span>
          </div>
          <div class="sc-res">
            产物：{{ recipeResult(r).zh || '—' }}<template v-if="recipeResult(r).eff"> · {{ recipeResult(r).eff }}</template>
          </div>
          <div class="sc-ops">
            <button class="btn teal" @click="loadRecipe(r)">载入</button>
            <button class="btn" @click="delRecipe(i)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="empty-tip" style="padding: 40px 0;">
        还没有保存的配方 —— 在「自由搭配」里配好材料后点「★ 保存这个配方」
      </p>
    </section>

    <p class="lab-foot">
      暴击机制依据《王国之泪》：基础 5% × 材料种类数，材料加成只取最高一项
      （龙素材 / 星星碎片 / 金苹果 / 吉波得的肝脏 100%，蔗糖 30%，禽蛋·山羊黄油·鼓隆调味粉·哈特诺起司·油壶 10%），
      血月夜必定暴击；龙素材另将效果时长拉满 30 分钟。
    </p>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cook } from '../lib/cookingEngine.js'
import { critRate } from '../lib/critRate.js'
import { loadCookingLab } from '../data.js'

const route = useRoute()
const router = useRouter()

const lab = ref(null)
const pot = ref(
  [...(route.query.m ? String(route.query.m).split(',') : [])].filter(Boolean).slice(0, 5)
    .reduce((acc, id) => {
      const hit = acc.find((x) => x.id === id)
      if (hit) hit.n++
      else acc.push({ id, n: 1 })
      return acc
    }, [])
)
const q = ref('')
const cat = ref('Cook')
const mode = ref('mix')
const bloodMoon = ref(false)
const showCritDetail = ref(false)
const showSaveBar = ref(false)
const saveName = ref('')
const undoStack = ref([])

// 我的配方（localStorage；旧版收藏键 cooklab-favs 自动迁移为「未命名配方」）
const RECIPE_KEY = 'cooklab-recipes'
function loadRecipes() {
  try {
    const cur = JSON.parse(localStorage.getItem(RECIPE_KEY) || '[]')
    if (cur.length) return cur
    const old = JSON.parse(localStorage.getItem('cooklab-favs') || '[]')
    if (old.length) {
      return old.map((f, i) => ({
        name: f.zh ? f.zh + '（旧收藏）' : '旧收藏 ' + (i + 1),
        pot: f.ids.reduce((acc, id) => {
          const hit = acc.find((x) => x.id === id)
          if (hit) hit.n++; else acc.push({ id, n: 1 })
          return acc
        }, []),
      }))
    }
  } catch (e) { /* ignore */ }
  return []
}
const recipes = ref(loadRecipes())

loadCookingLab().then((d) => (lab.value = d))

/* ---------- 分类 ---------- */
const CATS = [
  { key: 'CookMeat', label: '肉类' },
  { key: 'CookFish', label: '鱼蟹' },
  { key: 'CookFruit', label: '水果' },
  { key: 'CookMushroom', label: '蘑菇' },
  { key: 'CookPlant', label: '野菜' },
  { key: 'CookOre', label: '矿物' },
  { key: 'CookInsect', label: '昆虫' },
  { key: 'CookEnemy', label: '怪物素材' },
  { key: 'CookSpice', label: '香料' },
  { key: 'other', label: '其他' },
]
const EXCLUDE = new Set(['CookResult', 'CookFailure'])
const OTHER_TAGS = new Set(['CookForeign', 'CookGolem', 'CookEMedicine', 'CookOther', 'CookLowPrice', 'CookValue1'])

function mainTag(m) {
  const ts = (m.tags || []).filter((t) => t !== 'Cook')
  for (const t of ts) if (CATS.some((c) => c.key === t)) return t
  for (const t of ts) if (OTHER_TAGS.has(t)) return 'other'
  return 'other'
}

// 最近使用
const recents = ref([])
const catTabs = computed(() => [
  { key: 'Cook', label: '全部' },
  ...(recents.value.length ? [{ key: 'recent', label: '常用' }] : []),
  ...CATS,
])

const allMats = computed(() => {
  if (!lab.value) return []
  return Object.entries(lab.value.materials)
    .map(([id, m]) => ({ id, ...m, _cat: mainTag(m) }))
    .filter((m) => !EXCLUDE.has(m._cat) && !(m.tags || []).some((t) => EXCLUDE.has(t)))
    .filter((m) => m.icon)   // 只展示有图标的（内部 actor 无中文名也无图标）
})
const shelfTotal = computed(() => allMats.value.length)

const shelf = computed(() => {
  const kw = q.value.trim().toLowerCase()
  let list = allMats.value
  if (cat.value === 'recent') {
    list = recents.value.map((id) => allMats.value.find((m) => m.id === id)).filter(Boolean)
  } else if (cat.value !== 'Cook') {
    list = list.filter((m) => m._cat === cat.value)
  }
  if (kw) list = list.filter((m) => (m.zh && m.zh.toLowerCase().includes(kw)) || m.id.toLowerCase().includes(kw))
  return list.slice().sort((a, b) => (a.zh || a.id).localeCompare(b.zh || b.id, 'zh'))
})

/* ---------- 锅内操作 ---------- */
const totalN = computed(() => pot.value.reduce((s, x) => s + x.n, 0))
const full = computed(() => totalN.value >= 5)
const nOf = (id) => { const h = pot.value.find((x) => x.id === id); return h ? h.n : 0 }
const matOf = (id) => (lab.value && lab.value.materials[id]) || { zh: id, icon: null }

function snapshot() {
  undoStack.value.push(JSON.stringify(pot.value))
  if (undoStack.value.length > 50) undoStack.value.shift()
}
function add(id) {
  if (full.value) return
  snapshot()
  const h = pot.value.find((x) => x.id === id)
  if (h) h.n++
  else pot.value.push({ id, n: 1 })
  recents.value = [id, ...recents.value.filter((x) => x !== id)].slice(0, 12)
}
function dec(id) {
  const h = pot.value.find((x) => x.id === id)
  if (!h) return
  snapshot()
  h.n--
  if (h.n <= 0) pot.value = pot.value.filter((x) => x.id !== id)
}
function del(id) {
  snapshot()
  pot.value = pot.value.filter((x) => x.id !== id)
}
function undo() {
  if (!undoStack.value.length) return
  pot.value = JSON.parse(undoStack.value.pop())
}
function clearPot() {
  snapshot()
  pot.value = []
}

/* ---------- 判定 ---------- */
const potIds = computed(() => {
  const ids = []
  pot.value.forEach((x) => { for (let i = 0; i < x.n; i++) ids.push(x.id) })
  return ids
})

const result = computed(() =>
  lab.value && potIds.value.length
    ? cook(potIds.value, lab.value)
    : { path: 'empty' }
)

const crit = computed(() =>
  lab.value ? critRate(potIds.value, lab.value, bloodMoon.value) : { rate: 0, parts: [] }
)

// 展示用结果（引擎判定；暴击只展示「概率」与「必定」信息，不做随机模拟）
const shown = computed(() => (result.value.path === 'empty' ? {} : result.value))
// 必定大成功：配方含龙素材 / 星星碎片 / 金苹果 / 吉波得的肝脏（引擎 crit 字段或暴击率 100%）
const guaranteedCrit = computed(
  () => result.value.crit === 'guaranteed' || crit.value.rate >= 100
)

const PATH_LABEL = { fixed: '固定配方', elixir: '药剂', generic: '组合推导', fail: '失败料理', empty: '' }
function pathLabel(r) { return PATH_LABEL[r.path] || r.path }

function fmtMin(sec) {
  if (sec >= 3600) return Math.floor(sec / 60) + ' 分钟'
  const m = Math.floor(sec / 60), s = sec % 60
  return m + ':' + String(s).padStart(2, '0')
}

/* ---------- 暴击材料标记 ---------- */
const critIds = computed(() => {
  if (!lab.value) return new Set()
  const s = new Set([...(lab.value.special?.critGuaranteed || []), ...(lab.value.special?.dragonParts || [])])
  ;['Item_Enemy_121', 'Item_Material_01'].forEach((x) => s.add(x))
  return s
})
const isCrit = (id) => critIds.value.has(id)

/* ---------- 配方保存 ---------- */
function flushRecipes() {
  localStorage.setItem(RECIPE_KEY, JSON.stringify(recipes.value))
}
function saveRecipe() {
  const name = saveName.value.trim() || (result.value.zh || '未命名配方')
  recipes.value.push({ name, pot: JSON.parse(JSON.stringify(pot.value)), ts: Date.now() })
  flushRecipes()
  saveName.value = ''
  showSaveBar.value = false
}
function delRecipe(i) {
  recipes.value.splice(i, 1)
  flushRecipes()
}
function loadRecipe(r) {
  snapshot()
  pot.value = JSON.parse(JSON.stringify(r.pot))
  mode.value = 'mix'
}
function recipeResult(r) {
  if (!lab.value) return {}
  const ids = []
  r.pot.forEach((x) => { for (let i = 0; i < x.n; i++) ids.push(x.id) })
  if (!ids.length) return {}
  return cook(ids, lab.value)
}

// 锅内材料写入 URL（刷新 / 分享不丢）
watch(pot, (v) => {
  const ids = []
  v.forEach((x) => { for (let i = 0; i < x.n; i++) ids.push(x.id) })
  router.replace({ query: { ...route.query, m: ids.length ? ids.join(',') : undefined } })
}, { deep: true })

/* ---------- 左右两栏等高（材料库卡片与右侧工作台+结果卡上下沿对齐） ---------- */
const benchRef = ref(null)
const gridRef = ref(null)
let ro = null

function syncShelfHeight() {
  const bench = benchRef.value
  const grid = gridRef.value
  if (!bench || !grid) return
  // 窄屏单列布局不限制高度
  if (window.innerWidth <= 900) { grid.style.height = ''; return }
  const card = grid.closest('.shelf-col')
  if (!card) return

  // 右栏「内容底」——取最后一块的实际底边，不取 bench 盒高
  // （盒子可能被 grid 的 align-items 拉伸成虚高，导致测量反馈循环）
  const kids = [...bench.children].filter((k) => k.getBoundingClientRect().height > 0)
  if (!kids.length) return
  const benchTop = bench.getBoundingClientRect().top
  const contentH =
    Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) - benchTop
  if (contentH <= 0) return

  // 材料网格之外的固定高度（标题/搜索/分类 + 上下内边距）
  // 用「网格顶 − 卡片顶」+ 卡片下内边距 —— 与网格自身当前高度无关，不会自我干扰
  const cardRect = card.getBoundingClientRect()
  const gridTop = grid.getBoundingClientRect().top
  const cs = getComputedStyle(card)
  const padB = parseFloat(cs.paddingBottom) || 0
  const borB = parseFloat(cs.borderBottomWidth) || 0
  const chrome = (gridTop - cardRect.top) + padB + borB

  // 用固定 height 而不是 max-height：材料被筛选得少时也能把卡片撑到与右栏齐平
  // （max-height 只会限制上限，内容少时卡片会缩回去）
  grid.style.height = Math.max(240, Math.round(contentH - chrome)) + 'px'
}

onMounted(async () => {
  await nextTick()
  syncShelfHeight()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => syncShelfHeight())
    if (benchRef.value) ro.observe(benchRef.value)
  }
  window.addEventListener('resize', syncShelfHeight)
})
onUnmounted(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', syncShelfHeight)
})
</script>

<style scoped>
.lab-sub { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0 0 14px; }
.col-sub { font-size: 11.5px; color: var(--faint); font-weight: 400; letter-spacing: 0; }

/* 页头符文装饰线 */
.head-orn { display: flex; align-items: center; gap: 9px; max-width: 360px; margin: 2px 0 10px; }
.head-orn i { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .55; }
.head-orn b { color: var(--gold); font-size: 10px; font-weight: 400; opacity: .75; }

/* 四角符文装饰（游戏面板感，替代纯直角） */
.ornate { position: relative; overflow: hidden; }
.ornate::before,
.ornate::after {
  content: ""; position: absolute; width: 17px; height: 17px;
  border: 1.5px solid var(--gold); opacity: .38; pointer-events: none;
}
.ornate::before { top: 7px; left: 7px; border-right: 0; border-bottom: 0; border-top-left-radius: 9px; }
.ornate::after { bottom: 7px; right: 7px; border-left: 0; border-top: 0; border-bottom-right-radius: 9px; }

.mode-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.modes { display: flex; gap: 6px; }
.modes button {
  border: 1px solid var(--line2); background: var(--card); color: var(--muted);
  border-radius: 999px; padding: 6px 18px; font-size: 13px; cursor: pointer;
  transition: border-color .15s, color .15s, background .15s;
}
.modes button.on { background: var(--gold-bg); border-color: var(--gold); color: var(--gold); font-weight: 600; }
.bloodmoon {
  margin-left: auto; display: flex; align-items: center; gap: 7px;
  border: 1px solid var(--line2); background: var(--card); color: var(--muted);
  border-radius: 999px; padding: 6px 15px; font-size: 12.5px; cursor: pointer;
  transition: all .2s;
}
.bloodmoon.on { border-color: var(--red); background: var(--red-bg); color: var(--red); }

.lab-grid { display: grid; grid-template-columns: 380px minmax(0, 1fr); gap: 14px; align-items: start; }
.lab-col { padding: 14px 16px; }
.lab-col h3 { font-size: 13.5px; font-weight: 600; margin: 0 0 10px; color: var(--gold); letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }

/* 材料库列：与右栏等高（高度由脚本按右栏实测注入，两栏上下沿对齐） */
.shelf-col { display: flex; flex-direction: column; min-height: 0; }
.shelf-col .mat-grid { flex: 1 1 auto; min-height: 0; }

/* 基本搭配样式已移除（2026-10-12 老大：太影响排版） */

/* 材料库 */
.cat-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.cat-tabs button {
  border: 1px solid var(--line2); background: var(--card); border-radius: 999px;
  padding: 3px 11px; font-size: 11.5px; color: var(--muted); cursor: pointer;
  transition: all .15s;
}
.cat-tabs button.on { border-color: var(--gold); color: var(--gold); background: var(--gold-bg); font-weight: 600; }

.mat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 8px; overflow-y: auto; overflow-x: hidden; padding: 4px 2px 2px 0; min-height: 0; }
.mat-cell {
  position: relative; border: 1px solid var(--line); border-radius: 13px; background: var(--card);
  padding: 8px 4px 6px; text-align: center; cursor: pointer;
  transition: border-color .15s, transform .15s, box-shadow .15s, background .15s;
}
.mat-cell:hover { border-color: var(--teal); transform: translateY(-2px); box-shadow: 0 7px 16px rgba(46, 50, 54, .12); }
.mat-cell.inpot {
  border-color: var(--gold);
  background: linear-gradient(180deg, var(--gold-bg), rgba(154, 123, 28, .03));
  box-shadow: inset 0 0 0 1px rgba(154, 123, 28, .3);
}
.mat-cell.dim { opacity: .35; cursor: not-allowed; }
.mat-cell.dim:hover { transform: none; border-color: var(--line); box-shadow: none; }
.mat-cell img { width: 40px; height: 40px; object-fit: contain; display: block; margin: 0 auto; }
.mat-cell .mat-ph {
  width: 40px; height: 40px; margin: 0 auto; display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border-radius: 8px; color: var(--faint);
}
.mat-cell .mn { font-size: 11.5px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mat-cell .me { font-size: 10px; color: var(--teal); height: 14px; overflow: hidden; }
.mat-cell .cnt {
  position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 999px;
  background: var(--gold); color: #fff; font-size: 11.5px; font-weight: 700; line-height: 20px; padding: 0 5px;
}
.mat-cell .crit-flag {
  position: absolute; top: -5px; left: -5px; font-size: 8.5px; letter-spacing: .3px;
  color: var(--red); background: var(--red-bg); border: 1px solid rgba(180, 73, 58, .3);
  border-radius: 999px; padding: 0 5px; line-height: 15px;
}

/* 工作台：圆形材料槽（回归"锅"的意象，破直角） */
.bench { display: flex; flex-direction: column; gap: 14px; }
.slots {
  display: flex; justify-content: space-between; gap: 10px;
  padding: 14px 18px 16px; border-radius: 999px;
  border: 1px dashed rgba(154, 123, 28, .22);
  background:
    radial-gradient(120% 160% at 50% 120%, rgba(154, 123, 28, .09), transparent 68%),
    linear-gradient(180deg, rgba(154, 123, 28, .04), transparent 60%);
}
.slot {
  position: relative; width: 92px; height: 92px; border-radius: 50%;
  border: 1.5px dashed var(--line2); background: var(--card2);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  transition: border-color .2s, background .2s, box-shadow .2s, transform .2s;
}
.slot::after {
  /* 空槽中央菱形符文 */
  content: ""; position: absolute; width: 10px; height: 10px;
  border: 1.5px solid var(--line2); transform: rotate(45deg); opacity: .5;
}
.slot.filled {
  border: 1.5px solid var(--gold); background: var(--card);
  box-shadow: inset 0 0 0 4px rgba(154, 123, 28, .07), 0 6px 16px rgba(46, 50, 54, .12);
}
.slot.filled::after { display: none; }
.slot.filled:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 4px rgba(154, 123, 28, .12), 0 10px 22px rgba(46, 50, 54, .16); }
.slot img { width: 58px; height: 58px; object-fit: contain; cursor: pointer; }
.slot .slot-ph {
  width: 58px; height: 58px; display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border-radius: 999px; color: var(--faint); font-size: 20px; cursor: pointer;
}
.slot .sn {
  font-size: 10.5px; font-weight: 600; max-width: 80px; text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.slot .mul {
  position: absolute; right: -3px; bottom: -3px; min-width: 24px; height: 24px; border-radius: 999px;
  background: var(--gold); color: #fff; font-size: 11.5px; font-weight: 700; line-height: 24px;
  text-align: center; padding: 0 5px; box-shadow: 0 2px 7px rgba(154, 123, 28, .4);
}
.slot .slot-del {
  position: absolute; top: -4px; right: -4px; width: 21px; height: 21px; border-radius: 999px;
  border: 1px solid var(--line2); background: var(--card); color: var(--faint);
  font-size: 13px; line-height: 1; cursor: pointer; padding: 0;
  transition: all .15s; opacity: 0;
}
.slot.filled:hover .slot-del { opacity: 1; }
.slot .slot-del:hover { border-color: var(--red); background: var(--red-bg); color: var(--red); }
.slot .slot-empty { font-size: 10.5px; color: var(--faint); position: absolute; bottom: 14px; }

.ops { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.btn {
  border: 1px solid var(--line2); background: var(--card); color: var(--muted); border-radius: 999px;
  padding: 6px 16px; font-size: 12.5px; cursor: pointer; transition: all .15s;
}
.btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
.btn:disabled { opacity: .4; cursor: default; }
.btn.tiny { padding: 4px 11px; font-size: 11.5px; }
.btn.primary { border-color: var(--gold); background: var(--gold-bg); color: var(--gold); font-weight: 600; }
.btn.primary:hover:not(:disabled) { background: var(--gold); color: #fff; }
.btn.teal { border-color: var(--teal); background: var(--teal-bg); color: var(--teal); }
.btn.teal:hover:not(:disabled) { background: var(--teal); color: #fff; }
.count { font-size: 12.5px; color: var(--muted); margin-left: auto; font-variant-numeric: tabular-nums; }
.count b { color: var(--gold); }

/* 暴击框 */
.critbox {
  margin-top: 14px; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px;
  background: linear-gradient(180deg, rgba(154,123,28,.06), rgba(154,123,28,.02));
}
.crow { display: flex; align-items: center; gap: 10px; }
.clabel { font-size: 12.5px; color: var(--muted); }
.cval { font-size: 22px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; line-height: 1; }
.cval.hi { color: var(--red); }
.cval.zero { color: var(--faint); font-weight: 500; font-size: 17px; }
.critbar { flex: 1; height: 8px; border-radius: 999px; background: var(--bg2); overflow: hidden; min-width: 70px; }
.critbar i { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), #c9a227); border-radius: 999px; transition: width .35s; }
.critbar i.hi { background: linear-gradient(90deg, #c0503f, #e0664f); }
.critdetail { font-size: 11.5px; color: var(--muted); margin-top: 8px; line-height: 1.7; }
.critdetail code { background: var(--bg2); border-radius: 4px; padding: 1px 5px; font-size: 11px; }

/* 结果卡：左「大图 + 名称」/ 右「数据竖排」 */
.result-col h3 { margin-bottom: 12px; }
.result-empty { text-align: center; padding: 24px 0 16px; }
.result-empty .re-icon { font-size: 30px; opacity: .5; }
.result-empty p { color: var(--faint); font-size: 13px; margin: 8px 0 0; }

.result-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: center; }
.res-left { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }

/* 产物大图：更大 + 光环 + 环形符文 */
.res-art { position: relative; width: 178px; height: 178px; flex: none; display: flex; align-items: center; justify-content: center; }
.art-halo {
  position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle, rgba(154, 123, 28, .18) 0%, rgba(14, 138, 125, .1) 55%, transparent 72%);
}
.art-halo::after {
  content: ""; position: absolute; inset: 13px; border-radius: 50%;
  border: 1px dashed rgba(154, 123, 28, .4);
}
.result-icon { position: relative; z-index: 1; width: 130px; height: 130px; object-fit: contain; }
.result-icon.ph {
  display: flex; align-items: center; justify-content: center; color: var(--faint); font-size: 40px;
  background: var(--card2); border-radius: 50%; border: 1px solid var(--line);
}
.rname {
  font-size: 19px; font-weight: 800; line-height: 1.3;
  display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;
}
.rbadges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.pbadge { display: inline-block; font-size: 11px; border-radius: 999px; padding: 2px 10px; background: var(--bg2); color: var(--muted); }
.pbadge.fixed { background: var(--teal-bg); color: var(--teal); }
.pbadge.elixir { background: var(--blue-bg); color: var(--blue); }
.pbadge.fail { background: var(--red-bg); color: var(--red); }
.pbadge.gold {
  background: linear-gradient(135deg, #edb84a, #c07c1c); color: #fff;
  box-shadow: 0 2px 8px rgba(192, 124, 28, .35);
}

/* 右侧：四项数据竖排 */
.res-stats { display: flex; flex-direction: column; gap: 8px; }
.stat-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 9px 13px; border-radius: 11px;
  border: 1px solid var(--line);
  background: linear-gradient(90deg, rgba(154, 123, 28, .045), rgba(154, 123, 28, .01));
}
.sk { font-size: 12.5px; color: var(--muted); flex: none; }
.sv { font-size: 18px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; text-align: right; }
.sv em { font-style: normal; font-size: 11px; margin-left: 2px; opacity: .75; }
.sv.zero { color: var(--faint); font-weight: 500; }
.sv.bad { color: var(--red); font-size: 14px; }
.sv.rupee { color: var(--teal); }
.sv.rupee em { color: var(--teal); }

.warnbox { background: var(--red-bg); color: var(--red); border-radius: 10px; padding: 8px 13px; font-size: 12.5px; margin-top: 12px; }
.note { border-top: 1px dashed var(--line); padding-top: 10px; margin-top: 12px; font-size: 12px; color: var(--muted); line-height: 1.65; }
/* 深链与保存同款按钮（RouterLink 渲染为 a，需补齐按钮观感） */
a.btn {
  display: inline-flex; align-items: center; justify-content: center;
  text-decoration: none; line-height: 1.4;
}
a.btn:hover { text-decoration: none; }
.result-ops { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.savebar { display: flex; gap: 8px; margin-top: 10px; }
.savebar input { flex: 1; border: 1px solid var(--line2); border-radius: 10px; padding: 8px 12px; background: var(--bg2); color: var(--text); outline: none; font: inherit; min-width: 0; }
.savebar input:focus { border-color: var(--gold); }

/* 我的配方 */
.saved-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.saved-card { border: 1px solid var(--line); border-radius: 12px; background: var(--card); padding: 13px 14px; display: flex; flex-direction: column; gap: 9px; }
.sc-top { display: flex; align-items: center; gap: 9px; }
.sc-top img { width: 34px; height: 34px; object-fit: contain; }
.sc-ph { width: 34px; height: 34px; border-radius: 9px; background: var(--bg2); display: flex; align-items: center; justify-content: center; color: var(--faint); }
.sc-name { font-size: 13.5px; font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-ings { display: flex; gap: 5px; flex-wrap: wrap; }
.ingmini { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--muted); background: var(--bg2); border-radius: 7px; padding: 2px 7px 2px 3px; }
.ingmini img { width: 18px; height: 18px; object-fit: contain; }
.sc-res { font-size: 11.5px; color: var(--muted); }
.sc-ops { display: flex; gap: 7px; margin-top: auto; }
.sc-ops .btn { padding: 4px 13px; font-size: 12px; }
.lab-foot { margin: 22px 0 6px; font-size: 11.5px; color: var(--faint); line-height: 1.8; }
.empty-tip { color: var(--faint); font-size: 12.5px; text-align: center; margin: 12px 0; }

@media (max-width: 900px) {
  .lab-grid { grid-template-columns: 1fr; align-items: start; }
  .mat-grid { max-height: 320px; }
  .slots { flex-wrap: wrap; justify-content: center; gap: 12px; }
  .rname { font-size: 18px; }
  .bloodmoon { margin-left: 0; width: 100%; justify-content: center; }
}
@media (max-width: 720px) {
  .slot { width: 72px; height: 72px; }
  .slot img { width: 46px; height: 46px; }
  .slot .slot-ph { width: 46px; height: 46px; font-size: 17px; }
  .slot .mul { min-width: 21px; height: 21px; line-height: 21px; font-size: 10.5px; }
  .slots { padding: 12px 12px 14px; }
  /* 结果卡：小屏改上下堆叠，数据仍竖排 */
  .result-body { grid-template-columns: 1fr; gap: 14px; }
  .res-art { width: 148px; height: 148px; }
  .result-icon { width: 108px; height: 108px; }
  .rname { font-size: 17px; }
  .sv { font-size: 16px; }
  .result-ops .btn { flex: 1; }
}
</style>
