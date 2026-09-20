/**
 * Merchant UPI Pool Configuration
 * Dynamically loads and balances across 10-15+ UPI VPAs from environment variables.
 * Zero hardcoded UPI addresses.
 */

let roundRobinCursor = 0

/**
 * Parses and returns all active merchant UPI VPAs from the environment.
 * Supports:
 * - Numbered variables: MERCHANT_UPI_VPA_1 .. MERCHANT_UPI_VPA_20
 * - Comma-delimited list: MERCHANT_UPI_POOL
 * - Single primary variable: MERCHANT_UPI_VPA
 * @returns {Array<{ vpa: string, name: string }>}
 */
export function getMerchantUpiPool() {
  const pool = []
  const seen = new Set()

  const defaultMerchantName = process.env.MERCHANT_NAME || 'Prince Club'

  const register = (vpa, name) => {
    if (!vpa || typeof vpa !== 'string') return
    const cleanVpa = vpa.trim()
    if (!cleanVpa || cleanVpa.length < 3 || seen.has(cleanVpa.toLowerCase())) return
    seen.add(cleanVpa.toLowerCase())
    pool.push({
      vpa: cleanVpa,
      name: (name && String(name).trim()) || defaultMerchantName,
    })
  }

  // 1. Numbered environment variables (MERCHANT_UPI_VPA_1 to MERCHANT_UPI_VPA_20)
  for (let i = 1; i <= 20; i++) {
    const vpa = process.env[`MERCHANT_UPI_VPA_${i}`] || process.env[`UPI_VPA_${i}`]
    const name = process.env[`MERCHANT_UPI_NAME_${i}`] || process.env[`UPI_NAME_${i}`]
    if (vpa) register(vpa, name)
  }

  // 2. Comma-delimited pool string
  if (process.env.MERCHANT_UPI_POOL) {
    const rawItems = process.env.MERCHANT_UPI_POOL.split(',')
    rawItems.forEach((item) => register(item))
  }

  // 3. Primary single variable fallback
  if (process.env.MERCHANT_UPI_VPA) {
    register(process.env.MERCHANT_UPI_VPA, process.env.MERCHANT_NAME)
  }

  // Fail loudly in production if no UPI is configured
  if (pool.length === 0) {
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd) {
      throw new Error('[CRITICAL CONFIG] No Merchant UPI VPA configured in environment variables (MERCHANT_UPI_VPA or MERCHANT_UPI_VPA_1..15)')
    }
    // Development fallback
    pool.push({
      vpa: 'merchant@upi',
      name: defaultMerchantName,
    })
  }

  return pool
}

/**
 * Returns the primary (first configured) merchant UPI.
 */
export function getPrimaryMerchantUpi() {
  const pool = getMerchantUpiPool()
  return pool[0]
}

/**
 * Selects the next merchant UPI in round-robin fashion for load distribution.
 */
export function getNextMerchantUpi() {
  const pool = getMerchantUpiPool()
  if (pool.length === 1) return pool[0]
  const selected = pool[roundRobinCursor % pool.length]
  roundRobinCursor = (roundRobinCursor + 1) % pool.length
  return selected
}

/**
 * Selects a random merchant UPI from the pool.
 */
export function getRandomMerchantUpi() {
  const pool = getMerchantUpiPool()
  return pool[Math.floor(Math.random() * pool.length)]
}
