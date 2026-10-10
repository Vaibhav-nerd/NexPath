import { config } from '../config.js'

let currentDay = new Date().toISOString().slice(0, 10)
let dailyCallCount = 0

function ensureCurrentDay() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== currentDay) {
    currentDay = today
    dailyCallCount = 0
  }
}

/**
 * Checks if the daily LLM budget is within limit.
 * @returns {boolean} true if allowed, false if cap reached
 */
export function canMakeLLMCall() {
  ensureCurrentDay()
  return dailyCallCount < config.DAILY_CALL_CAP
}

/**
 * Increments the daily LLM call count.
 * @returns {number} updated count
 */
export function recordLLMCall() {
  ensureCurrentDay()
  dailyCallCount++
  return dailyCallCount
}

/**
 * Returns current budget metrics.
 */
export function getBudgetMetrics() {
  ensureCurrentDay()
  return {
    day: currentDay,
    count: dailyCallCount,
    cap: config.DAILY_CALL_CAP,
    remaining: Math.max(0, config.DAILY_CALL_CAP - dailyCallCount),
  }
}

/**
 * Test utility to set the daily count.
 */
export function setDailyCountForTest(val) {
  dailyCallCount = val
}
