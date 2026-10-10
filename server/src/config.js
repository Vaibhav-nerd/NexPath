import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env explicitly from repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || ''
const isMock = process.env.LLM_MOCK === 'true' || process.env.NODE_ENV === 'test' || (!apiKey && !!process.env.VERCEL)

// Fail-fast validation for required secrets in production mode
if (!isMock && !apiKey) {
  throw new Error('Missing required environment variable: ANTHROPIC_API_KEY or GEMINI_API_KEY. Set it in .env or run with LLM_MOCK=true.')
}

export const config = {
  ANTHROPIC_API_KEY: apiKey,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  LLM_MODEL: process.env.LLM_MODEL || 'claude-haiku-5-5',
  LLM_MAX_TOKENS: Number.parseInt(process.env.LLM_MAX_TOKENS || '1800', 10),
  LLM_EXPAND_MAX_TOKENS: Number.parseInt(process.env.LLM_EXPAND_MAX_TOKENS || '700', 10),
  LLM_TIMEOUT_MS: Number.parseInt(process.env.LLM_TIMEOUT_MS || '25000', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  PORT: Number.parseInt(process.env.PORT || '5000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_PER_MIN: Number.parseInt(process.env.RATE_LIMIT_PER_MIN || '5', 10),
  DAILY_CALL_CAP: Number.parseInt(process.env.DAILY_CALL_CAP || '300', 10),
  CACHE_TTL_HOURS: Number.parseInt(process.env.CACHE_TTL_HOURS || '72', 10),
  MEMORY_CACHE_MAX: Number.parseInt(process.env.MEMORY_CACHE_MAX || '200', 10),
  MAX_QUERY_CHARS: Number.parseInt(process.env.MAX_QUERY_CHARS || '200', 10),
  LLM_MOCK: isMock,
}
