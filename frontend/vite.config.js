import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    minify: 'oxc',
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: mode === 'production',
          },
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
}))
