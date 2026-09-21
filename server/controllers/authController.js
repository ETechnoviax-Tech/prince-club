import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { generateToken } from '../middleware/auth.js'
import { dispatchOTP } from '../services/notificationService.js'
import { getClientRealIp } from '../middleware/rateLimit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CREDENTIALS_FILE = path.join(__dirname, '../db/credentials.json')
const PROFILES_FILE = path.join(__dirname, '../db/profiles.json')

// In-memory fallback stores with file persistence
export const memoryProfiles = new Map()
export const memoryCredentials = new Map() // id/username/email -> passwordHash
export const resetCodes = new Map() // identity -> { code, expiresAt }

export async function loadCredentialsFromDisk() {
  try {
    const raw = await fs.promises.readFile(CREDENTIALS_FILE, 'utf8').catch(() => null)
    if (raw) {
      const parsed = JSON.parse(raw)
      for (const [k, v] of Object.entries(parsed)) {
        memoryCredentials.set(k, v)
      }
    }
  } catch (err) {
    console.warn('[Credentials] Failed to load credentials from disk:', err.message)
  }
}

export async function saveCredentialsToDisk() {
  try {
    const obj = Object.fromEntries(memoryCredentials.entries())
    await fs.promises.writeFile(CREDENTIALS_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    console.warn('[Credentials] Failed to save credentials to disk:', err.message)
  }
}

export async function loadProfilesFromDisk() {
  try {
    const raw = await fs.promises.readFile(PROFILES_FILE, 'utf8').catch(() => null)
    if (raw) {
      const parsed = JSON.parse(raw)
      for (const [k, v] of Object.entries(parsed)) {
        memoryProfiles.set(k, v)
      }
    }
  } catch (err) {
    console.warn('[Profiles] Failed to load profiles from disk:', err.message)
  }
}

export async function saveProfilesToDisk() {
  try {
    const obj = Object.fromEntries(memoryProfiles.entries())
    await fs.promises.writeFile(PROFILES_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    console.warn('[Profiles] Failed to save profiles to disk:', err.message)
  }
}

// Load on boot (async non-blocking)
loadCredentialsFromDisk().catch(() => {})
loadProfilesFromDisk().catch(() => {})


export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + '_prince_salt_2026_vault').digest('hex')
}

// 1. Strict Login (Never auto-creates accounts; only registered users can log in)
export async function loginOrRegister(req, res) {
  try {
    const { identity, password } = req.validatedLogin || {
      identity: (req.body.username || req.body.identity || '').trim().toLowerCase(),
      password: req.body.password,
    }

    if (!identity || identity.length < 3) {
      return res.status(400).json({ error: 'Username, phone number, or email must be at least 3 characters' })
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    const cleanUsername = identity

    if (isSupabaseConfigured) {
      // 1. Check if profile exists by username or email
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${cleanUsername},email.eq.${cleanUsername}`)
        .maybeSingle()

      if (error) {
        console.error('[Supabase Error] find profile:', error)
        return res.status(500).json({ error: 'Error checking user credentials' })
      }

      // If user does NOT exist, strictly reject! Never auto-create on login.
      if (!profile) {
        return res.status(401).json({ error: 'Account does not exist. Please click Register to create an account.' })
      }

      // Strictly verify password (profile.password_hash may not exist in schema \u2014 use memoryCredentials)
      const storedHash =
        memoryCredentials.get(profile.id) ||
        memoryCredentials.get(profile.username) ||
        (profile.email && memoryCredentials.get(profile.email)) ||
        profile.password_hash // fallback if column exists

      if (!storedHash || storedHash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' })
      }

      // Fetch or auto-init wallet for this registered profile
      let { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (!wallet) {
        const { data: newWal } = await supabase
          .from('wallets')
          .insert({ user_id: profile.id, balance: 1000.0 })
          .select()
          .single()
        wallet = newWal
      }

      const userRole = profile.is_admin === true ? 'admin' : (profile.role || 'user')
      const token = generateToken({
        id: profile.id,
        username: profile.username,
        role: userRole,
        is_admin: Boolean(profile.is_admin || profile.role === 'admin'),
      })

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          role: userRole,
          is_admin: Boolean(profile.is_admin || profile.role === 'admin'),
        },
        wallet: wallet || { balance: 1000.0 },
      })
    }

    // Local Fallback Store — search by username, phone variants, or email
    const phoneVariants = /^\d{10}$/.test(cleanUsername)
      ? [cleanUsername, `+91${cleanUsername}`, `91${cleanUsername}`]
      : /^(\+91|91)(\d{10})$/.test(cleanUsername)
      ? [cleanUsername, cleanUsername.replace(/^(\+91|91)/, '')]
      : [cleanUsername]

    let profile = Array.from(memoryProfiles.values()).find(
      (p) => phoneVariants.includes(p.username) || (p.email && p.email === cleanUsername)
    )

    if (!profile) {
      return res.status(401).json({ error: 'Account does not exist. Please click Register to create an account.' })
    }

    // Try all credential lookup keys
    const storedHash =
      memoryCredentials.get(profile.id) ||
      memoryCredentials.get(profile.username) ||
      memoryCredentials.get(cleanUsername) ||
      phoneVariants.reduce((found, v) => found || memoryCredentials.get(v), null) ||
      (profile.email && memoryCredentials.get(profile.email))

    if (!storedHash || storedHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' })
    }

    const userRole = profile.is_admin === true ? 'admin' : (profile.role || 'user')
    const token = generateToken({
      id: profile.id,
      username: profile.username,
      role: userRole,
      is_admin: Boolean(profile.is_admin || profile.role === 'admin'),
    })

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: userRole,
        is_admin: Boolean(profile.is_admin || profile.role === 'admin'),
      },
      wallet: { balance: 1000.0 },
    })
  } catch (err) {
    console.error('[loginOrRegister Exception]:', err)
    return res.status(500).json({ error: 'Server error processing authentication' })
  }
}

// 2. Signup / Register
export async function register(req, res) {
  try {
    const { username, email, password, referralCode, otpCode } = req.validatedSignup || {
      username: (req.body.username || '').trim().toLowerCase(),
      email: (req.body.email || '').trim().toLowerCase() || null,
      password: req.body.password,
      referralCode: req.body.referralCode,
      otpCode: (req.body.otpCode || req.body.otp || '').trim() || null,
    }

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // BUG FIX: Must be `let` not `const` — may be reassigned if username conflict
    let cleanUsername = username
    const cleanEmail = email || null
    const hashed = hashPassword(password)

    // Verify OTP for email registration
    let validOtpId = null
    if (cleanEmail) {
      const cleanOtp = String(otpCode || '').trim()
      if (!cleanOtp) {
        return res.status(400).json({ error: 'Please enter the 6-digit verification code sent to your email.' })
      }

      if (isSupabaseConfigured) {
        const { data: otpRecord } = await supabase
          .from('password_resets')
          .select('id')
          .eq('identity', cleanEmail)
          .eq('otp_code', cleanOtp)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!otpRecord) {
          return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new OTP.' })
        }
        validOtpId = otpRecord.id
      } else {
        const cached = resetCodes.get(cleanEmail)
        if (!cached || cached.code !== cleanOtp || Date.now() > cached.expiresAt) {
          return res.status(400).json({ error: 'Invalid or expired verification code.' })
        }
        resetCodes.delete(cleanEmail)
      }
    }

    if (isSupabaseConfigured) {
      // Check duplicate
      const query = cleanEmail
        ? supabase.from('profiles').select('id, username, email').or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`)
        : supabase.from('profiles').select('id, username, email').eq('username', cleanUsername)

      const { data: existing } = await query.maybeSingle()

      if (existing) {
        if (existing.email && existing.email === cleanEmail) {
          return res.status(409).json({ error: 'Email is already registered. Please log in.' })
        }
        if (existing.username === cleanUsername) {
          return res.status(409).json({ error: 'Username already registered. Please log in.' })
        }
        cleanUsername = `${cleanUsername.slice(0, 18)}_${Math.floor(100 + Math.random() * 900)}`
      }

      // Resolve referral code if provided
      let referredBy = null
      if (referralCode) {
        try {
          const cleanRef = referralCode.trim().toUpperCase()
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .or(`referral_code.eq.${cleanRef},username.eq.${referralCode.trim().toLowerCase()}`)
            .maybeSingle()
          if (referrer?.id) {
            referredBy = referrer.id
          }
        } catch {}
      }

      const generatedRefCode = `PC${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`

      let profile = null
      try {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            username: cleanUsername,
            email: cleanEmail,
            role: 'user',
            password_hash: hashed,
            referral_code: generatedRefCode,
            referred_by: referredBy,
          })
          .select()
          .single()

        if (error) throw error
        profile = data
      } catch (insertErr) {
        // Fallback without new columns if schema mismatch
        try {
          const { data, error } = await supabase
            .from('profiles')
            .insert({
              username: cleanUsername,
              email: cleanEmail,
              role: 'user',
              password_hash: hashed,
            })
            .select()
            .single()
          if (error) throw error
          profile = data
        } catch (fallbackErr) {
          console.error('[Supabase Error] insert profile fallback:', fallbackErr)
          return res.status(500).json({ error: 'Failed to create user account', details: fallbackErr.message })
        }
      }

      // Store credentials under all possible lookup keys
      memoryCredentials.set(profile.id, hashed)
      memoryCredentials.set(cleanUsername, hashed)
      // Also store with +91 prefix for phone numbers (10-digit)
      if (/^\d{10}$/.test(cleanUsername)) {
        memoryCredentials.set(`+91${cleanUsername}`, hashed)
        memoryCredentials.set(`91${cleanUsername}`, hashed)
      }
      if (cleanEmail) memoryCredentials.set(cleanEmail, hashed)
      await saveCredentialsToDisk()

      const startingBal = referralCode ? 1200.0 : 1000.0
      await supabase.from('wallets').insert({
        user_id: profile.id,
        balance: startingBal,
      })

      // If user joined with referral, record bonus ledger entry
      if (referralCode) {
        try {
          await supabase.from('wallet_transactions').insert({
            user_id: profile.id,
            type: 'BONUS',
            amount: 200.0,
            balance_after: startingBal,
            description: `Referral Welcome Bonus (Code: ${referralCode.trim().toUpperCase()})`,
          })
        } catch {}
      }

      // Consume registration OTP atomically
      if (validOtpId && isSupabaseConfigured) {
        try {
          await supabase
            .from('password_resets')
            .update({ is_used: true, user_id: profile.id })
            .eq('id', validOtpId)
        } catch {}
      }

      const token = generateToken({
        id: profile.id,
        username: profile.username,
        role: profile.role || 'user',
      })

      return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          role: profile.role,
          referral_code: profile.referral_code || generatedRefCode,
        },
        wallet: { balance: startingBal },
      })
    }

    // Fallback local store
    const existing = Array.from(memoryProfiles.values()).find(
      (p) => p.username === cleanUsername || (cleanEmail && p.email === cleanEmail)
    )
    if (existing) {
      if (existing.email && existing.email === cleanEmail) {
        return res.status(409).json({ error: 'Email is already registered. Please log in.' })
      }
      return res.status(409).json({ error: 'Username already registered. Please log in.' })
    }

    const startingBal = referralCode ? 1200.0 : 1000.0
    const profile = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      email: cleanEmail,
      role: 'user',
      created_at: new Date().toISOString(),
    }

    memoryProfiles.set(profile.id, profile)
    memoryCredentials.set(profile.id, hashed)
    memoryCredentials.set(cleanUsername, hashed)
    // Also store with +91 prefix for phone numbers
    if (/^\d{10}$/.test(cleanUsername)) {
      memoryCredentials.set(`+91${cleanUsername}`, hashed)
      memoryCredentials.set(`91${cleanUsername}`, hashed)
    }
    if (cleanEmail) memoryCredentials.set(cleanEmail, hashed)
    await saveCredentialsToDisk()
    await saveProfilesToDisk()

    const token = generateToken({
      id: profile.id,
      username: profile.username,
      role: profile.role,
    })

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: profile.id, username: profile.username, email: profile.email, role: profile.role },
      wallet: { balance: startingBal },
    })
  } catch (err) {
    console.error('[register Exception]:', err)
    return res.status(500).json({ error: 'Failed to complete registration' })
  }
}

// 3. Forgot Password (persisted in password_resets table and dispatched via WhatsApp/Email)
export async function forgotPassword(req, res) {
  try {
    const cleanId = req.cleanIdentity || (req.body.identity || '').trim().toLowerCase()
    const channel = (req.body.channel || 'AUTO').toUpperCase()
    const clientIp = req.realIp || getClientRealIp(req)

    if (!cleanId || cleanId.length < 3) {
      return res.status(400).json({ error: 'Enter your registered username, phone, or email' })
    }

    // Generate secure 6-digit numeric OTP
    const code = String(crypto.randomInt(100000, 999999))
    const expiresAtMs = Date.now() + 15 * 60 * 1000 // 15 minutes
    const expiresAtIso = new Date(expiresAtMs).toISOString()

    resetCodes.set(cleanId, { code, expiresAt: expiresAtMs })

    let profile = null
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email')
          .or(`username.eq.${cleanId},email.eq.${cleanId}`)
          .maybeSingle()
        profile = data
      } catch {}
    }

    // Resolve target destination based on channel selection and registered profile info
    let targetDestination = cleanId
    if (channel === 'EMAIL') {
      if (profile?.email) {
        targetDestination = profile.email
      } else if (cleanId.includes('@')) {
        targetDestination = cleanId
      } else {
        return res.status(400).json({ error: 'No registered email found for this account. Please select WhatsApp OTP.' })
      }
    } else if (channel === 'WHATSAPP') {
      if (profile?.phone) {
        targetDestination = profile.phone
      } else if (!cleanId.includes('@')) {
        targetDestination = cleanId
      } else {
        return res.status(400).json({ error: 'Please enter your registered phone number for WhatsApp OTP.' })
      }
    }

    const dispatchResult = await dispatchOTP({
      identity: targetDestination,
      channel,
      otpCode: code,
      username: profile?.username || cleanId,
    })

    if (isSupabaseConfigured) {
      try {
        // Invalidate previous active OTPs for this identity
        await supabase
          .from('password_resets')
          .update({ is_used: true })
          .eq('identity', cleanId)
          .eq('is_used', false)

        // Insert new reset OTP record with channel, destination, and real client IP
        await supabase.from('password_resets').insert({
          user_id: profile ? profile.id : null,
          identity: cleanId,
          otp_code: code,
          channel: dispatchResult.channel || channel,
          destination: dispatchResult.destination || targetDestination,
          ip_address: clientIp,
          expires_at: expiresAtIso,
          is_used: false,
        })
      } catch (dbErr) {
        console.warn('[password_resets DB Notice]:', dbErr.message)
      }
    }

    return res.json({
      success: true,
      message: dispatchResult.deliveryMessage || 'Reset verification code sent successfully',
      channel: dispatchResult.channel,
      destination: dispatchResult.destination,
      identity: cleanId,
      expiresInMinutes: 15,
    })
  } catch (err) {
    console.error('[forgotPassword Exception]:', err)
    return res.status(500).json({ error: 'Failed to process password recovery' })
  }
}

// 3b. Standalone Send OTP (for registration verification or security confirmations)
export async function sendOTP(req, res) {
  try {
    const { identity, channel = 'AUTO', purpose } = req.body
    if (!identity || typeof identity !== 'string' || identity.trim().length < 3) {
      return res.status(400).json({ error: 'Valid phone number or email address required' })
    }

    const cleanId = identity.trim().toLowerCase()
    const clientIp = req.realIp || getClientRealIp(req)

    // For registration, verify this identity isn't already taken
    if (purpose === 'REGISTER' || purpose === 'REGISTRATION') {
      if (isSupabaseConfigured) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${cleanId},username.eq.${cleanId}`)
          .maybeSingle()
        if (existing) {
          return res.status(409).json({ error: 'This email is already registered. Please log in.' })
        }
      }
    }

    const code = String(crypto.randomInt(100000, 999999))
    const expiresAtMs = Date.now() + 15 * 60 * 1000
    const expiresAtIso = new Date(expiresAtMs).toISOString()

    resetCodes.set(cleanId, { code, expiresAt: expiresAtMs })

    const dispatchResult = await dispatchOTP({
      identity: cleanId,
      channel,
      otpCode: code,
      username: cleanId,
    })

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('password_resets')
          .update({ is_used: true })
          .eq('identity', cleanId)
          .eq('is_used', false)

        await supabase.from('password_resets').insert({
          identity: cleanId,
          otp_code: code,
          channel: dispatchResult.channel,
          destination: dispatchResult.destination,
          ip_address: clientIp,
          expires_at: expiresAtIso,
          is_used: false,
        })
      } catch {}
    }

    return res.json({
      success: true,
      message: dispatchResult.deliveryMessage,
      channel: dispatchResult.channel,
      destination: dispatchResult.destination,
      expiresInMinutes: 15,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch OTP' })
  }
}

// 3c. Standalone Verify OTP
export async function verifyOTP(req, res) {
  try {
    const { identity, otpCode } = req.body
    if (!identity || !otpCode) {
      return res.status(400).json({ error: 'Identity and OTP code are required' })
    }

    const cleanId = String(identity).trim().toLowerCase()
    const cleanCode = String(otpCode).trim()

    let profile = null
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email')
          .or(`username.eq.${cleanId},email.eq.${cleanId}`)
          .maybeSingle()
        profile = data
      } catch {}
    }

    const searchIdentities = [cleanId]
    if (profile?.username) searchIdentities.push(profile.username.toLowerCase())
    if (profile?.email) searchIdentities.push(profile.email.toLowerCase())

    let verified = false

    if (isSupabaseConfigured) {
      try {
        const { data: dbRecord } = await supabase
          .from('password_resets')
          .select('id')
          .in('identity', searchIdentities)
          .eq('otp_code', cleanCode)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (dbRecord) {
          verified = true
        }
      } catch (dbErr) {
        console.warn('[verifyOTP DB Check Notice]:', dbErr.message)
      }
    }

    if (!verified) {
      for (const idToTry of searchIdentities) {
        const memRecord = resetCodes.get(idToTry)
        if (memRecord && memRecord.code === cleanCode && Date.now() <= memRecord.expiresAt) {
          verified = true
          break
        }
      }
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' })
    }

    // OTP verified successfully; note: OTP is left active until resetPassword consumes it atomically
    return res.json({
      success: true,
      message: 'OTP verified successfully',
      identity: cleanId,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify OTP' })
  }
}

// 4. Reset Password with OTP verification (validated against password_resets)
export async function resetPassword(req, res) {
  try {
    const { identity, resetCode, newPassword } = req.validatedReset || {
      identity: (req.body.identity || '').trim().toLowerCase(),
      resetCode: (req.body.resetCode || '').trim(),
      newPassword: req.body.newPassword,
    }

    if (!identity || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Identity, reset code, and new password are required' })
    }

    const cleanId = identity
    const cleanCode = resetCode

    let verified = false
    let resetRecordId = null

    let profile = null
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email')
          .or(`username.eq.${cleanId},email.eq.${cleanId}`)
          .maybeSingle()
        profile = data
      } catch {}
    }

    const searchIdentities = [cleanId]
    if (profile?.username) searchIdentities.push(profile.username.toLowerCase())
    if (profile?.email) searchIdentities.push(profile.email.toLowerCase())

    // 1. Check Supabase password_resets table first
    if (isSupabaseConfigured) {
      try {
        const { data: dbRecord } = await supabase
          .from('password_resets')
          .select('*')
          .in('identity', searchIdentities)
          .eq('otp_code', cleanCode)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (dbRecord) {
          verified = true
          resetRecordId = dbRecord.id
        }
      } catch (dbErr) {
        console.warn('[password_resets check notice]:', dbErr.message)
      }
    }

    // 2. Fallback to memory store if DB check didn't resolve
    if (!verified) {
      for (const idToTry of searchIdentities) {
        const memRecord = resetCodes.get(idToTry)
        if (memRecord) {
          if (Date.now() <= memRecord.expiresAt && memRecord.code === cleanCode) {
            verified = true
            resetCodes.delete(idToTry)
            break
          }
        }
      }
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please check and retry.' })
    }

    const newHash = hashPassword(newPassword)

    if (isSupabaseConfigured) {
      // Mark OTP as used in password_resets table
      if (resetRecordId) {
        try {
          await supabase
            .from('password_resets')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', resetRecordId)
        } catch {}
      }

      // Update password hash using already-resolved profile (avoids re-fetch + variable shadowing)
      if (profile) {
        try {
          await supabase
            .from('profiles')
            .update({ password_hash: newHash })
            .eq('id', profile.id)
        } catch {}
        memoryCredentials.set(profile.id, newHash)
        if (profile.username) memoryCredentials.set(profile.username.toLowerCase(), newHash)
        if (profile.email) memoryCredentials.set(profile.email.toLowerCase(), newHash)
      }
    }

    memoryCredentials.set(cleanId, newHash)
    await saveCredentialsToDisk()
    resetCodes.delete(cleanId)

    return res.json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    })
  } catch (err) {
    console.error('[resetPassword Exception]:', err)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}
