import { verifyToken } from './auth.js'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryProfiles } from '../controllers/authController.js'

/**
 * Database-backed admin guard.
 * The bearer session identifies the operator; the current database profile
 * is checked on every request so stale client-side role data is never trusted.
 */
export async function requireDualAdminAuth(req, res, next) {
  try {
    // Session verification
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

    // Optional deployment-level identity restriction.
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
