import test from 'node:test'
import assert from 'node:assert/strict'
import {
  roadmapRequestSchema,
  roadmapResponseSchema,
  validateGraph,
} from '../src/schema.js'
import { createCacheKey, normalizeText } from '../src/services/cache.js'
import {
  canMakeLLMCall,
  recordLLMCall,
  setDailyCountForTest,
} from '../src/services/budget.js'

test('Request schema validation', () => {
  // Valid goal
  const valid = roadmapRequestSchema.parse({
    goal: 'Machine Learning Engineer',
    level: 'intermediate',
  })
  assert.equal(valid.goal, 'Machine Learning Engineer')
  assert.equal(valid.level, 'intermediate')

  // Empty goal should fail
  assert.throws(() => {
    roadmapRequestSchema.parse({ goal: '   ', level: 'beginner' })
  })

  // >200 chars should fail
  assert.throws(() => {
    roadmapRequestSchema.parse({ goal: 'a'.repeat(201), level: 'beginner' })
  })
})

test('Cache key normalization', () => {
  const key1 = createCacheKey('Machine Learning Engineer!', 'beginner')
  const key2 = createCacheKey('   machine   learning engineer   ', 'BEGINNER')
  assert.equal(key1, key2)

  assert.equal(normalizeText('Hello, World!'), 'hello world')
})

test('Budget guard functionality', () => {
  setDailyCountForTest(299)
  assert.equal(canMakeLLMCall(), true)

  recordLLMCall()
  assert.equal(canMakeLLMCall(), false) // hit cap 300

  setDailyCountForTest(0) // reset
  assert.equal(canMakeLLMCall(), true)
})

test('Graph validation logic', () => {
  const validRoadmap = {
    g: 'ML Engineer',
    s: 'Valid roadmap',
    n: [
      { i: 'n1', t: 'Python', k: 'skill', p: 1, d: '2w', w: 'Basis', q: ['python'] },
      { i: 'n2', t: 'Math', k: 'skill', p: 1, d: '2w', w: 'Math basis', q: ['math'] },
      { i: 'n3', t: 'Pandas', k: 'skill', p: 2, d: '2w', w: 'Data wrangling', q: ['pandas'] },
      { i: 'n4', t: 'ML Algo', k: 'skill', p: 2, d: '2w', w: 'Classical ML', q: ['ml'] },
      { i: 'n5', t: 'Project 1', k: 'project', p: 3, d: '2w', w: 'Hands-on', q: ['project'] },
      { i: 'n6', t: 'Deep Learning', k: 'skill', p: 3, d: '2w', w: 'Neural nets', q: ['dl'] },
      { i: 'n7', t: 'NLP', k: 'skill', p: 4, d: '2w', w: 'Text processing', q: ['nlp'] },
      { i: 'n8', t: 'Project 2', k: 'project', p: 4, d: '2w', w: 'Transformer', q: ['hf'] },
      { i: 'n9', t: 'MLOps', k: 'skill', p: 5, d: '2w', w: 'Docker', q: ['docker'] },
      { i: 'n10', t: 'Deploy', k: 'skill', p: 5, d: '2w', w: 'FastAPI', q: ['fastapi'] },
      { i: 'n11', t: 'Cert', k: 'cert', p: 6, d: '2w', w: 'Exam', q: ['cert'] },
      { i: 'n12', t: 'ML Engineer', k: 'milestone', p: 7, d: 'Target', w: 'Goal', q: ['interview'] },
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
  }

  // Should pass
  assert.equal(validateGraph(validRoadmap), true)

  // Duplicate ID
  const duplicateId = JSON.parse(JSON.stringify(validRoadmap))
  duplicateId.n[1].i = 'n1'
  assert.throws(() => validateGraph(duplicateId), /Duplicate node ID/)

  // Non-existent edge target
  const badEdge = JSON.parse(JSON.stringify(validRoadmap))
  badEdge.e.push(['n1', 'n999'])
  assert.throws(() => validateGraph(badEdge), /nonexistent target ID/)

  // Cycle
  const cycleGraph = JSON.parse(JSON.stringify(validRoadmap))
  cycleGraph.e.push(['n10', 'n1']) // creates a back-edge loop
  assert.throws(() => validateGraph(cycleGraph), /cycle/)

  // Missing milestone in highest phase
  const noMilestone = JSON.parse(JSON.stringify(validRoadmap))
  noMilestone.n[11].k = 'skill'
  assert.throws(() => validateGraph(noMilestone), /milestone/)
})
