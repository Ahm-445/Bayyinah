import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// The deployed backend (Render). Used by production builds when
// VITE_API_BASE_URL is not a full URL; set VITE_API_BASE_URL to override.
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://bayyinah-eteb.onrender.com/api'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const define = {}

  // A deployed build must talk to the real backend by full URL (there is no
  // /api proxy on a static host): a relative "/api" would post to the static
  // site itself and every request would 404.
  if (command === 'build' && mode === 'production') {
    if (env.VITE_USE_MOCKS === 'true') {
      console.warn('\n[bayyinah] VITE_USE_MOCKS=true: this production build uses the in-browser mock API.\n')
    } else if (!/^https?:\/\//.test(env.VITE_API_BASE_URL ?? '')) {
      console.warn(
        `\n[bayyinah] VITE_API_BASE_URL is "${env.VITE_API_BASE_URL ?? ''}"; using ${DEFAULT_PRODUCTION_API_BASE_URL}.\n`,
      )
      define['import.meta.env.VITE_API_BASE_URL'] = JSON.stringify(DEFAULT_PRODUCTION_API_BASE_URL)
    }
  }

  return {
    define,
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin /api in dev, so the browser never hits CORS.
      // VITE_API_PROXY_TARGET picks the backend (default http://localhost:5000).
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
      },
    },
  }
})
