import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import sampleFixture from './fixtures/sample.json'
import { getLayoutedGraph } from './layout'
import { QueryBar } from './components/QueryBar'
import { RoadmapGraph } from './components/RoadmapGraph'
import { SidePanel } from './components/SidePanel'
import { ProgressBar } from './components/ProgressBar'
import { ListView } from './components/ListView'
import { expandNode, generateRoadmap } from './api'

const EXAMPLE_GOALS = [
  'Machine Learning Engineer',
  'Full Stack Cloud Developer',
  'DevOps and Site Reliability Engineer',
]

export default function App() {
  const [activeRoadmap, setActiveRoadmap] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [completedNodeIds, setCompletedNodeIds] = useState(new Set())
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set())
  const [isExpanding, setIsExpanding] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error' | 'limit'
  const [errorMessage, setErrorMessage] = useState('')
  const [viewMode, setViewMode] = useState('graph') // 'graph' | 'list'
  const [isCached, setIsCached] = useState(false)
  const [lastSubmittedGoal, setLastSubmittedGoal] = useState('')
  const [lastSubmittedLevel, setLastSubmittedLevel] = useState('beginner')
  const [fxEnabled, setFxEnabled] = useState(true)

  const abortControllerRef = useRef(null)

  // Pause all animations when tab is hidden (§6)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.documentElement.setAttribute('data-tab-hidden', 'true')
      } else {
        document.documentElement.removeAttribute('data-tab-hidden')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Load from sessionStorage or fixture on mount
  useEffect(() => {
    const useFixture = import.meta.env.VITE_USE_FIXTURE === 'true'
    const saved = sessionStorage.getItem('career_roadmap_active')

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setActiveRoadmap(parsed.roadmap)
        setIsCached(!!parsed.cached)
        setStatus('success')
        return
      } catch (e) {
        sessionStorage.removeItem('career_roadmap_active')
      }
    }

    if (useFixture) {
      setActiveRoadmap(sampleFixture)
      setIsCached(true)
      setStatus('success')
    }
  }, [])

  // Sync completion states with localStorage keyed by goal
  useEffect(() => {
    if (!activeRoadmap?.g) return
    const key = `roadmap_progress_${encodeURIComponent(activeRoadmap.g.toLowerCase())}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        setCompletedNodeIds(new Set(JSON.parse(stored)))
      } catch (e) {
        setCompletedNodeIds(new Set())
      }
    } else {
      setCompletedNodeIds(new Set())
    }
  }, [activeRoadmap?.g])

  const saveProgress = useCallback(
    (newSet) => {
      setCompletedNodeIds(newSet)
      if (activeRoadmap?.g) {
        const key = `roadmap_progress_${encodeURIComponent(activeRoadmap.g.toLowerCase())}`
        localStorage.setItem(key, JSON.stringify(Array.from(newSet)))
      }
    },
    [activeRoadmap?.g]
  )

  const handleToggleComplete = useCallback(
    (nodeId) => {
      const next = new Set(completedNodeIds)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      saveProgress(next)
    },
    [completedNodeIds, saveProgress]
  )

  // Layouted graph memoized on activeRoadmap changes
  const layouted = useMemo(() => {
    if (!activeRoadmap) return { nodes: [], edges: [], goal: '', summary: '' }
    return getLayoutedGraph(activeRoadmap)
  }, [activeRoadmap])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return layouted.nodes.find((n) => n.id === selectedNodeId) || null
  }, [selectedNodeId, layouted.nodes])

  // Generate roadmap handler with AbortController
  const handleGenerate = async (goal, level) => {
    // Abort previous in-flight request if user submits again
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLastSubmittedGoal(goal)
    setLastSubmittedLevel(level)
    setStatus('loading')
    setErrorMessage('')
    setSelectedNodeId(null)
    setExpandedNodeIds(new Set())

    const useFixture = import.meta.env.VITE_USE_FIXTURE === 'true'
    if (useFixture) {
      setTimeout(() => {
        setActiveRoadmap(sampleFixture)
        setIsCached(true)
        setStatus('success')
        sessionStorage.setItem(
          'career_roadmap_active',
          JSON.stringify({ roadmap: sampleFixture, cached: true })
        )
      }, 500)
      return
    }

    try {
      const data = await generateRoadmap(goal, level, controller.signal)
      setActiveRoadmap(data)
      setIsCached(!!data.cached)
      setStatus('success')
      sessionStorage.setItem(
        'career_roadmap_active',
        JSON.stringify({ roadmap: data, cached: !!data.cached })
      )
    } catch (err) {
      if (err.name === 'AbortError') {
        return // Ignore intentional abort
      }
      if (err.status === 429) {
        setStatus('limit')
      } else {
        setErrorMessage(
          err.message || 'The roadmap could not be generated. Try again in a moment.'
        )
        setStatus('error')
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  // Node expansion ("Go deeper")
  const handleExpandNode = async (node) => {
    if (!node || !activeRoadmap) return
    const nodeId = node.id
    setIsExpanding(true)

    const useFixture = import.meta.env.VITE_USE_FIXTURE === 'true'
    if (useFixture) {
      setTimeout(() => {
        const subTopics = [
          { t: `${node.data.title} Foundations`, d: '3d', w: 'Key underlying concepts.' },
          { t: `${node.data.title} Practice`, d: '4d', w: 'Practical exercises.' },
        ]
        applyExpansion(nodeId, subTopics)
        setIsExpanding(false)
      }, 400)
      return
    }

    try {
      const data = await expandNode(activeRoadmap.g, node.data.title)
      if (data && Array.isArray(data.sub)) {
        applyExpansion(nodeId, data.sub)
      }
    } catch (e) {
      // Quiet failure for sub-topics expansion
    } finally {
      setIsExpanding(false)
    }
  }

  const applyExpansion = (parentId, subTopics) => {
    if (!subTopics || subTopics.length === 0) return

    const parentIndex = activeRoadmap.n.findIndex((n) => n.i === parentId)
    const parentNode = activeRoadmap.n[parentIndex]
    if (!parentNode) return

    const newNodes = [...activeRoadmap.n]
    const newEdges = [...activeRoadmap.e]

    subTopics.forEach((sub, idx) => {
      const newId = `${parentId}_sub_${idx + 1}`
      if (newNodes.some((n) => n.i === newId)) return

      newNodes.push({
        i: newId,
        t: sub.t,
        k: 'skill',
        p: parentNode.p,
        d: sub.d,
        w: sub.w,
        q: [sub.t],
      })

      newEdges.push([parentId, newId])
    })

    const updatedRoadmap = {
      ...activeRoadmap,
      n: newNodes,
      e: newEdges,
    }

    setActiveRoadmap(updatedRoadmap)
    setExpandedNodeIds((prev) => new Set(prev).add(parentId))
  }

  const handleExportJSON = () => {
    if (!activeRoadmap) return
    const blob = new Blob([JSON.stringify(activeRoadmap, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(activeRoadmap.g || 'roadmap').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalSteps = activeRoadmap?.n?.length || 0
  const completedSteps = completedNodeIds.size

  return (
    <div className="app-container" data-fx={fxEnabled ? 'on' : 'off'}>
      <QueryBar
        onGenerate={handleGenerate}
        isLoading={status === 'loading'}
        isCached={isCached}
        viewMode={viewMode}
        onToggleView={() => setViewMode((v) => (v === 'graph' ? 'list' : 'graph'))}
        completedCount={completedSteps}
        totalCount={totalSteps}
        onExportJSON={handleExportJSON}
        fxEnabled={fxEnabled}
        onToggleFx={() => setFxEnabled((v) => !v)}
      />

      {totalSteps > 0 && (
        <ProgressBar
          totalSteps={totalSteps}
          completedSteps={completedSteps}
        />
      )}

      <main className="workspace">
        {/* State 1: Empty State */}
        {status === 'idle' && (
          <div className="state-center">
            <h1 className="state-title">Career Roadmap Generator</h1>
            <p className="state-body">
              Type your career goal to generate an interactive, reverse-engineered roadmap designed backwards from target role to first steps.
            </p>
            <div className="example-chips">
              {EXAMPLE_GOALS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="example-chip"
                  onClick={() => handleGenerate(example, 'beginner')}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* State 2: Skeleton Loading */}
        {status === 'loading' && (
          <div className="skeleton-container" aria-live="polite">
            <span className="skeleton-text">Building your roadmap…</span>
            <div className="skeleton-grid">
              <div className="skeleton-node" />
              <div className="skeleton-node" />
              <div className="skeleton-node" />
              <div className="skeleton-node" />
              <div className="skeleton-node" />
            </div>
          </div>
        )}

        {/* State 4: Error State */}
        {status === 'error' && (
          <div className="state-banner" role="alert">
            <p className="banner-message">{errorMessage}</p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'fit-content' }}
              onClick={() => handleGenerate(lastSubmittedGoal, lastSubmittedLevel)}
            >
              Try again
            </button>
          </div>
        )}

        {/* State 5: Limit State */}
        {status === 'limit' && (
          <div className="state-banner" role="alert">
            <p className="banner-message">
              You've reached today's limit. Try again tomorrow.
            </p>
          </div>
        )}

        {/* State 3: Success State */}
        {status === 'success' && activeRoadmap && (
          <>
            {viewMode === 'graph' ? (
              <RoadmapGraph
                initialNodes={layouted.nodes}
                initialEdges={layouted.edges}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                selectedNodeId={selectedNodeId}
                completedNodeIds={completedNodeIds}
                isLiteMode={totalSteps > 30}
              />
            ) : (
              <ListView
                nodes={layouted.nodes}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
                selectedNodeId={selectedNodeId}
                completedNodeIds={completedNodeIds}
              />
            )}

            <SidePanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onToggleComplete={handleToggleComplete}
              isCompleted={selectedNode ? completedNodeIds.has(selectedNode.id) : false}
              onExpandNode={handleExpandNode}
              isExpanded={selectedNode ? expandedNodeIds.has(selectedNode.id) : false}
              isExpanding={isExpanding}
            />
          </>
        )}
      </main>
    </div>
  )
}
