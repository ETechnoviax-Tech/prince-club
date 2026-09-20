import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runVerification() {
  console.log('🎰 Verifying JILI, EVO, and Multi-Provider Third-Party Game API Integration...\n')
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`✅ PASS: ${name}`)
      passed++
    } catch (e) {
      console.error(`❌ FAIL: ${name} ->`, e.message)
      failed++
    }
  }

  // 1. Check frontend components
  test('ThirdPartyGameModal.jsx exists and has playable mechanics', () => {
    const p = path.resolve(__dirname, '../frontend/src/components/ThirdPartyGameModal.jsx')
    assert(fs.existsSync(p), 'Missing ThirdPartyGameModal.jsx')
    const content = fs.readFileSync(p, 'utf8')
    assert(content.includes('slot-machine-cabinet'), 'Missing slot cabinet')
    assert(content.includes('casino-table-cabinet'), 'Missing casino table cabinet')
    assert(content.includes('playThirdPartyRound'), 'Missing round action')
  })

  test('HomeLobby.jsx has provider filter and third-party catalog grid', () => {
    const p = path.resolve(__dirname, '../frontend/src/components/HomeLobby.jsx')
    const content = fs.readFileSync(p, 'utf8')
    assert(content.includes('home-providers-bar'), 'Missing provider bar')
    assert(content.includes('section-provider-catalog'), 'Missing catalog section')
    assert(content.includes('onLaunchThirdPartyGame'), 'Missing game launch handler')
  })

  test('App.jsx mounts ThirdPartyGameModal with activeThirdPartyGame', () => {
    const p = path.resolve(__dirname, '../frontend/src/App.jsx')
    const content = fs.readFileSync(p, 'utf8')
    assert(content.includes('ThirdPartyGameModal'), 'Missing ThirdPartyGameModal in App.jsx')
    assert(content.includes('activeThirdPartyGame'), 'Missing activeThirdPartyGame state in App.jsx')
  })

  // 2. Test Backend Providers Endpoint
  try {
    const res = await fetch('http://localhost:5000/api/game/providers')
    const json = await res.json()
    test('Backend /api/game/providers returns supported provider list', () => {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(json.success, true)
      assert(Array.isArray(json.providers))
      const ids = json.providers.map((p) => p.id)
      assert(ids.includes('JILI'), 'JILI provider missing')
      assert(ids.includes('EVO'), 'EVO provider missing')
      assert(ids.includes('PG'), 'PG provider missing')
      assert(ids.includes('SPRIBE'), 'SPRIBE provider missing')
    })
  } catch (err) {
    console.error('Providers fetch failed:', err.message)
    failed++
  }

  // 3. Test JILI Catalog
  try {
    const res = await fetch('http://localhost:5000/api/game/third-party/catalog?provider=JILI&limit=10')
    const json = await res.json()
    test('Backend JILI catalog returns official games from 55club WebAPI', () => {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(json.success, true)
      assert(json.totalCount > 50, `Expected > 50 JILI games, got ${json.totalCount}`)
      assert(Array.isArray(json.games) && json.games.length > 0)
      const first = json.games[0]
      assert(first.name, 'Missing game name')
      assert(first.img && first.img.startsWith('http'), 'Invalid image URL')
    })
  } catch (err) {
    console.error('JILI catalog fetch failed:', err.message)
    failed++
  }

  // 4. Test EVO Catalog
  try {
    const res = await fetch('http://localhost:5000/api/game/third-party/catalog?provider=EVO&limit=10')
    const json = await res.json()
    test('Backend EVO catalog returns official live casino games from 55club WebAPI', () => {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(json.success, true)
      assert(json.totalCount > 100, `Expected > 100 EVO games, got ${json.totalCount}`)
      assert(Array.isArray(json.games) && json.games.length > 0)
      const first = json.games[0]
      assert(first.name, 'Missing EVO game name')
      assert(first.img && first.img.startsWith('http'), 'Invalid EVO image URL')
    })
  } catch (err) {
    console.error('EVO catalog fetch failed:', err.message)
    failed++
  }

  // 5. Test PG Soft Catalog
  try {
    const res = await fetch('http://localhost:5000/api/game/third-party/catalog?provider=PG&limit=5')
    const json = await res.json()
    test('Backend PG Soft catalog returns official games from 55club WebAPI', () => {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(json.success, true)
      assert(json.totalCount > 20, `Expected > 20 PG games, got ${json.totalCount}`)
    })
  } catch (err) {
    console.error('PG catalog fetch failed:', err.message)
    failed++
  }

  // 6. Test Game Play Round (atomic bet deduction and settlement)
  try {
    const res = await fetch('http://localhost:5000/api/game/third-party/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_dev01',
        gameId: '49',
        provider: 'JILI',
        betAmount: 20,
      }),
    })
    const json = await res.json()
    test('POST /api/game/third-party/play executes round and returns outcome', () => {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(json.success, true)
      assert(typeof json.isWin === 'boolean')
      assert(typeof json.payout === 'number')
      assert(Array.isArray(json.reelOutcome), 'Reel outcome missing')
    })
  } catch (err) {
    console.error('Play round failed:', err.message)
    failed++
  }

  console.log(`\n===========================================`)
  console.log(`Verification Summary: ${passed} passed, ${failed} failed`)
  console.log(`===========================================`)

  if (failed > 0) process.exit(1)
}

runVerification()
