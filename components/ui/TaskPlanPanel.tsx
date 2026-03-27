'use client'

// ── TaskPlanPanel.tsx ──────────────────────────────────────────────────────────
// Shows the AI's decomposed task plan in real time.
// Each step has a status: pending → running → done / failed.
// Auto-collapses when idle. Animates when active.

import { useStore, type TaskItem } from '@/store/useStore'
import { useEffect } from 'react'

const STATUS_ICON: Record<TaskItem['status'], string> = {
  pending: '○',
  running: '◉',
  done:    '✓',
  failed:  '✗',
}

const STATUS_COLOR: Record<TaskItem['status'], string> = {
  pending: '#1A2040',
  running: '#00DDFF',
  done:    '#00FF66',
  failed:  '#ef4444',
}

export default function TaskPlanPanel() {
  const currentPhase = useStore(s => s.currentPhase)
  const taskPlan     = useStore(s => s.taskPlan)
  const setTaskPlan  = useStore(s => s.setTaskPlan)
  const setCurrentPhase = useStore(s => s.setCurrentPhase)

  // Auto-clear plan when a run is finished/interrupted so stale partial states don't persist.
  useEffect(() => {
    if (!taskPlan.length) return
    const terminal = currentPhase === 'done' || currentPhase === 'idle'
    if (!terminal) return
    const id = window.setTimeout(() => {
      setTaskPlan([])
      // If we're still in "done", return to idle baseline after the plan clears.
      if (useStore.getState().currentPhase === 'done') setCurrentPhase('idle')
    }, 2200)
    return () => window.clearTimeout(id)
  }, [currentPhase, taskPlan, setTaskPlan, setCurrentPhase])

  // Only show when there is an active plan and the agent is running
  const isActive = currentPhase !== 'idle' && currentPhase !== 'done'
  if (!taskPlan.length || (!isActive && taskPlan.every(t => t.status === 'pending'))) return null

  const doneCount = taskPlan.filter(t => t.status === 'done').length
  const pendingItems = taskPlan.filter(t => t.status === 'pending' || t.status === 'running')
  const pendingLabel = pendingItems[0]?.label ?? ''

  return (
    <div style={{
      padding:      '6px 16px',
      background:   '#08091200',
      borderBottom: '1px solid #1A204055',
      display:      'flex',
      alignItems:   'center',
      gap:          '6px',
      flexShrink:   0,
      overflowX:    'auto',
    }}>
      {/* Label */}
      <span style={{
        fontSize:    '9px',
        fontFamily:  "'VT323', monospace",
        color:       '#304060',
        letterSpacing: '2px',
        marginRight: '6px',
        whiteSpace:  'nowrap',
        flexShrink:  0,
      }}>
        PLAN {doneCount}/{taskPlan.length}:
      </span>

      {pendingItems.length > 0 && (
        <span
          style={{
            fontSize: '8px',
            fontFamily: "'VT323', monospace",
            color: '#00DDFFaa',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={pendingItems.map((p) => p.label).join(' | ')}
        >
          NEXT: {pendingLabel}
        </span>
      )}

      <button
        type="button"
        onClick={() => setTaskPlan([])}
        style={{
          fontSize: '8px',
          fontFamily: "'VT323', monospace",
          color: '#6875a0',
          background: 'transparent',
          border: '1px solid #1A2040',
          borderRadius: '3px',
          padding: '1px 5px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginRight: '8px',
        }}
        title="Clear current runtime plan"
      >
        CLEAR
      </button>

      {taskPlan.map((step, i) => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Step */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '4px',
            padding:    '1px 6px',
            borderRadius: '3px',
            background: step.status === 'running'
              ? 'rgba(0,221,255,0.07)'
              : step.status === 'done'
                ? 'rgba(0,255,102,0.04)'
                : 'transparent',
            border: `1px solid ${step.status === 'running' ? '#00DDFF33' : step.status === 'done' ? '#00FF6622' : 'transparent'}`,
            transition: 'all .35s',
            animation: step.status === 'running' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          }}>
            <span style={{
              fontSize: '8px',
              color: STATUS_COLOR[step.status],
              fontWeight: step.status === 'running' ? 900 : 400,
              transition: 'color .3s',
            }}>
              {STATUS_ICON[step.status]}
            </span>
            <span style={{
              fontSize:    '9px',
              fontFamily:  "'VT323', monospace",
              color:       step.status === 'pending' ? '#2a3050' : STATUS_COLOR[step.status],
              letterSpacing: '.5px',
              whiteSpace:  'nowrap',
              transition:  'color .3s',
            }}>
              {step.label}
            </span>
          </div>

          {/* Arrow connector */}
          {i < taskPlan.length - 1 && (
            <span style={{
              fontSize: '8px',
              color: step.status === 'done' ? '#00FF6633' : '#1A2040',
              transition: 'color .5s',
            }}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
