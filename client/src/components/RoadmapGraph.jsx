import React, { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
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
  const [hoveredNodeId, setHoveredNodeId] = useState(null)

  // Map nodes with dynamic state without altering dagre positions
  const nodes = useMemo(() => {
    return initialNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        isDone: completedNodeIds.has(node.id),
      },
    }))
  }, [initialNodes, selectedNodeId, completedNodeIds])

  // Active node for edge highlighting is either hovered or selected
  const activeNodeId = hoveredNodeId || selectedNodeId

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
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
          maskColor="rgba(246, 247, 249, 0.7)"
          style={{ bottom: 16, left: 72 }}
        />
      </ReactFlow>
    </div>
  )
}
