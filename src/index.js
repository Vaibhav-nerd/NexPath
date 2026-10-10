import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { config } from './config.js'
import roadmapRouter from './routes/roadmap.js'

const app = express()

// Trust reverse proxy if deployed
app.set('trust proxy', 1)

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true,
  })
)

// Body parser cap at 5kb (§6.3)
app.use(express.json({ limit: '5kb' }))

// Rate limiting on roadmap endpoints (§6.3)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

app.use('/api/roadmap', limiter)
app.use('/api/roadmap', roadmapRouter)

// Health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mockLLM: config.LLM_MOCK,
  })
})

// Global error handler - clean JSON with no stack traces (§6.4, §9 Phase 5)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500)
  const message =
    statusCode === 500
      ? 'An unexpected internal error occurred. Please try again later.'
      : err.message || 'An error occurred'

  res.status(statusCode).json({ error: message })
})

// Optional MongoDB connection
if (config.MONGODB_URI) {
  mongoose
    .connect(config.MONGODB_URI)
    .then(() => console.log('[MongoDB] Connected successfully'))
    .catch((err) =>
      console.warn(`[MongoDB] Connection warning (using in-memory cache): ${err.message}`)
    )
} else {
  console.log('[MongoDB] No MONGODB_URI set; using in-memory LRU cache.')
}

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`[Server] Running on http://localhost:${config.PORT}`)
  })
}

export default app
