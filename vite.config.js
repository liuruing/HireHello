import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    minify: true
  },
  server: {
    host: '0.0.0.0',  // 允许从任何IP地址访问
    port: 5173,       // 默认端口
    strictPort: false,
    open: true,       // 自动打开浏览器
    cors: true        // 启用CORS
  }
}) 