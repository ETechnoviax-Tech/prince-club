import assert from 'assert'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const BASE_URL = 'http://localhost:5000/api'
const ADMIN_MASTER_SECRET = process.env.ADMIN_SECRET_KEY || 'club69_admin_master_secret_2026'

async function runTests() {
  console.log('🚀 Starting Admin Dual-Verification & Management Dashboard Test Suite...\n')

  const ts = Date.now()
  const normalUserPhone = `98${String(ts).slice(-8)}`
  const adminUserPhone = process.env.ADMIN_IDENTIFIER || `99${String(ts).slice(-8)}`
  const testPassword = 'Password@12345'

  // 1. Register a normal player account
  console.log('1. Registering normal player account...')
  const regNormalRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: normalUserPhone,
      password: testPassword,
      email: `normal_${ts}@club69.in`,
    }),
  })
  assert.strictEqual(regNormalRes.status, 201, 'Normal player registration failed')
  const normalData = await regNormalRes.json()
  const normalToken = normalData.token
  const normalUserId = normalData.user.id
  console.log(`✓ Normal player registered: ${normalUserPhone} (Role: ${normalData.user.role})`)

  // 2. Register an account to become Admin
  console.log('\n2. Registering account to promote to admin...')
  const regAdminRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: adminUserPhone,
      password: testPassword,
      email: `admin_${ts}@club69.in`,
    }),
  })
  let adminToken = null
  let adminUserId = null
  if (regAdminRes.status === 201) {
    const adminCandData = await regAdminRes.json()
    adminToken = adminCandData.token
    adminUserId = adminCandData.user.id
    console.log(`✓ Admin candidate registered: ${adminUserPhone}`)
  } else if (regAdminRes.status === 409) {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: adminUserPhone, password: testPassword }),
    })
    const loginData = await loginRes.json()
    adminToken = loginData.token
    adminUserId = loginData.user?.id
    console.log(`✓ Admin candidate already existed, logged in: ${adminUserPhone}`)
  } else {
    assert.fail(`Admin candidate registration failed with status ${regAdminRes.status}`)
  }

  // 3. Test Security: Accessing Admin Route WITHOUT any verification (no headers)
  console.log('\n3. Testing Security: Unauthenticated request to /api/admin/verify...')
  const unauthRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  assert.strictEqual(unauthRes.status, 403, 'Should be rejected with 403')
  const unauthJson = await unauthRes.json()
  assert.strictEqual(unauthJson.stage, 'backend_verification', 'Must fail at backend verification stage')
  console.log('✓ Rejected: Missing master key caught by Backend Verification.')

  // 4. Test Security: Providing valid Backend Master Key BUT normal user token (role: 'user')
  console.log('\n4. Testing Security: Valid Master Key but User has role: "user" in DB...')
  const normalAdminRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
  })
  assert.strictEqual(normalAdminRes.status, 403, 'Normal user must be denied admin access')
  const normalAdminJson = await normalAdminRes.json()
  assert.strictEqual(normalAdminJson.stage, 'db_verification', 'Must fail at DB verification stage')
  console.log('✓ Rejected: Non-admin account blocked by DB Role Verification.')

  // 5. Promote candidate account to admin using Master Key
  console.log('\n5. Promoting account to admin in database via Master Key...')
  const promoteRes = await fetch(`${BASE_URL}/admin/promote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
    body: JSON.stringify({ identity: adminUserPhone }),
  })
  assert.strictEqual(promoteRes.status, 200, 'Admin promotion failed')
  console.log(`✓ Account ${adminUserPhone} successfully granted role: "admin" in DB.`)

  // Re-login to get refreshed token with admin role in payload
  const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminUserPhone, password: testPassword }),
  })
  assert.strictEqual(loginAdminRes.status, 200, 'Admin re-login failed')
  const refreshedAdminData = await loginAdminRes.json()
  const validAdminToken = refreshedAdminData.token
  assert.strictEqual(refreshedAdminData.user.role, 'admin', 'Refreshed user role must be admin')

  // 6. Test Security: Admin token provided but INVALID Backend Master Key
  console.log('\n6. Testing Security: Admin account in DB but WRONG Backend Master Key...')
  const wrongKeyRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': 'incorrect_wrong_secret_9999',
    },
  })
  assert.strictEqual(wrongKeyRes.status, 403, 'Must reject with wrong secret key')
  console.log('✓ Rejected: Wrong secret key caught by Backend Verification.')

  // 7. Dual-Verification Success: Both DB role = 'admin' AND Valid Backend Key
  console.log('\n7. Testing Dual-Verification Success (Both DB + Backend Valid)...')
  const verifiedRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
  })
  assert.strictEqual(verifiedRes.status, 200, 'Dual-verification failed')
  const verifiedData = await verifiedRes.json()
  assert.strictEqual(verifiedData.dbVerified, true, 'dbVerified must be true')
  assert.strictEqual(verifiedData.backendVerified, true, 'backendVerified must be true')
  console.log('✓ SUCCESS: Dual verification passed for DB + Backend!')

  // 8. Test Platform Matrix Endpoint
  console.log('\n8. Testing GET /api/admin/matrix...')
  const matrixRes = await fetch(`${BASE_URL}/admin/matrix`, {
    headers: {
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
  })
  assert.strictEqual(matrixRes.status, 200, 'Failed to fetch admin matrix')
  const matrixJson = await matrixRes.json()
  assert(matrixJson.matrix.totalUsers >= 2, 'Total users should be >= 2')
  assert(typeof matrixJson.matrix.poolMatrix === 'object', 'Pool matrix must be present')
  console.log(`✓ Matrix retrieved: Total Players: ${matrixJson.matrix.totalUsers}, Net Profit: ₹${matrixJson.matrix.platformNetProfit}`)

  // 9. Place a bet as normal player, then inspect in Bets Ledger ("kispar kitna pasia laga kon kitna jeeta")
  console.log('\n9. Placing bet as normal player to test "kispar kitna pasia laga kon kitna jeeta"...')
  let betRes = await fetch(`${BASE_URL}/game/bet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalToken}`,
    },
    body: JSON.stringify({
      userId: normalUserId,
      selection: 'green',
      amount: 250,
      mode: 'PARITY',
    }),
  })
  if (betRes.status === 400) {
    const errBody = await betRes.json()
    if (errBody.error && errBody.error.includes('locked')) {
      console.log('   (Round locked in last 5s, waiting 6s for next round...)')
      await new Promise((r) => setTimeout(r, 6000))
      betRes = await fetch(`${BASE_URL}/game/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${normalToken}`,
        },
        body: JSON.stringify({
          userId: normalUserId,
          selection: 'green',
          amount: 250,
          mode: 'PARITY',
        }),
      })
    }
  }
  assert.strictEqual(betRes.status, 201, 'Placing bet failed')
  console.log('✓ Normal player placed bet: ₹250 on GREEN')

  // Inspect in Bets Ledger
  const betsRes = await fetch(`${BASE_URL}/admin/bets`, {
    headers: {
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
  })
  assert.strictEqual(betsRes.status, 200, 'Failed to fetch bets ledger')
  const betsData = await betsRes.json()
  const placedBet = betsData.bets.find((b) => b.userId === normalUserId)
  assert(placedBet, 'Placed bet must be recorded in admin bets ledger')
  assert.strictEqual(placedBet.targetSelection, 'green', 'Target selection must match "green"')
  assert.strictEqual(placedBet.amountPlaced, 250, 'Amount placed must be 250')
  console.log(`✓ Bets Ledger Verified: ${placedBet.username} placed ₹${placedBet.amountPlaced} on ${placedBet.targetSelection} (Status: ${placedBet.status}, Won: ₹${placedBet.amountWon})`)

  // 10. Test Users CRUD: List Users
  console.log('\n10. Testing Users CRUD: List Users...')
  const usersRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: {
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
  })
  assert.strictEqual(usersRes.status, 200, 'Failed to list users')
  const usersData = await usersRes.json()
  assert(usersData.users.length >= 2, 'Users count must be at least 2')
  console.log(`✓ Listed ${usersData.users.length} users successfully.`)

  // 11. Test Users CRUD: Update Balance (+₹500 credit)
  console.log('\n11. Testing Users CRUD: Credit balance for normal player...')
  const creditRes = await fetch(`${BASE_URL}/admin/users/${normalUserId}/balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
    body: JSON.stringify({ amount: 500, action: 'credit', reason: 'VIP deposit bonus' }),
  })
  assert.strictEqual(creditRes.status, 200, 'Credit balance failed')
  const creditData = await creditRes.json()
  assert(creditData.newBalance > 500, 'New balance must reflect credit')
  console.log(`✓ Normal player balance credited by ₹500. New balance: ₹${creditData.newBalance}`)

  // 12. Test Users CRUD: Update Status (Freeze account)
  console.log('\n12. Testing Users CRUD: Freeze user account...')
  const freezeRes = await fetch(`${BASE_URL}/admin/users/${normalUserId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validAdminToken}`,
      'x-admin-key': ADMIN_MASTER_SECRET,
    },
    body: JSON.stringify({ status: 'suspended' }),
  })
  assert.strictEqual(freezeRes.status, 200, 'Freeze user failed')
  console.log('✓ Account frozen successfully.')

  console.log('\n============================================================')
  console.log('🎉 ALL 12 ADMIN DUAL-VERIFICATION & MANAGEMENT TESTS PASSED!')
  console.log('============================================================')
}

runTests().catch((err) => {
  console.error('\n❌ Admin test suite failed:', err)
  process.exit(1)
})
