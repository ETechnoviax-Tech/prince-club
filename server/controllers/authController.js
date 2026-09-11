import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'

const memoryProfiles = new Map()

export async function loginOrRegister(req, res) {
  try {
    const { username } = req.body

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    const cleanUsername = username.trim().toLowerCase()

    if (isSupabaseConfigured) {
      // 1. Check if profile exists
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (error) {
        console.error('[Supabase Error] find profile:', error)
        return res.status(500).json({ error: 'Error checking profile' })
      }

      // 2. Create if not exists
      if (!profile) {
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({ username: cleanUsername, role: 'user' })
          .select()
          .single()

        if (insertErr) {
          console.error('[Supabase Error] insert profile:', insertErr)
          return res.status(500).json({ error: 'Error creating user profile' })
        }
        profile = newProfile

        // Initialize wallet with starting balance
        await supabase.from('wallets').insert({
          user_id: profile.id,
          balance: 1000.0,
        })
      }

      // Fetch wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', profile.id)
        .single()

      return res.json({
        user: profile,
        wallet: wallet || { balance: 1000.0 },
      })
    }

    // Fallback store
    let profile = Array.from(memoryProfiles.values()).find((p) => p.username === cleanUsername)
    if (!profile) {
      profile = {
        id: crypto.randomUUID(),
        username: cleanUsername,
        role: 'user',
        created_at: new Date().toISOString(),
      }
      memoryProfiles.set(profile.id, profile)
    }

    return res.json({
      user: profile,
      wallet: { balance: 1000.0 },
    })
  } catch (err) {
    console.error('[loginOrRegister Exception]:', err)
    return res.status(500).json({ error: 'Server error processing authentication' })
  }
}
