import { config } from '../config.js'

// Mock fixture generator for offline dev / unit tests
function getMockRoadmapResponse(goal, level) {
  return JSON.stringify({
    g: goal || 'Machine Learning Engineer',
    s: `A backwards-engineered path to becoming an expert in ${goal || 'Machine Learning'}.`,
    n: [
      {
        i: 'n1',
        t: 'Programming fundamentals',
        k: 'skill',
        p: 1,
        d: '3w',
        w: 'Foundational syntax and data structures.',
        q: ['python programming basics', 'data structures beginners'],
      },
      {
        i: 'n2',
        t: 'Mathematics and logic',
        k: 'skill',
        p: 1,
        d: '3w',
        w: 'Linear algebra, calculus, and discrete mathematics.',
        q: ['linear algebra course', 'applied calculus'],
      },
      {
        i: 'n3',
        t: 'Data structures in practice',
        k: 'skill',
        p: 2,
        d: '2w',
        w: 'Practical problem solving and algorithms.',
        q: ['algorithms and data structures', 'leetcode practice'],
      },
      {
        i: 'n4',
        t: 'Core domain modeling',
        k: 'skill',
        p: 2,
        d: '3w',
        w: 'Standard modeling principles and algorithms.',
        q: ['statistical modeling', 'scikit learn guide'],
      },
      {
        i: 'n5',
        t: 'Hands-on prototype',
        k: 'project',
        p: 3,
        d: '2w',
        w: 'Working end-to-end prototype validating core theory.',
        q: ['machine learning project github', 'build model pipeline'],
      },
      {
        i: 'n6',
        t: 'Deep learning systems',
        k: 'skill',
        p: 3,
        d: '4w',
        w: 'Neural network architectures and deep optimization.',
        q: ['pytorch tutorials', 'deep learning fundamentals'],
      },
      {
        i: 'n7',
        t: 'Domain specialization',
        k: 'skill',
        p: 4,
        d: '3w',
        w: 'Advanced techniques in chosen specialization.',
        q: ['transformers huggingface', 'modern system architecture'],
      },
      {
        i: 'n8',
        t: 'Specialized capstone',
        k: 'project',
        p: 4,
        d: '2w',
        w: 'End-to-end production artifact solving real problems.',
        q: ['capstone ml project', 'deploy model fast api'],
      },
      {
        i: 'n9',
        t: 'Engineering & MLOps',
        k: 'skill',
        p: 5,
        d: '3w',
        w: 'Containerization, CI/CD, and model registries.',
        q: ['docker for engineers', 'mlops architecture'],
      },
      {
        i: 'n10',
        t: 'Serving & performance',
        k: 'skill',
        p: 5,
        d: '2w',
        w: 'Low-latency inference engines and scalability.',
        q: ['model inference optimization', 'triton server'],
      },
      {
        i: 'n11',
        t: 'Industry certification',
        k: 'cert',
        p: 6,
        d: '3w',
        w: 'Formal validation of production cloud capabilities.',
        q: ['cloud architect certification', 'ml engineer exam'],
      },
      {
        i: 'n12',
        t: goal || 'Target Role',
        k: 'milestone',
        p: 7,
        d: 'Target',
        w: 'Achieved professional competence ready for industry roles.',
        q: ['career interview questions', 'system design practice'],
      },
    ],
    e: [
      ['n1', 'n3'],
      ['n2', 'n4'],
      ['n3', 'n4'],
      ['n4', 'n5'],
      ['n1', 'n6'],
      ['n6', 'n7'],
      ['n7', 'n8'],
      ['n5', 'n9'],
      ['n8', 'n9'],
      ['n9', 'n10'],
      ['n10', 'n11'],
      ['n10', 'n12'],
      ['n11', 'n12'],
    ],
  })
}

function getMockExpandResponse(nodeTitle) {
  return JSON.stringify({
    sub: [
      { t: `${nodeTitle} Foundations`, d: '3d', w: 'Essential principles and setups.' },
      { t: `${nodeTitle} Implementation`, d: '4d', w: 'Hands-on practical code.' },
      { t: `${nodeTitle} Advanced Cases`, d: '5d', w: 'Edge cases and optimization.' },
    ],
  })
}

/**
 * Calls Anthropic Messages API or returns mock in test/dev.
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
    await new Promise((resolve) => setTimeout(resolve, 50)) // simulate brief latency
    let mockText
    if (system.includes('sub-topics')) {
      const match = user.match(/Step:\s*(.+)/)
      mockText = getMockExpandResponse(match ? match[1] : 'Step')
    } else {
      const match = user.match(/Goal:\s*(.+?)(?:\n|$)/)
      mockText = getMockRoadmapResponse(match ? match[1] : 'Machine Learning Engineer')
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        max_tokens: maxTokens,
        temperature: 0.3,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: controller.signal,
    })

    const elapsed = Date.now() - startTime

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      let errMsg = `Upstream LLM error (${res.status})`
      if (res.status === 429) {
        errMsg = 'Rate limit exceeded with LLM provider. Try again later.'
      } else if (res.status === 401 || res.status === 403) {
        errMsg = 'Invalid LLM credentials configured.'
      }
      console.error(
        `[LLM Error] time=${new Date().toISOString()} status=${res.status} duration=${elapsed}ms`
      )
      throw new Error(errMsg)
    }

    const data = await res.json()
    const content = data.content?.[0]?.text || ''
    const usage = data.usage || { input_tokens: 0, output_tokens: 0 }

    console.log(
      `[LLM Call] time=${new Date().toISOString()} cached=false duration=${elapsed}ms tokens_in=${usage.input_tokens} tokens_out=${usage.output_tokens} model=${config.LLM_MODEL}`
    )

    return {
      text: content,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM request timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
