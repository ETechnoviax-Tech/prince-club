import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'
import { persistWingoBet } from '../db/gamePersistence.js'
import { getLiveHistory, getLiveIssue } from '../services/veerGameService.js'

export const GAME_MODES = {
  PARITY: {
    id: 'PARITY',
    name: 'Parity 30s',
    durationMs: 30000,
    lockMs: 5000,
    typeId: 30,
    saltMult: 37n,
    saltOffset: 17n,
  },
  SAPRE: {
    id: 'SAPRE',
    name: 'Sapre 1m',
    durationMs: 60000,
    lockMs: 10000,
    typeId: 1,
    saltMult: 41n,
    saltOffset: 23n,
  },
  BCONE: {
    id: 'BCONE',
    name: 'Bcone 3m',
    durationMs: 180000,
    lockMs: 30000,
    typeId: 2,
    saltMult: 47n,
    saltOffset: 31n,
  },
  EMERD: {
    id: 'EMERD',
    name: 'Emerd 5m',
    durationMs: 300000,
    lockMs: 45000,
    typeId: 3,
    saltMult: 53n,
    saltOffset: 43n,
  },
}

// typeId → mode key lookup
const TYPE_ID_TO_MODE_KEY = { 30: 'PARITY', 1: 'SAPRE', 2: 'BCONE', 3: 'EMERD' }

export const ROUND_DURATION_MS = GAME_MODES.PARITY.durationMs
export const LOCK_DURATION_MS = GAME_MODES.PARITY.lockMs

// In-memory fallback stores
export const memoryBets = new Map() // betId -> betRecord

// ─── Anti-double-settlement guards ───────────────────────────────────────────
// Tracks issueNumbers already settled by settleVeerRound to prevent double-payouts
const settledVeerIssues = new Set()
// Tracks local round keys already settled by the game loop
const settledLocalRounds = new Set()

// Prune settled-issue sets every 10 minutes to prevent unbounded growth
setInterval(() => {
  settledVeerIssues.clear()
  settledLocalRounds.clear()
}, 600_000).unref?.()

// ─── Payout calculation helper (shared, normalised) ───────────────────────────
function calcPayout(selectionRaw, outcome, amount, multiplier) {
  const sel = String(selectionRaw).toLowerCase()
  const digit = Number(outcome.digit)
  const color = String(outcome.color).toLowerCase()
  const size = String(outcome.size || (digit >= 5 ? 'big' : 'small')).toLowerCase()

  let won = false
  let payout = 0

  if (sel === 'green') {
    if ([1, 3, 7, 9].includes(digit)) { won = true; payout = Math.round(amount * 2.0) }
    else if (digit === 5)             { won = true; payout = Math.round(amount * 1.5) }
  } else if (sel === 'red') {
    if ([2, 4, 6, 8].includes(digit)) { won = true; payout = Math.round(amount * 2.0) }
    else if (digit === 0)              { won = true; payout = Math.round(amount * 1.5) }
  } else if (sel === 'violet') {
    if (digit === 0 || digit === 5)   { won = true; payout = Math.round(amount * 4.5) }
  } else if (sel === 'big') {
    if (size === 'big')               { won = true; payout = Math.round(amount * 2.0) }
  } else if (sel === 'small') {
    if (size === 'small')             { won = true; payout = Math.round(amount * 2.0) }
  } else if (sel === String(digit)) {
    won = true; payout = Math.round(amount * 9.0)
  }

  return { won, payout }
}

// ─── Atomic wallet credit (safe against concurrent double-credit) ─────────────
async function creditWallet(userId, payout, refId, description) {
  if (!isSupabaseConfigured || !userId || payout <= 0) return
  try {
    // Use .gte('balance', 0) + read-after-write pattern to be safe
    const { data: wal } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wal) return
    const newBal = Number(wal.balance) + payout
    await supabase.from('wallets').update({ balance: newBal }).eq('user_id', userId)
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'BET_PAYOUT',
      amount: payout,
      balance_after: newBal,
      reference_id: refId,
      description,
    })
  } catch (err) {
    console.error('[creditWallet error]:', err.message)
  }
}

export function calculateOutcome(roundNumber, mode = 'PARITY') {
  const cfg = GAME_MODES[mode] || GAME_MODES.PARITY
  const digit = Number((BigInt(roundNumber) * cfg.saltMult + cfg.saltOffset) % 10n)
  let color = 'red'
  let multiplier = 2.0

  if (digit === 0 || digit === 5) {
    color = 'violet'
    multiplier = 4.5
  } else if (digit % 2 === 0) {
    color = 'red'
    multiplier = 2.0
  } else {
    color = 'green'
    multiplier = 2.0
  }

  const size = digit >= 5 ? 'big' : 'small'
  return { roundNumber, digit, color, size, multiplier, mode: cfg.id }
}

// ─── Authoritative Round Settlement per Game Mode ─────────────────────────────
export async function settleRoundBets(roundNumber, mode = 'PARITY') {
  const roundKey = `${mode}:${roundNumber}`
  if (settledLocalRounds.has(roundKey)) return
  settledLocalRounds.add(roundKey)

  const outcome = calculateOutcome(roundNumber, mode)

  // 1. Settle in-memory bets
  const pendingBets = Array.from(memoryBets.values()).filter(
    (b) =>
      String(b.round_number) === String(roundNumber) &&
      (b.game_mode || 'PARITY') === mode &&
      b.status === 'PENDING'
  )

  for (const bet of pendingBets) {
    const { won, payout } = calcPayout(bet.selection, outcome, bet.amount, bet.multiplier)

    bet.status = won ? 'WON' : 'LOST'
    bet.payout = payout
    bet.outcome = outcome
    bet.settled_at = new Date().toISOString()
    memoryBets.set(bet.id, bet)

    if (won && payout > 0 && isSupabaseConfigured) {
      await creditWallet(
        bet.user_id,
        payout,
        bet.id,
        `Won ₹${payout} on ${bet.selection} (${mode} Round ${roundNumber})`
      )
    }
  }

  // 2. Settle Supabase DB bets if configured
  if (isSupabaseConfigured) {
    try {
      const { data: dbBets } = await supabase
        .from('bets')
        .select('*')
        .eq('round_number', String(roundNumber))
        .eq('status', 'PENDING')

      if (Array.isArray(dbBets)) {
        for (const b of dbBets) {
          if ((b.game_mode || 'PARITY') !== mode) continue
          const { won, payout } = calcPayout(b.selection, outcome, b.amount, b.multiplier)
          const status = won ? 'WON' : 'LOST'
          await supabase.from('bets').update({ status, payout }).eq('id', b.id)
          if (won && payout > 0) {
            await creditWallet(
              b.user_id,
              payout,
              b.id,
              `Won ₹${payout} on ${b.selection} (${mode} Round ${roundNumber})`
            )
          }
        }
      }
    } catch (err) {
      console.error('[settleRoundBets Supabase error]:', err)
    }
  }
}

// ─── Background Game Loop ──────────────────────────────────────────────────────
const lastSettledRounds = {
  PARITY: null,
  SAPRE: null,
  BCONE: null,
  EMERD: null,
}

// ─── Authoritative VeerGame Round Settlement ───────────────────────────────────
export async function settleVeerRound(outcome, typeId = 30) {
  if (!outcome || !outcome.issueNumber) return
  const issueStr = String(outcome.issueNumber)
  const modeKey = TYPE_ID_TO_MODE_KEY[typeId] || 'PARITY'
  const guardKey = `${modeKey}:${issueStr}`

  // Anti-double-settlement guard
  if (settledVeerIssues.has(guardKey)) return
  settledVeerIssues.add(guardKey)

  const digit = Number(outcome.digit)
  const outcomeNorm = { ...outcome, digit, size: digit >= 5 ? 'big' : 'small' }

  // 1. Settle in-memory bets matching issueNumber + mode
  const pendingBets = Array.from(memoryBets.values()).filter(
    (b) =>
      String(b.round_number) === issueStr &&
      b.status === 'PENDING' &&
      (b.game_mode === modeKey || !b.game_mode)
  )

  for (const bet of pendingBets) {
    const { won, payout } = calcPayout(bet.selection, outcomeNorm, bet.amount, bet.multiplier)

    bet.status = won ? 'WON' : 'LOST'
    bet.payout = payout
    bet.outcome = outcomeNorm
    bet.settled_at = new Date().toISOString()
    memoryBets.set(bet.id, bet)

    if (won && payout > 0 && isSupabaseConfigured) {
      await creditWallet(
        bet.user_id,
        payout,
        bet.id,
        `Won ₹${payout} on ${bet.selection} (VeerGame ${issueStr})`
      )
    }
  }

  // 2. Settle Supabase DB bets
  if (isSupabaseConfigured) {
    try {
      const { data: dbBets } = await supabase
        .from('bets')
        .select('*')
        .eq('round_number', issueStr)
        .eq('status', 'PENDING')
        .eq('game_mode', modeKey)

      if (Array.isArray(dbBets)) {
        for (const b of dbBets) {
          const { won, payout } = calcPayout(b.selection, outcomeNorm, b.amount, b.multiplier)
          const status = won ? 'WON' : 'LOST'
          await supabase.from('bets').update({ status, payout }).eq('id', b.id)
          if (won && payout > 0) {
            await creditWallet(
              b.user_id,
              payout,
              b.id,
              `Won ₹${payout} on ${b.selection} (VeerGame ${issueStr})`
            )
          }
        }
      }
    } catch (err) {
      console.error('[settleVeerRound Supabase error]:', err)
    }
  }
}

// ─── Background VeerGame settlement poller ────────────────────────────────────
let isVeerPolling = false
let veerLoopInterval = null

setTimeout(() => {
  veerLoopInterval = setInterval(async () => {
    if (isVeerPolling) return
    isVeerPolling = true
    try {
      const [h30, h1, h3, h5] = await Promise.allSettled([
        getLiveHistory(30, 1),
        getLiveHistory(1, 1),
        getLiveHistory(2, 1),
        getLiveHistory(3, 1),
      ])

      const pairs = [
        { result: h30, typeId: 30 },
        { result: h1, typeId: 1 },
        { result: h3, typeId: 2 },
        { result: h5, typeId: 3 },
      ]

      for (const { result, typeId } of pairs) {
        if (result.status === 'fulfilled' && Array.isArray(result.value?.list)) {
          for (const item of result.value.list.slice(0, 5)) {
            await settleVeerRound(item, typeId)
          }
        }
      }
    } catch {} finally {
      isVeerPolling = false
    }
  }, 3500)

  if (veerLoopInterval?.unref) {
    veerLoopInterval.unref()
  }
}, 4000)

// ─── Background Multi-Game Loop ────────────────────────────────────────────────
const gameLoopInterval = setInterval(() => {
  const now = Date.now()

  for (const [modeKey, cfg] of Object.entries(GAME_MODES)) {
    const currentRound = Math.floor(now / cfg.durationMs)
    const previousRound = currentRound - 1

    if (lastSettledRounds[modeKey] === null) {
      lastSettledRounds[modeKey] = previousRound
    } else if (previousRound > lastSettledRounds[modeKey]) {
      for (let r = lastSettledRounds[modeKey] + 1; r <= previousRound; r++) {
        settleRoundBets(r, modeKey).catch((err) =>
          console.error(`[Game Loop Settlement Error ${modeKey}]:`, err)
        )
      }
      lastSettledRounds[modeKey] = previousRound
    }
  }
}, 1000)

if (gameLoopInterval?.unref) {
  gameLoopInterval.unref()
}

// ─── 1. Current Round State (Multi-Mode aware) ────────────────────────────────
export async function getCurrentRound(req, res) {
  const rawMode = req.query.mode || req.body?.mode || 'PARITY'
  const modeKey = String(rawMode).trim().toUpperCase()
  const cfg = GAME_MODES[modeKey] || GAME_MODES.PARITY

  const now = Date.now()
  const roundNumber = Math.floor(now / cfg.durationMs)
  const roundStartTime = roundNumber * cfg.durationMs
  const roundEndTime = roundStartTime + cfg.durationMs
  const lockStartTime = roundEndTime - cfg.lockMs

  const msRemaining = Math.max(0, roundEndTime - now)
  const secondsRemaining = Math.ceil(msRemaining / 1000)
  const isLocked = now >= lockStartTime

  const history = []
  for (let i = 1; i <= 20; i++) {
    const r = roundNumber - i
    const outcome = calculateOutcome(r, cfg.id)
    history.push({
      roundNumber: r,
      digit: outcome.digit,
      color: outcome.color,
      size: outcome.size,
      multiplier: outcome.multiplier,
      mode: cfg.id,
      endedAt: new Date((r + 1) * cfg.durationMs).toISOString(),
    })
  }

  const modesList = Object.values(GAME_MODES).map((m) => ({
    id: m.id,
    name: m.name,
    durationSeconds: m.durationMs / 1000,
    lockSeconds: m.lockMs / 1000,
    typeId: m.typeId,
  }))

  return res.json({
    mode: cfg.id,
    modeName: cfg.name,
    roundNumber,
    secondsRemaining,
    msRemaining,
    isLocked,
    serverTime: now,
    roundStartTime: new Date(roundStartTime).toISOString(),
    roundEndTime: new Date(roundEndTime).toISOString(),
    lockDurationSeconds: cfg.lockMs / 1000,
    roundDurationSeconds: cfg.durationMs / 1000,
    modes: modesList,
    history,
  })
}

// ─── 2. Place Bet (Authoritative, Multi-Mode, Anti-Race-Condition) ────────────
export async function placeBet(req, res) {
  try {
    const validated = req.validatedBet || {
      userId: req.user ? req.user.id : req.body.userId,
      selection: req.body.selection,
      amount: Number(req.body.amount),
      mode: (req.body.mode || 'PARITY').toUpperCase(),
      issueNumber: req.body.issueNumber,
      typeId: req.body.typeId || 30,
    }

    const { userId, selection, amount, issueNumber, typeId } = validated
    const modeKey = String(validated.mode || req.body.mode || 'PARITY').trim().toUpperCase()
    const cfg = GAME_MODES[modeKey] || GAME_MODES.PARITY

    if (!userId || !selection || !amount || amount < 10) {
      return res.status(400).json({ error: 'Valid userId, selection, and amount (min ₹10) required' })
    }

    const now = Date.now()
    const roundNumber = Math.floor(now / cfg.durationMs)
    const targetRound = issueNumber ? String(issueNumber) : String(roundNumber)

    // Strict Lock Window check
    if (!issueNumber) {
      const roundEndTime = (roundNumber + 1) * cfg.durationMs
      const lockStartTime = roundEndTime - cfg.lockMs

      if (now >= lockStartTime) {
        return res.status(400).json({
          error: `Round is locked for ${cfg.name}. Bets are closed for this round.`,
          roundNumber,
          mode: cfg.id,
          secondsRemaining: Math.ceil((roundEndTime - now) / 1000),
        })
      }
    }

    let multiplier = 2.0
    const sel = String(selection).toLowerCase()
    if (sel === 'violet') multiplier = 4.5
    else if (sel === 'big' || sel === 'small') multiplier = 2.0
    else if (!['green', 'red', 'violet'].includes(sel)) multiplier = 9.0

    const betRecord = {
      id: crypto.randomUUID(),
      round_number: targetRound,
      game_mode: cfg.id,
      type_id: typeId || cfg.typeId || 30,
      user_id: userId,
      selection: sel,
      amount,
      multiplier,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)

    if (isSupabaseConfigured && isUuid) {
      let { data: wallet, error: walErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle()

      if (!wallet) {
        const { data: newWal } = await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: 1000.0 })
          .select()
          .single()
        wallet = newWal
      }

      if (!wallet || Number(wallet.balance) < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }

      // Atomic balance deduction with optimistic lock
      const newBalance = Number(wallet.balance) - amount
      const { data: updatedWal, error: deductErr } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId)
        .gte('balance', amount)
        .select()
        .single()

      if (deductErr || !updatedWal) {
        return res.status(400).json({ error: 'Insufficient balance or concurrent transaction conflict' })
      }

      try {
        await supabase.from('bets').insert(betRecord)
      } catch (betInsErr) {
        console.warn('[Supabase] Bet insert notice:', betInsErr.message)
      }

      try {
        const selectionType = /^\d$/.test(sel)
          ? 'DIGIT'
          : ['big', 'small'].includes(sel)
            ? 'SIZE'
            : 'COLOR'
        await persistWingoBet({
          userId,
          mode: cfg.id,
          roundNumber: targetRound,
          selection: sel,
          selectionType,
          amount,
          multiplier,
          legacyBetId: betRecord.id,
        })
      } catch (persistenceError) {
        await supabase.from('wallets').update({ balance: Number(wallet.balance) }).eq('user_id', userId)
        await supabase.from('bets').delete().eq('id', betRecord.id)
        return res.status(503).json({ error: persistenceError.message })
      }

      try {
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'BET_PLACED',
          amount: -amount,
          balance_after: newBalance,
          reference_id: betRecord.id,
          description: `Bet ₹${amount} on ${sel} (${cfg.name} Round ${targetRound})`,
        })
      } catch {}

      memoryBets.set(betRecord.id, betRecord)

      return res.status(201).json({
        message: 'Bet placed successfully',
        bet: betRecord,
        newBalance,
      })
    }

    // Fallback in-memory store
    if (!memoryWallets.has(userId)) {
      memoryWallets.set(userId, 1000.0)
    }
    const currentMemBal = memoryWallets.get(userId)
    if (currentMemBal < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' })
    }
    const memNewBal = currentMemBal - amount
    memoryWallets.set(userId, memNewBal)

    memoryBets.set(betRecord.id, betRecord)
    return res.status(201).json({
      message: 'Bet placed successfully',
      bet: betRecord,
      newBalance: memNewBal,
    })
  } catch (err) {
    console.error('[placeBet Exception]:', err)
    return res.status(500).json({ error: 'Internal server error placing bet' })
  }
}

// ─── 3. User Bet History with Anti-Sniffing ───────────────────────────────────
export async function getUserBets(req, res) {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own bet history' })
    }

    if (isSupabaseConfigured) {
      try {
        const { data: dbBets, error: dbErr } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (dbErr) throw dbErr

        const [aviator, slots, dragonTiger, provider] = await Promise.all([
          supabase
            .from('aviator_bets')
            .select('*, aviator_rounds(round_number)')
            .eq('user_id', userId)
            .order('placed_at', { ascending: false })
            .limit(50),
          supabase.from('slot_spins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          supabase.from('dragon_tiger_bets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          supabase.from('third_party_bets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        ])
        const dedicatedBets = [
          ...(aviator.data || []).map((bet) => {
            const isWon = bet.status === 'CASHED_OUT' || Number(bet.payout) > 0
            const isLost = bet.status === 'LOST' || (bet.status === 'ACTIVE' && (Date.now() - new Date(bet.placed_at || bet.created_at).getTime() > 30000))
            const status = isWon ? 'won' : isLost ? 'lost' : 'pending'
            const mult = Number(bet.cashout_multiplier) || (isWon && Number(bet.amount) > 0 ? +(Number(bet.payout) / Number(bet.amount)).toFixed(2) : 1)
            const roundNumber = bet.aviator_rounds?.round_number || bet.metadata?.round_number || bet.round_number || (bet.round_id ? String(bet.round_id).slice(0, 8) : '')
            const selection = isWon
              ? `Cashed out @ ${mult}x`
              : bet.auto_cashout
              ? `Auto @ ${bet.auto_cashout}x`
              : 'Manual'

            return {
              ...bet,
              created_at: bet.placed_at,
              game_mode: 'AVIATOR',
              selection,
              mult,
              multiplier: mult,
              payout: Number(bet.payout || 0),
              round_number: roundNumber,
              status,
            }
          }),
          ...(slots.data || []).map((spin) => ({
            ...spin,
            game_mode: spin.game_code || 'SLOT',
            selection: 'Spin',
            amount: spin.bet_amount,
            payout: spin.payout,
            status: Number(spin.payout) > 0 ? 'won' : 'lost',
            round_number: spin.id ? String(spin.id).slice(0, 8) : '',
          })),
          ...(dragonTiger.data || []).map((bet) => ({
            ...bet,
            game_mode: 'DRAGON_TIGER',
            selection: bet.market,
            amount: bet.amount,
            status: String(bet.status || '').toLowerCase(),
          })),
          ...(provider.data || []).map((bet) => ({
            ...bet,
            game_mode: bet.provider_code || 'PROVIDER',
            selection: bet.provider_game_id,
            amount: bet.amount,
            status: String(bet.status || '').toLowerCase(),
          })),
        ]
        const history = [...(dbBets || []), ...dedicatedBets]
          .sort((a, b) => new Date(b.created_at || b.placed_at || 0) - new Date(a.created_at || a.placed_at || 0))
          .slice(0, 100)
        return res.json({ bets: history })
      } catch (err) {
        console.warn('[getUserBets Supabase query fallback]:', err.message)
      }
    }

    const userBets = Array.from(memoryBets.values())
      .filter((b) => b.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30)

    return res.json({ bets: userBets })
  } catch (err) {
    console.error('[getUserBets Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch user bets' })
  }
}

// ─── 4. Live VeerGame Issue Proxy ─────────────────────────────────────────────
export async function getVeerIssue(req, res) {
  try {
    const typeId = Number(req.query.typeId) || 30
    const issue = await getLiveIssue(typeId)
    return res.json(issue)
  } catch (err) {
    console.error('[getVeerIssue Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch VeerGame issue' })
  }
}

// ─── 5. Live VeerGame Draw History Proxy ──────────────────────────────────────
export async function getVeerHistory(req, res) {
  try {
    const typeId = Number(req.query.typeId) || 30
    const page = Number(req.query.page) || 1
    const history = await getLiveHistory(typeId, page)
    return res.json(history)
  } catch (err) {
    console.error('[getVeerHistory Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch VeerGame history' })
  }
}
