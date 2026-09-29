<template>
  <main v-if="item" class="container" style="padding-top: 24px; max-width: 760px;">
    <!-- header -->
    <div class="card head">
      <img v-if="item.icon" :src="'/icons/' + item.icon" class="big-icon" :alt="item.zh" />
      <div v-else class="big-icon ph">{{ (item.zh || item.id)[0] }}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
          <h1 style="font-size: 22px; font-weight: 500; margin: 0;">{{ item.zh || item.id }}</h1>
          <span v-if="item.en" style="color: var(--muted); font-size: 13px;">{{ item.en }}</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
          <span class="chip">{{ item.g }}</span>
          <span v-if="item.num" class="chip amber">图鉴 #{{ item.num }}</span>
          <span class="chip plain mono">{{ item.id }}</span>
        </div>
      </div>
    </div>

    <!-- stats -->
    <div v-if="stats.length" class="stat-grid">
      <div v-for="s in stats" :key="s.k" class="stat">
        <div class="k">{{ s.k }}</div>
        <div class="v" :class="s.cls">{{ s.v }}</div>
      </div>
    </div>

    <!-- description -->
    <div v-if="item.desc" class="card sec">
      <div class="sec-title">游戏内描述</div>
      <p class="desc">{{ item.desc }}</p>
    </div>

    <!-- effect -->
    <div v-if="item.eff" class="card sec">
      <div class="sec-title">料理 / 药用效果</div>
      <p class="desc">
        <span class="chip blue">{{ item.eff }}</span>
        <span v-if="item.effLv" style="margin-left: 8px;">等级 {{ item.effLv }}</span>
        <span v-if="minText" style="margin-left: 8px;">· 时长 {{ minText }}</span>
      </p>
    </div>

    <!-- armor enhancement -->
    <div v-if="isArmor && enhRows.length" class="card sec">
      <div class="sec-title">强化（当前 ★{{ item.rank }} → ★{{ item.rank + 1 }}）</div>
      <div v-for="(row, ri) in enhRows" :key="ri" class="line-row">
        <span>{{ row.items_zh.map((m) => `${m.zh || m.id} ×${m.num}`).join('、') }}</span>
        <span class="sub">费用 {{ row.price }} 卢比</span>
      </div>
    </div>
    <div v-else-if="isArmor && !enhRows.length" class="card sec">
      <div class="sec-title">强化</div>
      <p class="desc" style="color: var(--faint);">无法强化或已满级</p>
    </div>

    <!-- dish recipe -->
    <div v-if="ingRecipes.length" class="card sec">
      <div class="sec-title">配方</div>
      <div v-for="r in ingRecipes" :key="r.__i" class="recipe">
        <div v-for="(s, si) in r.slots" :key="si" class="slot">
          <template v-if="s.type === 'actor'">
            <RouterLink :to="'/items/' + s.id" class="mat">{{ s.zh || s.id }}</RouterLink>
          </template>
          <template v-else>
            <span class="mat tag">{{ s.name }}</span>
            <span class="sub">任意一种：</span>
            <RouterLink
              v-for="m in s.items"
              :key="m.id"
              :to="'/items/' + m.id"
              class="mat mini"
            >{{ m.zh || m.id }}</RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- used in -->
    <div v-if="usedRecipes.length" class="card sec">
      <div class="sec-title">可制成（{{ usedRecipes.length }}）</div>
      <div class="used-grid">
        <RouterLink
          v-for="r in usedRecipes"
          :key="r.__i"
          :to="'/items/' + r.result"
          class="used-cell"
        >
          <img v-if="iconOf(r.result)" :src="iconOf(r.result)" loading="lazy" :alt="r.result_zh" />
          <span>{{ r.result_zh || r.result }}</span>
        </RouterLink>
      </div>
    </div>

    <!-- dropped by -->
    <div v-if="item.drop.length" class="card sec">
      <div class="sec-title">掉落来源（{{ item.drop.length }}）</div>
      <div class="line-row" v-for="(d, di) in item.drop" :key="di">
        <span>{{ d[1] || d[0] }}</span>
        <span class="sub">概率 {{ d[2] }}%</span>
      </div>
    </div>

    <!-- map CTA -->
    <div class="map-cta">
      <a :href="mapUrl" target="_blank" rel="noopener" class="map-btn">
        <span>🗺️ 在互动地图上查看点位</span>
        <span class="map-sub">按物品定位全部刷新位置 · 打开 TOTKmap 互动地图</span>
      </a>
    </div>
  </main>

  <main v-else-if="loaded" class="container" style="padding-top: 48px; text-align: center;">
    <p style="color: var(--faint);">未找到该条目</p>
    <RouterLink to="/items">← 返回图鉴</RouterLink>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadItems, loadRecipes, loadEnhancement, iconUrl, fmtTime } from '../data'
import { mapSearchUrl } from '../mapLink'

const route = useRoute()
const items = ref(null)
const recipes = ref(null)
const enh = ref(null)
const loaded = ref(false)

Promise.all([loadItems(), loadRecipes(), loadEnhancement()]).then(([a, b, c]) => {
  items.value = a
  recipes.value = b
  enh.value = c
  loaded.value = true
})

const item = computed(() =>
  items.value ? items.value.find((x) => x.id === route.params.id) : null
)

const mapUrl = computed(() =>
  item.value ? mapSearchUrl(item.value.id) : '#'
)

const isArmor = computed(() => item.value && item.value.cat === 'Armor')
const minText = computed(() => fmtTime(item.value && item.value.effMin))

const enhRows = computed(() => {
  if (!item.value || !item.value.next || !enh.value) return []
  return enh.value[item.value.next] || []
})

const ingRecipes = computed(() =>
  (item.value && item.value.ing || []).map((i) => ({ ...recipes.value[i], __i: i }))
)
const usedRecipes = computed(() =>
  (item.value && item.value.used || []).map((i) => ({ ...recipes.value[i], __i: i }))
)

const stats = computed(() => {
  const it = item.value
  if (!it) return []
  const out = []
  if (it.perf != null) out.push({ k: it.cat === 'Armor' ? '防御力' : '攻击力', v: it.perf, cls: 'red' })
  if (it.buy != null) out.push({ k: '买入价', v: it.buy + ' 卢比' })
  if (it.sell != null) out.push({ k: '卖出价', v: it.sell + ' 卢比' })
  if (it.hp != null) out.push({ k: '回复', v: it.hp / 4 + ' 心心', cls: 'green' })
  if (it.rank != null) out.push({ k: '强化等级', v: '★' + it.rank })
  if (out.length) return out
  return [{ k: '类型', v: it.g }]
})

function iconOf(id) {
  const it = items.value && items.value.find((x) => x.id === id)
  return it ? iconUrl(it) : null
}
</script>

<style scoped>
.head { display: flex; gap: 18px; padding: 20px; align-items: center; }
.big-icon { width: 84px; height: 84px; object-fit: contain; border-radius: 12px; background: var(--bg); border: 1px solid var(--line); }
.big-icon.ph { display: flex; align-items: center; justify-content: center; font-size: 30px; color: var(--faint); }
.mono { font-family: ui-monospace, Consolas, monospace; font-size: 11.5px; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 14px; }
.stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.stat .k { font-size: 12px; color: var(--muted); }
.stat .v { font-size: 19px; font-weight: 500; margin-top: 2px; }
.stat .v.red { color: var(--red); }
.stat .v.green { color: var(--green); }

.sec { margin-top: 14px; padding: 14px 18px; }
.sec-title { font-size: 12px; color: var(--faint); margin-bottom: 8px; }
.desc { margin: 0; line-height: 1.8; white-space: pre-line; }

.line-row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-bottom: 1px dashed var(--line); }
.line-row:last-child { border-bottom: none; }
.sub { color: var(--faint); font-size: 12.5px; white-space: nowrap; }

.recipe { padding: 6px 0; border-bottom: 1px dashed var(--line); }
.recipe:last-child { border-bottom: none; }
.slot { padding: 3px 0; }
.mat { color: var(--teal); }
.mat.tag { background: var(--blue-bg); color: var(--blue); border-radius: 6px; padding: 1px 8px; }
.mat.mini { color: var(--muted); margin-left: 6px; font-size: 12.5px; }

.used-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.used-cell {
  display: flex; align-items: center; gap: 8px; border: 1px solid var(--line);
  border-radius: 8px; padding: 6px 10px; color: var(--text); font-size: 13px;
}
.used-cell:hover { border-color: var(--teal); text-decoration: none; }
.used-cell img { width: 28px; height: 28px; object-fit: contain; }

.map-cta { margin-top: 18px; text-align: center; }
.map-btn {
  display: block; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--blue-bg); color: var(--blue);
  font-size: 14px; text-decoration: none; transition: border-color .15s;
}
.map-btn:hover { border-color: var(--blue); text-decoration: none; }
.map-btn .map-sub { display: block; margin-top: 3px; font-size: 11.5px; color: var(--muted); }

@media (max-width: 720px) {
  .head { gap: 12px; padding: 14px; }
  .big-icon { width: 64px; height: 64px; }
  .head h1 { font-size: 19px !important; }
  .stat-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
  .stat { padding: 10px 12px; }
  .stat .v { font-size: 17px; }
  .sec { padding: 12px 14px; }
}
</style>
