import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'frontend'),
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
