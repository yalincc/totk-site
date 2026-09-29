let _items = null
let _recipes = null

export function loadItems() {
  if (!_items) _items = fetch('/data/items.json').then((r) => r.json())
  return _items
}

export function loadRecipes() {
  if (!_recipes) _recipes = fetch('/data/recipes.json').then((r) => r.json())
  return _recipes
}

export function loadEnhancement() {
  if (!loadEnhancement._p)
    loadEnhancement._p = fetch('/data/enhancement.json').then((r) => r.json())
  return loadEnhancement._p
}

let _dishes = null
export function loadDishes() {
  if (!_dishes) _dishes = fetch('/data/dishes.json').then((r) => r.json())
  return _dishes
}

let _quests = null
export function loadQuests() {
  if (!_quests) _quests = fetch('/data/quests.json').then((r) => r.json())
  return _quests
}

export function iconUrl(item) {
  return item.icon ? '/icons/' + item.icon : null
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
