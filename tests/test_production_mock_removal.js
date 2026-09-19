import http from 'http'

async function checkApi(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5000${path}`, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function runTests() {
  console.log('--- RUNNING PRODUCTION MOCK REMOVAL VERIFICATION ---')

  // 1. Aviator State: check that seed fake rounds (99995-100000) are purged
  const state = await checkApi('/api/game/aviator/state')
  const hasFakeSeeds = (state.history || []).some(
    (h) => h.roundId >= 99995 && h.roundId <= 100000
  )
  if (hasFakeSeeds) {
    throw new Error('FAILED: Aviator state still contains hardcoded fake seed rounds (99995-100000)')
  }
  console.log('✓ PASS 1: Aviator state clean from fake seed rounds')

  // 2. Aviator History endpoint
  const hist = await checkApi('/api/game/aviator/history')
  const histHasFakes = (hist.history || []).some(
    (h) => h.roundId >= 99995 && h.roundId <= 100000
  )
  if (histHasFakes) {
    throw new Error('FAILED: Aviator history still contains fake seed rounds')
  }
  console.log('✓ PASS 2: Aviator history endpoint clean')

  console.log('ALL TESTS PASSED: Mock data successfully purged.')
}

runTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
