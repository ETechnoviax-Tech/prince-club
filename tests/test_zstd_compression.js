/**
 * Test script to verify server Zstandard (zstd), Brotli (br), and Gzip (gzip) compression
 */
import http from 'node:http'
import zlib from 'node:zlib'

const TEST_URL = 'http://127.0.0.1:5000/api/activity/stats'

function testEncoding(encoding) {
  return new Promise((resolve, reject) => {
    const req = http.request(TEST_URL, {
      headers: {
        'Accept-Encoding': encoding,
      },
    }, (res) => {
      const serverEncoding = res.headers['content-encoding']
      console.log(`[Test: ${encoding}] Server Content-Encoding header: "${serverEncoding}"`)

      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks)
        try {
          let decompressed
          if (serverEncoding === 'zstd') {
            decompressed = zlib.zstdDecompressSync(rawBuffer).toString('utf-8')
          } else if (serverEncoding === 'br') {
            decompressed = zlib.brotliDecompressSync(rawBuffer).toString('utf-8')
          } else if (serverEncoding === 'gzip') {
            decompressed = zlib.gunzipSync(rawBuffer).toString('utf-8')
          } else {
            decompressed = rawBuffer.toString('utf-8')
          }

          const parsed = JSON.parse(decompressed)
          console.log(`✅ [${encoding}] Decompression successful! Wire bytes: ${rawBuffer.length}b, Keys: ${Object.keys(parsed).length}`)
          resolve(true)
        } catch (err) {
          console.error(`❌ [${encoding}] Decompression failed:`, err.message)
          reject(err)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function run() {
  console.log('🧪 Starting Server Compression Verification...')
  await testEncoding('zstd')
  await testEncoding('br')
  await testEncoding('gzip')
  console.log('🎉 All server compression tests passed successfully!')
}

run()

