import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
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
          target: env.VITE_COMFYUI_BASE_URL || 'http://10.0.0.77:8188',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/comfy/, ''),
        },
      },
    },
  }
})
