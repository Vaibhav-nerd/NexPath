import { config } from '../config.js'

/**
 * Dynamic mock roadmap generator tailored to the requested goal and level.
 * Ensures that even in offline/demo mode, each query gets personalized results.
 */
export function getMockRoadmapResponse(goal = 'Software Engineer', level = 'beginner') {
  const cleanGoal = (goal || 'Software Engineer').trim()
  return JSON.stringify({
    g: cleanGoal,
    s: `A backwards-engineered path to becoming an expert in ${cleanGoal}.`,
    n: [
      {
        i: 'n1',
        t: `${cleanGoal} Foundations`,
        k: 'skill',
        p: 1,
        d: '3w',
        w: `Foundational syntax, tools, and basic concepts of ${cleanGoal}.`,
        q: [`${cleanGoal} basics for beginners`, `${cleanGoal} fundamental tools`],
      },
      {
        i: 'n2',
        t: 'Tooling & Environment Setup',
        k: 'skill',
        p: 1,
        d: '2w',
        w: `Industry standard environments, toolchains, and developer workflow.`,
        q: [`best tools for ${cleanGoal}`, `${cleanGoal} setup guide`],
      },
      {
        i: 'n3',
        t: `Practical Core Techniques`,
        k: 'skill',
        p: 2,
        d: '3w',
        w: `Applied problem solving and essential domain patterns in ${cleanGoal}.`,
        q: [`${cleanGoal} practical guide`, `${cleanGoal} core skills`],
      },
      {
        i: 'n4',
        t: `${cleanGoal} Hands-on Prototype`,
        k: 'project',
        p: 2,
        d: '3w',
        w: `Build and ship an end-to-end prototype validating core skills.`,
        q: [`${cleanGoal} beginner projects`, `build ${cleanGoal} project`],
      },
      {
        i: 'n5',
        t: `Advanced Specialization`,
        k: 'skill',
        p: 3,
        d: '4w',
        w: `Complex problem domains, optimization, and industry architectures.`,
        q: [`advanced ${cleanGoal} techniques`, `${cleanGoal} architecture`],
      },
      {
        i: 'n6',
        t: `Professional Industry Certification`,
        k: 'cert',
        p: 3,
        d: '2w',
        w: `Validation of professional capability via recognized industry benchmarks.`,
        q: [`${cleanGoal} certifications`, `${cleanGoal} credentials`],
      },
      {
        i: 'n7',
        t: `${cleanGoal} Production Showcase`,
        k: 'milestone',
        p: 4,
        d: '4w',
        w: `Public portfolio showcase demonstrating production readiness for employers.`,
        q: [`${cleanGoal} portfolio showcase`, `${cleanGoal} job preparation`],
      },
    ],
    e: [
      ['n1', 'n2'],
      ['n1', 'n3'],
      ['n2', 'n4'],
      ['n3', 'n4'],
      ['n4', 'n5'],
      ['n5', 'n6'],
      ['n6', 'n7'],
    ],
  })
}

export function getMockExpandResponse(nodeTitle) {
  return JSON.stringify({
    sub: [
      { t: `${nodeTitle} Foundations`, d: '3d', w: 'Essential principles and setups.' },
      { t: `${nodeTitle} Implementation`, d: '4d', w: 'Hands-on practical code and workflow.' },
      { t: `${nodeTitle} Advanced Cases`, d: '5d', w: 'Edge cases and production optimization.' },
    ],
  })
}

/**
 * Determines whether the configured provider is Google Gemini or Anthropic Claude.
 */
function isGeminiProvider() {
  const model = (config.LLM_MODEL || '').toLowerCase()
  const key = config.GEMINI_API_KEY || config.ANTHROPIC_API_KEY || ''
  return model.includes('gemini') || key.startsWith('AIza') || key.startsWith('AQ.') || !!config.GEMINI_API_KEY
}

/**
 * Calls Gemini API or Anthropic Messages API or returns mock.
 *
 * @param {Object} params
 * @param {string} params.system - System prompt
 * @param {string} params.user - User prompt
 * @param {number} [params.maxTokens] - Output cap
 * @returns {Promise<{ text: string, tokens: { input: number, output: number } }>}
 */
export async function callLLM({ system, user, maxTokens = config.LLM_MAX_TOKENS }) {
  const startTime = Date.now()

  // Mock path for testing or offline development
  if (config.LLM_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    let mockText
    if (system.includes('sub-topics')) {
      const match = user.match(/Step:\s*(.+)/)
      mockText = getMockExpandResponse(match ? match[1] : 'Step')
    } else {
      const match = user.match(/Goal:\s*(.+?)(?:\n|$)/)
      mockText = getMockRoadmapResponse(match ? match[1] : 'Software Engineer')
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[LLM Call] time=${new Date().toISOString()} cached=false duration=${elapsed}ms tokens=mock model=${config.LLM_MODEL}`
    )
    return {
      text: mockText,
      tokens: { input: 150, output: 600 },
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.LLM_TIMEOUT_MS)

  try {
    let content = ''
    let usage = { input_tokens: 0, output_tokens: 0 }

    if (isGeminiProvider()) {
      // Google Gemini API
      const model = config.LLM_MODEL || 'gemini-3.5-flash-lite'
      const apiKey = config.GEMINI_API_KEY || config.ANTHROPIC_API_KEY
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }],
          },
          contents: [
            {
              parts: [{ text: user }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      })

      const elapsed = Date.now() - startTime

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error(
          `[LLM Error Gemini] time=${new Date().toISOString()} status=${res.status} duration=${elapsed}ms body=${errText.slice(0, 200)}`
        )
        if (res.status === 429) {
          throw new Error('Rate limit exceeded with LLM provider. Try again later.')
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error('Invalid LLM credentials or configuration. Check your GEMINI_API_KEY.')
        }
        throw new Error(`Upstream LLM error (${res.status})`)
      }

      const data = await res.json()
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (data.usageMetadata) {
        usage = {
          input_tokens: data.usageMetadata.promptTokenCount || 0,
          output_tokens: data.usageMetadata.candidatesTokenCount || 0,
        }
      }

      console.log(
        `[LLM Call Gemini] time=${new Date().toISOString()} cached=false duration=${elapsed}ms tokens_in=${usage.input_tokens} tokens_out=${usage.output_tokens} model=${model}`
      )
    } else {
      // Anthropic Messages API
      const apiKey = config.ANTHROPIC_API_KEY
      const model = (config.LLM_MODEL || '').includes('gemini') ? 'claude-3-haiku-20240307' : (config.LLM_MODEL || 'claude-3-haiku-20240307')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.3,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        signal: controller.signal,
      })

      const elapsed = Date.now() - startTime

      if (!res.ok) {
        let errMsg = `Upstream LLM error (${res.status})`
        if (res.status === 429) {
          errMsg = 'Rate limit exceeded with LLM provider. Try again later.'
        } else if (res.status === 401 || res.status === 403) {
          errMsg = 'Invalid LLM credentials configured. Check your ANTHROPIC_API_KEY.'
        }
        console.error(
          `[LLM Error Anthropic] time=${new Date().toISOString()} status=${res.status} duration=${elapsed}ms`
        )
        throw new Error(errMsg)
      }

      const data = await res.json()
      content = data.content?.[0]?.text || ''
      if (data.usage) {
        usage = {
          input_tokens: data.usage.input_tokens || 0,
          output_tokens: data.usage.output_tokens || 0,
        }
      }

      console.log(
        `[LLM Call Anthropic] time=${new Date().toISOString()} cached=false duration=${elapsed}ms tokens_in=${usage.input_tokens} tokens_out=${usage.output_tokens} model=${model}`
      )
    }

    return { text: content, tokens: usage }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM request timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
