import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev equivalent of nginx.conf's `/api/` proxy_pass to the terrain
    // service in Docker — lets the frontend always call a relative `/api/...`
    // path with no environment-specific base URL, and no CORS involved either
    // way. Run the backend locally with `uv run uvicorn main:app --port 8000`.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
