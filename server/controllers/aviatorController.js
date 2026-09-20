import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryTransactions, memoryWallets } from '../db/store.js'

// Authoritative runtime state. Wallets and bet records are persisted when
// Supabase is configured; the memory maps are used only for local fallback.
const state = {
  roundId: Number(`${Date.now()}${crypto.randomInt(10, 99)}`),
  roundDbId: null,
  roundEnsurePromise: null,
  phase: 'WAITING', // 'WAITING' | 'FLYING' | 'CRASHED'
  crashPoint: null,
  serverSeed: null,
  seedCommitment: null,
  startTime: Date.now(),
  flightDurationMs: 0,
  flyingStartedAt: null,
  crashedAt: null,
  history: [],
  bets: new Map(), // key: betId -> betRecord
  recentCashouts: [], // cashouts from real bets in the current flight
}

// Populate genuine completed rounds on server launch if Supabase is connected
if (isSupabaseConfigured) {
  supabase
    .from('aviator_rounds')
    .select('round_number, crash_point')
    .eq('phase', 'CRASHED')
    .not('crash_point', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)
    .then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        state.history = data.map((r) => ({
          roundId: Number(r.round_number),
          crashPoint: Number(r.crash_point),
        }))
      }
    })
    .catch(() => {})
}

const WAITING_DURATION_MS = 6000
const COOLDOWN_DURATION_MS = 3000

// Per-User Execution Mutex to strictly prevent race conditions on concurrent bets
const userLocks = new Map()

async function withUserLock(userId, fn) {
  const currentLock = userLocks.get(userId) || Promise.resolve()
  let release
  const nextLock = new Promise((resolve) => {
    release = resolve
  })
  const queuedLock = currentLock.then(() => nextLock)
  userLocks.set(userId, queuedLock)

  try {
    await currentLock
    return await fn()
  } finally {
    release()
    if (userLocks.get(userId) === queuedLock) {
      userLocks.delete(userId)
    }
  }
}

// Cashout Mutex per betId to prevent double-spending on simultaneous cashout triggers
const activeCashouts = new Set()

function createServerSeed() {
  return crypto.randomBytes(32).toString('hex')
}

function commitmentForSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex')
}

// Derive the crash point from a committed server seed. The seed is revealed
// after the crash so clients can independently verify the completed round.
function generateCrashPoint(serverSeed) {
  const digest = crypto.createHmac('sha256', serverSeed).update('aviator-crash-v1').digest()
  const rand = digest.readUInt32BE(0) / 0xffffffff
  const pick = (min, max) => min + (digest.readUInt32BE(4) % (max - min + 1))
  if (rand < 0.08) {
    // 8% instant/low crash: 1.01x - 1.15x
    return +(1.01 + pick(0, 14) / 100).toFixed(2)
  } else if (rand < 0.60) {
    // 52% standard flight: 1.16x - 3.20x
    return +(1.16 + pick(0, 204) / 100).toFixed(2)
  } else if (rand < 0.90) {
    // 30% high flight: 3.21x - 10.00x
    return +(3.21 + pick(0, 679) / 100).toFixed(2)
  } else {
    // 10% mega flight: 10.01x - 88.00x
    return +(10.01 + pick(0, 7799) / 100).toFixed(2)
  }
}

async function ensureRoundRecord() {
  if (!isSupabaseConfigured) return null
  if (state.roundDbId) return state.roundDbId
  if (state.roundEnsurePromise) return state.roundEnsurePromise

  state.roundEnsurePromise = (async () => {
    const now = new Date()
    const { data, error } = await supabase
      .from('aviator_rounds')
      .insert({
        round_number: state.roundId,
        phase: 'WAITING',
        waiting_started_at: now.toISOString(),
        waiting_duration_ms: WAITING_DURATION_MS,
        cooldown_duration_ms: COOLDOWN_DURATION_MS,
        server_seed_commitment: state.seedCommitment,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      throw new Error(`Failed to persist Aviator round: ${error?.message || 'missing round id'}`)
    }
    state.roundDbId = data.id
    return data.id
    })()

    try {
      return await state.roundEnsurePromise
    } finally {
      state.roundEnsurePromise = null
    }
  }

function prepareRound() {
  state.serverSeed = createServerSeed()
  state.seedCommitment = commitmentForSeed(state.serverSeed)
  state.crashPoint = null
  state.roundDbId = null
  state.roundEnsurePromise = null
  state.flyingStartedAt = null
  state.crashedAt = null
}

async function finalizeRoundRecord() {
  if (!isSupabaseConfigured || !state.roundDbId) return

  let totalBetAmount = 0
  let totalPayout = 0
  for (const b of state.bets.values()) {
    totalBetAmount += Number(b.amount || 0)
    totalPayout += Number(b.payout || 0)
  }

  const { error } = await supabase
    .from('aviator_rounds')
    .update({
      phase: 'SETTLED',
      settled_at: new Date().toISOString(),
      crashed_at: state.crashedAt || new Date().toISOString(),
      flying_started_at: state.flyingStartedAt,
      server_seed_reveal: state.serverSeed,
      crash_point: state.crashPoint,
      flight_duration_ms: state.flightDurationMs,
      total_bet_amount: totalBetAmount,
      total_payout: totalPayout,
    })
    .eq('id', state.roundDbId)
  if (error) console.error('[Aviator round settlement error]:', error.message)
}

// Compute current multiplier from flight elapsed ms
export function calculateMultiplier(elapsedMs) {
  if (elapsedMs <= 0) return 1.0
  const seconds = elapsedMs / 1000
  // Exponential curve: starts slow, accelerates
  const mult = 1.0 + 0.06 * Math.pow(seconds, 1.45)
  return +mult.toFixed(2)
}

// Calculate how many ms it takes to reach a specific crash point
export function durationForCrashPoint(crashPoint) {
  const diff = Math.max(0.01, crashPoint - 1.0)
  const seconds = Math.pow(diff / 0.06, 1 / 1.45)
  return Math.round(seconds * 1000)
}

// Aviator Authoritative Server Loop
function startAviatorLoop() {
  state.phase = 'WAITING'
  state.startTime = Date.now()
  state.recentCashouts = []
  prepareRound()
  let tickInFlight = false

  const tick = async () => {
    if (tickInFlight) return
    tickInFlight = true
    try {
    const now = Date.now()

    if (state.phase === 'WAITING') {
      const elapsed = now - state.startTime
      if (elapsed >= WAITING_DURATION_MS) {
        // Transition to FLYING
        state.phase = 'FLYING'
        state.flyingStartedAt = new Date().toISOString()
        state.crashPoint = generateCrashPoint(state.serverSeed)
        state.flightDurationMs = durationForCrashPoint(state.crashPoint)
        state.startTime = Date.now()

        if (isSupabaseConfigured && state.roundDbId) {
          supabase
            .from('aviator_rounds')
            .update({ phase: 'FLYING', flying_started_at: state.flyingStartedAt })
            .eq('id', state.roundDbId)
            .then(({ error }) => {
              if (error) console.error('[Aviator round flying update error]:', error.message)
            })
        }
      }
    } else if (state.phase === 'FLYING') {
      const elapsed = now - state.startTime
      const currentMult = calculateMultiplier(elapsed)

      // Process real user auto-cashouts (<= crashPoint is safe and fair)
      for (const [betId, b] of state.bets.entries()) {
        if (b.status === 'ACTIVE' && b.autoCashout && currentMult >= b.autoCashout && b.autoCashout <= state.crashPoint) {
          await settleCashout(b, b.autoCashout)
        }
      }

      // Check for crash condition.
      if (elapsed >= state.flightDurationMs || currentMult >= state.crashPoint) {
        // Plane Flew Away!
        state.phase = 'CRASHED'
        state.crashedAt = new Date().toISOString()
        state.startTime = Date.now()

        // Settle all remaining active user bets as LOST
        const lostBetIds = []
        for (const [betId, b] of state.bets.entries()) {
          if (b.status === 'ACTIVE') {
            b.status = 'LOST'
            b.payout = 0
            lostBetIds.push(b.id)
          }
        }

        // Batch update lost bets in Supabase
        if (isSupabaseConfigured) {
          if (lostBetIds.length > 0) {
            supabase
              .from('aviator_bets')
              .update({ status: 'LOST', payout: 0 })
              .in('id', lostBetIds)
              .then(({ error }) => {
                if (error) console.error('[Aviator batch loss settlement error]:', error.message)
              })
          }
          if (state.roundDbId) {
            supabase
              .from('aviator_bets')
              .update({ status: 'LOST', payout: 0 })
              .eq('round_id', state.roundDbId)
              .eq('status', 'ACTIVE')
              .then(({ error }) => {
                if (error) console.error('[Aviator roundDbId sweep error]:', error.message)
              })
          }
        }

        // Record flight in history
        state.history.unshift({ roundId: state.roundId, crashPoint: state.crashPoint })
        if (state.history.length > 30) state.history.pop()
        await finalizeRoundRecord()
      }
    } else if (state.phase === 'CRASHED') {
      const elapsed = now - state.startTime
      if (elapsed >= COOLDOWN_DURATION_MS) {
        // Prepare next round
        state.roundId++
        state.phase = 'WAITING'
        state.startTime = Date.now()
        prepareRound()
        state.bets.clear()
        if (state.recentCashouts.length > 30) state.recentCashouts.length = 30
      }
    }
    } catch (err) {
      console.error('[Aviator loop error]:', err)
    } finally {
      tickInFlight = false
    }
  }

  // High precision 100ms authoritative tick
  const loop = setInterval(tick, 100)
  if (loop?.unref) loop.unref()
}

startAviatorLoop()

// Settle Cashout helper with concurrency safety
async function settleCashout(bet, multiplier) {
  if (bet.status !== 'ACTIVE') return false
  if (activeCashouts.has(bet.id)) return false
  activeCashouts.add(bet.id)

  try {
    const mult = Math.min(multiplier, state.crashPoint)
    const payout = Math.round(bet.amount * mult)

    bet.status = 'CASHED_OUT'
    bet.cashoutMultiplier = mult
    bet.payout = payout

    state.recentCashouts.unshift({
      username: `You`,
      amount: bet.amount,
      multiplier: mult,
      payout,
      time: Date.now(),
    })

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bet.userId)

    if (isSupabaseConfigured && isUuid) {
      let walletUpdated = false
      let betMarkedWon = false
      try {
        const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', bet.userId).single()
        if (!wal) throw new Error('Wallet not found while settling Aviator cashout')
        const newBal = Number(wal.balance) + payout
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: newBal })
          .eq('user_id', bet.userId)
        if (walletError) throw walletError
        walletUpdated = true
        const { error: betError } = await supabase
          .from('aviator_bets')
          .update({
            status: 'CASHED_OUT',
            payout,
            cashout_multiplier: mult,
            cashed_out_at: new Date().toISOString(),
          })
          .eq('id', bet.id)
        if (betError) throw betError
        betMarkedWon = true
        const { error: transactionError } = await supabase.from('wallet_transactions').insert({
            user_id: bet.userId,
            type: 'BET_PAYOUT',
            amount: payout,
            balance_after: newBal,
            reference_id: bet.id,
            description: `Aviator Cash Out at ${mult}x (+₹${payout})`,
          })
        if (transactionError) throw transactionError
      } catch (err) {
        console.error('[settleCashout Supabase error]:', err)
        if (betMarkedWon) {
          await supabase.from('aviator_bets').update({ status: 'ACTIVE', payout: 0 }).eq('id', bet.id)
        }
        if (walletUpdated) {
          const { data: currentWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', bet.userId)
            .single()
          if (currentWallet) {
            await supabase
              .from('wallets')
              .update({ balance: Math.max(0, Number(currentWallet.balance) - payout) })
              .eq('user_id', bet.userId)
          }
        }
        bet.status = 'ACTIVE'
        bet.cashoutMultiplier = null
        bet.payout = 0
        return false
      }
    } else {
      // In-memory fallback
      const prevBal = memoryWallets.get(bet.userId) || 1000
      const newBal = prevBal + payout
      memoryWallets.set(bet.userId, newBal)
      memoryTransactions.push({
        id: crypto.randomUUID(),
        user_id: bet.userId,
        type: 'BET_PAYOUT',
        amount: payout,
        balance_after: newBal,
        reference_id: bet.id,
        description: `Aviator Cash Out at ${mult}x (+₹${payout})`,
        created_at: new Date().toISOString(),
      })
    }

    return { payout, mult }
  } finally {
    activeCashouts.delete(bet.id)
  }
}

// 1. Get Live Aviator State (Broadcast to all connected players)
export async function getAviatorState(req, res) {
  const now = Date.now()
  let currentMultiplier = 1.0
  let remainingMs = 0
  let elapsedMs = 0

  if (state.phase === 'WAITING') {
    elapsedMs = now - state.startTime
    remainingMs = Math.max(0, WAITING_DURATION_MS - elapsedMs)
    currentMultiplier = 1.0
  } else if (state.phase === 'FLYING') {
    elapsedMs = now - state.startTime
    currentMultiplier = calculateMultiplier(elapsedMs)
    remainingMs = Math.max(0, state.flightDurationMs - elapsedMs)
  } else if (state.phase === 'CRASHED') {
    elapsedMs = now - state.startTime
    remainingMs = Math.max(0, COOLDOWN_DURATION_MS - elapsedMs)
    currentMultiplier = state.crashPoint
  }

  // Calculate live multiplayer totals
  const totalPlayers = new Set(Array.from(state.bets.values()).map((bet) => bet.userId)).size

  let totalPool = 0
  for (const b of state.bets.values()) totalPool += b.amount

  // Include user bets for authenticated requester
  const authUserId = req.user?.id || req.query.userId
  const userBets = []
  if (authUserId) {
    for (const b of state.bets.values()) {
      if (b.userId === authUserId) {
        userBets.push({
          id: b.id,
          panelId: b.panelId !== undefined ? b.panelId : 0,
          amount: b.amount,
          autoCashout: b.autoCashout,
          status: b.status,
          cashoutMultiplier: b.cashoutMultiplier,
          payout: b.payout,
          roundId: b.roundId,
          placedAt: b.placedAt,
        })
      }
    }
  }

  return res.json({
    game: 'AVIATOR',
    engine: 'in-house',
    roundId: state.roundId,
    phase: state.phase,
    multiplier: currentMultiplier,
    crashPoint: state.phase === 'CRASHED' ? state.crashPoint : null,
    seedCommitment: state.seedCommitment,
    serverSeed: state.phase === 'CRASHED' ? state.serverSeed : null,
    remainingMs,
    elapsedMs,
    waitingDurationMs: WAITING_DURATION_MS,
    cooldownDurationMs: COOLDOWN_DURATION_MS,
    history: state.history.slice(0, 20),
    totalPlayers,
    totalPool,
    recentCashouts: state.recentCashouts.slice(0, 10),
    userBets,
    serverTime: now,
  })
}

// 2. Place Bet with Per-User Concurrency Mutex
export async function placeAviatorBet(req, res) {
  const authUserId = req.user ? req.user.id : req.body.userId
  const { amount, autoCashout, panelId: rawPanelId } = req.body
  const panelId = (rawPanelId === 1 || rawPanelId === '1') ? 1 : 0

  if (!authUserId) {
    return res.status(401).json({ error: 'User authentication required' })
  }

  const numAmount = Number(amount)
  if (!Number.isInteger(numAmount) || numAmount < 10) {
    return res.status(400).json({ error: 'Bet amount must be a whole number of at least ₹10' })
  }

  if (numAmount > 50000) {
    return res.status(400).json({ error: 'Maximum bet amount is ₹50,000' })
  }

  if (state.phase !== 'WAITING') {
    return res.status(400).json({ error: 'Bets are only accepted during the waiting countdown before takeoff' })
  }

  const cleanAuto = autoCashout === null || autoCashout === undefined || autoCashout === ''
    ? null
    : Number(autoCashout)
  if (cleanAuto !== null && (!Number.isFinite(cleanAuto) || cleanAuto < 1.05 || cleanAuto > 100)) {
    return res.status(400).json({ error: 'Auto cashout multiplier must be between 1.05x and 100x' })
  }

  // Execute inside per-user mutex lock to handle concurrent requests safely
  return await withUserLock(authUserId, async () => {
    try {
      // Re-verify phase under lock in case it transitioned while waiting for lock
      if (state.phase !== 'WAITING') {
        return res.status(400).json({ error: 'Round has already taken off' })
      }

      // Strictly prevent double bets on the SAME panel: check if user already has an active bet on this panel
      for (const b of state.bets.values()) {
        const betPanel = b.panelId !== undefined ? b.panelId : 0
        if (b.userId === authUserId && b.roundId === state.roundId && betPanel === panelId && (b.status === 'ACTIVE' || b.status === 'PLACED')) {
          return res.status(409).json({ error: `You already have an active bet placed on panel ${panelId + 1} for this round` })
        }
      }

      const betId = crypto.randomUUID()
      let balanceAfter = 1000
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)

      if (isSupabaseConfigured && isUuid) {
        // Atomic wallet deduction
        const { data: wal, error: walErr } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
        if (walErr || !wal) return res.status(404).json({ error: 'Wallet not found' })
        if (Number(wal.balance) < numAmount) return res.status(400).json({ error: 'Insufficient wallet balance' })

        balanceAfter = Number(wal.balance) - numAmount
        const { error: updateErr } = await supabase
          .from('wallets')
          .update({ balance: balanceAfter })
          .eq('user_id', authUserId)
          .gte('balance', numAmount)

        if (updateErr) return res.status(400).json({ error: 'Transaction failed: insufficient balance' })

        if (!state.roundDbId) {
          await ensureRoundRecord()
        }
        const { error: betInsertError } = await supabase.from('aviator_bets').insert({
          id: betId,
          round_id: state.roundDbId,
          user_id: authUserId,
          amount: numAmount,
          auto_cashout: cleanAuto,
          status: 'ACTIVE',
          metadata: { round_number: state.roundId },
        })
        if (betInsertError) {
          await supabase.from('wallets').update({ balance: Number(wal.balance) }).eq('user_id', authUserId)
          return res.status(503).json({ error: 'Aviator round is temporarily unavailable. Please try again.' })
        }

        const { error: transactionError } = await supabase.from('wallet_transactions').insert({
          user_id: authUserId,
          type: 'BET_PLACED',
          amount: -numAmount,
          balance_after: balanceAfter,
          reference_id: betId,
          description: `Aviator Bet Round #${state.roundId}`,
        })
        if (transactionError) {
          await supabase.from('aviator_bets').delete().eq('id', betId)
          await supabase.from('wallets').update({ balance: Number(wal.balance) }).eq('user_id', authUserId)
          return res.status(503).json({ error: 'Aviator transaction could not be recorded. Please try again.' })
        }
      } else {
        // In-memory atomic fallback
        if (!memoryWallets.has(authUserId)) {
          memoryWallets.set(authUserId, 1000.0)
        }
        const currentBal = memoryWallets.get(authUserId)
        if (currentBal < numAmount) {
          return res.status(400).json({ error: 'Insufficient wallet balance' })
        }
        balanceAfter = currentBal - numAmount
        memoryWallets.set(authUserId, balanceAfter)
        memoryTransactions.push({
          id: crypto.randomUUID(),
          user_id: authUserId,
          type: 'BET_PLACED',
          amount: -numAmount,
          balance_after: balanceAfter,
          reference_id: betId,
          description: `Aviator Bet Round #${state.roundId}`,
          created_at: new Date().toISOString(),
        })
      }

      const betRecord = {
        id: betId,
        userId: authUserId,
        panelId,
        amount: numAmount,
        autoCashout: cleanAuto,
        status: 'ACTIVE',
        cashoutMultiplier: null,
        payout: 0,
        roundId: state.roundId,
        placedAt: Date.now(),
      }

      state.bets.set(betId, betRecord)

      return res.json({
        success: true,
        betId,
        panelId,
        roundId: state.roundId,
        amount: numAmount,
        autoCashout: cleanAuto,
        newBalance: balanceAfter,
      })
    } catch (err) {
      console.error('[placeAviatorBet error]:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })
}

// 3. Cash Out with Atomic Settle Lock
export async function cashoutAviator(req, res) {
  const authUserId = req.user ? req.user.id : req.body.userId
  const { betId } = req.body

  if (!authUserId || !betId) {
    return res.status(400).json({ error: 'Valid userId and betId required' })
  }

  return await withUserLock(authUserId, async () => {
    try {
      const bet = state.bets.get(betId)
      if (!bet || bet.userId !== authUserId) {
        return res.status(404).json({ error: 'Active bet not found' })
      }

      if (bet.status === 'CASHED_OUT') {
        return res.json({
          success: true,
          betId,
          payout: bet.payout,
          multiplier: bet.cashoutMultiplier,
          message: `Already cashed out at ${bet.cashoutMultiplier}x`,
        })
      }

      if (bet.status !== 'ACTIVE') {
        return res.status(400).json({ error: `Bet is already ${bet.status}` })
      }

      if (state.phase !== 'FLYING') {
        return res.status(400).json({ error: 'Cannot cash out. Round is not in flight.' })
      }

      const now = Date.now()
      const currentMult = calculateMultiplier(now - state.startTime)

      if (currentMult >= state.crashPoint) {
        bet.status = 'LOST'
        bet.payout = 0
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)
        if (isSupabaseConfigured && isUuid) {
          supabase
            .from('aviator_bets')
            .update({ status: 'LOST', payout: 0 })
            .eq('id', betId)
            .then(({ error }) => {
              if (error) console.error('[Aviator late cashout loss update error]:', error.message)
            })
        }
        return res.status(400).json({ error: 'Too late! The plane already flew away.' })
      }

      const result = await settleCashout(bet, currentMult)
      if (!result) {
        return res.status(503).json({ error: 'Cashout could not be recorded. Please retry.' })
      }

      let finalBalance = 1000
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)
      if (isSupabaseConfigured && isUuid) {
        const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
        if (wal) finalBalance = Number(wal.balance)
      } else {
        finalBalance = memoryWallets.get(authUserId) || 1000
      }

      return res.json({
        success: true,
        betId,
        payout: result.payout,
        multiplier: result.mult,
        newBalance: finalBalance,
        message: `Cashed out at ${result.mult}x for ₹${result.payout}!`,
      })
    } catch (err) {
      console.error('[cashoutAviator error]:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })
}

// 4. Cancel Bet (during WAITING phase before takeoff)
export async function cancelAviatorBet(req, res) {
  const authUserId = req.user ? req.user.id : req.body.userId
  const { betId } = req.body

  if (!authUserId || !betId) {
    return res.status(400).json({ error: 'Valid userId and betId required' })
  }

  return await withUserLock(authUserId, async () => {
    try {
      const bet = state.bets.get(betId)
      if (!bet || bet.userId !== authUserId) {
        return res.status(404).json({ error: 'Bet not found' })
      }

      if (state.phase !== 'WAITING') {
        return res.status(400).json({ error: 'Cannot cancel bet once the flight is taking off or in flight' })
      }

      if (bet.status !== 'ACTIVE') {
        return res.status(400).json({ error: `Cannot cancel bet with status: ${bet.status}` })
      }

      const refundAmount = bet.amount
      bet.status = 'REFUNDED'
      state.bets.delete(betId)

      let newBalance = 1000
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)
      if (isSupabaseConfigured && isUuid) {
        const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
        if (wal) {
          newBalance = Number(wal.balance) + refundAmount
          await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', authUserId)
        }
        await supabase.from('aviator_bets').update({ status: 'REFUNDED' }).eq('id', betId)
        await supabase.from('wallet_transactions').insert({
          user_id: authUserId,
          type: 'BET_REFUND',
          amount: refundAmount,
          balance_after: newBalance,
          reference_id: betId,
          description: `Aviator Bet Cancelled Round #${state.roundId}`,
        })
      } else {
        const prevBal = memoryWallets.get(authUserId) || 1000
        newBalance = prevBal + refundAmount
        memoryWallets.set(authUserId, newBalance)
        memoryTransactions.push({
          id: crypto.randomUUID(),
          user_id: authUserId,
          type: 'BET_REFUND',
          amount: refundAmount,
          balance_after: newBalance,
          reference_id: betId,
          description: `Aviator Bet Cancelled Round #${state.roundId}`,
          created_at: new Date().toISOString(),
        })
      }

      return res.json({
        success: true,
        message: 'Bet cancelled and refunded successfully',
        betId,
        refundAmount,
        newBalance,
      })
    } catch (err) {
      console.error('[cancelAviatorBet error]:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })
}

// 5. Get History
export async function getAviatorHistory(req, res) {
  return res.json({
    history: state.history,
  })
}
