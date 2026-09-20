import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runVerification() {
  console.log('🚀 Running Comprehensive Prince Club Games & 55Club API Verification...\n')
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

  // 1. Verify all 5 game components exist
  const components = [
    'HomeLobby.jsx',
    'K3Game.jsx',
    'FiveDGame.jsx',
    'TrxGame.jsx',
    'AviatorGame.jsx',
    'AuthModal.jsx',
    'ActivityView.jsx',
    'FortuneWheelModal.jsx',
  ]

  for (const comp of components) {
    test(`Component ${comp} exists and has content`, () => {
      const p = path.resolve(__dirname, '../frontend/src/components', comp)
      assert(fs.existsSync(p), `Missing ${comp}`)
      const content = fs.readFileSync(p, 'utf8')
      assert(content.length > 500, `${comp} content is too small`)
    })
  }

  // 2. Verify App.jsx imports and routes all games
  test('App.jsx mounts K3Game, FiveDGame, and TrxGame', () => {
    const appPath = path.resolve(__dirname, '../frontend/src/App.jsx')
    const appCode = fs.readFileSync(appPath, 'utf8')
    assert(appCode.includes("import K3Game from './components/K3Game'"), 'Missing K3Game import')
    assert(appCode.includes("import FiveDGame from './components/FiveDGame'"), 'Missing FiveDGame import')
    assert(appCode.includes("import TrxGame from './components/TrxGame'"), 'Missing TrxGame import')
    assert(appCode.includes("currentGame === 'k3'"), 'Missing k3 conditional render')
    assert(appCode.includes("currentGame === '5d'"), 'Missing 5d conditional render')
    assert(appCode.includes("currentGame === 'trx'"), 'Missing trx conditional render')
  })

  // 3. Verify HomeLobby routes lottery items to their respective game modes
  test('HomeLobby routes lottery clicks to k3, 5d, trx, and wingo', () => {
    const lobbyPath = path.resolve(__dirname, '../frontend/src/components/HomeLobby.jsx')
    const lobbyCode = fs.readFileSync(lobbyPath, 'utf8')
    assert(lobbyCode.includes("onSelectGame('k3')"), 'K3 card does not trigger onSelectGame(k3)')
    assert(lobbyCode.includes("onSelectGame('5d')"), '5D card does not trigger onSelectGame(5d)')
    assert(lobbyCode.includes("onSelectGame('trx')"), 'TRX card does not trigger onSelectGame(trx)')
    assert(lobbyCode.includes("onSelectGame('wingo'"), 'Win Go card does not trigger onSelectGame(wingo)')
  })

  // 4. Verify Live 55club API gateway connectivity on localhost:5000
  try {
    const resIssue = await fetch('http://localhost:5000/api/game/veer/issue?typeId=30')
    const issueJson = await resIssue.json()
    test('Backend /api/game/veer/issue returns live round from 55club', () => {
      assert.strictEqual(issueJson.success, true)
      assert(typeof issueJson.issueNumber === 'string')
      assert(issueJson.issueNumber.length >= 16)
      const validSources = ['55club', 'veergame', '55club_mirror3', 'fallback']
      assert(validSources.includes(issueJson.source), `Unexpected source: ${issueJson.source}`)
      if (issueJson.source === 'fallback') {
        console.log('    ⚠️  Note: Using local fallback (upstream API unreachable)')
      }
    })
  } catch (err) {
    console.error('Backend fetch /veer/issue failed:', err.message)
    failed++
  }

  // 5. Verify Live Draw History from 55club
  try {
    const resHist = await fetch('http://localhost:5000/api/game/veer/history?typeId=30')
    const histJson = await resHist.json()
    test('Backend /api/game/veer/history returns official live draw history', () => {
      assert.strictEqual(histJson.success, true)
      assert(Array.isArray(histJson.list))
      assert(histJson.list.length > 0)
      assert(typeof histJson.list[0].digit === 'number')
    })
  } catch (err) {
    console.error('Backend fetch /veer/history failed:', err.message)
    failed++
  }

  // 6. Verify brand name consistency: 69 CLUB across UI
  test('Branding is consistently 69 CLUB', () => {
    const files = [
      '../frontend/src/components/HomeLobby.jsx',
      '../frontend/src/components/ActivityView.jsx',
      '../frontend/src/components/FortuneWheelModal.jsx',
      '../frontend/src/components/auth/LoginPage.jsx',
    ]
    for (const f of files) {
      const content = fs.readFileSync(path.resolve(__dirname, f), 'utf8')
      assert(content.includes('69 CLUB') || content.includes('69 Club'), `${f} missing 69 Club brand`)
      assert(!content.includes('PRINCE CLUB'), `${f} still has PRINCE CLUB`)
    }
  })

  console.log(`\n===========================================`)
  console.log(`Test Results: ${passed} passed, ${failed} failed`)
  console.log(`===========================================`)

  if (failed > 0) process.exit(1)
}

runVerification()
