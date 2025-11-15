import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true, // Allow LAN access
    port: 5173,
    proxy: {
      '/comfy': {
        target: process.env.VITE_COMFYUI_BASE_URL || 'http://10.0.0.77:8188',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/comfy/, ''),
      },
      '/ollama': {
        target: process.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
})
