import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // E: 盘（非系统盘）文件系统事件常丢失，导致 HMR/模块缓存不失效——
    // 表现为"改了文件但浏览器还是旧样式"。轮询兜底，代价可忽略。
    watch: { usePolling: true, interval: 300 },
  },
  // 相对路径基准：使 dist 可直接双击 index.html（file://）使用，线上根路径部署同样有效
  base: './',
})
