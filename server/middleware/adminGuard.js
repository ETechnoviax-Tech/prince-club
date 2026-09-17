import { verifyToken } from './auth.js'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryProfiles } from '../controllers/authController.js'

/**
 * Triple-Verification Admin Guard
 * Check 1: Backend Master Key Verification (valid secret key in env)
 * Check 2: Database Role Check (account role must be 'admin' in DB)
 * Check 3: ADMIN_IDENTIFIER match (phone/email must match env whitelist if configured)
 */
export async function requireDualAdminAuth(req, res, next) {
  try {
    // -------------------------------------------------------------
    // Check 1: Backend Master Secret Verification
    // -------------------------------------------------------------
    const configuredSecret = process.env.ADMIN_SECRET_KEY || 'club69_admin_master_secret_2026'
    const providedKey = req.headers['x-admin-key'] || req.query.adminKey || req.body?.adminKey

    if (!providedKey || String(providedKey).trim() !== configuredSecret) {
      return res.status(403).json({
        error: 'Backend Verification Failed: Invalid or missing Admin Master Secret Key',
        stage: 'backend_verification',
        verified: false,
      })
    }

    // -------------------------------------------------------------
    // Check 2: Database Role Check
    // -------------------------------------------------------------
    const authHeader = req.headers.authorization || req.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'DB Verification Failed: Missing session Bearer token',
        stage: 'db_verification',
        verified: false,
      })
    }

    const token = authHeader.slice(7).trim()
    const decoded = verifyToken(token)
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'DB Verification Failed: Invalid or expired session token',
        stage: 'db_verification',
        verified: false,
      })
    }

    let userRole = null
    let adminProfile = null

    if (isSupabaseConfigured) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, email, role, is_admin, created_at')
        .eq('id', decoded.id)
        .maybeSingle()

      if (error || !profile) {
        return res.status(403).json({
          error: 'DB Verification Failed: User account record not found in database',
          stage: 'db_verification',
          verified: false,
        })
      }
      userRole = profile.is_admin === true ? 'admin' : (profile.role || 'user')
      adminProfile = profile
    } else {
      // Fallback local memory & disk persistence store
      const profile = memoryProfiles.get(decoded.id)
      if (!profile) {
        return res.status(403).json({
          error: 'DB Verification Failed: User profile not found in persistent store',
          stage: 'db_verification',
          verified: false,
        })
      }
      userRole = profile.is_admin === true ? 'admin' : (profile.role || 'user')
      adminProfile = profile
    }

    const isAuthorizedAdmin = adminProfile.is_admin === true || userRole === 'admin' || adminProfile.role === 'admin'

    if (!isAuthorizedAdmin) {
      return res.status(403).json({
        error: 'DB Verification Failed: Account does not possess administrative privileges in database',
        stage: 'db_verification',
        verified: false,
        requiredRole: 'admin',
        actualRole: userRole || 'user',
        isAdmin: false,
      })
    }

    // -------------------------------------------------------------
    // Check 3: ADMIN_IDENTIFIER Whitelist (optional but enforced if set)
    // Set ADMIN_IDENTIFIER=phone_or_email in .env to restrict admin access
    // to a single pre-authorized account identity.
    // -------------------------------------------------------------
    const adminIdentifier = process.env.ADMIN_IDENTIFIER
    if (adminIdentifier && adminIdentifier.trim().length > 0) {
      const cleanId = adminIdentifier.trim().toLowerCase()
      const profileUsername = (adminProfile.username || '').toLowerCase()
      const profileEmail = (adminProfile.email || '').toLowerCase()

      if (profileUsername !== cleanId && profileEmail !== cleanId) {
        return res.status(403).json({
          error: 'Identity Verification Failed: This account is not authorized as the designated admin identity',
          stage: 'identity_verification',
          verified: false,
        })
      }
    }

    // All verifications passed
    req.adminUser = adminProfile
    req.user = decoded
    next()
  } catch (err) {
    console.error('[requireDualAdminAuth Exception]:', err)
    return res.status(500).json({ error: 'Internal server error during admin dual-verification' })
  }
}

