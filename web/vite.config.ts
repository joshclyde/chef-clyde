import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API_PROXY lets a verification instance target an isolated API server
      "/api": process.env.API_PROXY ?? "http://localhost:3001",
    },
  },
})
