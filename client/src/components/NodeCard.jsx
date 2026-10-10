import React, { useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'

const CheckIcon = () => (
  <svg
    className="done-badge"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
  </svg>
)

function NodeCardComponent({ id, data, selected }) {
  const { title, kind, duration, isDone, phase, animEnter } = data
  const [pulse, setPulse] = useState(false)
  const prevDoneRef = useRef(isDone)

  // One-time 400ms pulse ring when transitioning to complete
  useEffect(() => {
    if (!prevDoneRef.current && isDone) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 400)
      return () => clearTimeout(timer)
    }
    prevDoneRef.current = isDone
  }, [isDone])

  const kindClass = `kind-${kind || 'skill'}`
  const doneClass = isDone ? 'is-done' : ''
  const selectedClass = selected ? 'selected' : ''
  const enterClass = animEnter ? 'anim-enter' : ''
  const pulseClass = pulse ? 'pulse-complete' : ''

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}, ${duration}, ${isDone ? 'completed' : 'not completed'}`}
      className={`custom-node ${kindClass} ${doneClass} ${selectedClass} ${enterClass} ${pulseClass}`}
      style={{ '--phase': phase || 1 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ visibility: 'hidden' }}
      />
      <div className="node-header">
        <span className="node-title">{title}</span>
        {isDone && <CheckIcon />}
      </div>
      <span className="node-duration">{duration}</span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ visibility: 'hidden' }}
      />
    </div>
  )
}

export const NodeCard = React.memo(NodeCardComponent)
