import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const parseAllowedHosts = () => {
  const hosts = process.env.VITE_ALLOWED_HOSTS
  return hosts ? hosts.split(',').map(host => host.trim()).filter(Boolean) : true
}

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: parseAllowedHosts(),
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: parseAllowedHosts(),
  }
})
