import { Router } from 'express'
import { config } from '../config.js'
import {
  expandRequestSchema,
  expandResponseSchema,
  roadmapRequestSchema,
  roadmapResponseSchema,
  validateGraph,
} from '../schema.js'
import {
  EXPAND_SYSTEM_PROMPT,
  REPAIR_SYSTEM_PROMPT,
  ROADMAP_SYSTEM_PROMPT,
  formatExpandUserPrompt,
  formatRepairUserPrompt,
  formatRoadmapUserPrompt,
} from '../prompts.js'
import { callLLM } from '../services/llm.js'
import {
  createCacheKey,
  createExpansionCacheKey,
  dedupeInFlight,
  getFromCache,
  setInCache,
} from '../services/cache.js'
import { canMakeLLMCall, recordLLMCall } from '../services/budget.js'

const router = Router()

/**
 * Strips markdown code fences from LLM text output.
 */
function stripCodeFences(text) {
  if (!text) return ''
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim()
}

/**
 * Parses and validates roadmap JSON with sensible milestone phase normalization.
 */
function parseAndValidateRoadmap(rawText) {
  const cleaned = stripCodeFences(rawText)
  const json = JSON.parse(cleaned)

  // Ensure milestone node exists and is in its own highest phase
  if (Array.isArray(json.n) && json.n.length > 0) {
    let milestoneNodes = json.n.filter((node) => node.k === 'milestone')
    if (milestoneNodes.length === 0) {
      json.n[json.n.length - 1].k = 'milestone'
      milestoneNodes = [json.n[json.n.length - 1]]
    }

    const goalNode = json.n.find((n) => n.k === 'milestone') || json.n[json.n.length - 1]

    // 2. Auto-heal missing incoming edges for nodes in phase > 1
    const incomingSet = new Set(json.e.map(([, to]) => to))
    json.n.forEach((node) => {
      if ((node.p || 1) > 1 && !incomingSet.has(node.i)) {
        const prevNode =
          json.n.find((cand) => (cand.p || 1) < (node.p || 1)) || json.n[0]
        if (prevNode && prevNode.i !== node.i) {
          json.e.push([prevNode.i, node.i])
          incomingSet.add(node.i)
        }
      }
    })

    // 3. Auto-heal missing outgoing edges for non-goal nodes
    const outgoingSet = new Set(json.e.map(([from]) => from))
    json.n.forEach((node) => {
      if (node.i !== goalNode.i && !outgoingSet.has(node.i)) {
        const nextNode =
          json.n.find((cand) => (cand.p || 1) > (node.p || 1)) || goalNode
        if (nextNode && nextNode.i !== node.i) {
          json.e.push([node.i, nextNode.i])
          outgoingSet.add(node.i)
        }
      }
    })
  }

  const zodValidated = roadmapResponseSchema.parse(json)
  validateGraph(zodValidated)
  return zodValidated
}

// POST /api/roadmap
router.post('/', async (req, res, next) => {
  const reqStart = Date.now()
  try {
    // 1. Zod validate request
    const parseResult = roadmapRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || 'Invalid request body'
      return res.status(400).json({ error: issue })
    }

    const { goal, level } = parseResult.data
    const cacheKey = createCacheKey(goal, level)

    // 2. Cache lookup
    const cached = await getFromCache(cacheKey)
    if (cached) {
      console.log(
        `[Request] time=${new Date().toISOString()} cached=true duration=${Date.now() - reqStart}ms goal="${goal}"`
      )
      return res.json({ ...cached, cached: true })
    }

    // 3. In-flight deduplication
    const result = await dedupeInFlight(cacheKey, async () => {
      // 3.1 Budget check before LLM call
      if (!canMakeLLMCall()) {
        const err = new Error('Daily limit reached, try again tomorrow')
        err.statusCode = 429
        throw err
      }

      // 3.2 Primary LLM call
      recordLLMCall()
      const { text: rawOutput } = await callLLM({
        system: ROADMAP_SYSTEM_PROMPT,
        user: formatRoadmapUserPrompt(goal, level),
        maxTokens: config.LLM_MAX_TOKENS,
      })

      // 3.3 Parse & Validate with 1 repair retry on failure
      let roadmapData
      try {
        roadmapData = parseAndValidateRoadmap(rawOutput)
      } catch (firstErr) {
        console.warn(
          `[Roadmap Validation Failed] Attempting single repair call: ${firstErr.message}`
        )
        // Single repair call (§6.4)
        try {
          const { text: repairedOutput } = await callLLM({
            system: REPAIR_SYSTEM_PROMPT,
            user: formatRepairUserPrompt(rawOutput, firstErr.message),
            maxTokens: config.LLM_MAX_TOKENS,
          })
          roadmapData = parseAndValidateRoadmap(repairedOutput)
        } catch (repairErr) {
          console.error(
            `[Roadmap Repair Failed] Returning 502: ${repairErr.message}`
          )
          const err = new Error(
            'The roadmap could not be generated. Try again in a moment.'
          )
          err.statusCode = 502
          throw err
        }
      }

      // 3.4 Save to cache
      await setInCache(cacheKey, goal, level, roadmapData)
      return roadmapData
    })

    console.log(
      `[Request] time=${new Date().toISOString()} cached=false duration=${Date.now() - reqStart}ms goal="${goal}"`
    )
    return res.json({ ...result, cached: false })
  } catch (err) {
    next(err)
  }
})

// POST /api/roadmap/expand
router.post('/expand', async (req, res, next) => {
  try {
    const parseResult = expandRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message })
    }

    const { goal, nodeTitle } = parseResult.data
    const cacheKey = createExpansionCacheKey(goal, nodeTitle)

    // Cache lookup
    const cached = await getFromCache(cacheKey)
    if (cached) {
      return res.json({ ...cached, cached: true })
    }

    // In-flight deduplication
    const result = await dedupeInFlight(cacheKey, async () => {
      if (!canMakeLLMCall()) {
        const err = new Error('Daily limit reached, try again tomorrow')
        err.statusCode = 429
        throw err
      }

      recordLLMCall()
      const { text: rawOutput } = await callLLM({
        system: EXPAND_SYSTEM_PROMPT,
        user: formatExpandUserPrompt(goal, nodeTitle),
        maxTokens: config.LLM_EXPAND_MAX_TOKENS,
      })

      const cleaned = stripCodeFences(rawOutput)
      const parsed = JSON.parse(cleaned)
      const validated = expandResponseSchema.parse(parsed)

      await setInCache(cacheKey, goal, nodeTitle, validated)
      return validated
    })

    return res.json({ ...result, cached: false })
  } catch (err) {
    next(err)
  }
})

export default router
