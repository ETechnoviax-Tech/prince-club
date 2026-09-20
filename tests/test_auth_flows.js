import assert from 'assert'
import app from '../server/index.js'

async function runAuthTests() {
  console.log('--- Starting Authentication Flow Tests (Signup, Login, Forgot, Reset) ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    const testUsername = 'testuser_' + Math.random().toString(36).substring(2, 7)
    const testPassword = 'password123'
    const newPassword = 'newPassword456'

    // 1. Signup / Register
    console.log('1. Testing Signup...')
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: testPassword,
        referralCode: 'VIP2026',
      }),
    })
    const signupJson = await signupRes.json()
    assert.strictEqual(signupRes.status, 201, `Signup failed: ${JSON.stringify(signupJson)}`)
    assert.strictEqual(signupJson.user.username, testUsername)
    assert.strictEqual(signupJson.wallet.balance, 1200) // with referral bonus
    console.log(`✓ Signup passed for ${testUsername} with balance ₹${signupJson.wallet.balance}`)

    // 2. Duplicate Signup Prevention
    console.log('2. Testing Duplicate Signup Prevention...')
    const dupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    })
    assert.strictEqual(dupRes.status, 409)
    console.log('✓ Duplicate username properly prevented (409 Conflict)')

    // 3. Login with correct password
    console.log('3. Testing Login with valid credentials...')
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    })
    const loginJson = await loginRes.json()
    assert.strictEqual(loginRes.status, 200)
    assert.strictEqual(loginJson.user.username, testUsername)
    console.log('✓ Login verified successfully')

    // 4. Login with wrong password
    console.log('4. Testing Login with incorrect password...')
    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'wrongpassword',
      }),
    })
    assert.strictEqual(wrongLoginRes.status, 401)
    console.log('✓ Wrong password rejected (401 Unauthorized)')

    // 5. Forgot Password (OTP request)
    console.log('5. Testing Forgot Password OTP request...')
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: testUsername }),
    })
    const forgotJson = await forgotRes.json()
    assert.strictEqual(forgotRes.status, 200)
    assert(forgotJson.resetCode, 'Reset code missing')
    const otpCode = forgotJson.resetCode
    console.log(`✓ OTP generated successfully: ${otpCode}`)

    // 6. Reset Password with OTP
    console.log('6. Testing Password Reset with OTP...')
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: testUsername,
        resetCode: otpCode,
        newPassword: newPassword,
      }),
    })
    const resetJson = await resetRes.json()
    assert.strictEqual(resetRes.status, 200, `Reset failed: ${JSON.stringify(resetJson)}`)
    console.log('✓ Password reset confirmed with OTP')

    // 7. Login with old password (must fail)
    console.log('7. Verifying Old Password no longer works...')
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    })
    assert.strictEqual(oldLoginRes.status, 401)
    console.log('✓ Old password rejected as expected')

    // 8. Login with new password (must succeed)
    console.log('8. Verifying Login with New Password...')
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: newPassword,
      }),
    })
    assert.strictEqual(newLoginRes.status, 200)
    console.log('✓ Login with New Password succeeded!')

    console.log('\n--- ALL AUTHENTICATION FLOW TESTS PASSED SUCCESSFULLY! ---')
  } finally {
    server.close()
  }
}

runAuthTests().catch((err) => {
  console.error('Auth Test Failed:', err)
  process.exit(1)
})
