import dagre from 'dagre'
import { MarkerType } from 'reactflow'

const NODE_WIDTH = 200
const NODE_HEIGHT = 72

/**
 * Transforms compact roadmap JSON into positioned React Flow nodes and edges.
 *
 * @param {Object} roadmap - Compact roadmap JSON { g, s, n, e }
 * @returns {{ nodes: Array, edges: Array, goal: string, summary: string }}
 */
export function getLayoutedGraph(roadmap) {
  if (!roadmap || !Array.isArray(roadmap.n)) {
    return { nodes: [], edges: [], goal: '', summary: '' }
  }

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: 'LR',
    ranksep: 80,
    nodesep: 24,
  })

  // Add nodes to dagre
  roadmap.n.forEach((node) => {
    dagreGraph.setNode(node.i, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Add edges to dagre
  const edgesData = Array.isArray(roadmap.e) ? roadmap.e : []
  edgesData.forEach(([source, target]) => {
    if (source && target) {
      dagreGraph.setEdge(source, target)
    }
  })

  // Run layout
  dagre.layout(dagreGraph)

  // Map to React Flow nodes
  const nodes = roadmap.n.map((item) => {
    const nodeWithPosition = dagreGraph.node(item.i)
    return {
      id: item.i,
      type: 'customNode',
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: {
        id: item.i,
        title: item.t,
        kind: item.k,
        phase: item.p,
        duration: item.d,
        why: item.w,
        queries: item.q || [],
      },
    }
  })

  // Map to React Flow edges
  const edges = edgesData.map(([source, target]) => ({
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: 'var(--line)',
    },
    style: {
      stroke: 'var(--line)',
      strokeWidth: 1.5,
    },
  }))

  return {
    nodes,
    edges,
    goal: roadmap.g || '',
    summary: roadmap.s || '',
  }
}
