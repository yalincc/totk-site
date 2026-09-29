import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Compendium from './views/Compendium.vue'
import ItemDetail from './views/ItemDetail.vue'
import Cooking from './views/Cooking.vue'
import Quests from './views/Quests.vue'
import ComingSoon from './views/ComingSoon.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/items', component: Compendium },
    { path: '/items/:id', component: ItemDetail },
    { path: '/cooking', component: Cooking },
    { path: '/quests', component: Quests },
    { path: '/map', component: ComingSoon, props: { title: '互动地图', note: '请通过顶部导航"地图 ↗"进入互动地图（TOTKmap）' } },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
