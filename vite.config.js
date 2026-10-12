import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173 },
  // 相对路径基准：使 dist 可直接双击 index.html（file://）使用，线上根路径部署同样有效
  base: './',
})
