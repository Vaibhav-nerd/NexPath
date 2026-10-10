async function runChecks() {
  console.log('--- Starting Phase 2 Verification Checks ---')

  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/api/health')
  const healthData = await healthRes.json()
  console.log('1. Health check status:', healthRes.status, healthData)
  if (healthRes.status !== 200) throw new Error('Health check failed')

  // 2. Empty or 500-char goal -> 400
  const emptyRes = await fetch('http://localhost:5000/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: '   ', level: 'beginner' }),
  })
  console.log('2a. Empty goal status (expected 400):', emptyRes.status)
  if (emptyRes.status !== 400) throw new Error('Empty goal should return 400')

  const longRes = await fetch('http://localhost:5000/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'x'.repeat(250), level: 'beginner' }),
  })
  console.log('2b. 250-char goal status (expected 400):', longRes.status)
  if (longRes.status !== 400) throw new Error('Long goal should return 400')

  // 3. Cache test: Same request twice
  const req1 = await fetch('http://localhost:5000/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'Cloud Architect', level: 'intermediate' }),
  })
  const data1 = await req1.json()
  console.log('3a. First request cached flag (expected false):', data1.cached)
  if (data1.cached !== false) throw new Error('First call should not be cached')

  const req2 = await fetch('http://localhost:5000/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'Cloud Architect', level: 'intermediate' }),
  })
  const data2 = await req2.json()
  console.log('3b. Second request cached flag (expected true):', data2.cached)
  if (data2.cached !== true) throw new Error('Second call should be cached')

  // 4. Rate limit check: Rapid requests
  console.log('4. Testing rate limit (5 requests allowed per minute)...')
  let got429 = false
  for (let i = 0; i < 6; i++) {
    const res = await fetch('http://localhost:5000/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: `Test Goal ${i}`, level: 'beginner' }),
    })
    console.log(`   Rapid request #${i + 1} status:`, res.status)
    if (res.status === 429) {
      got429 = true
      break
    }
  }
  if (!got429) throw new Error('Expected 429 on rapid requests exceeding limit')

  console.log('✅ ALL PHASE 2 CHECKS PASSED!')
}

runChecks().catch((err) => {
  console.error('❌ Check failed:', err)
  process.exit(1)
})
