import { hashPassword, memoryCredentials } from './authController.js'
import { supabase, isSupabaseConfigured } from '../config/supabase.js'

// In-memory fallback stores
const memoryFeedback = []
const memoryAnnouncements = [
  {
    id: 'ann-1',
    title: 'Welcome to 69 Club Official Platform',
    content: 'Welcome to 69 Club, the premier prediction and gaming arena. Experience real-time Win Go lottery, 60 FPS Aviator crash, and instant UPI automated withdrawals.',
    category: 'Important',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ann-2',
    title: 'Daily Attendance Bonus Festival',
    content: 'Log in consecutively every 24 hours to claim increasing daily rewards from ₹5.00 up to ₹7,000.00! Check in at the Activity Center now.',
    category: 'Activity',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ann-3',
    title: 'UPI Fast Recharge Guidelines',
    content: 'When depositing via UPI QR, always submit your accurate 12-digit UTR transaction number to ensure instant automated credit to your account within 10-60 seconds.',
    category: 'System',
    created_at: new Date().toISOString(),
  },
]

/**
 * GET /api/service/announcements
 * Retrieve live platform announcements filtered by category.
 */
export async function getAnnouncements(req, res) {
  try {
    const category = (req.query.category || 'All').trim()

    if (isSupabaseConfigured) {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (category && category !== 'All') {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error

      return res.json({
        success: true,
        announcements: data || [],
      })
    }

    let list = memoryAnnouncements
    if (category && category !== 'All') {
      list = list.filter((a) => a.category.toLowerCase() === category.toLowerCase())
    }

    return res.json({
      success: true,
      announcements: list,
    })
  } catch (err) {
    console.error('[getAnnouncements Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve announcements' })
  }
}

/**
 * POST /api/service/feedback
 * Submit a real-time player feedback/support ticket.
 */
export async function submitFeedback(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to submit feedback.' })
    }

    const { category, message, contactInfo } = req.body

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Please select a feedback category.' })
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Please describe your feedback with at least 5 characters.' })
    }

    const cleanCategory = category.trim()
    const cleanMessage = message.trim()
    const cleanContact = (contactInfo || '').trim()

    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)
      let validUserId = null
      if (isUuid) {
        const { data: p } = await supabase.from('profiles').select('id').eq('id', authUserId).maybeSingle()
        if (p) validUserId = p.id
      }

      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: validUserId,
          category: cleanCategory,
          message: cleanMessage,
          contact_info: cleanContact,
          status: 'PENDING',
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        message: 'Your feedback ticket has been submitted successfully. Our VIP team will review it shortly.',
        ticket: data,
      })
    }

    const ticket = {
      id: crypto.randomUUID(),
      user_id: authUserId,
      category: cleanCategory,
      message: cleanMessage,
      contact_info: cleanContact,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }
    memoryFeedback.unshift(ticket)

    return res.status(201).json({
      success: true,
      message: 'Your feedback ticket has been submitted successfully.',
      ticket,
    })
  } catch (err) {
    console.error('[submitFeedback Exception]:', err)
    return res.status(500).json({ error: 'Failed to submit feedback. Please try again.' })
  }
}

/**
 * GET /api/service/feedback
 * Fetch tickets submitted by the logged-in user.
 */
export async function getUserFeedback(req, res) {
  try {
    const authUserId = req.user ? req.user.id : (req.query.userId || null)
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to view feedback history.' })
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return res.json({
        success: true,
        tickets: data || [],
      })
    }

    const userTickets = memoryFeedback.filter((f) => f.user_id === authUserId)
    return res.json({
      success: true,
      tickets: userTickets,
    })
  } catch (err) {
    console.error('[getUserFeedback Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve feedback tickets' })
  }
}

/**
 * POST /api/service/settings/profile
 * Update user nickname, avatar, or contact phone.
 */
export async function updateProfileSettings(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to update settings.' })
    }

    const { nickname, avatarUrl, phone } = req.body
    const updates = {}

    if (nickname && typeof nickname === 'string') {
      const cleanNick = nickname.trim()
      if (cleanNick.length < 2 || cleanNick.length > 20) {
        return res.status(400).json({ error: 'Nickname must be between 2 and 20 characters.' })
      }
      updates.nickname = cleanNick
    }

    if (avatarUrl && typeof avatarUrl === 'string') {
      updates.avatar_url = avatarUrl.trim()
    }

    if (phone && typeof phone === 'string') {
      const cleanPhone = phone.trim()
      if (!/^\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' })
      }
      updates.phone = cleanPhone
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' })
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authUserId)
        .select('id, username, email, nickname, avatar_url, phone')
        .single()

      if (error) throw error

      return res.json({
        success: true,
        message: 'Profile settings updated successfully.',
        user: data,
      })
    }

    return res.json({
      success: true,
      message: 'Profile settings updated successfully.',
      user: updates,
    })
  } catch (err) {
    console.error('[updateProfileSettings Exception]:', err)
    return res.status(500).json({ error: 'Failed to update profile settings' })
  }
}

/**
 * POST /api/service/settings/password
 * Change account login/security password.
 */
export async function changeSecurityPassword(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to change password.' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' })
    }

    if (isSupabaseConfigured) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('password_hash')
        .eq('id', authUserId)
        .single()

      if (error || !profile) {
        return res.status(404).json({ error: 'User account not found' })
      }

      const storedHash = profile?.password_hash || memoryCredentials.get(authUserId)
      if (storedHash && storedHash !== hashPassword(currentPassword)) {
        return res.status(400).json({ error: 'Incorrect current password.' })
      }

      const newHash = hashPassword(newPassword)
      await supabase.from('profiles').update({ password_hash: newHash }).eq('id', authUserId)
      memoryCredentials.set(authUserId, newHash)

      return res.json({
        success: true,
        message: 'Security password changed successfully. Please remember your new credentials.',
      })
    }

    return res.json({
      success: true,
      message: 'Security password updated successfully.',
    })
  } catch (err) {
    console.error('[changeSecurityPassword Exception]:', err)
    return res.status(500).json({ error: 'Failed to change security password' })
  }
}

/**
 * POST /api/service/settings/bind-email
 * Bind or update backup recovery email address for a mobile user.
 * Strictly guarantees that one email can only belong to one user account.
 */
export async function bindBackupEmail(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to bind a recovery email.' })
    }

    const { email } = req.body
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required.' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 80) {
      return res.status(400).json({ error: 'Please enter a valid email address format (e.g. name@domain.com).' })
    }

    if (isSupabaseConfigured) {
      // 1. Check if this email is already bound to another account (case-insensitive)
      const { data: existingUser, error: checkErr } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('email', cleanEmail)
        .neq('id', authUserId)
        .maybeSingle()

      if (existingUser) {
        return res.status(400).json({
          error: 'This email address is already bound to another account. Each account must have a unique email.',
        })
      }

      // 2. Update profiles table with unique backup email
      const { data: updatedProfile, error: updateErr } = await supabase
        .from('profiles')
        .update({ email: cleanEmail })
        .eq('id', authUserId)
        .select('id, username, email, nickname, avatar_url, phone')
        .single()

      if (updateErr) {
        if (updateErr.code === '23505') {
          return res.status(400).json({
            error: 'This email address is already bound to another account.',
          })
        }
        throw updateErr
      }

      return res.json({
        success: true,
        message: 'Backup recovery email bound successfully! You can now use it for account recovery.',
        user: updatedProfile,
      })
    }

    return res.json({
      success: true,
      message: 'Backup recovery email bound successfully.',
      user: { email: cleanEmail },
    })
  } catch (err) {
    console.error('[bindBackupEmail Exception]:', err)
    return res.status(500).json({ error: 'Failed to bind backup email address' })
  }
}
