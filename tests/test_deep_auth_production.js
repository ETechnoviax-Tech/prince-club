import assert from 'assert'

const BASE = 'http://localhost:5000/api/auth'

async function runDeepAuthTests() {
  console.log('🧪 [DEEP PRODUCTION AUTH TEST SUITE] Starting exhaustive verification...\n')

  // 1. Non-existent phone login
  const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000)
  const res1 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: randomPhone, password: 'Password123!' }),
  })
  const json1 = await res1.json()
  assert.strictEqual(res1.status, 401, 'Non-existent phone must return 401')
  assert(json1.error.includes('Account does not exist'), 'Must state account does not exist')
  console.log('✅ 1. Random unregistered phone rejected with 401 Account does not exist')

  // 2. Non-existent email login
  const randomEmail = `ghost_${Date.now()}@example.com`
  const res2 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: randomEmail, password: 'Password123!' }),
  })
  const json2 = await res2.json()
  assert.strictEqual(res2.status, 401, 'Non-existent email must return 401')
  console.log('✅ 2. Random unregistered email rejected with 401 Account does not exist')

  // 3. Short credentials rejection
  const res3 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ab', password: '12' }),
  })
  assert.strictEqual(res3.status, 400, 'Invalid short credentials must return 400')
  console.log('✅ 3. Invalid / short credentials rejected with 400')

  // 4. Register new phone user
  const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000)
  const testPass = 'Secret_Pass_999'
  const res4 = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: testPass }),
  })
  const json4 = await res4.json()
  assert.strictEqual(res4.status, 201, 'Registration must return 201')
  assert(json4.token, 'Must return JWT token')
  assert(json4.user, 'Must return user object')
  assert(json4.wallet?.balance >= 1000, 'Must initialize wallet')
  console.log(`✅ 4. Real phone registration succeeded (201 Created, UID: ${json4.user.id})`)

  // 5. Duplicate phone registration prevention
  const res5 = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: 'AnotherPassword' }),
  })
  assert.strictEqual(res5.status, 409, 'Duplicate phone must return 409')
  console.log('✅ 5. Duplicate phone registration strictly blocked with 409 Conflict')

  // 6. Register new email user
  const testEmail = `player_${Date.now()}@domain.com`
  const emailPass = 'Email_Secure_888'
  const res6 = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testEmail, email: testEmail, password: emailPass }),
  })
  const json6 = await res6.json()
  assert.strictEqual(res6.status, 201, 'Email registration must return 201')
  console.log(`✅ 6. Real email registration succeeded (201 Created, Email: ${json6.user.email})`)

  // 7. Duplicate email prevention
  const res7 = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testEmail, email: testEmail, password: 'OtherPassword' }),
  })
  assert.strictEqual(res7.status, 409, 'Duplicate email must return 409')
  console.log('✅ 7. Duplicate email registration strictly blocked with 409 Conflict')

  // 8. Login with correct phone & correct password
  const res8 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: testPass }),
  })
  const json8 = await res8.json()
  assert.strictEqual(res8.status, 200, 'Correct phone login must return 200')
  assert(json8.token, 'Must return signed token')
  console.log('✅ 8. Login with registered phone & valid password succeeded (200 OK)')

  // 9. Login with registered phone & WRONG password
  const res9 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: 'INCORRECT_PASSWORD' }),
  })
  const json9 = await res9.json()
  assert.strictEqual(res9.status, 401, 'Wrong password must return 401')
  assert(json9.error.includes('Incorrect password'), 'Must return password mismatch error')
  console.log('✅ 9. Login with registered phone & wrong password strictly rejected with 401')

  // 10. Login with registered email & correct password
  const res10 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testEmail, password: emailPass }),
  })
  const json10 = await res10.json()
  assert.strictEqual(res10.status, 200, 'Correct email login must return 200')
  console.log('✅ 10. Login with registered email & valid password succeeded (200 OK)')

  // 11. Login with registered email & WRONG password
  const res11 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testEmail, password: 'BAD_PASSWORD' }),
  })
  assert.strictEqual(res11.status, 401, 'Wrong email password must return 401')
  console.log('✅ 11. Login with registered email & wrong password strictly rejected with 401')

  // 12. Forgot password OTP dispatch
  const res12 = await fetch(`${BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: testPhone, channel: 'WHATSAPP' }),
  })
  const json12 = await res12.json()
  assert.strictEqual(res12.status, 200, 'Forgot password request must return 200')
  assert(json12.resetCode, 'Reset code must be generated')
  const resetOtp = json12.resetCode
  console.log(`✅ 12. Forgot password generated 6-digit verification code: ${resetOtp}`)

  // 13. Reset password with invalid OTP
  const res13 = await fetch(`${BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: testPhone,
      resetCode: '000000',
      newPassword: 'BrandNewPassword1!',
    }),
  })
  assert.strictEqual(res13.status, 400, 'Invalid OTP must return 400')
  console.log('✅ 13. Invalid OTP code rejected with 400 Bad Request')

  // 14. Reset password with correct OTP
  const brandNewPassword = 'BrandNewPassword1!'
  const res14 = await fetch(`${BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: testPhone,
      resetCode: resetOtp,
      newPassword: brandNewPassword,
    }),
  })
  assert.strictEqual(res14.status, 200, 'Reset password with valid OTP must return 200')
  console.log('✅ 14. Password reset successfully updated credentials (200 OK)')

  // 15. Attempt login with OLD password -> must fail
  const res15 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: testPass }),
  })
  assert.strictEqual(res15.status, 401, 'Old password must be rejected after reset')
  console.log('✅ 15. Old password immediately invalidated (401 Unauthorized)')

  // 16. Login with NEW password -> must succeed
  const res16 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testPhone, password: brandNewPassword }),
  })
  const json16 = await res16.json()
  assert.strictEqual(res16.status, 200, 'New password login must succeed')
  assert(json16.token, 'New JWT token generated')
  console.log('✅ 16. Login with newly reset password succeeded (200 OK)')

  console.log('\n🎉 ALL 16 PRODUCTION AUTH TESTS PASSED 100% CLEANLY!')
}

runDeepAuthTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
})
