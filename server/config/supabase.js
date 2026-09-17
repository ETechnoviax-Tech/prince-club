import path from 'path'
import { fileURLToPath } from 'url'
import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure WebSocket is defined globally for Node.js < 22 compatibility with Supabase Realtime
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-supabase-url') &&
    !supabaseKey.includes('your-supabase')
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null

if (!isSupabaseConfigured) {
  console.warn('[Supabase] SUPABASE_URL or key not configured in .env. Running in local fallback store mode.')
}
