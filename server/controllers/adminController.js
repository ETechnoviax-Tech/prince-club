import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import {
  memoryProfiles,
  memoryCredentials,
  saveProfilesToDisk,
  saveCredentialsToDisk,
  hashPassword,
} from './authController.js'
import { memoryWallets, memoryTransactions, memoryDeposits } from '../db/store.js'
import { memoryBets } from './gameController.js'

// 1. Dual-Verification Status Handshake
export async function verifyAdminSession(req, res) {
  try {
    return res.json({
      success: true,
      message: 'Dual-verification passed: DB role is admin and Backend Secret Key is verified.',
      dbVerified: true,
      backendVerified: true,
      admin: {
        id: req.adminUser.id,
        username: req.adminUser.username,
        email: req.adminUser.email,
        role: req.adminUser.role,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// 2. Comprehensive System Matrix & Live Risk Matrix
export async function getAdminMatrix(req, res) {
  try {
    let totalUsers = 0
    let totalDepositsAmount = 0
    let totalWithdrawalsAmount = 0
    let totalBetsCount = 0
    let totalBetsAmount = 0
    let totalPayoutsAmount = 0

    // Compute Users
    if (isSupabaseConfigured) {
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      totalUsers = uCount || 0

      // Financials
      const { data: depData } = await supabase.from('deposit_requests').select('amount').eq('status', 'APPROVED')
      totalDepositsAmount = (depData || []).reduce((acc, d) => acc + Number(d.amount || 0), 0)

      const { data: withData } = await supabase.from('withdrawal_requests').select('amount').eq('status', 'APPROVED')
      totalWithdrawalsAmount = (withData || []).reduce((acc, w) => acc + Number(w.amount || 0), 0)
    } else {
      totalUsers = memoryProfiles.size
      for (const d of memoryDeposits.values()) {
        if (d.status === 'APPROVED') totalDepositsAmount += Number(d.amount || 0)
      }
    }

    // Process Bets from Supabase DB & live in-memory pool
    let allBets = []
    if (isSupabaseConfigured) {
      const { data: dbBets } = await supabase.from('bets').select('*')
      const betMap = new Map()
      ;(dbBets || []).forEach((b) => betMap.set(b.id, b))
      for (const [id, mb] of memoryBets.entries()) {
        betMap.set(id, { ...betMap.get(id), ...mb })
      }
      allBets = Array.from(betMap.values())
    } else {
      allBets = Array.from(memoryBets.values())
    }

    totalBetsCount = allBets.length

    // Live matrix buckets ("kispar kitna paisa laga")
    const poolMatrix = {
      colors: { red: 0, green: 0, violet: 0 },
      sizes: { big: 0, small: 0 },
      digits: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      totalPendingVolume: 0,
    }

    for (const b of allBets) {
      const amt = Number(b.amount || 0)
      const payout = Number(b.payout || 0)
      totalBetsAmount += amt

      if (b.status === 'WON') {
        totalPayoutsAmount += payout
      }

      // If pending, categorize into live pool matrix
      if (b.status === 'PENDING') {
        poolMatrix.totalPendingVolume += amt
        const sel = String(b.selection || '').toLowerCase()

        if (sel === 'red' || sel === 'green' || sel === 'violet') {
          poolMatrix.colors[sel] = (poolMatrix.colors[sel] || 0) + amt
        } else if (sel === 'big' || sel === 'small') {
          poolMatrix.sizes[sel] = (poolMatrix.sizes[sel] || 0) + amt
        } else if (/^[0-9]$/.test(sel)) {
          poolMatrix.digits[sel] = (poolMatrix.digits[sel] || 0) + amt
        }
      }
    }

    const platformNetProfit = totalBetsAmount - totalPayoutsAmount

    return res.json({
      success: true,
      matrix: {
        totalUsers,
        totalDepositsAmount,
        totalWithdrawalsAmount,
        totalBetsCount,
        totalBetsAmount,
        totalPayoutsAmount,
        platformNetProfit,
        profitMarginPct: totalBetsAmount > 0 ? Number(((platformNetProfit / totalBetsAmount) * 100).toFixed(2)) : 0,
        poolMatrix,
      },
    })
  } catch (err) {
    console.error('[getAdminMatrix Error]:', err)
    return res.status(500).json({ error: 'Failed to generate matrix metrics' })
  }
}

// 3. Bets Ledger: "Kispar kitna pasia laga kon kitna jeeta"
export async function getBetsLedger(req, res) {
  try {
    const { status, mode, round, limit = 100 } = req.query
    let bets = []

    if (isSupabaseConfigured) {
      let query = supabase.from('bets').select('*, profiles(username, email)')
      if (status) query = query.ilike('status', status)
      if (mode) query = query.ilike('game_mode', mode)
      if (round) query = query.eq('round_number', round)
      query = query.order('created_at', { ascending: false }).limit(Number(limit))

      const { data: dbBets, error } = await query
      if (!error && dbBets) {
        bets = dbBets.map((b) => ({
          ...b,
          username: b.profiles?.username || b.user_id?.slice(0, 8) || 'Player',
        }))
      }
    }

    // Merge in-memory active bets if not already in DB
    const betIds = new Set(bets.map((b) => b.id))
    for (const [id, mb] of memoryBets.entries()) {
      if (!betIds.has(id)) {
        bets.unshift(mb)
      }
    }

    if (status) {
      bets = bets.filter((b) => String(b.status).toUpperCase() === String(status).toUpperCase())
    }
    if (mode) {
      bets = bets.filter((b) => (b.game_mode || 'PARITY').toUpperCase() === mode.toUpperCase())
    }
    if (round) {
      bets = bets.filter((b) => String(b.round_number) === String(round))
    }

    // Sort descending by timestamp
    bets.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    const paged = bets.slice(0, Number(limit))

    // Enrich with unified fields for both frontend formats
    const enriched = paged.map((b) => {
      let uname = b.username
      if (!uname) {
        const u = memoryProfiles.get(b.user_id)
        uname = u?.username || b.user_id?.slice(0, 8) || 'Player'
      }
      return {
        id: b.id,
        userId: b.user_id,
        user: uname,
        username: uname,
        period: b.round_number,
        roundNumber: b.round_number,
        gameMode: b.game_mode || 'PARITY',
        selection: b.selection,
        targetSelection: b.selection,
        amount: Number(b.amount || 0),
        amountPlaced: Number(b.amount || 0),
        status: b.status,
        payout: Number(b.payout || 0),
        amountWon: Number(b.payout || 0),
        multiplier: b.multiplier,
        outcome: b.outcome || null,
        placedAt: b.created_at || new Date().toISOString(),
        settledAt: b.settled_at || null,
      }
    })

    return res.json({
      success: true,
      count: enriched.length,
      totalRecords: bets.length,
      bets: enriched,
    })
  } catch (err) {
    console.error('[getBetsLedger Error]:', err)
    return res.status(500).json({ error: 'Failed to retrieve bets ledger' })
  }
}

// 4. Users CRUD: List Users
export async function listUsers(req, res) {
  try {
    const { search = '' } = req.query
    const cleanSearch = String(search).trim().toLowerCase()

    let users = []

    if (isSupabaseConfigured) {
      let query = supabase.from('profiles').select('*, wallets(balance)')
      if (cleanSearch) {
        query = query.or(`username.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`)
      }
      const { data, error } = await query
      if (error) throw error

      users = (data || []).map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email || 'N/A',
        role: u.role || 'user',
        isAdmin: Boolean(u.is_admin || u.role === 'admin'),
        status: u.status || 'active',
        balance: Number(u.wallets?.balance ?? u.wallets?.[0]?.balance ?? 1000.0),
        createdAt: u.created_at,
      }))
    } else {
      for (const [id, prof] of memoryProfiles.entries()) {
        const uname = prof.username || ''
        const email = prof.email || ''
        if (
          !cleanSearch ||
          uname.toLowerCase().includes(cleanSearch) ||
          email.toLowerCase().includes(cleanSearch) ||
          id.toLowerCase().includes(cleanSearch)
        ) {
          const w = memoryWallets.get(id)
          users.push({
            id: prof.id,
            username: prof.username,
            email: prof.email || 'N/A',
            role: prof.role || 'user',
            isAdmin: Boolean(prof.is_admin || prof.role === 'admin'),
            status: prof.status || 'active',
            balance: w?.balance !== undefined ? Number(w.balance) : 1000.0,
            createdAt: prof.created_at || '2026-09-17',
          })
        }
      }
    }

    return res.json({ success: true, count: users.length, users })
  } catch (err) {
    console.error('[listUsers Error]:', err)
    return res.status(500).json({ error: 'Failed to list users' })
  }
}

// 5. Users CRUD: Update User Balance (Credit / Debit)
export async function updateUserBalance(req, res) {
  try {
    const { id } = req.params
    const { amount, action = 'credit', reason = 'Admin Adjustment' } = req.body

    const numAmt = Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      return res.status(400).json({ error: 'Positive numerical amount is required' })
    }

    let newBalance = 0

    if (isSupabaseConfigured) {
      const { data: wal, error: fErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', id)
        .single()

      if (fErr || !wal) return res.status(404).json({ error: 'User wallet not found' })

      const curBal = Number(wal.balance)
      newBalance = action === 'debit' ? Math.max(0, curBal - numAmt) : curBal + numAmt

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', id)

      // Ledger entry
      await supabase.from('wallet_transactions').insert({
        user_id: id,
        type: action === 'debit' ? 'WITHDRAWAL' : 'BONUS',
        amount: numAmt,
        balance_after: newBalance,
        description: `Admin ${action.toUpperCase()}: ${reason}`,
      })
    } else {
      let wal = memoryWallets.get(id)
      if (!wal) {
        wal = { user_id: id, balance: 1000.0 }
        memoryWallets.set(id, wal)
      }
      const curBal = Number(wal.balance)
      newBalance = action === 'debit' ? Math.max(0, curBal - numAmt) : curBal + numAmt
      wal.balance = newBalance

      memoryTransactions.push({
        id: crypto.randomUUID(),
        user_id: id,
        type: action === 'debit' ? 'WITHDRAWAL' : 'BONUS',
        amount: numAmt,
        balance_after: newBalance,
        description: `Admin ${action.toUpperCase()}: ${reason}`,
        created_at: new Date().toISOString(),
      })
    }

    return res.json({
      success: true,
      message: `User balance ${action === 'debit' ? 'debited' : 'credited'} by ₹${numAmt}`,
      userId: id,
      newBalance,
    })
  } catch (err) {
    console.error('[updateUserBalance Error]:', err)
    return res.status(500).json({ error: err.message })
  }
}

// 6. Users CRUD: Update Role (user <-> admin)
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Role must be 'user' or 'admin'" })
    }

    const isAdmin = role === 'admin'

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ role, is_admin: isAdmin }).eq('id', id)
      if (error) throw error
    } else {
      const prof = memoryProfiles.get(id)
      if (!prof) return res.status(404).json({ error: 'User not found' })
      prof.role = role
      prof.is_admin = isAdmin
      saveProfilesToDisk()
    }

    return res.json({ success: true, message: `User role updated to ${role}`, userId: id, role, isAdmin })
  } catch (err) {
    console.error('[updateUserRole Error]:', err)
    return res.status(500).json({ error: err.message })
  }
}

// 7. Users CRUD: Freeze/Unfreeze Status (active <-> suspended)
export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'suspended'" })
    }

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ status }).eq('id', id)
    } else {
      const prof = memoryProfiles.get(id)
      if (!prof) return res.status(404).json({ error: 'User not found' })
      prof.status = status
      saveProfilesToDisk()
    }

    return res.json({ success: true, message: `User status set to ${status}`, userId: id, status })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// 8. Users CRUD: Delete User
export async function deleteUser(req, res) {
  try {
    const { id } = req.params

    if (req.adminUser?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own active admin account' })
    }

    if (isSupabaseConfigured) {
      await supabase.from('wallets').delete().eq('user_id', id)
      await supabase.from('profiles').delete().eq('id', id)
    } else {
      const prof = memoryProfiles.get(id)
      if (prof) {
        memoryCredentials.delete(id)
        if (prof.username) memoryCredentials.delete(prof.username)
        if (prof.email) memoryCredentials.delete(prof.email)
        memoryProfiles.delete(id)
        memoryWallets.delete(id)
        saveProfilesToDisk()
        saveCredentialsToDisk()
      }
    }

    return res.json({ success: true, message: 'User account deleted successfully', deletedId: id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// 9. Bootstrap / Promote Master Admin
export async function promoteOrSeedAdmin(req, res) {
  try {
    const { identity } = req.body
    if (!identity) {
      return res.status(400).json({ error: 'Identity (username, phone, or email) is required' })
    }

    const clean = String(identity).trim().toLowerCase()
    let found = null

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${clean},email.eq.${clean}`)
        .maybeSingle()

      if (error || !data) {
        return res.status(404).json({ error: `Account '${identity}' not found in database` })
      }
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.id)
      found = { ...data, role: 'admin' }
    } else {
      for (const prof of memoryProfiles.values()) {
        if (
          prof.username?.toLowerCase() === clean ||
          prof.email?.toLowerCase() === clean ||
          prof.id === clean
        ) {
          prof.role = 'admin'
          saveProfilesToDisk()
          found = prof
          break
        }
      }
    }

    if (!found) {
      return res.status(404).json({ error: `User with identity '${identity}' not found in profiles` })
    }

    return res.json({
      success: true,
      message: `User '${found.username}' promoted to admin role in database`,
      user: { id: found.id, username: found.username, role: 'admin' },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
