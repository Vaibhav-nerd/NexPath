import { z } from 'zod'

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/g

// Request schema for POST /api/roadmap
export const roadmapRequestSchema = z.object({
  goal: z
    .string()
    .transform((val) => val.replace(CONTROL_CHARS_REGEX, '').trim())
    .refine((val) => val.length > 0, { message: 'Goal cannot be empty' })
    .refine((val) => val.length <= 200, {
      message: 'Goal exceeds maximum length of 200 characters',
    }),
  level: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .default('beginner'),
})

// Request schema for POST /api/roadmap/expand
export const expandRequestSchema = z.object({
  goal: z
    .string()
    .transform((val) => val.replace(CONTROL_CHARS_REGEX, '').trim())
    .refine((val) => val.length > 0, { message: 'Goal cannot be empty' }),
  nodeTitle: z
    .string()
    .transform((val) => val.replace(CONTROL_CHARS_REGEX, '').trim())
    .refine((val) => val.length > 0, { message: 'Node title cannot be empty' }),
})

// Node schema (§7 contract)
export const nodeSchema = z.object({
  i: z.string().min(1),
  t: z.string().min(1),
  k: z.enum(['skill', 'project', 'milestone', 'cert']),
  p: z.number().int().min(1),
  d: z.string().min(1),
  w: z.string().min(1),
  q: z.array(z.string()).min(1).max(3),
})

// Roadmap schema (§7 contract)
export const roadmapResponseSchema = z.object({
  g: z.string().min(1),
  s: z.string().min(1),
  n: z.array(nodeSchema).min(10).max(14),
  e: z.array(z.tuple([z.string(), z.string()])),
})

// Expansion schema (§7 contract)
export const expandResponseSchema = z.object({
  sub: z
    .array(
      z.object({
        t: z.string().min(1),
        d: z.string().min(1),
        w: z.string().min(1),
      })
    )
    .max(6),
})

/**
 * Validates graph structure and semantics:
 * 1. Unique node IDs
 * 2. Edges reference existing node IDs
 * 3. No cycles (DAG)
 * 4. Exactly one milestone node in highest phase representing the goal
 * 5. Every node except phase 1 has at least one incoming edge
 * 6. Every node except the goal node has at least one outgoing edge
 *
 * @param {Object} roadmap - { g, s, n, e }
 * @throws {Error} if validation fails
 */
export function validateGraph(roadmap) {
  const nodes = roadmap.n
  const edges = roadmap.e

  // 1. Unique IDs
  const idSet = new Set()
  nodes.forEach((n) => {
    if (idSet.has(n.i)) {
      throw new Error(`Duplicate node ID: ${n.i}`)
    }
    idSet.add(n.i)
  })

  // 2. Edges reference existing nodes & no self-loops
  edges.forEach(([from, to]) => {
    if (!idSet.has(from)) {
      throw new Error(`Edge references nonexistent source ID: ${from}`)
    }
    if (!idSet.has(to)) {
      throw new Error(`Edge references nonexistent target ID: ${to}`)
    }
    if (from === to) {
      throw new Error(`Self-referencing cycle on node: ${from}`)
    }
  })

  // 3. Cycle detection (Kahn's algorithm)
  const inDegree = new Map()
  const adj = new Map()

  idSet.forEach((id) => {
    inDegree.set(id, 0)
    adj.set(id, [])
  })

  edges.forEach(([from, to]) => {
    inDegree.set(to, inDegree.get(to) + 1)
    adj.get(from).push(to)
  })

  const queue = []
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id)
  })

  let visitedCount = 0
  while (queue.length > 0) {
    const curr = queue.shift()
    visitedCount++
    for (const neighbor of adj.get(curr)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1)
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (visitedCount !== nodes.length) {
    throw new Error('Graph contains a cycle or circular dependency')
  }

  // 4. Exactly one node in highest phase, kind milestone
  const maxPhase = Math.max(...nodes.map((n) => n.p))
  const highestPhaseNodes = nodes.filter((n) => n.p === maxPhase)

  if (highestPhaseNodes.length !== 1) {
    throw new Error(
      `Highest phase (${maxPhase}) must contain exactly 1 node, found ${highestPhaseNodes.length}`
    )
  }

  const goalNode = highestPhaseNodes[0]
  if (goalNode.k !== 'milestone') {
    throw new Error(
      `Goal node in highest phase must have kind 'milestone', found '${goalNode.k}'`
    )
  }

  // 5. Every node except phase 1 has at least one incoming edge
  const incomingMap = new Set(edges.map(([, to]) => to))
  nodes.forEach((n) => {
    if (n.p > 1 && !incomingMap.has(n.i)) {
      throw new Error(
        `Node ${n.i} in phase ${n.p} must have at least one incoming edge`
      )
    }
  })

  // 6. Every node except the goal node has at least one outgoing edge
  const outgoingMap = new Set(edges.map(([from]) => from))
  nodes.forEach((n) => {
    if (n.i !== goalNode.i && !outgoingMap.has(n.i)) {
      throw new Error(
        `Node ${n.i} must have at least one outgoing edge towards the goal`
      )
    }
  })

  return true
}
