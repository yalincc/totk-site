<template>
  <header class="site-header">
    <div class="inner">
      <RouterLink to="/" class="logo">
        超级全能互动地图<span class="sub">王国之泪 · 数据图鉴</span>
      </RouterLink>
      <nav class="nav">
        <RouterLink to="/items">图鉴</RouterLink>
        <a :href="mapUrl" target="_blank" rel="noopener">地图 ↗</a>
        <RouterLink to="/cooking">料理</RouterLink>
        <RouterLink to="/quests">任务</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />

  <footer class="site-footer">
    本站为非官方粉丝站点，与任天堂无关。《塞尔达传说 王国之泪》相关素材版权归任天堂所有。<br />
    全站数据由游戏 romfs 直接提取，仅供参考 · 不作商业用途
  </footer>
</template>

<script setup>
import { MAP_URL } from './mapLink'
const mapUrl = MAP_URL
</script>
