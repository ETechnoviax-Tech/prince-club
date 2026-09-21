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
      const allTeamIds = [...directIds, ...tier2Ids]

      // 4. Calculate Deposits for Direct and Team
      let directDepositNumber = 0
      let directDepositAmount = 0
      let directFirstDepositCount = 0

      let teamDepositNumber = 0
      let teamDepositAmount = 0
      let teamFirstDepositCount = 0

      if (directIds.length > 0) {
        const { data: directDeps } = await supabase
          .from('deposit_requests')
          .select('id, user_id, amount, status')
          .in('user_id', directIds)
          .eq('status', 'APPROVED')

        if (directDeps && directDeps.length > 0) {
          directDepositNumber = directDeps.length
          directDepositAmount = directDeps.reduce((sum, d) => sum + Number(d.amount || 0), 0)
          directFirstDepositCount = new Set(directDeps.map((d) => d.user_id)).size
        }
      }

      if (allTeamIds.length > 0) {
        const { data: teamDeps } = await supabase
          .from('deposit_requests')
          .select('id, user_id, amount, status')
          .in('user_id', allTeamIds)
          .eq('status', 'APPROVED')

        if (teamDeps && teamDeps.length > 0) {
          teamDepositNumber = teamDeps.length
          teamDepositAmount = teamDeps.reduce((sum, d) => sum + Number(d.amount || 0), 0)
          teamFirstDepositCount = new Set(teamDeps.map((d) => d.user_id)).size
        }
      }

      // 5. Calculate Team Turnover and Commission from Bets
      let directTurnover = 0
      let tier2Turnover = 0
      let yesterdayDirectTurnover = 0
      let yesterdayTier2Turnover = 0
      let thisWeekDirectTurnover = 0
      let thisWeekTier2Turnover = 0

      const now = new Date()
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      
      // Calculate start of current week (Monday 00:00:00)
      const dayOfWeek = now.getDay() // 0 is Sunday, 1 is Monday...
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
      weekStartDate.setHours(0, 0, 0, 0)
      const weekStart = weekStartDate.toISOString()

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
          thisWeekDirectTurnover = directBets
            .filter((b) => b.created_at >= weekStart)
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
          thisWeekTier2Turnover = tier2Bets
            .filter((b) => b.created_at >= weekStart)
            .reduce((sum, b) => sum + Number(b.amount || 0), 0)
        }
      }

      // Commission Ratios: Tier 1 (0.60%), Tier 2 (0.18%)
      const directCommission = directTurnover * 0.006
      const tier2Commission = tier2Turnover * 0.0018
      const totalCumulativeCommission = directCommission + tier2Commission

      const yesterdayCommission = yesterdayDirectTurnover * 0.006 + yesterdayTier2Turnover * 0.0018
      const thisWeekCommission = thisWeekDirectTurnover * 0.006 + thisWeekTier2Turnover * 0.0018
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
      ].slice(0, 50)

      return res.json({
        success: true,
        referralCode,
        referralLink,
        yesterdayCommission: yesterdayCommission.toFixed(2),
        directStats: {
          registerCount: directList.length,
          depositNumber: directDepositNumber,
          depositAmount: directDepositAmount.toFixed(2),
          firstDepositCount: directFirstDepositCount,
        },
        teamStats: {
          registerCount: allTeamIds.length,
          depositNumber: teamDepositNumber,
          depositAmount: teamDepositAmount.toFixed(2),
          firstDepositCount: teamFirstDepositCount,
        },
        promotionData: {
          thisWeek: thisWeekCommission.toFixed(2),
          totalCommission: totalCumulativeCommission.toFixed(2),
          directSubordinates: directList.length,
          totalTeamMembers: allTeamIds.length,
        },
        directSubordinates: directList.length,
        totalTeamMembers: allTeamIds.length,
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
      directStats: {
        registerCount: 0,
        depositNumber: 0,
        depositAmount: '0.00',
        firstDepositCount: 0,
      },
      teamStats: {
        registerCount: 0,
        depositNumber: 0,
        depositAmount: '0.00',
        firstDepositCount: 0,
      },
      promotionData: {
        thisWeek: '0.00',
        totalCommission: '0.00',
        directSubordinates: 0,
        totalTeamMembers: 0,
      },
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
