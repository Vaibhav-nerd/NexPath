import React from 'react'

export function ProgressBar({ totalSteps, completedSteps }) {
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="progress-container" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  )
}
