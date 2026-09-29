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
        v-for="d in filtered"
        :key="d.actor"
        class="item-cell dish-cell"
        :class="{ sel: sel && sel.actor === d.actor }"
        @click="sel = sel && sel.actor === d.actor ? null : d"
      >
        <span class="num">#{{ d.num }}</span>
        <img :src="'/icons/' + d.actor + '.png'" loading="lazy" :alt="d.zh" />
        <div class="nm" :title="d.zh">{{ d.zh }}</div>
      </div>
    </div>
    <p v-else style="color: var(--faint); text-align: center; padding: 48px 0;">
      没有匹配的料理
    </p>

    <!-- 详情卡：选中时展示 -->
    <div v-if="sel" class="card dish-detail">
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
          <div class="recipe-tag" v-if="sel.recipes.length > 1">配方 {{ ri + 1 }}<template v-if="r.single">（单一材料）</template></div>
          <div v-for="(s, si) in r.slots" :key="si" class="slot">
            <template v-if="s.type === 'actor'">
              <RouterLink :to="'/items/' + s.id" class="mat">{{ s.zh || s.id }}</RouterLink>
            </template>
            <template v-else>
              <span class="mat tag">{{ tagZh(s.name) }}</span>
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
      <p v-else class="norecipe">
        图鉴收录条目，romfs 中无固定配方（多为烤制 / 单材料合成类，游戏内自由组合）
      </p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
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
.dish-detail { margin-top: 18px; }
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
</style>
