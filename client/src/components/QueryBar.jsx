import React, { useState } from 'react'

const MAX_QUERY_CHARS = 200

export function QueryBar({
  onGenerate,
  isLoading,
  isCached,
  viewMode,
  onToggleView,
  completedCount,
  totalCount,
  onExportJSON,
  fxEnabled,
  onToggleFx,
}) {
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('beginner')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = goal.trim()
    if (!trimmed || isLoading) return
    onGenerate(trimmed, level)
  }

  const charCount = goal.length
  const showCharCounter = charCount >= MAX_QUERY_CHARS * 0.8

  return (
    <header className="query-bar">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="query-input-wrap">
          <input
            type="text"
            className="query-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value.slice(0, MAX_QUERY_CHARS))}
            placeholder="What do you want to become?"
            disabled={isLoading}
            aria-label="Career goal"
          />
          {showCharCounter && (
            <span className="char-counter">
              {charCount}/{MAX_QUERY_CHARS}
            </span>
          )}
        </div>

        <select
          className="level-select"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          disabled={isLoading}
          aria-label="Starting level"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !goal.trim()}
        >
          {isLoading ? 'Building…' : 'Generate roadmap'}
        </button>
      </form>

      <div className="meta-status-wrap">
        {totalCount > 0 && (
          <span className="progress-meta">
            {completedCount} of {totalCount} steps complete
          </span>
        )}

        {isCached && <span className="cached-tag">Cached</span>}

        {totalCount > 0 && (
          <>
            <button
              type="button"
              className="view-toggle-btn"
              onClick={onToggleView}
              aria-label="Toggle between graph and list view"
            >
              {viewMode === 'graph' ? 'List view' : 'Graph view'}
            </button>
            <button
              type="button"
              className="view-toggle-btn"
              onClick={onExportJSON}
              aria-label="Download roadmap as JSON"
            >
              Export
            </button>
            <button
              type="button"
              className="view-toggle-btn"
              onClick={onToggleFx}
              aria-label="Toggle visual effects"
            >
              FX: {fxEnabled ? 'On' : 'Off'}
            </button>
          </>
        )}
      </div>
    </header>
  )
}
