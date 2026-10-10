import React from 'react'

export function ListView({
  nodes,
  onNodeClick,
  selectedNodeId,
  completedNodeIds,
}) {
  // Group nodes by phase
  const phases = React.useMemo(() => {
    const map = new Map()
    nodes.forEach((node) => {
      const p = node.data.phase || 1
      if (!map.has(p)) map.set(p, [])
      map.get(p).push(node)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [nodes])

  return (
    <div className="list-view" role="region" aria-label="Roadmap list view">
      {phases.map(([phaseNum, phaseNodes]) => (
        <section key={phaseNum} className="list-phase-group">
          <h3 className="phase-heading">Phase {phaseNum}</h3>
          <div>
            {phaseNodes.map((node) => {
              const isDone = completedNodeIds.has(node.id)
              const isSelected = node.id === selectedNodeId

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  className={`list-node-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onNodeClick(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onNodeClick(node)
                    }
                  }}
                  aria-label={`${node.data.title}, ${node.data.duration}, ${
                    isDone ? 'completed' : 'not completed'
                  }`}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: isDone ? 'var(--muted)' : 'var(--ink)',
                      }}
                    >
                      {node.data.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {node.data.kind} · {node.data.duration}
                    </div>
                  </div>
                  <div>
                    {isDone ? (
                      <span style={{ color: 'var(--done)', fontSize: 14 }}>
                        ✓ Complete
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
