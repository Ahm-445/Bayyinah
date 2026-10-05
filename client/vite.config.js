import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin /api in dev, so the browser never hits CORS.
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
      },
    },
  }
})
