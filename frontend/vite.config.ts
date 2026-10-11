import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/incidents': {
          target: env.VITE_INCIDENT_API_TARGET || 'http://localhost:8081',
          changeOrigin: true,
        },
        '/api/health': {
          target: env.VITE_INCIDENT_API_TARGET || 'http://localhost:8081',
          changeOrigin: true,
        },
        '/api/analytics': {
          target: env.VITE_ANALYTICS_API_TARGET || 'http://localhost:8083',
          changeOrigin: true,
        },
        '/api/analysis': {
          target: env.VITE_ANALYTICS_API_TARGET || 'http://localhost:8083',
          changeOrigin: true,
        },
        '/api/v1': {
          target: env.VITE_TRIAGE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/health': {
          target: env.VITE_TRIAGE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})