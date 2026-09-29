<template>
  <main class="container" style="padding-top: 72px; text-align: center;">
    <h1 style="font-size: 24px; font-weight: 500;">{{ title }}</h1>
    <p style="color: var(--muted); margin-top: 12px;">{{ note }}</p>
    <p style="color: var(--faint); font-size: 12.5px; margin-top: 4px;">
      数据已就绪，模块建设中
    </p>
    <RouterLink to="/" style="display: inline-block; margin-top: 20px;">← 返回首页</RouterLink>
  </main>
</template>

<script setup>
defineProps({
  title: String,
  note: String,
})
</script>
