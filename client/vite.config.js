import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // A deployed build must talk to the real backend by full URL (there is no
  // /api proxy on a static host). Warn loudly instead of shipping a broken build.
  if (command === 'build' && mode === 'production') {
    if (env.VITE_USE_MOCKS === 'true') {
      console.warn('\n[bayyinah] VITE_USE_MOCKS=true: this production build uses the in-browser mock API.\n')
    } else if (!/^https?:\/\//.test(env.VITE_API_BASE_URL ?? '')) {
      console.warn(
        `\n[bayyinah] VITE_API_BASE_URL is "${env.VITE_API_BASE_URL ?? ''}". Set it to the backend's full URL, e.g. https://<backend>/api.\n`,
      )
    }
  }

  return {
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
