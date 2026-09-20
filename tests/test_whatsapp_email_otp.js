import assert from 'assert'
import app from '../server/index.js'

async function runOtpTests() {
  console.log('--- Starting WhatsApp & Email OTP Verification Tests ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    const testUsername = 'otpuser_' + Math.random().toString(36).substring(2, 7)
    const testPhone = '98765' + Math.floor(10000 + Math.random() * 90000)
    const testEmail = `${testUsername}@example.com`
    const initialPass = 'initialPass123'
    const newPass = 'updatedPass456'

    // 1. Register User
    console.log('1. Registering user for OTP testing...')
    const regRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: initialPass,
      }),
    })
    assert.strictEqual(regRes.status, 201)
    console.log(`✓ User registered: ${testUsername} (${testEmail})`)

    // 2. Request WhatsApp OTP
    console.log('2. Testing WhatsApp OTP dispatch...')
    const waRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: testPhone,
        channel: 'WHATSAPP',
      }),
    })
    const waJson = await waRes.json()
    assert.strictEqual(waRes.status, 200, `WhatsApp OTP failed: ${JSON.stringify(waJson)}`)
    assert.strictEqual(waJson.channel, 'WHATSAPP')
    assert(waJson.resetCode, 'Reset code must be returned')
    assert(waJson.destination.includes('+91'), 'Phone number should be formatted with country code')
    console.log(`✓ WhatsApp OTP delivered successfully to ${waJson.destination} (Code: ${waJson.resetCode})`)

    // 3. Request Email OTP
    console.log('3. Testing Email OTP dispatch...')
    const emailRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: testEmail,
        channel: 'EMAIL',
      }),
    })
    const emailJson = await emailRes.json()
    assert.strictEqual(emailRes.status, 200, `Email OTP failed: ${JSON.stringify(emailJson)}`)
    assert.strictEqual(emailJson.channel, 'EMAIL')
    assert.strictEqual(emailJson.destination, testEmail)
    console.log(`✓ Email OTP delivered successfully to ${emailJson.destination} (Code: ${emailJson.resetCode})`)

    // 4. Standalone Send & Verify OTP endpoint test
    console.log('4. Testing Standalone /api/auth/send-otp & /api/auth/verify-otp...')
    const sendOtpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: '+919999888877',
        channel: 'WHATSAPP',
      }),
    })
    const sendOtpJson = await sendOtpRes.json()
    assert.strictEqual(sendOtpRes.status, 200)
    assert.strictEqual(sendOtpJson.success, true)

    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: '+919999888877',
        otpCode: sendOtpJson.otpCode,
      }),
    })
    const verifyJson = await verifyRes.json()
    assert.strictEqual(verifyRes.status, 200)
    assert.strictEqual(verifyJson.verified || verifyJson.success, true)
    console.log('✓ Standalone WhatsApp OTP generated and verified successfully')

    // 5. Complete Password Reset with Email OTP
    console.log('5. Completing Password Reset with Email OTP...')
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: testUsername,
        resetCode: emailJson.resetCode,
        newPassword: newPass,
      }),
    })
    const resetJson = await resetRes.json()
    assert.strictEqual(resetRes.status, 200, `Reset failed: ${JSON.stringify(resetJson)}`)
    console.log('✓ Password reset confirmed with OTP')

    // 6. Verify New Password Login
    console.log('6. Verifying Login with New Password...')
    const loginNewRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: newPass,
      }),
    })
    assert.strictEqual(loginNewRes.status, 200)
    console.log('✓ Login with New Password succeeded!')

    console.log('\n--- ALL WHATSAPP & EMAIL OTP TESTS PASSED SUCCESSFULLY! ---')
  } finally {
    server.close()
  }
}

runOtpTests().catch((err) => {
  console.error('OTP test failed:', err)
  process.exit(1)
})
