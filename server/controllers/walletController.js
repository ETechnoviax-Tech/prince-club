import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'

import { memoryTransactions, memoryWallets } from '../db/store.js'

export async function getWallet(req, res) {
  try {
    const { userId } = req.params

    if (isSupabaseConfigured) {
      let { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return res.status(500).json({ error: 'Failed to retrieve wallet' })
      }

      if (!wallet) {
        // Auto-create wallet with starting bonus/balance if not exists
        const { data: newWallet, error: createErr } = await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: 1000.0 })
          .select()
          .single()

        if (createErr) {
          return res.status(500).json({ error: 'Failed to initialize wallet' })
        }
        wallet = newWallet
      }

      return res.json({ wallet })
    }

    // Fallback store
    if (!memoryWallets.has(userId)) {
      memoryWallets.set(userId, 1000.0)
    }
    return res.json({
      wallet: {
        user_id: userId,
        balance: memoryWallets.get(userId),
        currency: 'INR',
      },
    })
  } catch (err) {
    console.error('[getWallet Exception]:', err)
    return res.status(500).json({ error: 'Server error retrieving wallet' })
  }
}

export async function getTransactions(req, res) {
  try {
    const { userId } = req.params

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return res.status(500).json({ error: 'Failed to retrieve transactions' })
      return res.json({ transactions: data || [] })
    }

    const txs = memoryTransactions
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return res.json({ transactions: txs })
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching transactions' })
  }
}

export async function resetWallet(req, res) {
  try {
    const { userId } = req.body
    const DEFAULT_START = 1000.0

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('wallets')
        .update({ balance: DEFAULT_START, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return res.status(500).json({ error: 'Failed to reset wallet' })
      return res.json({ message: 'Wallet balance reset', wallet: data })
    }

    memoryWallets.set(userId, DEFAULT_START)
    return res.json({
      message: 'Wallet balance reset',
      wallet: { user_id: userId, balance: DEFAULT_START },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset wallet' })
  }
}
