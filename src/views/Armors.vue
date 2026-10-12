<template>
  <main class="container" style="padding-top: 24px;">
    <h1 class="page-head">
      <span class="ph-icon">◈</span>防具图鉴
      <span class="ph-sub">{{ armors.length }} 件 · 67 套装 · 四星强化阶梯</span>
    </h1>
    <div class="search-box" style="max-width: 560px;">
      <input
        v-model="q"
        placeholder="搜索防具名 / 套装名…"
        aria-label="搜索防具"
      />
    </div>

    <div class="tabs">
      <button :class="{ on: !slot }" @click="slot = null">
        全部 {{ armors.length }}
      </button>
      <button
        v-for="s in slotList"
        :key="s"
        :class="{ on: slot === s }"
        @click="slot = slot === s ? null : s"
      >
        {{ s }} {{ slotCounts[s] }}
      </button>
    </div>

    <p class="result-count">已显示 {{ filtered.length }} / 共 {{ armors.length }}</p>

    <div class="armor-grid">
      <div
        v-for="a in filtered"
        :key="a.id"
        class="card armor-card"
        @click="openById(a.id)"
      >
        <img v-if="a.icon" :src="'/icons/' + a.icon" loading="lazy" :alt="a.zh" />
        <div v-else class="ph">{{ (a.zh || a.id)[0] }}</div>
        <div class="nm" :title="a.zh">{{ a.zh || a.id }}</div>
        <div class="sub">
          <span class="slot-tag">{{ a.slot }}</span>
          <span v-if="a.def != null" class="def-tag">防御 {{ a.def }}</span>
        </div>
      </div>
    </div>

    <p v-if="!filtered.length" style="color: var(--faint); text-align: center; padding: 48px 0;">
      没有匹配的防具
    </p>

    <!-- 详情弹层 -->
    <Teleport to="body">
      <div v-if="sel" class="modal-mask" @click.self="close">
        <div class="modal armor-detail" role="dialog" aria-modal="true">
          <button class="close" @click="close" aria-label="关闭">×</button>

          <div class="detail-head">
            <img v-if="sel.icon" :src="'/icons/' + sel.icon" :alt="sel.zh" class="big-icon" />
            <div v-else class="ph big-icon">{{ (sel.zh || sel.id)[0] }}</div>
            <div class="head-info">
              <h2 class="a-title">{{ sel.zh || sel.id }}</h2>
              <div class="badges">
                <span class="slot-tag">{{ sel.slot }}</span>
                <span v-if="sel.set" class="set-tag">{{ sel.set }}套装</span>
                <span v-if="sel.pos" class="layer-tag">{{ sel.pos.layerCn }}</span>
              </div>
              <div class="stats">
                <span v-if="sel.def != null">防御 <b>{{ sel.def }}</b></span>
                <span v-if="sel.buy != null">购入 <b>{{ sel.buy }}</b> 卢比</span>
                <span v-else-if="sel.sell != null">卖出 <b>{{ sel.sell }}</b> 卢比</span>
              </div>
            </div>
          </div>

          <p v-if="sel.desc" class="desc">{{ sel.desc }}</p>

          <a :href="mapUrl" target="_blank" rel="noopener" class="map-btn">
            在地图上查看
            <span class="map-sub">
              {{ sel.pos ? `坐标 ${sel.pos.x} / ${sel.pos.z}` : 'TOTKmap 关键词定位' }}
            </span>
          </a>

          <!-- 获取方式 -->
          <section v-if="sel.how || sel.note">
            <h3>获取方式</h3>
            <p class="plain">{{ sel.how || '—' }}</p>
            <p v-if="sel.note" class="plain note">{{ sel.note }}</p>
          </section>

          <!-- 强化阶梯 -->
          <section v-if="ladder.length > 1">
            <h3>强化阶梯 <span class="src-tag">来源 TOTKmap</span></h3>
            <table class="ladder">
              <thead>
                <tr><th>阶段</th><th>费用</th><th>材料</th><th>防御</th></tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in ladder" :key="i">
                  <td class="stage">{{ r.stage }}</td>
                  <td>{{ r.cost != null ? r.cost + ' 卢比' : '—' }}</td>
                  <td class="mats">
                    <template v-if="r.mats.length">
                      <template v-for="(m, j) in r.mats" :key="j">
                        <RouterLink
                          v-if="m.itemId"
                          :to="'/items/' + m.itemId"
                          class="mat"
                        >{{ m.zh }}×{{ m.n }}</RouterLink>
                        <span v-else class="mat dim">
                          {{ m.zh || '未知材料' }}×{{ m.n }}
                        </span>
                      </template>
                    </template>
                    <span v-else>—</span>
                  </td>
                  <td class="def-cell">{{ r.def != null ? r.def : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section v-else>
            <h3>强化阶梯</h3>
            <p class="plain">该防具不可强化</p>
          </section>

          <!-- 套装成员 -->
          <section v-if="setMates.length > 1">
            <h3>{{ sel.set }}套装（{{ setMates.length }} 件）</h3>
            <div class="mates">
              <button
                v-for="m in setMates"
                :key="m.id"
                class="mate"
                :class="{ cur: m.id === sel.id }"
                @click="openById(m.id)"
              >
                <img v-if="m.icon" :src="'/icons/' + m.icon" loading="lazy" :alt="m.zh" />
                <span>{{ m.zh || m.id }}</span>
              </button>
            </div>
          </section>

          <!-- 关联任务 -->
          <section v-if="sel.reqTasks && sel.reqTasks.length">
            <h3>关联任务</h3>
            <div class="chain">
              <RouterLink
                v-for="(t, i) in sel.reqTasks"
                :key="i"
                :to="{ path: '/quests', query: { q: t.name || t.key } }"
                class="chain-item link"
              >{{ t.name || t.key }}</RouterLink>
            </div>
          </section>

          <!-- 图鉴详情 -->
          <section>
            <h3>更多数值</h3>
            <RouterLink :to="'/items/' + sel.id" class="chain-item link">
              在图鉴中查看 {{ sel.zh || sel.id }} →
            </RouterLink>
          </section>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadArmors } from '../data'
import { mapKeywordUrl } from '../mapLink'

const route = useRoute()
const router = useRouter()

const armors = ref([])
const q = ref(route.query.q || '')
const slot = ref(route.query.slot || null)
const selIdx = ref(-1)

loadArmors().then((d) => (armors.value = d))

const SLOT_ORDER = ['头部', '上身', '下身']

const slotCounts = computed(() => {
  const c = {}
  for (const a of armors.value) if (a.slot) c[a.slot] = (c[a.slot] || 0) + 1
  return c
})
const slotList = computed(() =>
  Object.keys(slotCounts.value).sort(
    (a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b)
  )
)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return armors.value
    .filter((a) => {
      if (slot.value && a.slot !== slot.value) return false
      if (!kw) return true
      return (
        (a.zh && a.zh.toLowerCase().includes(kw)) ||
        (a.set && a.set.toLowerCase().includes(kw)) ||
        a.id.toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => {
      // 套装相邻：setId 数字升序，同套按部位
      const na = parseInt((a.setId || '').replace(/\D/g, ''), 10) || 9999
      const nb = parseInt((b.setId || '').replace(/\D/g, ''), 10) || 9999
      if (na !== nb) return na - nb
      const sa = SLOT_ORDER.indexOf(a.slot), sb = SLOT_ORDER.indexOf(b.slot)
      return (sa < 0 ? 9 : sa) - (sb < 0 ? 9 : sb)
    })
})

const sel = computed(() =>
  selIdx.value >= 0 ? filtered.value[selIdx.value] || null : null
)

const mapUrl = computed(() => (sel.value ? mapKeywordUrl(sel.value) : '#'))

const setMates = computed(() => {
  if (!sel.value || !sel.value.setId) return [sel.value].filter(Boolean)
  return armors.value.filter((a) => a.setId === sel.value.setId)
})

// 强化阶梯：steps[lv1..lv5]，lvN.stars/mats 是升到 N 星的费用，lvN.def 是 N-1 星后的防御
const ladder = computed(() => {
  const s = sel.value && sel.value.upg && sel.value.upg.steps
  if (!s || !s.length) return []
  const rows = [{ stage: '初始', cost: null, mats: [], def: s[0].def }]
  for (let i = 1; i < s.length; i++) {
    const prev = s[i - 1]
    const mats = prev.mats || []
    if (prev.stars == null && !mats.length) break // 不可强化
    rows.push({
      stage: '★'.repeat(i),
      cost: prev.stars,
      mats,
      def: s[i].def,
    })
  }
  return rows
})

const hasFilter = computed(() => !!(q.value || slot.value))

function openIdx(i) {
  selIdx.value = i >= 0 && i < filtered.value.length ? i : -1
}
function close() {
  selIdx.value = -1
}

// 从套装成员跳转：目标不在当前筛选结果里时，先清空筛选再打开
async function openById(id) {
  let i = filtered.value.findIndex((a) => a.id === id)
  if (i < 0) {
    q.value = ''
    slot.value = null
    i = filtered.value.findIndex((a) => a.id === id)
  }
  if (i >= 0) openIdx(i)
}

watch(filtered, () => {
  if (selIdx.value >= filtered.value.length) selIdx.value = -1
})

watch([q, slot], () => {
  router.replace({
    query: {
      ...route.query,
      q: q.value || undefined,
      slot: slot.value || undefined,
    },
  })
})

function onKey(e) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') { if (selIdx.value > 0) selIdx.value-- }
  else if (e.key === 'ArrowRight') { if (selIdx.value < filtered.value.length - 1) selIdx.value++ }
}

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
.result-count { font-size: 12.5px; color: var(--faint); margin: 12px 0 6px; }

.armor-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 12px; margin-top: 6px;
}
.armor-card {
  padding: 12px 10px; text-align: center; cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.armor-card:hover {
  border-color: var(--gold); transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(46, 50, 54, 0.1);
}
.armor-card img { width: 64px; height: 64px; object-fit: contain; }
.armor-card .ph {
  width: 64px; height: 64px; margin: 0 auto; display: flex;
  align-items: center; justify-content: center;
  background: var(--bg2); border-radius: 10px; color: var(--faint); font-size: 20px;
}
.armor-card .nm {
  margin-top: 8px; font-size: 13px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.armor-card .sub {
  margin-top: 4px; display: flex; gap: 6px; justify-content: center; align-items: center;
}
.slot-tag {
  background: var(--bg2); color: var(--muted); border-radius: 999px;
  padding: 1px 8px; font-size: 11px;
}
.def-tag { color: var(--gold); font-size: 11.5px; font-weight: 600; }

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
.modal .close:hover { color: var(--gold); }
.modal .close {
  position: absolute; top: 12px; right: 14px; border: none; background: none;
  font-size: 24px; line-height: 1; color: var(--faint); cursor: pointer;
}
.modal .close:hover { color: var(--text); }

.detail-head { display: flex; gap: 16px; align-items: flex-start; padding-right: 24px; }
.big-icon { width: 96px; height: 96px; object-fit: contain; flex: none; }
.big-icon.ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--bg2); border: 1px solid var(--line2); border-radius: 12px; color: var(--faint); font-size: 32px;
}
.a-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.set-tag {
  background: var(--teal-bg); color: var(--teal);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.layer-tag {
  background: var(--bg2); color: var(--muted);
  border-radius: 999px; padding: 2px 10px; font-size: 12px;
}
.stats { display: flex; gap: 14px; font-size: 13px; color: var(--muted); flex-wrap: wrap; }
.stats b { color: var(--gold); font-weight: 600; }
.desc { color: var(--muted); font-size: 13.5px; line-height: 1.7; margin: 14px 0; }

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
}
.plain { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.65; }
.plain.note { margin-top: 4px; }

.ladder { width: 100%; border-collapse: collapse; font-size: 13px; }
.ladder th {
  text-align: left; color: var(--faint); font-weight: 500; font-size: 12px;
  padding: 4px 8px; border-bottom: 1px solid var(--line);
}
.ladder td { padding: 6px 8px; border-bottom: 1px dashed var(--line); vertical-align: top; }
.stage { color: var(--amber); white-space: nowrap; }
.def-cell { color: var(--gold); font-weight: 600; }
.mats { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.mat {
  color: var(--teal); text-decoration: none;
  border-bottom: 1px dotted var(--teal);
}
.mat:hover { color: var(--teal); }
.mat.dim { color: var(--faint); border-bottom: none; cursor: default; }

.mates { display: flex; gap: 10px; flex-wrap: wrap; }
.mate {
  border: 1px solid var(--line2); background: var(--card); border-radius: 10px;
  padding: 8px 12px; display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text); cursor: pointer;
}
.mate:hover { border-color: var(--teal); }
.mate.cur { border-color: var(--teal); background: var(--teal-bg); }
.mate img { width: 28px; height: 28px; object-fit: contain; }

.chain { display: flex; gap: 8px; flex-wrap: wrap; }
.chain-item {
  border: 1px solid var(--line2); background: var(--bg2); border-radius: 999px;
  padding: 5px 14px; font-size: 13px; color: var(--teal);
  cursor: pointer; text-decoration: none; display: inline-block;
  transition: border-color 0.15s, background 0.15s;
}
.chain-item.link:hover { border-color: var(--teal); background: var(--teal-bg); }

@media (max-width: 720px) {
  .armor-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
  .armor-card img, .armor-card .ph { width: 52px; height: 52px; }
  .modal-mask { padding: 0; align-items: flex-end; }
  .modal {
    max-width: 100%; border-radius: 16px 16px 0 0; max-height: 88vh; padding: 20px 18px;
  }
  .detail-head { gap: 12px; }
  .big-icon { width: 68px; height: 68px; }
  .a-title { font-size: 16px; }
}
</style>
