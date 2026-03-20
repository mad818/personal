'use client'

// ── components/skills/LearningLog.tsx ─────────────────────────────────────────
// NEXUS PRIME — Learning Log: animated timeline of system learning events
// with filtering, export, and real-time entry injection from training actions.

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_LEARNING_LOG, type LearningEvent } from '@/lib/skillEngine'

// ── Event type config ─────────────────────────────────────────────────────────
const EVENT_META: Record<LearningEvent['type'], { label: string; color: string; icon: string }> = {
  acquired:          { label: 'Acquired',       color: 'var(--gold)',    icon: '✦' },
  improved:          { label: 'Improved',        color: 'var(--accent)',  icon: '↑' },
  error_learned:     { label: 'Error Learned',   color: 'var(--blush)',   icon: '⚠' },
  pattern_detected:  { label: 'Pattern',         color: 'var(--text)',    icon: '◈' },
  optimization:      { label: 'Optimization',    color: 'var(--accent2)', icon: '⚡' },
}

// ── Format timestamp ──────────────────────────────────────────────────────────
function fmtTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Single log entry ──────────────────────────────────────────────────────────
function LogEntry({ event, isNew }: { event: LearningEvent; isNew?: boolean }) {
  const meta = EVENT_META[event.type]

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -16, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
      }}
    >
      {/* Timeline dot */}
      <div style={{ flexShrink: 0, paddingTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: meta.color,
          flexShrink: 0,
          boxShadow: isNew ? `0 0 8px ${meta.color}44` : 'none',
        }}>
          {meta.icon}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: meta.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {meta.label}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text)',
          }}>
            {event.skillName}
          </span>
          {isNew && (
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: 3 }}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '3px',
                background: `${meta.color}22`,
                color: meta.color,
              }}
            >
              NEW
            </motion.span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
            {fmtTime(event.timestamp)}
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text2)', lineHeight: 1.45 }}>
          {event.description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: 'var(--gold)',
          }}>
            +{event.xpGained} XP
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({
  active,
  onChange,
}: {
  active: LearningEvent['type'] | 'all'
  onChange: (f: LearningEvent['type'] | 'all') => void
}) {
  const filters: Array<{ key: LearningEvent['type'] | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'acquired', label: 'Acquired' },
    { key: 'improved', label: 'Improved' },
    { key: 'error_learned', label: 'Errors' },
    { key: 'pattern_detected', label: 'Patterns' },
    { key: 'optimization', label: 'Optimized' },
  ]

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '5px',
            border: `1px solid ${active === f.key ? 'var(--accent)' : 'var(--border)'}`,
            background: active === f.key ? 'var(--accent)18' : 'var(--surf)',
            color: active === f.key ? 'var(--accent)' : 'var(--text3)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          {f.key !== 'all' && (
            <span style={{ marginRight: '4px' }}>
              {EVENT_META[f.key as LearningEvent['type']].icon}
            </span>
          )}
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Main LearningLog export ────────────────────────────────────────────────────
export default function LearningLog({
  newEvent,
}: {
  newEvent?: LearningEvent | null
}) {
  const [events, setEvents] = useState<LearningEvent[]>(DEFAULT_LEARNING_LOG)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<LearningEvent['type'] | 'all'>('all')
  const topRef = useRef<HTMLDivElement>(null)

  // Inject new event from training
  useEffect(() => {
    if (!newEvent) return
    setEvents(prev => [newEvent, ...prev])
    setNewIds(prev => { const s = new Set(Array.from(prev)); s.add(newEvent.id); return s })
    setTimeout(() => {
      setNewIds(prev => {
        const next = new Set(prev)
        next.delete(newEvent.id)
        return next
      })
    }, 8000)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [newEvent])

  const handleClear = useCallback(() => {
    setEvents([])
    setNewIds(new Set())
  }, [])

  const handleExport = useCallback(() => {
    const data = JSON.stringify(events, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-learning-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [events])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  // Stats
  const totalXP = events.reduce((s, e) => s + e.xpGained, 0)
  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{
      background: 'var(--surf2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: 900,
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Learning Log
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1px' }}>
            {events.length} events · {totalXP.toLocaleString()} XP accumulated
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleExport}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border2)',
              background: 'var(--surf)',
              color: 'var(--text2)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            ↓ Export
          </button>
          <button
            onClick={handleClear}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border2)',
              background: 'var(--surf)',
              color: 'var(--text3)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            ✕ Clear
          </button>
        </div>
      </div>

      {/* XP mini stats */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        {(Object.keys(EVENT_META) as LearningEvent['type'][]).map(type => {
          const meta = EVENT_META[type]
          const count = counts[type] ?? 0
          return (
            <div key={type} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: 'var(--text3)',
            }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: count > 0 ? meta.color : 'var(--text3)' }}>
                {count}
              </span>
              <span>{meta.label}</span>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '12px' }}>
        <FilterBar active={filter} onChange={setFilter} />
      </div>

      {/* Timeline */}
      <div
        ref={topRef}
        style={{
          maxHeight: '420px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: '13px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>◈</div>
              No learning events yet. Train a skill to start the log.
            </motion.div>
          ) : (
            filtered.map(evt => (
              <LogEntry
                key={evt.id}
                event={evt}
                isNew={newIds.has(evt.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
