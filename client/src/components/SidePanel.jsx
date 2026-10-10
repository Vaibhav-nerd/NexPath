import React, { useEffect, useRef } from 'react'

export function SidePanel({
  node,
  onClose,
  onToggleComplete,
  isCompleted,
  onExpandNode,
  isExpanded,
  isExpanding,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!node) return null

  const { id, title, duration, why, queries = [] } = node.data

  return (
    <aside
      ref={panelRef}
      className="side-panel"
      role="complementary"
      aria-label="Node Details"
    >
      <div className="side-panel-header">
        <h2 className="side-panel-title">{title}</h2>
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="side-panel-section">
        <span className="section-label">Duration</span>
        <p className="panel-text">{duration}</p>
      </div>

      <div className="side-panel-section">
        <span className="section-label">Why it matters</span>
        <p className="panel-text">{why}</p>
      </div>

      {queries.length > 0 && (
        <div className="side-panel-section">
          <span className="section-label">Learning resources</span>
          <ul className="search-phrase-list">
            {queries.map((q, idx) => (
              <li key={idx}>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="search-phrase-link"
                >
                  {q}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onToggleComplete(id)}
        >
          {isCompleted ? 'Mark incomplete' : 'Mark complete'}
        </button>

        {node.data.kind !== 'milestone' && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onExpandNode(node)}
            disabled={isExpanded || isExpanding}
          >
            {isExpanding
              ? 'Expanding…'
              : isExpanded
              ? 'Expanded'
              : 'Go deeper'}
          </button>
        )}
      </div>
    </aside>
  )
}
