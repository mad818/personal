'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SEVERITY_COLORS } from '@/lib/notifications'
import type { NotificationSeverity } from '@/store/useStore'

// ── Toast types ────────────────────────────────────────────────────────────────
export interface ToastItem {
  id:        string
  title:     string
  message?:  string
  severity:  NotificationSeverity
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void
}

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastContainer')
  return ctx
}

// ── Standalone toast function (module-level) ───────────────────────────────────
// Allows calling toast() without hooks from anywhere. Emits a custom event.
export function toast(opts: Omit<ToastItem, 'id'>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('nexus:toast', { detail: opts }))
}

// ── Single toast card ──────────────────────────────────────────────────────────
function ToastCard({
  item,
  onDismiss,
}: {
  item:      ToastItem
  onDismiss: (id: string) => void
}) {
  const [hovered,   setHovered]   = useState(false)
  const [remaining, setRemaining] = useState(100)
  const duration = item.duration ?? 5000
  const startRef = useRef(Date.now())
  const pausedRef = useRef(false)

  // Progress bar countdown
  useEffect(() => {
    if (hovered) {
      pausedRef.current = true
      return
    }
    pausedRef.current = false
    const interval = setInterval(() => {
      if (pausedRef.current) return
      const elapsed = Date.now() - startRef.current
      const pct     = Math.max(0, 100 - (elapsed / duration) * 100)
      setRemaining(pct)
      if (pct <= 0) {
        clearInterval(interval)
        onDismiss(item.id)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [hovered, item.id, duration, onDismiss])

  // Also reset timer base when hover ends
  useEffect(() => {
    if (!hovered) {
      // Recalculate remaining time at start
      startRef.current = Date.now() - ((100 - remaining) / 100) * duration
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered])

  const borderColor = SEVERITY_COLORS[item.severity]

  return (
    <motion.div
      layout
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        width:        '300px',
        background:   'rgba(14, 10, 11, 0.96)',
        border:       `1px solid rgba(58,46,43,0.8)`,
        borderLeft:   `3px solid ${borderColor}`,
        borderRadius: '10px',
        padding:      '12px 14px 14px',
        boxShadow:    `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.3)`,
        backdropFilter: 'blur(16px)',
        overflow:     'hidden',
        cursor:       'default',
        marginBottom: '6px',
      }}
    >
      {/* Header row */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            '8px',
        marginBottom:   item.message ? '4px' : '0',
      }}>
        <div style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         'rgba(236,229,223,0.92)',
          letterSpacing: '0.3px',
          flex:          1,
          lineHeight:    1.3,
        }}>
          {item.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{
            fontSize:      '8px',
            fontWeight:    700,
            color:         borderColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            background:    `${borderColor}18`,
            padding:       '1px 5px',
            borderRadius:  '3px',
          }}>
            {item.severity}
          </span>
          <button
            onClick={() => onDismiss(item.id)}
            style={{
              background: 'transparent',
              border:     'none',
              color:      'rgba(122,107,98,0.6)',
              cursor:     'pointer',
              fontSize:   '16px',
              lineHeight: 1,
              padding:    0,
            }}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      </div>

      {item.message && (
        <div style={{
          fontSize:   '10.5px',
          color:      'rgba(122,107,98,0.85)',
          lineHeight: 1.4,
        }}>
          {item.message}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        position:     'absolute',
        bottom:       0,
        left:         0,
        right:        0,
        height:       '2px',
        background:   'rgba(58,46,43,0.4)',
      }}>
        <div style={{
          height:     '100%',
          width:      `${remaining}%`,
          background: borderColor,
          transition: 'width 0.05s linear',
          opacity:    0.7,
        }} />
      </div>
    </motion.div>
  )
}

// ── Toast container — add to layout ───────────────────────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 10)
    setToasts((prev) => {
      const next = [{ ...opts, id }, ...prev].slice(0, 3) // max 3
      return next
    })
  }, [])

  // Listen for module-level toast() calls
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<ToastItem, 'id'>
      addToast(detail)
    }
    window.addEventListener('nexus:toast', handler)
    return () => window.removeEventListener('nexus:toast', handler)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div
        aria-live="polite"
        style={{
          position:      'fixed',
          bottom:        '24px',
          right:         '24px',
          zIndex:        2000,
          display:       'flex',
          flexDirection: 'column-reverse',
          gap:           '0',
          pointerEvents: toasts.length > 0 ? 'auto' : 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
