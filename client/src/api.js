/**
 * Client API services communicating with backend Express server via Vite proxy.
 */

export async function generateRoadmap(goal, level = 'beginner', signal) {
  const response = await fetch('/api/roadmap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goal, level }),
    signal,
  })

  if (response.status === 429) {
    const error = new Error("You've reached today's limit. Try again tomorrow.")
    error.status = 429
    throw error
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(
      data.error || 'The roadmap could not be generated. Try again in a moment.'
    )
    error.status = response.status
    throw error
  }

  return response.json()
}

export async function expandNode(goal, nodeTitle, signal) {
  const response = await fetch('/api/roadmap/expand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goal, nodeTitle }),
    signal,
  })

  if (response.status === 429) {
    const error = new Error("You've reached today's limit. Try again tomorrow.")
    error.status = 429
    throw error
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.error || 'Could not expand node.')
    error.status = response.status
    throw error
  }

  return response.json()
}
