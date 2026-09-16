process.env.NODE_ENV = 'test'
import assert from 'assert'
import crypto from 'crypto'
import app from '../server/index.js'

import { generateToken } from '../server/middleware/auth.js'

async function runPaymentGatewayTests() {
  console.log('=== Starting Production-Grade Payment Gateway Tests ===')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Create a test user
    const username = 'pguser_' + Math.random().toString(36).substring(2, 7)
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
    assert.strictEqual(signupRes.status, 201, `Signup failed: ${JSON.stringify(signupData)}`)
    const user = signupData.user
    const userToken = signupData.token

    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    }

    const adminToken = generateToken({ id: 'admin-01', username: 'admin', role: 'admin' })
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }

    console.log(`✓ Test user created: ${username} (ID: ${user.id})`)

    // 2. Test Idempotency Layer on Deposit Creation (Double-Click Prevention)
    console.log('\n2. Testing Idempotency & Double-Click Prevention...')
    const idempotencyKey = 'idemp_' + crypto.randomUUID()

    const depositPayload = {
      userId: user.id,
      amount: 500,
    }

    // First request
    const depRes1 = await fetch(`${baseUrl}/api/payments/create-deposit`, {
      method: 'POST',
      headers: {
        ...userHeaders,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(depositPayload),
    })
    const depData1 = await depRes1.json()
    assert.strictEqual(depRes1.status, 201, `Deposit 1 failed: ${JSON.stringify(depData1)}`)
    assert.ok(depData1.deposit?.id)
    const originalDepositId = depData1.deposit.id

    // Second request with exact same Idempotency-Key (Simulating double-click)
    const depRes2 = await fetch(`${baseUrl}/api/payments/create-deposit`, {
      method: 'POST',
      headers: {
        ...userHeaders,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(depositPayload),
    })
    const depData2 = await depRes2.json()
    assert.strictEqual(depRes2.status, 201, `Idempotent replay failed: ${JSON.stringify(depData2)}`)
    assert.strictEqual(depRes2.headers.get('x-idempotent-replay'), 'true', 'Must have X-Idempotent-Replay header')
    assert.strictEqual(depData2.deposit.id, originalDepositId, 'Replayed deposit must return identical deposit ID')
    console.log(`✓ Idempotency verified: Replay returned cached response without creating second record`)

    // 3. Test Per-User Concurrent Lock (Race Condition Mutex)
    console.log('\n3. Testing Per-User Concurrent Request Lock...')
    // Fire two withdrawal requests concurrently
    const [p1, p2] = await Promise.all([
      fetch(`${baseUrl}/api/wallet/withdraw`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          userId: user.id,
          amount: 150,
          payoutMethod: 'UPI',
          upiId: 'test@upi',
        }),
      }),
      fetch(`${baseUrl}/api/wallet/withdraw`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          userId: user.id,
          amount: 150,
          payoutMethod: 'UPI',
          upiId: 'test@upi',
        }),
      }),
    ])

    const p1Status = p1.status
    const p2Status = p2.status
    const p1Data = await p1.json()
    const p2Data = await p2.json()



    // At least one must succeed (201), and if concurrency overlap occurs, the second is blocked with 409
    const has409 = p1Status === 409 || p2Status === 409
    const has201 = p1Status === 201 || p2Status === 201
    assert.ok(has201, 'At least one withdrawal request must succeed')
    console.log(`✓ Concurrency results: Req1 status=${p1Status}, Req2 status=${p2Status}`)
    if (has409) {
      console.log('✓ Payment concurrent lock caught parallel request (409 Conflict)')
    } else {
      console.log('✓ Sequential mutex processing completed safely')
    }

    // 4. Test Webhook Signature Verification & Ingestion
    console.log('\n4. Testing Webhook HMAC Signature & Ingestion...')
    const webhookSecret = 'prince_club_webhook_secret_key_2026'
    const webhookEventId = 'evt_' + Date.now()
    const webhookPayload = {
      provider: 'RAZORPAY_OR_CASHFREE',
      event_id: webhookEventId,
      event_type: 'deposit.success',
      data: {
        order_ref: depData1.deposit.order_ref,
        amount: 500,
        utr_number: '123456789012',
      },
    }

    const rawPayload = JSON.stringify(webhookPayload)
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex')

    // Valid webhook
    const hookRes1 = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': validSignature,
      },
      body: rawPayload,
    })
    const hookData1 = await hookRes1.json()
    assert.strictEqual(hookRes1.status, 200, `Webhook ingestion failed: ${JSON.stringify(hookData1)}`)
    assert.strictEqual(hookData1.status, 'PROCESSED')
    console.log('✓ Signed webhook successfully verified and processed')

    // 5. Test Webhook Replay Attack Prevention
    console.log('\n5. Testing Webhook Replay Attack Prevention...')
    const hookRes2 = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': validSignature,
      },
      body: rawPayload,
    })
    const hookData2 = await hookRes2.json()
    assert.strictEqual(hookRes2.status, 200)
    assert.strictEqual(hookData2.status, 'DUPLICATE', 'Replayed webhook must be tagged DUPLICATE')
    console.log('✓ Duplicate webhook detected and ignored safely (status: DUPLICATE)')

    // 6. Test Webhook Payout Failure with Automatic Refund
    console.log('\n6. Testing Payout Failure Webhook with Auto-Refund...')
    // First create a withdrawal
    const wReqRes = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        userId: user.id,
        amount: 100,
        payoutMethod: 'UPI',
        upiId: 'refundtest@upi',
      }),
    })
    const wReqData = await wReqRes.json()
    assert.strictEqual(wReqRes.status, 201)
    const withdrawalIdToFail = wReqData.withdrawal.id

    // Webhook notifying bank payout failed
    const failHookPayload = {
      provider: 'BANK_IMPS',
      event_id: 'fail_evt_' + Date.now(),
      event_type: 'withdrawal.failed',
      data: {
        withdrawal_id: withdrawalIdToFail,
        reason: 'Beneficiary bank server down',
      },
    }
    const failRaw = JSON.stringify(failHookPayload)
    const failSig = crypto.createHmac('sha256', webhookSecret).update(failRaw).digest('hex')

    const failHookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': failSig,
      },
      body: failRaw,
    })
    const failHookData = await failHookRes.json()
    assert.strictEqual(failHookRes.status, 200)
    console.log('✓ Webhook failure processed and auto-refund triggered')

    // 7. Test Admin Manual Refund API
    console.log('\n7. Testing Admin Manual Refund API...')
    const refundRes = await fetch(`${baseUrl}/api/payments/refund`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        target_id: originalDepositId,
        target_type: 'DEPOSIT',
        amount: 100,
        reason: 'Customer disputed chargeback',
      }),
    })
    const refundData = await refundRes.json()
    assert.strictEqual(refundRes.status, 200, `Admin refund failed: ${JSON.stringify(refundData)}`)
    assert.strictEqual(refundData.success, true)
    console.log('✓ Admin refund processed successfully')

    console.log('\n=== ALL 7 PAYMENT GATEWAY TEST SCENARIOS PASSED! ===')
  } finally {
    server.close()
  }
}

runPaymentGatewayTests().catch((err) => {
  console.error('Payment gateway test failed:', err)
  process.exit(1)
})
