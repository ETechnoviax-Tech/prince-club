import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'

const idempotency = () => crypto.randomUUID()

export async function persistWingoBet({
  userId,
  mode,
  roundNumber,
  selection,
  selectionType,
  amount,
  multiplier,
  legacyBetId,
}) {
  if (!isSupabaseConfigured) return null

  const now = Date.now()
  // Keep roundNumber as a string — VeerGame issueNumbers are 18-digit strings
  // that exceed JS Number safe integer range. Pass as-is; Supabase JS driver
  // will forward the string value and PostgreSQL BIGINT will accept it.
  const roundNumberStr = String(roundNumber)
  const roundNumberBigInt = roundNumberStr.length <= 15
    ? Number(roundNumberStr)   // safe for local epoch-based round numbers
    : roundNumberStr           // keep as string for 18-digit VeerGame issueNumbers

  let { data: round, error: roundError } = await supabase
    .from('wingo_rounds')
    .select('id')
    .eq('mode', mode)
    .eq('round_number', roundNumberBigInt)
    .maybeSingle()

  if (!round && !roundError) {
    const { data, error } = await supabase
      .from('wingo_rounds')
      .insert({
        mode,
        round_number: roundNumberBigInt,
        start_time: new Date(now - 30000).toISOString(),
        lock_time: new Date(now + 5000).toISOString(),
        end_time: new Date(now + 30000).toISOString(),
      })
      .select('id')
      .single()
    round = data
    roundError = error
  }

  if (roundError || !round?.id) {
    throw new Error(`Failed to persist Win Go round: ${roundError?.message || 'round unavailable'}`)
  }

  const { data: bet, error } = await supabase
    .from('wingo_bets')
    .insert({
      round_id: round.id,
      user_id: userId,
      selection,
      selection_type: selectionType,
      amount,
      multiplier,
      metadata: { legacyBetId },
      idempotency_key: idempotency(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to persist Win Go bet: ${error.message}`)
  return bet
}

export async function persistSlotSpin({ userId, gameCode, betAmount, spinResult }) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('slot_spins')
    .insert({
      user_id: userId,
      game_code: gameCode,
      bet_amount: betAmount,
      reels: spinResult.reels || spinResult.result || [],
      winning_lines: spinResult.winningLines || [],
      total_multiplier: spinResult.totalMultiplier || spinResult.multiplier || 0,
      payout: spinResult.finalWin || 0,
      idempotency_key: idempotency(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to persist slot spin: ${error.message}`)
  return data
}

export async function persistDragonTigerBet({ userId, market, betAmount, roundResult }) {
  if (!isSupabaseConfigured) return null
  const roundNumber = Number(roundResult.round || roundResult.roundNumber || Date.now())
  const { data: round, error: roundError } = await supabase
    .from('dragon_tiger_rounds')
    .insert({
      round_number: roundNumber,
      status: 'SETTLED',
      dragon_card: roundResult.dragonCard || null,
      tiger_card: roundResult.tigerCard || null,
      winner: roundResult.winner || null,
      dealt_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (roundError) throw new Error(`Failed to persist Dragon Tiger round: ${roundError.message}`)
  const { data, error } = await supabase
    .from('dragon_tiger_bets')
    .insert({
      round_id: round.id,
      user_id: userId,
      market,
      amount: betAmount,
      multiplier: roundResult.multiplier || 0,
      payout: roundResult.payout || 0,
      status: roundResult.isWin ? 'WON' : 'LOST',
      settled_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to persist Dragon Tiger bet: ${error.message}`)
  return data
}

export async function persistMinesSession({ userId, betAmount, minesCount, sessionData }) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('mines_sessions')
    .insert({
      user_id: userId,
      board_size: 25,
      mines_count: minesCount,
      bet_amount: betAmount,
      mine_positions: sessionData.minePositions || sessionData.mines || [],
      current_multiplier: sessionData.multiplier || 1,
      current_payout: sessionData.payout || 0,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to persist Mines session: ${error.message}`)
  return data
}

export async function persistThirdPartyPlay({ userId, provider, gameId, betAmount, result }) {
  if (!isSupabaseConfigured) return null
  const { data: round, error: roundError } = await supabase
    .from('third_party_rounds')
    .insert({
      provider_code: provider,
      provider_game_id: String(gameId),
      status: 'SETTLED',
      request_payload: { gameId, provider, betAmount },
      response_payload: result || {},
      started_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (roundError) throw new Error(`Failed to persist provider round: ${roundError.message}`)

  const { data, error } = await supabase
    .from('third_party_bets')
    .insert({
      round_id: round.id,
      user_id: userId,
      provider_code: provider,
      provider_game_id: String(gameId),
      amount: betAmount,
      payout: result?.payout || result?.winAmount || 0,
      status: result?.payout > 0 || result?.winAmount > 0 ? 'WON' : 'LOST',
      request_payload: { gameId, provider, betAmount },
      response_payload: result || {},
      settled_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to persist provider bet: ${error.message}`)
  return data
}
