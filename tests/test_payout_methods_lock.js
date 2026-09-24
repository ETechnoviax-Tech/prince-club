import assert from 'assert'
import { supabase, isSupabaseConfigured } from '../server/config/supabase.js'
import { generateToken } from '../server/middleware/auth.js'

const baseUrl = 'http://localhost:5000'

async function runPayoutMethodsLockTests() {
  console.log('--- Starting Payout Methods & Immutability Lock Tests ---')

  let testUserId = null

  try {
    const testPhone = '99' + Math.floor(10000000 + Math.random() * 90000000)
    const testUsername = `user_${Date.now()}`

    // 1. Create a test profile in DB
    if (isSupabaseConfigured) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          phone: testPhone,
          username: testUsername,
        })
        .select()
        .single()

      if (error || !profile) {
        throw new Error(`Failed to create test profile: ${error?.message}`)
      }
      testUserId = profile.id
    } else {
      testUserId = 'test-payout-' + Date.now()
    }

    const userToken = generateToken({ id: testUserId, username: testUsername, role: 'user' })
    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    }

    const adminToken = generateToken({ id: '2c61d957-6336-4bab-9f2d-5b6ff9c0d79c', username: '8433125736', role: 'admin' })
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }

    console.log(`✓ Test user created: ${testUsername} (ID: ${testUserId})`)

    // 2. Fetch payout methods initially (empty)
    const getRes1 = await fetch(`${baseUrl}/api/wallet/payout-methods/${testUserId}`, {
      headers: userHeaders,
    })
    const getData1 = await getRes1.json()
    assert.strictEqual(getRes1.status, 200, 'GET /payout-methods must return 200')
    assert.deepStrictEqual(getData1.methods, {})
    console.log('✓ Initial payout methods empty')

    // 3. Bind UPI ID
    console.log('3. Binding UPI ID (player@okhdfcbank)...')
    const bindUpiRes = await fetch(`${baseUrl}/api/wallet/payout-methods/bind`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        method: 'UPI',
        details: {
          upiId: 'player@okhdfcbank',
          holderName: 'Rahul Sharma',
        },
      }),
    })
    const bindUpiData = await bindUpiRes.json()
    assert.strictEqual(bindUpiRes.status, 201, `First UPI bind must return 201: ${JSON.stringify(bindUpiData)}`)
    assert.strictEqual(bindUpiData.isLocked, true)
    console.log('✓ UPI ID successfully bound and locked')

    // 4. Attempt to change bound UPI ID (Immutability check)
    console.log('4. Attempting to overwrite bound UPI with hacker@okaxis...')
    const hackUpiRes = await fetch(`${baseUrl}/api/wallet/payout-methods/bind`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        method: 'UPI',
        details: {
          upiId: 'hacker@okaxis',
          holderName: 'Hacker Name',
        },
      }),
    })
    const hackUpiData = await hackUpiRes.json()
    assert.strictEqual(hackUpiRes.status, 403, 'Must return 403 Forbidden on attempt to change locked payout method')
    assert.strictEqual(hackUpiData.isLocked, true)
    assert(hackUpiData.error.includes('Customer Support'), 'Error must instruct user to contact Customer Support')
    console.log('✓ Blocked modification: 403 Forbidden with Customer Support redirect notice')

    // 5. Bind Bank Card
    console.log('5. Binding Bank Card...')
    const bindBankRes = await fetch(`${baseUrl}/api/wallet/payout-methods/bind`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        method: 'BANK',
        details: {
          bankName: 'HDFC Bank',
          accountNumber: '987654321012',
          ifsc: 'HDFC0001234',
          holderName: 'Rahul Sharma',
        },
      }),
    })
    const bindBankData = await bindBankRes.json()
    assert.strictEqual(bindBankRes.status, 201, 'Bank Card bind must return 201')
    assert.strictEqual(bindBankData.isLocked, true)
    console.log('✓ Bank Card successfully bound and locked')

    // 6. Attempt to modify Bank Card
    console.log('6. Attempting to overwrite bound Bank Card...')
    const hackBankRes = await fetch(`${baseUrl}/api/wallet/payout-methods/bind`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        method: 'BANK',
        details: {
          bankName: 'SBI',
          accountNumber: '111122223333',
          ifsc: 'SBIN0001234',
          holderName: 'Hacker Bank',
        },
      }),
    })
    assert.strictEqual(hackBankRes.status, 403, 'Must return 403 on bank change attempt')
    console.log('✓ Blocked bank card modification: 403 Forbidden')

    // 7. Verify GET returns both locked methods
    console.log('7. Verifying GET /api/wallet/payout-methods returns both locked accounts...')
    const getRes2 = await fetch(`${baseUrl}/api/wallet/payout-methods/${testUserId}`, {
      headers: userHeaders,
    })
    const getData2 = await getRes2.json()
    assert.strictEqual(getRes2.status, 200)
    assert.strictEqual(getData2.methods.UPI.upiId, 'player@okhdfcbank')
    assert.strictEqual(getData2.methods.UPI.is_locked, true)
    assert.strictEqual(getData2.methods.BANK.accountNumber, '987654321012')
    assert.strictEqual(getData2.methods.BANK.is_locked, true)
    console.log('✓ Authoritative bound accounts fetched successfully with is_locked=true')

    // 8. Admin Reset (Customer Support simulation)
    console.log('8. Simulating Customer Support Admin Reset on UPI...')
    const adminResetRes = await fetch(`${baseUrl}/api/wallet/payout-methods/admin-reset`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: testUserId,
        method: 'UPI',
      }),
    })
    const adminResetData = await adminResetRes.json()
    assert.strictEqual(adminResetRes.status, 200)
    assert.strictEqual(adminResetData.success, true)
    console.log('✓ Admin successfully unbound UPI following customer support ticket')

    // 9. Now user can re-bind their new UPI
    console.log('9. Re-binding new verified UPI after support reset...')
    const rebindRes = await fetch(`${baseUrl}/api/wallet/payout-methods/bind`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        method: 'UPI',
        details: {
          upiId: 'newrahul@okaxis',
          holderName: 'Rahul Sharma',
        },
      }),
    })
    const rebindData = await rebindRes.json()
    assert.strictEqual(rebindRes.status, 201)
    assert.strictEqual(rebindData.details.upiId, 'newrahul@okaxis')
    console.log('✓ User successfully bound new verified UPI')

    console.log('🎉 ALL PAYOUT METHOD & IMMUTABILITY TESTS PASSED!')
  } finally {
    // Clean up test user
    if (testUserId && isSupabaseConfigured) {
      try {
        await supabase.from('user_payout_methods').delete().eq('user_id', testUserId)
        await supabase.from('wallets').delete().eq('user_id', testUserId)
        await supabase.from('profiles').delete().eq('id', testUserId)
        console.log(`Cleaned up test user ${testUserId} from DB.`)
      } catch (err) {
        console.warn('Cleanup note:', err.message)
      }
    }
  }
}

runPayoutMethodsLockTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err)
    process.exit(1)
  })
