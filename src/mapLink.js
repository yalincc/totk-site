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
