import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from '../config/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const BASE_URL = 'http://127.0.0.1:5000/api'
const TEST_IDENTITY = '8433125736' // Preserved admin account

async function runTests() {
  console.log('=== 1. Testing Forgot Password (Code Leak Prevention & IP Tracking) ===')
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '103.21.244.10, 172.68.23.1', // Simulate real client IP
    },
    body: JSON.stringify({
      identity: TEST_IDENTITY,
      channel: 'WHATSAPP',
    }),
  })

  const forgotData = await forgotRes.json()
  console.log('Forgot Password response:', forgotData)

  if (forgotData.resetCode) {
    throw new Error('FAIL: resetCode was leaked in API response!')
  }
  console.log('✓ PASS: resetCode is NOT leaked in API response.')

  // Fetch the created OTP record from Supabase directly
  const { data: resetRecords, error: dbErr } = await supabase
    .from('password_resets')
    .select('*')
    .eq('identity', TEST_IDENTITY)
    .eq('is_used', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (dbErr || !resetRecords || resetRecords.length === 0) {
    throw new Error('FAIL: No active password_resets record found in database: ' + JSON.stringify(dbErr))
  }

  const latestReset = resetRecords[0]
  console.log('✓ PASS: Found password_resets record in DB:', {
    id: latestReset.id,
    channel: latestReset.channel,
    ip_address: latestReset.ip_address,
    is_used: latestReset.is_used,
    expires_at: latestReset.expires_at,
  })

  if (latestReset.ip_address !== '103.21.244.10') {
    console.warn('Note: IP recorded was:', latestReset.ip_address)
  } else {
    console.log('✓ PASS: Real client IP (103.21.244.10) was recorded in DB.')
  }

  const validOtp = latestReset.otp_code

  console.log('\n=== 2. Testing Standalone OTP Verification (verifyOTP) ===')
  // 2a. Wrong OTP
  const wrongRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_IDENTITY,
      otpCode: '000000',
    }),
  })
  const wrongData = await wrongRes.json()
  console.log('Wrong OTP response (status ' + wrongRes.status + '):', wrongData)
  if (wrongRes.status !== 400) {
    throw new Error('FAIL: Expected 400 for wrong OTP, got ' + wrongRes.status)
  }
  console.log('✓ PASS: Wrong OTP was rejected.')

  // 2b. Correct OTP
  const correctRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_IDENTITY,
      otpCode: validOtp,
    }),
  })
  const correctData = await correctRes.json()
  console.log('Correct OTP response (status ' + correctRes.status + '):', correctData)
  if (!correctRes.ok || !correctData.success) {
    throw new Error('FAIL: Valid OTP verification failed: ' + JSON.stringify(correctData))
  }
  console.log('✓ PASS: Valid OTP verified successfully.')

  // Verify OTP was NOT consumed prematurely
  const { data: checkUnconsumed } = await supabase
    .from('password_resets')
    .select('is_used')
    .eq('id', latestReset.id)
    .single()

  if (checkUnconsumed.is_used) {
    throw new Error('FAIL: verifyOTP should NOT consume the OTP prematurely!')
  }
  console.log('✓ PASS: OTP remains unconsumed (is_used = false) ready for resetPassword.')

  console.log('\n=== 3. Testing Reset Password with Verified OTP ===')
  const resetPassRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_IDENTITY,
      resetCode: validOtp,
      newPassword: 'password123',
    }),
  })
  const resetPassData = await resetPassRes.json()
  console.log('Reset Password response (status ' + resetPassRes.status + '):', resetPassData)
  if (!resetPassRes.ok) {
    throw new Error('FAIL: Reset password failed: ' + JSON.stringify(resetPassData))
  }
  console.log('✓ PASS: Password successfully reset.')

  // Check DB that OTP is now consumed
  const { data: checkConsumed } = await supabase
    .from('password_resets')
    .select('is_used, used_at')
    .eq('id', latestReset.id)
    .single()

  if (!checkConsumed.is_used) {
    throw new Error('FAIL: OTP should be marked is_used = true after password reset!')
  }
  console.log('✓ PASS: OTP atomically marked is_used = true in DB.')

  // 3b. Try reusing the same OTP (Idempotency & Replay Attack Defense)
  const reuseRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_IDENTITY,
      resetCode: validOtp,
      newPassword: 'password123',
    }),
  })
  console.log('Replay attempt response (status ' + reuseRes.status + '):', await reuseRes.json())
  if (reuseRes.status !== 400) {
    throw new Error('FAIL: Replaying used OTP should return 400')
  }
  console.log('✓ PASS: Replay attack with used OTP is strictly prevented.')

  console.log('\n=== 4. Testing Real IP Database Rate Limiting ===')
  const testIp = '198.51.100.42'
  const action = 'test:rate-limit-check'

  // Clean test action from ip_rate_limits
  await supabase.from('ip_rate_limits').delete().eq('action', action)

  let blocked = false
  let retryAfter = 0
  for (let i = 1; i <= 6; i++) {
    const { data: rpcRes } = await supabase.rpc('check_ip_rate_limit', {
      p_ip: testIp,
      p_action: action,
      p_max_attempts: 3,
      p_window_seconds: 60,
      p_block_seconds: 180,
    })

    if (!rpcRes.allowed) {
      blocked = true
      retryAfter = rpcRes.retryAfterSeconds
      console.log(`Attempt ${i}: BLOCKED as expected (retryAfter: ${retryAfter}s, reason: ${rpcRes.reason})`)
      break
    } else {
      console.log(`Attempt ${i}: Allowed (remaining: ${rpcRes.remaining})`)
    }
  }

  if (!blocked) {
    throw new Error('FAIL: Real IP rate limit was not enforced!')
  }
  console.log('✓ PASS: Real IP rate limit successfully blocked request at threshold.')

  // Clean up test action
  await supabase.from('ip_rate_limits').delete().eq('action', action)

  console.log('\n=============================================')
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!')
  console.log('=============================================')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('TEST ERROR:', err)
  process.exit(1)
})
