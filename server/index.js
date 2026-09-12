import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config()

import { isSupabaseConfigured } from './config/supabase.js'
import authRoutes from './routes/authRoutes.js'
import gameRoutes from './routes/gameRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import walletRoutes from './routes/walletRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Prince Club API',
    supabaseConnected: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/game', gameRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err)
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Prince Club API] Server running on http://localhost:${PORT}`)
    console.log(`[Prince Club API] Supabase status: ${isSupabaseConfigured ? 'Configured' : 'Fallback local store'}`)
  })
}

export default app
