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
import { APP_DOMAIN, API_DOMAIN, FRONTEND_URL, API_URL, isOriginAllowed } from './config/domain.js'
import authRoutes from './routes/authRoutes.js'
import gameRoutes from './routes/gameRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import activityRoutes from './routes/activityRoutes.js'
import promotionRoutes from './routes/promotionRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Dynamic CORS: supports localhost in dev & dynamic APP_DOMAIN/API_DOMAIN from .env
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'x-webhook-signature',
  ],
}

// Middleware
app.use(cors(corsOptions))
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString()
    },
  })
)

// Request timing header for observability
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  const originalWriteHead = res.writeHead
  res.writeHead = function (...args) {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6
    res.setHeader('X-Response-Time', `${elapsedMs.toFixed(2)}ms`)
    return originalWriteHead.apply(this, args)
  }
  next()
})

// Health check with dynamic domain information (supports /health, /api/health, /ping, /)
const healthHandler = async (req, res) => {
  res.json({
    status: 'ok',
    service: '69 Club API',
    domain: {
      app: APP_DOMAIN,
      api: API_DOMAIN,
      frontendUrl: FRONTEND_URL,
      apiUrl: API_URL,
      environment: process.env.NODE_ENV || 'development',
    },
    supabaseConnected: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  })
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)
app.get('/ping', healthHandler)
app.get('/', healthHandler)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/game', gameRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/promotion', promotionRoutes)

// 404 handler
app.use(async (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err)
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[69 Club API] Server running on http://localhost:${PORT}`)
    console.log(`[69 Club API] Supabase status: ${isSupabaseConfigured ? 'Configured' : 'Fallback local store'}`)
  })
}

export default app
