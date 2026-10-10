import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { LRUCache } from 'lru-cache'
import { config } from '../config.js'
import { Roadmap } from '../models/Roadmap.js'

// In-memory LRU cache
const memoryCache = new LRUCache({
  max: config.MEMORY_CACHE_MAX,
  ttl: config.CACHE_TTL_HOURS * 60 * 60 * 1000, // ms
})

// In-flight deduplication map
const inFlightRequests = new Map()

/**
 * Normalizes text: lowercase, trim, collapse whitespace, strip punctuation.
 */
export function normalizeText(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

/**
 * Generates sha1 cache key for goal and level.
 */
export function createCacheKey(goal, level = 'beginner') {
  const normalizedGoal = normalizeText(goal)
  const normalizedLevel = normalizeText(level)
  return crypto
    .createHash('sha1')
    .update(`${normalizedGoal}|${normalizedLevel}`)
    .digest('hex')
}

/**
 * Generates sha1 cache key for node expansion.
 */
export function createExpansionCacheKey(goal, nodeTitle) {
  const normalizedGoal = normalizeText(goal)
  const normalizedTitle = normalizeText(nodeTitle)
  return crypto
    .createHash('sha1')
    .update(`expand|${normalizedGoal}|${normalizedTitle}`)
    .digest('hex')
}

/**
 * Attempts cache retrieval from memory LRU, then MongoDB.
 *
 * @param {string} cacheKey
 * @returns {Promise<Object|null>}
 */
export async function getFromCache(cacheKey) {
  // 1. Check in-memory LRU
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)
  }

  // 2. Check MongoDB (if connected)
  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await Roadmap.findOne({ cacheKey }).lean()
      if (doc && doc.data) {
        // Backfill memory cache
        memoryCache.set(cacheKey, doc.data)
        return doc.data
      }
    } catch (err) {
      // Mongo lookup failure should not break app execution
    }
  }

  return null
}

/**
 * Writes data to memory LRU and MongoDB.
 *
 * @param {string} cacheKey
 * @param {string} goal
 * @param {string} level
 * @param {Object} data
 */
export async function setInCache(cacheKey, goal, level, data) {
  // 1. Write to memory cache
  memoryCache.set(cacheKey, data)

  // 2. Write to MongoDB (if connected)
  if (mongoose.connection.readyState === 1) {
    try {
      await Roadmap.findOneAndUpdate(
        { cacheKey },
        { cacheKey, goal, level, data },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      )
    } catch (err) {
      // Mongo write failure
    }
  }
}

/**
 * In-flight promise deduplication handler.
 * If a promise already exists for the key, returns it.
 * Otherwise runs producer(), stores promise, and cleans up when settled.
 *
 * @param {string} cacheKey
 * @param {Function} producer
 * @returns {Promise<any>}
 */
export async function dedupeInFlight(cacheKey, producer) {
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)
  }

  const promise = producer().finally(() => {
    inFlightRequests.delete(cacheKey)
  })

  inFlightRequests.set(cacheKey, promise)
  return promise
}

// Test utility
export function clearMemoryCacheForTest() {
  memoryCache.clear()
  inFlightRequests.clear()
}
