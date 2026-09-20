import assert from 'assert'
import app from '../server/index.js'
import { generateToken } from '../server/middleware/auth.js'

async function runWithdrawalAndVIPTests() {
  console.log('--- Starting Withdrawal System & VIP Bonus Tests ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Create a real user
    const username = 'wuser_' + Math.random().toString(36).substring(2, 7)
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email: `${username}@example.com`,
        password: 'password123',
      }),
    })
    const signupData = await signupRes.json()
    assert.strictEqual(signupRes.status, 201)
    const user = signupData.user
    const userToken = signupData.token
    const initialBalance = Number(signupData.wallet.balance) // 1000

    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    }

    const adminToken = generateToken({ id: 'admin-01', username: 'admin', role: 'admin' })
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }

    console.log(`✓ User created: ${username}, Initial Balance: ₹${initialBalance}`)

    // 2. Submit UPI Withdrawal Request (₹300)
    console.log('2. Testing UPI Withdrawal Request (₹300)...')
    const withdrawRes = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        userId: user.id,
        amount: 300,
        payoutMethod: 'UPI',
        upiId: 'player@okhdfcbank',
      }),
    })

    const withdrawData = await withdrawRes.json()
    assert.strictEqual(withdrawRes.status, 201, `Withdrawal failed: ${JSON.stringify(withdrawData)}`)
    assert.strictEqual(withdrawData.newBalance, initialBalance - 300)
    assert.strictEqual(withdrawData.withdrawal.amount, 300)
    assert.strictEqual(withdrawData.withdrawal.status, 'PENDING')
    const withdrawalId1 = withdrawData.withdrawal.id
    console.log(`✓ Withdrawal submitted: ID ${withdrawalId1}, Balance deducted to ₹${withdrawData.newBalance}`)

    // 3. Verify user can fetch their withdrawal history
    console.log('3. Testing Withdrawal History Retrieval...')
    const historyRes = await fetch(`${baseUrl}/api/wallet/withdrawals/${user.id}`, {
      headers: userHeaders,
    })
    assert.strictEqual(historyRes.status, 200)
    const historyData = await historyRes.json()
    assert.ok(Array.isArray(historyData.withdrawals))
    const foundW = historyData.withdrawals.find((w) => w.id === withdrawalId1)
    assert.ok(foundW, 'Submitted withdrawal must be present in history')
    console.log('✓ User withdrawal history verified')

    // 4. Test Admin Rejection with Automatic Refund
    console.log('4. Testing Admin Rejection & Automatic Refund...')
    const rejectRes = await fetch(`${baseUrl}/api/wallet/withdraw/verify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        withdrawalId: withdrawalId1,
        action: 'REJECT',
        notes: 'Invalid UPI ID provided',
      }),
    })
    assert.strictEqual(rejectRes.status, 200)
    const rejectData = await rejectRes.json()
    assert.strictEqual(rejectData.status, 'REJECTED')

    // Verify balance refunded back to initialBalance
    const walRes = await fetch(`${baseUrl}/api/wallet/${user.id}`, { headers: userHeaders })
    const walData = await walRes.json()
    assert.strictEqual(Number(walData.wallet.balance), initialBalance)
    console.log(`✓ Withdrawal rejected by Admin. Balance restored to ₹${walData.wallet.balance}`)

    // 5. Submit Bank Withdrawal Request (₹200) & Admin Approval
    console.log('5. Testing Bank Withdrawal Request & Admin Approval...')
    const bankWRes = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        userId: user.id,
        amount: 200,
        payoutMethod: 'BANK',
        bankDetails: {
          accountNumber: '123456789012',
          ifsc: 'HDFC0001234',
          holderName: 'Test Player',
        },
      }),
    })
    const bankWData = await bankWRes.json()
    assert.strictEqual(bankWRes.status, 201)
    const withdrawalId2 = bankWData.withdrawal.id

    const approveRes = await fetch(`${baseUrl}/api/wallet/withdraw/verify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        withdrawalId: withdrawalId2,
        action: 'APPROVE',
        notes: 'IMPS Ref #89234710',
      }),
    })
    assert.strictEqual(approveRes.status, 200)
    const approveData = await approveRes.json()
    assert.strictEqual(approveData.status, 'APPROVED')
    console.log('✓ Bank withdrawal successfully submitted and approved by Admin')

    // 6. Test VIP Daily Check-In Bonus
    console.log('6. Testing VIP Daily Check-In Bonus...')
    const vipRes = await fetch(`${baseUrl}/api/wallet/vip/claim`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({ userId: user.id }),
    })
    assert.strictEqual(vipRes.status, 200, 'VIP claim failed')
    const vipData = await vipRes.json()
    assert.ok(vipData.bonusAmount >= 15 && vipData.bonusAmount <= 50, 'Bonus must be between 15 and 50')
    console.log(`✓ Claimed VIP Daily Bonus: ₹${vipData.bonusAmount}! New Balance: ₹${vipData.newBalance}`)

    // 7. Test Duplicate Daily Claim within 24h
    console.log('7. Testing Duplicate Claim Prevention...')
    const dupClaimRes = await fetch(`${baseUrl}/api/wallet/vip/claim`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({ userId: user.id }),
    })
    assert.strictEqual(dupClaimRes.status, 400, 'Duplicate claim must be rejected with 400')
    const dupClaimData = await dupClaimRes.json()
    assert.ok(dupClaimData.error.includes('already claimed'))
    console.log('✓ Duplicate 24h VIP claim properly prevented (400)')

    console.log('\n--- ALL WITHDRAWAL & VIP BONUS TESTS PASSED SUCCESSFULLY! ---')
  } finally {
    server.close()
  }
}

runWithdrawalAndVIPTests().catch((err) => {
  console.error('Withdrawal/VIP test failed:', err)
  process.exit(1)
})
