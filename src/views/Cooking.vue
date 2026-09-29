<template>
  <main class="container" style="padding-top: 24px;">
    <div class="search-box" style="max-width: 560px;">
      <input v-model="q" placeholder="搜索菜名或材料…" aria-label="搜索料理" />
    </div>

    <div class="tabs">
      <button :class="{ on: !onlyRecipes }" @click="onlyRecipes = false">
        全部 {{ dishes.length }}
      </button>
      <button :class="{ on: onlyRecipes }" @click="onlyRecipes = true">
        含配方详情 {{ withRecipes }}
      </button>
    </div>

    <div v-if="filtered.length" class="item-grid">
      <div
        v-for="(d, i) in filtered"
        :key="d.actor"
        class="item-cell dish-cell"
        :class="{ sel: sel && sel.actor === d.actor }"
        @click="open(i)"
      >
        <span class="num">#{{ d.num }}</span>
        <span v-if="!d.recipes.length" class="norc">自由组合</span>
        <img :src="'/icons/' + d.actor + '.png'" loading="lazy" :alt="d.zh" />
        <div class="nm" :title="d.zh">{{ d.zh }}</div>
      </div>
    </div>
    <p v-else style="color: var(--faint); text-align: center; padding: 48px 0;">
      没有匹配的料理
    </p>

    <Teleport to="body">
      <div v-if="sel" class="modal-mask" @click.self="close">
        <div class="modal dish-detail" role="dialog" aria-modal="true">
          <button class="close" @click="close" aria-label="关闭">×</button>

          <div class="modal-top">
            <button class="arrow" :disabled="idx <= 0" @click="step(-1)" aria-label="上一道">‹</button>
            <span class="pos">{{ idx + 1 }} / {{ filtered.length }}</span>
            <button
              class="arrow"
              :disabled="idx >= filtered.length - 1"
              @click="step(1)"
              aria-label="下一道"
            >›</button>
          </div>

          <div class="dish-head">
            <img :src="'/icons/' + sel.actor + '.png'" :alt="sel.zh" />
            <div>
              <div class="sec-title" style="margin: 0;">
                #{{ sel.num }} {{ sel.zh }}
                <span class="en">{{ sel.name }}</span>
              </div>
              <div class="ings">{{ sel.zh_ings || sel.ingredients }}</div>
              <div v-if="bonusText" class="bonus">{{ bonusText }}</div>
            </div>
          </div>

          <div v-if="sel.recipes.length" class="recipe-list">
            <div v-for="(r, ri) in sel.recipes" :key="ri" class="recipe">
              <div class="recipe-tag" v-if="sel.recipes.length > 1">
                配方 {{ ri + 1 }}<template v-if="r.single">（单一材料）</template>
              </div>
              <div v-for="(s, si) in r.slots" :key="si" class="slot">
                <template v-if="s.type === 'actor'">
                  <RouterLink :to="'/items/' + s.id" class="mat" @click="close">
                    {{ s.zh || s.id }}
                  </RouterLink>
                </template>
                <template v-else>
                  <span class="mat tag">{{ tagZh(s.name) }}</span>
                  <span class="sub">任意一种：</span>
                  <RouterLink
                    v-for="m in s.items"
                    :key="m.id"
                    :to="'/items/' + m.id"
                    class="mat mini"
                    @click="close"
                  >{{ m.zh || m.id }}</RouterLink>
                </template>
              </div>
            </div>
          </div>
          <p v-else class="norecipe">
            图鉴收录条目，romfs 中无固定配方（多为烤制 / 单材料合成类，游戏内自由组合）
          </p>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { loadDishes, fmtTime } from '../data'

const dishes = ref([])
const q = ref('')
const onlyRecipes = ref(false)
const sel = ref(null)

loadDishes().then((d) => (dishes.value = d))

const withRecipes = computed(() => dishes.value.filter((d) => d.recipes.length).length)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return dishes.value.filter((d) => {
    if (onlyRecipes.value && !d.recipes.length) return false
    if (!kw) return true
    return (
      (d.zh && d.zh.toLowerCase().includes(kw)) ||
      (d.name && d.name.toLowerCase().includes(kw)) ||
      (d.zh_ings && d.zh_ings.toLowerCase().includes(kw)) ||
      (d.ingredients && d.ingredients.toLowerCase().includes(kw)) ||
      d.actor.toLowerCase().includes(kw)
    )
  })
})

const idx = computed(() =>
  sel.value ? filtered.value.findIndex((d) => d.actor === sel.value.actor) : -1
)

function open(i) {
  sel.value = filtered.value[i]
}
function close() {
  sel.value = null
}
function step(n) {
  const j = idx.value + n
  if (j >= 0 && j < filtered.value.length) sel.value = filtered.value[j]
}

// the open dish must stay inside the current filter result
watch(filtered, (list) => {
  if (sel.value && !list.some((d) => d.actor === sel.value.actor)) close()
})

function onKey(e) {
  if (!sel.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

watch(sel, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})

const bonusText = computed(() => {
  if (!sel.value || !sel.value.recipes.length) return ''
  const merged = {}
  for (const r of sel.value.recipes) {
    if (r.bonus) for (const [k, v] of Object.entries(r.bonus)) merged[k] = v
  }
  const parts = []
  if (merged.Heart != null) parts.push((merged.Heart > 0 ? '回复' : '附加') + '心心 ' + Math.abs(merged.Heart))
  if (merged.Level != null) parts.push('效果等级 ' + merged.Level)
  if (merged.Time != null) parts.push('持续 ' + fmtTime(merged.Time))
  return parts.join(' · ')
})

const TAG_ZH = {
  CookOre: '矿石', CookInsect: '昆虫', CookEnemy: '魔物资材', CookGolem: '魔像素材',
  CookForeign: '异国素材', CookMeat: '肉', CookFish: '鱼', CookFruit: '水果',
  CookMushroom: '蘑菇', CookPlant: '草类',
}
function tagZh(t) {
  return TAG_ZH[t] || t
}
</script>

<style scoped>
.dish-cell { position: relative; cursor: pointer; }
.dish-cell.sel { border-color: var(--teal); background: var(--teal-bg); }
.dish-cell .num {
  position: absolute; top: 4px; left: 6px;
  font-size: 10.5px; color: var(--faint); font-variant-numeric: tabular-nums;
}
.dish-cell .norc {
  position: absolute; top: 4px; right: 5px;
  font-size: 9.5px; color: var(--faint); background: var(--bg);
  border-radius: 4px; padding: 0 4px;
}

.modal-mask {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(44, 44, 42, 0.34);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.modal {
  position: relative;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  width: 100%; max-width: 560px; max-height: 84vh; overflow-y: auto;
  padding: 18px 20px;
}
.modal .close {
  position: absolute; top: 8px; right: 10px; z-index: 1;
  border: none; background: transparent; color: var(--faint);
  font-size: 22px; line-height: 1; cursor: pointer; padding: 4px 8px;
}
.modal .close:hover { color: var(--text); }
.modal-top {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-bottom: 10px;
}
.modal-top .pos {
  font-size: 12px; color: var(--faint); font-variant-numeric: tabular-nums;
  min-width: 62px; text-align: center;
}
.modal-top .arrow {
  width: 30px; height: 26px; border: 1px solid var(--line); background: var(--bg);
  border-radius: 7px; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1;
}
.modal-top .arrow:hover:not(:disabled) { border-color: var(--teal); color: var(--teal-deep); }
.modal-top .arrow:disabled { opacity: 0.4; cursor: default; }

.dish-head { display: flex; gap: 16px; align-items: flex-start; }
.dish-head img { width: 96px; height: 96px; object-fit: contain; flex: none; }
.dish-head .en { color: var(--faint); font-size: 13px; font-weight: 400; margin-left: 6px; }
.ings { margin-top: 6px; color: var(--muted); font-size: 13.5px; }
.bonus { margin-top: 8px; color: var(--amber); font-size: 13px; font-weight: 600; }
.recipe-list { margin-top: 14px; display: flex; flex-direction: column; gap: 12px; }
.recipe-tag { font-size: 12px; color: var(--teal); font-weight: 600; margin-bottom: 4px; }
.slot { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 3px 0; }
.mat {
  background: var(--teal-bg); color: var(--teal-deep); border-radius: 6px;
  padding: 2px 9px; font-size: 13px; text-decoration: none;
}
.mat:hover { background: var(--teal); color: #fff; }
.mat.tag { background: var(--blue-bg); color: var(--blue); }
.mat.mini { background: var(--bg); border: 1px solid var(--line); color: var(--text); font-size: 12.5px; }
.sub { color: var(--faint); font-size: 12px; }
.norecipe { margin-top: 12px; color: var(--faint); font-size: 13px; }

@media (max-width: 720px) {
  .item-grid { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
  .modal-mask { align-items: flex-end; padding: 0; }
  .modal {
    max-width: none; max-height: 88vh; border-radius: 16px 16px 0 0;
    padding: 16px 16px 22px;
  }
  .dish-head { gap: 12px; }
  .dish-head img { width: 72px; height: 72px; }
}
</style>
