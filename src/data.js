// 数据加载：离线版（file:// 双击 index.html）读注入的 window.__OFFLINE_DATA__；
// 线上/开发走相对路径 fetch（离线注入脚本见 .workbuddy/build_offline.py）
const OFFLINE = typeof window !== 'undefined' && window.__OFFLINE_DATA__

function loadData(key) {
  if (OFFLINE && window.__OFFLINE_DATA__[key]) {
    return Promise.resolve(window.__OFFLINE_DATA__[key])
  }
  return fetch('data/' + key + '.json').then((r) => r.json())
}

let _items = null
let _recipes = null

export function loadItems() {
  if (!_items) _items = loadData('items')
  return _items
}

// list views only show entries with a Chinese name; entries without one are
// internal actors (bundles / dye variants / npc props) kept only for deep links
export function loadItemsVisible() {
  if (!loadItemsVisible._p)
    loadItemsVisible._p = loadItems().then((d) => d.filter((i) => i.zh))
  return loadItemsVisible._p
}

export function loadRecipes() {
  if (!_recipes) _recipes = loadData('recipes')
  return _recipes
}

export function loadEnhancement() {
  if (!loadEnhancement._p) loadEnhancement._p = loadData('enhancement')
  return loadEnhancement._p
}

let _dishes = null
export function loadDishes() {
  if (!_dishes) _dishes = loadData('dishes')
  return _dishes
}

let _quests = null
export function loadQuests() {
  if (!_quests) _quests = loadData('quests')
  return _quests
}

let _armors = null
export function loadArmors() {
  if (!_armors) _armors = loadData('armors')
  return _armors
}

let _cookingLab = null
export function loadCookingLab() {
  if (!_cookingLab) _cookingLab = loadData('cooking_lab')
  return _cookingLab
}

export function iconUrl(item) {
  return item.icon ? 'icons/' + item.icon : null
}

export const GROUP_ORDER = [
  '单手剑', '双手剑', '枪', '弓', '盾', '防具',
  '鱼', '昆虫', '矿石', '水果', '蘑菇', '菜类', '肉', '材料',
  '料理', '左纳乌装置', '关键道具', '箭矢', '卢比', '特殊',
]

export function fmtPrice(n) {
  return n == null ? null : n.toLocaleString('zh-CN')
}

export function fmtTime(sec) {
  if (!sec) return null
  const m = Math.round(sec / 60)
  return m >= 60 ? (m / 60).toFixed(m % 60 ? 1 : 0) + '小时' : m + '分钟'
}
