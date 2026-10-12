import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import Compendium from './views/Compendium.vue'
import ItemDetail from './views/ItemDetail.vue'
import Cooking from './views/Cooking.vue'
import Quests from './views/Quests.vue'
import Armors from './views/Armors.vue'
import CookingLab from './views/CookingLab.vue'
import ComingSoon from './views/ComingSoon.vue'

// file://（离线版双击 index.html）下 history 路由无法工作，自动切换 hash 模式
const isFile = typeof location !== 'undefined' && location.protocol === 'file:'

const router = createRouter({
  history: isFile ? createWebHashHistory() : createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/items', component: Compendium },
    { path: '/items/:id', component: ItemDetail },
    { path: '/cooking', component: Cooking },
    { path: '/cooking-lab', component: CookingLab },
    { path: '/quests', component: Quests },
    { path: '/armors', component: Armors },
    { path: '/map', component: ComingSoon, props: { title: '互动地图', note: '请通过顶部导航"地图 ↗"进入互动地图（TOTKmap）' } },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
