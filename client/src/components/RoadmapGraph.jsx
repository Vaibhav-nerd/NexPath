import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeCard } from './NodeCard'

const nodeTypes = {
  customNode: NodeCard,
}

export function RoadmapGraph({
  initialNodes,
  initialEdges,
  onNodeClick,
  onPaneClick,
  selectedNodeId,
  completedNodeIds,
}) {
  const containerRef = useRef(null)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [rfInstance, setRfInstance] = useState(null)
  const [hasEntered, setHasEntered] = useState(false)

  // Entrance plays once per new roadmap (max 400ms)
  useEffect(() => {
    setHasEntered(false)
    const timer = setTimeout(() => setHasEntered(true), 450)
    return () => clearTimeout(timer)
  }, [initialNodes])

  // 10. Smooth camera zoom to selected node (duration 350ms <= 400ms)
  useEffect(() => {
    if (!selectedNodeId || !rfInstance) return
    const targetNode = initialNodes.find((n) => n.id === selectedNodeId)
    if (targetNode && targetNode.position) {
      rfInstance.setCenter(
        targetNode.position.x + 100, // half of 200px width
        targetNode.position.y + 36,  // half of 72px height
        { zoom: 1.05, duration: 350 }
      )
    }
  }, [selectedNodeId, initialNodes, rfInstance])

  // Cursor spotlight updated via requestAnimationFrame directly on DOM style
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let rafId = null
    let targetX = 0
    let targetY = 0

    const updateSpotlight = () => {
      el.style.setProperty('--mx', `${targetX}px`)
      el.style.setProperty('--my', `${targetY}px`)
      rafId = null
    }

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect()
      targetX = e.clientX - rect.left
      targetY = e.clientY - rect.top
      if (!rafId) {
        rafId = requestAnimationFrame(updateSpotlight)
      }
    }

    el.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Map nodes with dynamic state without altering dagre positions
  const nodes = useMemo(() => {
    return initialNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        isDone: completedNodeIds.has(node.id),
        animEnter: !hasEntered,
      },
    }))
  }, [initialNodes, selectedNodeId, completedNodeIds, hasEntered])

  // Active node for edge highlighting is either hovered or selected
  const activeNodeId = hoveredNodeId || selectedNodeId

  // 6. Edge flow on active path only; others dimmed to 40%
  const edges = useMemo(() => {
    return initialEdges.map((edge) => {
      const isConnected =
        activeNodeId &&
        (edge.source === activeNodeId || edge.target === activeNodeId)

      let strokeColor = 'var(--line)'
      let opacity = 1
      let strokeWidth = 1.5

      if (activeNodeId) {
        if (isConnected) {
          strokeColor = 'var(--accent)'
          strokeWidth = 2
          opacity = 1
        } else {
          opacity = 0.4
        }
      }

      return {
        ...edge,
        className: isConnected ? 'edge-flow' : '',
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth,
          opacity,
          transition: 'stroke 0.15s ease, opacity 0.15s ease',
        },
        markerEnd: {
          ...edge.markerEnd,
          color: strokeColor,
        },
      }
    })
  }, [initialEdges, activeNodeId])

  const handleNodeMouseEnter = useCallback((_, node) => {
    setHoveredNodeId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  const handleNodeClick = useCallback(
    (_, node) => {
      onNodeClick(node)
    },
    [onNodeClick]
  )

  return (
    <div ref={containerRef} className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--line)" gap={20} size={1} />
        <Controls
          showInteractive={false}
          style={{ bottom: 16, left: 16 }}
        />
        <MiniMap
          nodeStrokeColor="var(--line)"
          nodeColor="var(--surface)"
          maskColor="rgba(10, 14, 23, 0.75)"
          style={{ bottom: 16, left: 72 }}
        />
      </ReactFlow>
    </div>
  )
}
