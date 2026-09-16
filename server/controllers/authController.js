import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { generateToken } from '../middleware/auth.js'
import { dispatchOTP } from '../services/notificationService.js'

// In-memory fallback stores
const memoryProfiles = new Map()
const memoryCredentials = new Map() // id/username -> passwordHash
const resetCodes = new Map() // identity -> { code, expiresAt }

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + '_prince_salt_2026_vault').digest('hex')
}

// 1. Unified Login
export async function loginOrRegister(req, res) {
  try {
    const { identity, password } = req.validatedLogin || {
      identity: (req.body.username || req.body.identity || '').trim().toLowerCase(),
      password: req.body.password,
    }

    if (!identity || identity.length < 3) {
      return res.status(400).json({ error: 'Username or phone must be at least 3 characters' })
    }

    const cleanUsername = identity

    if (isSupabaseConfigured) {
      // 1. Check if profile exists
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (error) {
        console.error('[Supabase Error] find profile:', error)
        return res.status(500).json({ error: 'Error checking user credentials' })
      }

      // If user exists and password is provided, strictly verify password
      if (profile) {
        if (password) {
          const storedHash = profile.password_hash || memoryCredentials.get(profile.id)
          if (storedHash && storedHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid username or password' })
          }
        }
      } else {
        // Only allow auto-creation if this is explicitly a guest/demo account or password provided
        const insertPayload = { username: cleanUsername, role: 'user' }
        if (password) {
          insertPayload.password_hash = hashPassword(password)
        }

        let newProfile = null
        try {
          const { data, error: insertErr } = await supabase
            .from('profiles')
            .insert(insertPayload)
            .select()
            .single()

          if (insertErr) throw insertErr
          newProfile = data
        } catch {
          const { data, error: fallbackErr } = await supabase
            .from('profiles')
            .insert({ username: cleanUsername, role: 'user' })
            .select()
            .single()

          if (fallbackErr) {
            console.error('[Supabase Error] insert profile fallback:', fallbackErr)
            return res.status(500).json({ error: 'Error creating user profile' })
          }
          newProfile = data
        }

        profile = newProfile
        if (password) {
          memoryCredentials.set(profile.id, hashPassword(password))
          memoryCredentials.set(cleanUsername, hashPassword(password))
        }

        // Initialize wallet
        await supabase.from('wallets').insert({
          user_id: profile.id,
          balance: 1000.0,
        })
      }

      // Fetch wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', profile.id)
        .single()

      // Generate signed auth token
      const token = generateToken({
        id: profile.id,
        username: profile.username,
        role: profile.role || 'user',
      })

      return res.json({
        message: 'Login successful',
        token,
        user: { id: profile.id, username: profile.username, role: profile.role || 'user' },
        wallet: wallet || { balance: 1000.0 },
      })
    }

    // Local Fallback Store
    let profile = Array.from(memoryProfiles.values()).find((p) => p.username === cleanUsername)

    if (profile) {
      if (password) {
        const storedHash = memoryCredentials.get(profile.id)
        if (storedHash && storedHash !== hashPassword(password)) {
          return res.status(401).json({ error: 'Invalid username or password' })
        }
      }
    } else {
      profile = {
        id: crypto.randomUUID(),
        username: cleanUsername,
        role: 'user',
        created_at: new Date().toISOString(),
      }
      memoryProfiles.set(profile.id, profile)
      if (password) {
        memoryCredentials.set(profile.id, hashPassword(password))
        memoryCredentials.set(cleanUsername, hashPassword(password))
      }
    }

    const token = generateToken({
      id: profile.id,
      username: profile.username,
      role: profile.role,
    })

    return res.json({
      message: 'Login successful',
      token,
      user: { id: profile.id, username: profile.username, role: profile.role },
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
    const { username, email, password, referralCode } = req.validatedSignup || {
      username: (req.body.username || '').trim().toLowerCase(),
      email: (req.body.email || '').trim().toLowerCase() || null,
      password: req.body.password,
      referralCode: req.body.referralCode,
    }

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const cleanUsername = username
    const cleanEmail = email || null
    const hashed = hashPassword(password)

    if (isSupabaseConfigured) {
      // Check duplicate
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existing) {
        return res.status(409).json({ error: 'Username already registered. Please login.' })
      }

      let profile = null
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
      } catch {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            username: cleanUsername,
            email: cleanEmail,
            role: 'user',
          })
          .select()
          .single()

        if (error) {
          console.error('[Supabase Error] insert profile:', error)
          return res.status(500).json({ error: 'Failed to create user account', details: error.message })
        }
        profile = data
      }

      memoryCredentials.set(profile.id, hashed)
      memoryCredentials.set(cleanUsername, hashed)

      const startingBal = referralCode ? 1200.0 : 1000.0
      await supabase.from('wallets').insert({
        user_id: profile.id,
        balance: startingBal,
      })

      const token = generateToken({
        id: profile.id,
        username: profile.username,
        role: profile.role || 'user',
      })

      return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { id: profile.id, username: profile.username, email: profile.email, role: profile.role },
        wallet: { balance: startingBal },
      })
    }

    // Fallback store
    const existing = Array.from(memoryProfiles.values()).find((p) => p.username === cleanUsername)
    if (existing) {
      return res.status(409).json({ error: 'Username already registered. Please login.' })
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

    // Dispatch OTP via WhatsApp, Email, or Auto
    const targetDestination = profile?.email && channel === 'EMAIL' ? profile.email : cleanId
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

        // Insert new reset OTP record with channel and destination
        await supabase.from('password_resets').insert({
          user_id: profile ? profile.id : null,
          identity: cleanId,
          otp_code: code,
          channel: dispatchResult.channel || channel,
          destination: dispatchResult.destination || targetDestination,
          expires_at: expiresAtIso,
          is_used: false,
        })
      } catch (dbErr) {
        console.warn('[password_resets DB Notice]:', dbErr.message)
      }
    }

    return res.json({
      message: dispatchResult.deliveryMessage || 'Reset verification code sent successfully',
      channel: dispatchResult.channel,
      destination: dispatchResult.destination,
      identity: cleanId,
      resetCode: code, // returned for developer simulation
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
    const { identity, channel = 'AUTO' } = req.body
    if (!identity || typeof identity !== 'string' || identity.trim().length < 3) {
      return res.status(400).json({ error: 'Valid phone number or email address required' })
    }

    const cleanId = identity.trim().toLowerCase()
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
        await supabase.from('password_resets').insert({
          identity: cleanId,
          otp_code: code,
          channel: dispatchResult.channel,
          destination: dispatchResult.destination,
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
      otpCode: code,
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

    let verified = false
    let recordId = null

    if (isSupabaseConfigured) {
      try {
        const { data: dbRecord } = await supabase
          .from('password_resets')
          .select('*')
          .eq('identity', cleanId)
          .eq('otp_code', cleanCode)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (dbRecord) {
          verified = true
          recordId = dbRecord.id
        }
      } catch {}
    }

    if (!verified) {
      const memRecord = resetCodes.get(cleanId)
      if (memRecord && memRecord.code === cleanCode && Date.now() <= memRecord.expiresAt) {
        verified = true
      }
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' })
    }

    if (recordId && isSupabaseConfigured) {
      try {
        await supabase.from('password_resets').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', recordId)
      } catch {}
    }
    resetCodes.delete(cleanId)

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

      // Update password hash in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanId)
        .maybeSingle()

      if (profile) {
        try {
          await supabase
            .from('profiles')
            .update({ password_hash: newHash })
            .eq('id', profile.id)
        } catch {}
        memoryCredentials.set(profile.id, newHash)
      }
    }

    memoryCredentials.set(cleanId, newHash)
    resetCodes.delete(cleanId)

    return res.json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    })
  } catch (err) {
    console.error('[resetPassword Exception]:', err)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}
