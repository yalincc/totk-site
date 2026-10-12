// TOTKmap 互动地图联动（E:\WorkSpace\TOTKmap，部署后改 VITE_MAP_URL 为正式网址）
export const MAP_URL = import.meta.env.VITE_MAP_URL || 'http://localhost:8090'

// 图鉴条目 → 地图深链：TOTKmap 按 actor 名定位材料刷点（entry/actors 匹配）
export function mapSearchUrl(actorId) {
  return `${MAP_URL}/index.html?actor=${encodeURIComponent(actorId)}`
}

// 地图首页（导航入口用）
export function mapHomeUrl() {
  return MAP_URL
}

// 任务 → 地图深链：TOTKmap 目前只支持 ?actor=（材料）与 ?q=（探索搜索），
// 没有 marker/坐标参数，所以任务只能走关键词搜索。优先用任务中文名，
// 搜不到时依次回退到委托人中文名、地点中文名。
export function mapQuestUrl(quest) {
  const kw = quest.zh || quest.npcCn || quest.region || quest.id
  return `${MAP_URL}/index.html?q=${encodeURIComponent(kw)}`
}

// 单个步骤坐标点 → 地图深链（同样是关键词深链，坐标仅作兜底文案展示）
export function mapQuestStepUrl(quest) {
  return mapQuestUrl(quest)
}

// 通用关键词深链（装备等无 ?actor= 深链的板块用）：优先中文名，回退 id
export function mapKeywordUrl(entity) {
  const kw = entity.zh || entity.id
  return `${MAP_URL}/index.html?q=${encodeURIComponent(kw)}`
}
