import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// Custom zero-dependency plugin that pre-compresses static assets with Zstandard (.zst) and Gzip (.gz)
function zstdCompressionPlugin() {
  return {
    name: 'vite-plugin-zstd-compression',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname || '.', 'dist')
      if (!fs.existsSync(distDir)) return

      const compressFilesRecursively = (dir) => {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const fullPath = path.join(dir, file)
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            compressFilesRecursively(fullPath)
          } else if (/\.(js|css|html|svg|json)$/i.test(file) && !file.endsWith('.zst') && !file.endsWith('.gz')) {
            try {
              const content = fs.readFileSync(fullPath)
              if (content.length > 512) {
                // Generate Zstandard (.zst) compressed file
                if (typeof zlib.zstdCompressSync === 'function') {
                  const zstdBuffer = zlib.zstdCompressSync(content)
                  fs.writeFileSync(`${fullPath}.zst`, zstdBuffer)
                }
                // Generate Gzip (.gz) compressed file
                if (typeof zlib.gzipSync === 'function') {
                  const gzipBuffer = zlib.gzipSync(content)
                  fs.writeFileSync(`${fullPath}.gz`, gzipBuffer)
                }
              }
            } catch (err) {
              console.warn(`[Compression Plugin] Failed for ${file}:`, err.message)
            }
          }
        }
      }

      compressFilesRecursively(distDir)
      console.log('⚡ [Vite Build] Pre-compressed dist assets with Zstandard (zstd) and Gzip!')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), zstdCompressionPlugin()],
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
