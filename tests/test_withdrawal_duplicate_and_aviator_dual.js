import assert from 'assert'
import crypto from 'crypto'
import app from '../server/index.js'

// Force test environment
process.env.NODE_ENV = 'test'
process.env.SKIP_CAPTCHA = 'true'

async function runTests() {
  console.log('================================================================')
  console.log('🧪 VERIFYING WITHDRAWAL LOCKS & AVIATOR DUAL-PANEL FUNCTIONALITY')
  console.log('================================================================')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  let passed = 0
  let total = 0

  function check(condition, message) {
    total++
    if (condition) {
      console.log(`  ✅ [PASS]: ${message}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL]: ${message}`)
      assert(false, message)
    }
  }

  async function createTestUser(prefix) {
    const username = `${prefix}_${Math.random().toString(36).substring(2, 8)}`
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email: `${username}@example.com`,
        password: 'Password123!',
      }),
    })
    const signupData = await signupRes.json()
    assert.strictEqual(signupRes.status, 201, `Failed to create test user ${username}: ${JSON.stringify(signupData)}`)
    return {
      id: signupData.user.id,
      token: signupData.token,
      wallet: signupData.wallet,
    }
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: WITHDRAWAL DUPLICATE PREVENTION (UPI & BANK)
    // ----------------------------------------------------
    console.log('\n[1/2] Testing Duplicate & Concurrent Withdrawal Locks (UPI & Bank)...')

    const userA = await createTestUser('test_ua')
    const testUpi = `vip_player_${Date.now()}@okaxis`
    const testAccount = String(Math.floor(100000000000 + Math.random() * 899999999999))

    // Step 1: Submit First Withdrawal via UPI (Pending status)
    const w1Res = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        userId: userA.id,
        amount: 200,
        payoutMethod: 'UPI',
        upiId: testUpi,
      }),
    })
    const w1Data = await w1Res.json()
    check(w1Res.status === 201 && w1Data.withdrawal?.status === 'PENDING', `Initial UPI withdrawal of ₹200 placed (status: ${w1Res.status})`)

    // Wait for paymentLock to release
    await new Promise((r) => setTimeout(r, 500))

    // Step 2: Attempt duplicate withdrawal for User A (via Bank) while UPI is still PENDING -> Must be BLOCKED
    const w2Res = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        userId: userA.id,
        amount: 300,
        payoutMethod: 'BANK',
        bankDetails: {
          accountNumber: '1122334455',
          ifsc: 'SBIN0001234',
          holderName: 'User A',
        },
      }),
    })
    const w2Data = await w2Res.json()
    check(
      w2Res.status === 409 && (w2Data.error || '').toLowerCase().includes('pending'),
      `Double withdrawal blocked: User A rejected with 409 Conflict ("${w2Data.error}")`
    )

    await new Promise((r) => setTimeout(r, 500))

    // Step 3: Attempt withdrawal with SAME pending UPI ID from another user -> Must be BLOCKED
    const userB = await createTestUser('test_ub')
    const w3Res = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({
        userId: userB.id,
        amount: 150,
        payoutMethod: 'UPI',
        upiId: testUpi,
      }),
    })
    const w3Data = await w3Res.json()
    check(
      w3Res.status === 409 && (w3Data.error || '').toLowerCase().includes('upi'),
      `Duplicate UPI blocked across accounts: rejected with 409 ("${w3Data.error}")`
    )

    // Step 4: Bank Account duplicate prevention test
    const userBank1 = await createTestUser('test_ubank1')
    const wb1Res = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBank1.token}`,
      },
      body: JSON.stringify({
        userId: userBank1.id,
        amount: 250,
        payoutMethod: 'BANK',
        bankDetails: {
          accountNumber: testAccount,
          ifsc: 'HDFC0001234',
          holderName: 'Bank User 1',
        },
      }),
    })
    check(wb1Res.status === 201, `Initial Bank withdrawal placed for User Bank 1 (status: ${wb1Res.status})`)

    const userBank2 = await createTestUser('test_ubank2')
    const wb2Res = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBank2.token}`,
      },
      body: JSON.stringify({
        userId: userBank2.id,
        amount: 350,
        payoutMethod: 'BANK',
        bankDetails: {
          accountNumber: testAccount,
          ifsc: 'HDFC0001234',
          holderName: 'Bank User 2',
        },
      }),
    })
    const wb2Data = await wb2Res.json()
    check(
      wb2Res.status === 409 && (wb2Data.error || '').toLowerCase().includes('bank account'),
      `Duplicate Bank Account blocked across accounts: rejected with 409 ("${wb2Data.error}")`
    )

    // ----------------------------------------------------
    // TEST GROUP 2: AVIATOR DUAL-BETTING & MULTI-PANEL STATE
    // ----------------------------------------------------
    console.log('\n[2/2] Testing Aviator Dual-Panel Betting & State API...')

    // Wait for Aviator WAITING phase
    let aviatorState = null
    for (let attempt = 0; attempt < 35; attempt++) {
      const stateRes = await fetch(`${baseUrl}/api/game/aviator/state`)
      if (stateRes.status === 200) {
        aviatorState = await stateRes.json()
        if (aviatorState.phase === 'WAITING' && aviatorState.remainingMs > 3500) {
          break
        }
      }
      await new Promise((r) => setTimeout(r, 400))
    }

    check(aviatorState !== null, `Aviator state endpoint responsive (Current Round: ${aviatorState?.roundId})`)

    if (aviatorState && aviatorState.phase === 'WAITING') {
      const aviatorUser = await createTestUser('test_av')

      // Bet 1: Panel 0 (Top Panel)
      const p0Res = await fetch(`${baseUrl}/api/game/aviator/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aviatorUser.token}`,
        },
        body: JSON.stringify({
          userId: aviatorUser.id,
          amount: 10,
          panelId: 0,
          autoCashout: 1.5,
        }),
      })
      const p0Data = await p0Res.json()
      check(p0Res.status === 200 && p0Data.panelId === 0, `Panel 0 bet placed successfully (betId: ${p0Data.betId})`)

      // Attempt duplicate bet on SAME Panel 0 in same round -> Must be rejected 409
      const dupP0Res = await fetch(`${baseUrl}/api/game/aviator/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aviatorUser.token}`,
        },
        body: JSON.stringify({
          userId: aviatorUser.id,
          amount: 15,
          panelId: 0,
        }),
      })
      const dupP0Data = await dupP0Res.json()
      check(dupP0Res.status === 409, `Duplicate bet on SAME Panel 0 blocked with 409 ("${dupP0Data.error}")`)

      // Bet 2: Panel 1 (Bottom Panel) in same round -> Must SUCCEED (Dual-deck capability)
      const p1Res = await fetch(`${baseUrl}/api/game/aviator/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aviatorUser.token}`,
        },
        body: JSON.stringify({
          userId: aviatorUser.id,
          amount: 20,
          panelId: 1,
          autoCashout: 2.5,
        }),
      })
      const p1Data = await p1Res.json()
      check(p1Res.status === 200 && p1Data.panelId === 1, `Panel 1 bet placed successfully in same round (betId: ${p1Data.betId})`)

      // Check User Bets state query
      const userStateRes = await fetch(`${baseUrl}/api/game/aviator/state?userId=${aviatorUser.id}`, {
        headers: { Authorization: `Bearer ${aviatorUser.token}` },
      })
      const userStateData = await userStateRes.json()
      const userBets = userStateData.userBets || []
      check(userBets.length === 2, `Authoritative state tracks both panels for user (bets count: ${userBets.length})`)

      const panel0Bet = userBets.find((b) => b.panelId === 0)
      const panel1Bet = userBets.find((b) => b.panelId === 1)
      check(panel0Bet?.amount === 10 && panel1Bet?.amount === 20, 'Panel 0 (₹10) and Panel 1 (₹20) verified in live state')

      // Cancel Panel 0 bet before flight
      const cancelRes = await fetch(`${baseUrl}/api/game/aviator/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aviatorUser.token}`,
        },
        body: JSON.stringify({
          userId: aviatorUser.id,
          betId: p0Data.betId,
        }),
      })
      const cancelData = await cancelRes.json()
      check(cancelRes.status === 200 && cancelData.refundAmount === 10, 'Panel 0 bet cancelled and refunded ₹10 before takeoff')
    }

    console.log('\n================================================================')
    console.log(`🎉 ALL TESTS PASSED: ${passed}/${total} assertions successful!`)
    console.log('================================================================\n')
  } finally {
    server.close()
  }
}

runTests().then(() => {
  process.exit(0)
}).catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
