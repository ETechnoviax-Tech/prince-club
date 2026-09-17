// ============================================================================
// Centralized Domain & URL Configuration (Zero Hardcoding)
// Reads dynamically from environment variables.
// If the domain changes in the future, simply update APP_DOMAIN in .env!
// ============================================================================

export const APP_DOMAIN = (process.env.APP_DOMAIN || '69club1.site').trim().toLowerCase()
export const API_DOMAIN = (process.env.API_DOMAIN || `api.${APP_DOMAIN}`).trim().toLowerCase()

export const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? `https://${APP_DOMAIN}`
    : 'http://localhost:5173')
).replace(/\/+$/, '')

export const API_URL = (
  process.env.API_URL ||
  (process.env.NODE_ENV === 'production'
    ? `https://${API_DOMAIN}`
    : `http://localhost:${process.env.PORT || 5000}`)
).replace(/\/+$/, '')

/**
 * Returns whether an incoming request origin is permitted
 * Supports localhost/LAN in local development and all subdomains of APP_DOMAIN in production
 */
export function isOriginAllowed(origin) {
  if (!origin) return true // Server-to-server, curl, mobile apps, Postman

  // Localhost and LAN IP development
  if (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
  ) {
    return true
  }

  // Exact matches
  if (
    origin === FRONTEND_URL ||
    origin === `https://${APP_DOMAIN}` ||
    origin === `https://www.${APP_DOMAIN}` ||
    origin === `https://${API_DOMAIN}` ||
    origin === `http://${APP_DOMAIN}` ||
    origin === `http://${API_DOMAIN}`
  ) {
    return true
  }

  // Dynamic subdomain matcher for configured root domain (*.APP_DOMAIN)
  const escapedDomain = APP_DOMAIN.replace(/\./g, '\\.')
  const domainRegex = new RegExp(`^https?:\\/\\/([a-zA-Z0-9-]+\\.)*${escapedDomain}(:\\d+)?$`)
  if (domainRegex.test(origin)) {
    return true
  }

  // Vercel preview & production domains (*.vercel.app)
  try {
    const parsedHost = new URL(origin).hostname
    if (parsedHost.endsWith('.vercel.app')) {
      return true
    }
  } catch {}

  return false
}

