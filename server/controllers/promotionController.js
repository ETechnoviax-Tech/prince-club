import { supabase, isSupabaseConfigured } from '../config/supabase.js'
import { APP_DOMAIN, FRONTEND_URL } from '../config/domain.js'

function maskUsername(name) {
  if (!name) return 'User****'
  const str = String(name).trim()
  if (str.length <= 4) return str.slice(0, 1) + '***'
  return str.slice(0, 2) + '****' + str.slice(-2)
}

/**
 * GET /api/promotion/stats
 * Returns authoritative referral and multi-tier agent promotion statistics for the authenticated user.
 */
export async function getPromotionStats(req, res) {
  try {
    const authUserId = req.user ? req.user.id : (req.query.userId || null)
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to view promotion dashboard.' })
    }

    const domain = FRONTEND_URL || `https://${APP_DOMAIN}`

    if (isSupabaseConfigured) {
      // 1. Fetch user profile for referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, referral_code')
        .eq('id', authUserId)
        .single()

      let referralCode = profile?.referral_code
      if (!referralCode) {
        referralCode = `PC${authUserId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
        try {
          await supabase.from('profiles').update({ referral_code: referralCode }).eq('id', authUserId)
        } catch {}
      }

      const referralLink = `${domain}?ref=${referralCode}`

      // 2. Fetch Direct Subordinates (Tier 1)
      const { data: directMembers } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .eq('referred_by', authUserId)
        .order('created_at', { ascending: false })

      const directList = directMembers || []
      const directIds = directList.map((m) => m.id)

      // 3. Fetch Tier 2 Subordinates (Referred by direct members)
      let tier2List = []
      if (directIds.length > 0) {
        const { data: t2 } = await supabase
          .from('profiles')
          .select('id, username, created_at, referred_by')
          .in('referred_by', directIds)
          .order('created_at', { ascending: false })
        tier2List = t2 || []
      }
      const tier2Ids = tier2List.map((m) => m.id)
      const allSubordinateIds = [...directIds, ...tier2Ids]

      // 4. Calculate Team Turnover and Yesterday Turnover from Bets
      let directTurnover = 0
      let tier2Turnover = 0
      let yesterdayDirectTurnover = 0
      let yesterdayTier2Turnover = 0

      const now = new Date()
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      if (directIds.length > 0) {
        const { data: directBets } = await supabase
          .from('bets')
          .select('amount, created_at')
          .in('user_id', directIds)

        if (directBets) {
          directTurnover = directBets.reduce((sum, b) => sum + Number(b.amount || 0), 0)
          yesterdayDirectTurnover = directBets
            .filter((b) => b.created_at >= yesterdayStart && b.created_at < todayStart)
            .reduce((sum, b) => sum + Number(b.amount || 0), 0)
        }
      }

      if (tier2Ids.length > 0) {
        const { data: tier2Bets } = await supabase
          .from('bets')
          .select('amount, created_at')
          .in('user_id', tier2Ids)

        if (tier2Bets) {
          tier2Turnover = tier2Bets.reduce((sum, b) => sum + Number(b.amount || 0), 0)
          yesterdayTier2Turnover = tier2Bets
            .filter((b) => b.created_at >= yesterdayStart && b.created_at < todayStart)
            .reduce((sum, b) => sum + Number(b.amount || 0), 0)
        }
      }

      // Commission Ratios: Tier 1 (0.60%), Tier 2 (0.18%)
      const directCommission = directTurnover * 0.006
      const tier2Commission = tier2Turnover * 0.0018
      const totalCumulativeCommission = directCommission + tier2Commission

      const yesterdayCommission = yesterdayDirectTurnover * 0.006 + yesterdayTier2Turnover * 0.0018
      const totalTeamTurnover = directTurnover + tier2Turnover

      // Format team subordinates preview
      const subordinates = [
        ...directList.map((m) => ({
          id: m.id,
          username: maskUsername(m.username),
          tier: 'Tier 1 (Direct)',
          createdAt: m.created_at,
        })),
        ...tier2List.map((m) => ({
          id: m.id,
          username: maskUsername(m.username),
          tier: 'Tier 2 (Indirect)',
          createdAt: m.created_at,
        })),
      ].slice(0, 20)

      return res.json({
        success: true,
        referralCode,
        referralLink,
        yesterdayCommission: yesterdayCommission.toFixed(2),
        directSubordinates: directList.length,
        totalTeamMembers: directList.length + tier2List.length,
        teamTurnover: totalTeamTurnover.toFixed(2),
        cumulativeTotal: totalCumulativeCommission.toFixed(2),
        subordinates,
      })
    }

    // Fallback in-memory
    const code = `PC${String(authUserId).slice(0, 6).toUpperCase()}`
    return res.json({
      success: true,
      referralCode: code,
      referralLink: `${domain}?ref=${code}`,
      yesterdayCommission: '0.00',
      directSubordinates: 0,
      totalTeamMembers: 0,
      teamTurnover: '0.00',
      cumulativeTotal: '0.00',
      subordinates: [],
    })
  } catch (err) {
    console.error('[getPromotionStats Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve promotion statistics' })
  }
}
