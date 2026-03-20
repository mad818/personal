'use client'

// CameraArray.tsx — Horizontal strip of 6 vehicle camera feeds with visual
// overlay effects for NV/Thermal/LiDAR, expandable to large view.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VehicleCamera {
  id:     string
  label:  string
  type:   'RGB' | 'NV' | 'Thermal' | 'LiDAR' | 'Wide' | 'Rear'
  status: 'active' | 'standby'
}

const CAMERAS: VehicleCamera[] = [
  { id: 'vc1', label: 'Forward RGB',  type: 'RGB',     status: 'active'  },
  { id: 'vc2', label: 'Night Vision', type: 'NV',      status: 'active'  },
  { id: 'vc3', label: 'Thermal',      type: 'Thermal', status: 'active'  },
  { id: 'vc4', label: 'LiDAR',        type: 'LiDAR',   status: 'active'  },
  { id: 'vc5', label: 'Wide Angle',   type: 'Wide',    status: 'standby' },
  { id: 'vc6', label: 'Rear',         type: 'Rear',    status: 'active'  },
]

const TYPE_COLORS: Record<string, string> = {
  RGB:     '#10b981',
  NV:      '#4ade80',
  Thermal: '#f59e0b',
  LiDAR:   '#818cf8',
  Wide:    '#60a5fa',
  Rear:    '#a78bfa',
}

function CameraOverlay({ type }: { type: VehicleCamera['type'] }) {
  if (type === 'NV') return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'rgba(22,163,74,0.12)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(74,222,128,0.04) 3px, rgba(74,222,128,0.04) 6px)',
    }} />
  )
  if (type === 'Thermal') return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'linear-gradient(160deg, rgba(59,130,246,0.1) 0%, rgba(245,158,11,0.1) 50%, rgba(239,68,68,0.14) 100%)',
    }} />
  )
  if (type === 'LiDAR') return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        width: '100%', height: '100%',
        backgroundImage: 'radial-gradient(circle, rgba(129,140,248,0.2) 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(129,140,248,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(129,140,248,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
    </div>
  )
  if (type === 'Wide') return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
    }} />
  )
  return null
}

export default function CameraArray() {
  const [active, setActive]   = useState<string>('vc1')
  const [expanded, setExpanded] = useState<string | null>(null)

  const expandedCam = expanded ? CAMERAS.find((c) => c.id === expanded) : null

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        Multi-Spectrum Camera Array — {CAMERAS.filter((c) => c.status === 'active').length} Active
      </div>

      {/* Horizontal camera strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
        {CAMERAS.map((cam) => {
          const isActive = cam.id === active
          return (
            <div
              key={cam.id}
              onClick={() => { setActive(cam.id); setExpanded(cam.id) }}
              style={{
                position:     'relative',
                background:   '#060405',
                border:       `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--rs)',
                overflow:     'hidden',
                cursor:       'pointer',
                boxShadow:    isActive ? '0 0 10px 2px rgba(196,72,90,0.3)' : 'none',
                transition:   'box-shadow 0.2s, border-color 0.2s',
              }}
            >
              <CameraOverlay type={cam.type} />

              {/* Feed area */}
              <div style={{ height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '18px', opacity: 0.3 }}>📹</span>
              </div>

              {/* Status dot */}
              <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 2 }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%',
                  background: cam.status === 'active' ? '#10b981' : '#6b7280', display: 'inline-block' }} />
              </div>

              {/* Label bar */}
              <div style={{ padding: '4px 5px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.6)', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: TYPE_COLORS[cam.type], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cam.type}
                </div>
                <div style={{ fontSize: '7px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cam.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Currently active indicator */}
      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'var(--text3)' }}>Active:</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>
          {CAMERAS.find((c) => c.id === active)?.label}
        </span>
        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
          background: `${TYPE_COLORS[CAMERAS.find((c) => c.id === active)?.type ?? 'RGB']}22`,
          color: TYPE_COLORS[CAMERAS.find((c) => c.id === active)?.type ?? 'RGB'] }}>
          {CAMERAS.find((c) => c.id === active)?.type}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text3)' }}>Click any feed to expand</span>
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {expanded && expandedCam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setExpanded(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#060405', border: `1px solid ${TYPE_COLORS[expandedCam.type]}`, borderRadius: 'var(--r)', width: '80vw', maxWidth: '900px', overflow: 'hidden',
                boxShadow: `0 0 30px 5px ${TYPE_COLORS[expandedCam.type]}33` }}
            >
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${TYPE_COLORS[expandedCam.type]}44` }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>{expandedCam.label}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '4px',
                  background: `${TYPE_COLORS[expandedCam.type]}22`, color: TYPE_COLORS[expandedCam.type] }}>{expandedCam.type}</span>
                <button onClick={() => setExpanded(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '20px' }}>✕</button>
              </div>
              <div style={{ position: 'relative', height: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <CameraOverlay type={expandedCam.type} />
                <span style={{ fontSize: '52px', opacity: 0.2, position: 'relative', zIndex: 1 }}>📹</span>
                <span style={{ fontSize: '13px', color: 'var(--text3)', position: 'relative', zIndex: 1 }}>{expandedCam.label} — Live Feed</span>
                <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'monospace', position: 'relative', zIndex: 1 }}>1920×1080 · 30fps</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
