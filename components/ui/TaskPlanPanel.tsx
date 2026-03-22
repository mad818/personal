'use client'

// ── TaskPlanPanel.tsx ──────────────────────────────────────────────────────────
// Shows the AI's decomposed task plan in real time.
// Each step has a status: pending → running → done / failed.
// Auto-collapses when idle. Animates when active.

import { useStore, type TaskItem } from '@/store/useStore'

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

  // Only show when there is an active plan and the agent is running
  const isActive = currentPhase !== 'idle' && currentPhase !== 'done'
  if (!taskPlan.length || (!isActive && taskPlan.every(t => t.status === 'pending'))) return null

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
        PLAN:
      </span>

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
