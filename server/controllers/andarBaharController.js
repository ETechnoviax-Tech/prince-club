import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    const isRed = suit === '♥' || suit === '♦'
    for (const rank of RANKS) {
      deck.push({ rank, suit, isRed, name: `${rank}${suit}` })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    const temp = deck[i]
    deck[i] = deck[j]
    deck[j] = temp
  }
  return deck
}

const andarBaharHistory = [
  { id: 'ab-1', winningSide: 'ANDAR', jokerRank: '7', cardsDealt: 5, timestamp: Date.now() - 60000 },
  { id: 'ab-2', winningSide: 'BAHAR', jokerRank: 'K', cardsDealt: 4, timestamp: Date.now() - 45000 },
  { id: 'ab-3', winningSide: 'ANDAR', jokerRank: '9', cardsDealt: 1, timestamp: Date.now() - 30000 },
  { id: 'ab-4', winningSide: 'ANDAR', jokerRank: 'J', cardsDealt: 7, timestamp: Date.now() - 15000 },
]

export async function playAndarBahar(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const chosenSide = String(req.body.side || '').toUpperCase()
    const amount = Number(req.body.amount)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!['ANDAR', 'BAHAR'].includes(chosenSide)) {
      return res.status(400).json({ error: 'Chosen side must be ANDAR or BAHAR' })
    }

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ error: 'Bet amount must be at least ₹10' })
    }

    const deck = createDeck()
    const jokerCard = deck.pop()
    const targetRank = jokerCard.rank

    const dealtCards = []
    let winningSide = null
    let winningCard = null
    let turn = 'ANDAR'

    while (deck.length > 0) {
      const card = deck.pop()
      dealtCards.push({ side: turn, card })

      if (card.rank === targetRank) {
        winningSide = turn
        winningCard = card
        break
      }

      turn = turn === 'ANDAR' ? 'BAHAR' : 'ANDAR'
    }

    const won = chosenSide === winningSide
    const multiplier = winningSide === 'ANDAR' ? 1.95 : 2.00
    const payout = won ? Math.round(amount * multiplier) : 0
    const roundId = crypto.randomUUID()

    let finalBalance = 0
    let processedViaSupabase = false

    if (isSupabaseConfigured) {
      try {
        let { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle()

        if (!wallet) {
          const { data: newWal } = await supabase
            .from('wallets')
            .insert({ user_id: userId, balance: 1000.0 })
            .select()
            .maybeSingle()
          wallet = newWal
        }

        if (wallet) {
          if (Number(wallet.balance) < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' })
          }

          const balAfterDeduct = Number(wallet.balance) - amount
          const { data: updatedWal, error: deductErr } = await supabase
            .from('wallets')
            .update({ balance: balAfterDeduct })
            .eq('user_id', userId)
            .gte('balance', amount)
            .select()
            .single()

          if (!deductErr && updatedWal) {
            finalBalance = balAfterDeduct
            processedViaSupabase = true

            try {
              await supabase.from('wallet_transactions').insert({
                user_id: userId,
                type: 'ANDARBAHAR_BET',
                amount: -amount,
                balance_after: balAfterDeduct,
                reference_id: roundId,
                description: `Andar Bahar Bet on ${chosenSide} (₹${amount})`,
              })
            } catch {}

            if (won && payout > 0) {
              finalBalance = balAfterDeduct + payout
              await supabase
                .from('wallets')
                .update({ balance: finalBalance })
                .eq('user_id', userId)

              try {
                await supabase.from('wallet_transactions').insert({
                  user_id: userId,
                  type: 'ANDARBAHAR_PAYOUT',
                  amount: payout,
                  balance_after: finalBalance,
                  reference_id: roundId,
                  description: `Andar Bahar Won ₹${payout} on ${winningSide} (${multiplier}x)`,
                })
              } catch {}
            }

            try {
              await supabase.from('bets').insert({
                id: roundId,
                round_number: Date.now(),
                game_mode: 'ANDAR_BAHAR',
                user_id: userId,
                selection: chosenSide,
                amount,
                multiplier,
                status: won ? 'WON' : 'LOST',
                payout,
              })
            } catch {}
          }
        }
      } catch {}
    }

    if (!processedViaSupabase) {
      if (!memoryWallets.has(userId)) {
        memoryWallets.set(userId, 1000.0)
      }
      const curBal = memoryWallets.get(userId)
      if (curBal < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }
      const balAfter = curBal - amount + payout
      memoryWallets.set(userId, balAfter)
      finalBalance = balAfter
    }

    andarBaharHistory.unshift({
      id: roundId,
      winningSide,
      jokerRank: targetRank,
      cardsDealt: dealtCards.length,
      timestamp: Date.now(),
    })
    if (andarBaharHistory.length > 50) {
      andarBaharHistory.pop()
    }

    return res.json({
      roundId,
      jokerCard,
      dealtCards,
      winningSide,
      winningCard,
      totalCardsDealt: dealtCards.length,
      chosenSide,
      won,
      multiplier,
      payout,
      profit: won ? payout - amount : -amount,
      newBalance: finalBalance,
      history: andarBaharHistory.slice(0, 15),
    })
  } catch (err) {
    console.error('[playAndarBahar Exception]:', err)
    return res.status(500).json({ error: 'Internal server error processing Andar Bahar' })
  }
}

export function getAndarBaharHistory(req, res) {
  const andarWins = andarBaharHistory.filter((h) => h.winningSide === 'ANDAR').length
  const baharWins = andarBaharHistory.filter((h) => h.winningSide === 'BAHAR').length
  const total = andarBaharHistory.length || 1

  return res.json({
    history: andarBaharHistory.slice(0, 30),
    stats: {
      andarPercent: Math.round((andarWins / total) * 100),
      baharPercent: Math.round((baharWins / total) * 100),
      totalRounds: andarBaharHistory.length,
    },
  })
}
