import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from '../config/supabase.js'
import { generateToken } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const BASE_URL = 'http://127.0.0.1:5000/api'
const TEST_PHONE = '8433125736'
const TEST_BACKUP_EMAIL = 'recovery.test69@game.69club1.site'

async function runBackupEmailTests() {
  console.log('=== 1. Fetching Test User Account ===')
  const { data: userProfile, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, email, password_hash')
    .eq('username', TEST_PHONE)
    .single()

  if (pErr || !userProfile) {
    throw new Error('Could not find user profile for ' + TEST_PHONE)
  }

  const originalHash = userProfile.password_hash
  const originalEmail = userProfile.email

  const token = generateToken({
    id: userProfile.id,
    username: userProfile.username,
    role: 'admin',
  })

  console.log('User found:', { id: userProfile.id, username: userProfile.username, currentEmail: userProfile.email })

  console.log('\n=== 2. Testing Invalid Email Format Rejection ===')
  const badRes = await fetch(`${BASE_URL}/service/settings/bind-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: 'not-an-email' }),
  })
  const badData = await badRes.json()
  console.log('Invalid email response (status ' + badRes.status + '):', badData)
  if (badRes.status !== 400) {
    throw new Error('FAIL: Invalid email format should return 400')
  }
  console.log('✓ PASS: Invalid email format properly rejected.')

  console.log('\n=== 3. Testing Binding Backup Recovery Email ===')
  const bindRes = await fetch(`${BASE_URL}/service/settings/bind-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: TEST_BACKUP_EMAIL }),
  })
  const bindData = await bindRes.json()
  console.log('Bind email response (status ' + bindRes.status + '):', bindData)
  if (!bindRes.ok || !bindData.success) {
    throw new Error('FAIL: Binding backup email failed: ' + JSON.stringify(bindData))
  }
  console.log('✓ PASS: Backup email bound successfully in database.')

  // Verify in database
  const { data: updatedDbProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userProfile.id)
    .single()

  if (updatedDbProfile.email !== TEST_BACKUP_EMAIL) {
    throw new Error('FAIL: DB email does not match bound email!')
  }
  console.log('✓ PASS: Verified email in DB profiles table:', updatedDbProfile.email)

  console.log('\n=== 4. Testing Uniqueness: Preventing Another Account from using Same Email ===')
  // Create a temporary mock user ID to simulate another user trying to bind the same email
  const fakeOtherUserId = '00000000-0000-0000-0000-000000000001'
  const otherToken = generateToken({
    id: fakeOtherUserId,
    username: 'other_user',
    role: 'user',
  })

  const duplicateRes = await fetch(`${BASE_URL}/service/settings/bind-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otherToken}`,
    },
    body: JSON.stringify({ email: TEST_BACKUP_EMAIL }),
  })
  const duplicateData = await duplicateRes.json()
  console.log('Duplicate email attempt response (status ' + duplicateRes.status + '):', duplicateData)
  if (duplicateRes.status !== 400) {
    throw new Error('FAIL: Duplicate email must be blocked with 400')
  }
  console.log('✓ PASS: Duplicate email binding strictly rejected by uniqueness check.')

  console.log('\n=== 5. Testing Forgot Password with Bound Backup Email ===')
  // User enters the backup email into forgot-password screen
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_BACKUP_EMAIL,
      channel: 'EMAIL',
    }),
  })
  const forgotData = await forgotRes.json()
  console.log('Forgot password via backup email response:', forgotData)
  if (!forgotRes.ok || !forgotData.success) {
    throw new Error('FAIL: Forgot password with backup email failed: ' + JSON.stringify(forgotData))
  }
  console.log('✓ PASS: Forgot password request succeeded for backup email.')

  // Fetch the OTP from database
  const { data: resetRecords } = await supabase
    .from('password_resets')
    .select('*')
    .eq('identity', TEST_BACKUP_EMAIL)
    .eq('is_used', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!resetRecords || resetRecords.length === 0) {
    throw new Error('FAIL: No password reset record created for backup email')
  }
  const otpCode = resetRecords[0].otp_code
  console.log('✓ PASS: Found OTP in DB for backup email:', {
    destination: resetRecords[0].destination,
    channel: resetRecords[0].channel,
  })

  console.log('\n=== 6. Testing OTP Verification & Password Reset via Backup Email ===')
  // Verify OTP
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_BACKUP_EMAIL,
      otpCode,
    }),
  })
  const verifyData = await verifyRes.json()
  if (!verifyRes.ok || !verifyData.success) {
    throw new Error('FAIL: OTP verification failed: ' + JSON.stringify(verifyData))
  }
  console.log('✓ PASS: OTP verified successfully.')

  // Reset password
  const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: TEST_BACKUP_EMAIL,
      resetCode: otpCode,
      newPassword: 'newrecoverypass123',
    }),
  })
  const resetData = await resetRes.json()
  if (!resetRes.ok) {
    throw new Error('FAIL: Reset password failed: ' + JSON.stringify(resetData))
  }
  console.log('✓ PASS: Password successfully reset using backup email!')

  // Cleanup: Restore original email and password hash
  console.log('\n=== 7. Cleanup & Restoring Original State ===')
  await supabase
    .from('profiles')
    .update({ email: originalEmail, password_hash: originalHash })
    .eq('id', userProfile.id)
  await supabase.from('password_resets').delete().eq('identity', TEST_BACKUP_EMAIL)
  console.log('✓ Restored user profile to original state.')

  console.log('\n======================================================')
  console.log('ALL BACKUP EMAIL TESTS PASSED WITH 100% SUCCESS!')
  console.log('======================================================')
  process.exit(0)
}

runBackupEmailTests().catch((err) => {
  console.error('TEST ERROR:', err)
  process.exit(1)
})
