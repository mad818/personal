'use client'

// CameraGrid.tsx — 2x2 surveillance camera feed grid with RTSP placeholders,
// detection alerts, fullscreen expand, and per-camera controls.

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Camera {
  id: string
  name: string
  status: 'online' | 'offline'
  type: 'Normal' | 'NV' | 'Thermal' | 'LiDAR'
  rtsp: string
  location: string
}

const CAMERAS: Camera[] = [
  { id: 'cam-01', name: 'Front Gate',     status: 'online',  type: 'Normal',  rtsp: 'rtsp://192.168.1.10:554/stream1', location: 'North perimeter' },
  { id: 'cam-02', name: 'Side Entrance',  status: 'online',  type: 'NV',      rtsp: 'rtsp://192.168.1.11:554/stream1', location: 'East wall' },
  { id: 'cam-03', name: 'Rear Compound',  status: 'online',  type: 'Thermal', rtsp: 'rtsp://192.168.1.12:554/stream1', location: 'South perimeter' },
  { id: 'cam-04', name: 'Roof Overwatch', status: 'offline', type: 'LiDAR',   rtsp: 'rtsp://192.168.1.13:554/stream1', location: 'Roof mount' },
]

const TYPE_COLORS: Record<string, string> = {
  Normal:  '#6b7280',
  NV:      '#10b981',
  Thermal: '#f59e0b',
  LiDAR:   '#818cf8',
}

const TYPE_ICONS: Record<string, string> = {
  Normal:  '📷',
  NV:      '🌙',
  Thermal: '🔥',
  LiDAR:   '📡',
}

function CameraOverlay({ type }: { type: Camera['type'] }) {
  if (type === 'NV') return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.07)', borderRadius: 'var(--r)', pointerEvents: 'none',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.04) 2px, rgba(16,185,129,0.04) 4px)' }} />
  )
  if (type === 'Thermal') return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(245,158,11,0.06) 50%, rgba(239,68,68,0.08) 100%)', borderRadius: 'var(--r)', pointerEvents: 'none' }} />
  )
  if (type === 'LiDAR') return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r)', pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', backgroundImage: 'radial-gradient(circle, rgba(129,140,248,0.15) 1px, transparent 1px)', backgroundSize: '12px 12px', opacity: 0.6 }} />
    </div>
  )
  return null
}

export default function CameraGrid() {
  const [alertFlash, setAlertFlash]       = useState<Record<string, boolean>>({})
  const [recording, setRecording]         = useState<Record<string, boolean>>({})
  const [detection, setDetection]         = useState<Record<string, boolean>>({ 'cam-01': true, 'cam-02': true })
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [connected, setConnected]         = useState<Record<string, boolean>>({ 'cam-01': true, 'cam-02': true, 'cam-03': true })

  // Listen for eventBus 'camera:alert' events
  useEffect(() => {
    const handler = (e: CustomEvent<{ cameraId: string }>) => {
      const id = e.detail?.cameraId
      if (!id) return
      setAlertFlash((prev) => ({ ...prev, [id]: true }))
      setTimeout(() => setAlertFlash((prev) => ({ ...prev, [id]: false })), 2000)
    }
    window.addEventListener('camera:alert', handler as EventListener)
    return () => window.removeEventListener('camera:alert', handler as EventListener)
  }, [])

  const toggleRecording = useCallback((id: string) => {
    setRecording((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const toggleDetection = useCallback((id: string) => {
    setDetection((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleConnect = useCallback((id: string) => {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const expandedCamera = expanded ? CAMERAS.find((c) => c.id === expanded) : null

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        Live Surveillance Feeds
      </div>

      {/* 2×2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {CAMERAS.map((cam) => {
          const isOnline    = cam.status === 'online'
          const isConnected = connected[cam.id]
          const isRec       = recording[cam.id]
          const isDet       = detection[cam.id]
          const isFlashing  = alertFlash[cam.id]

          return (
            <motion.div
              key={cam.id}
              animate={{ boxShadow: isFlashing ? '0 0 0 2px #ef4444, 0 0 16px 4px rgba(239,68,68,0.4)' : '0 0 0 1px var(--border)' }}
              transition={{ duration: 0.2 }}
              style={{
                background:    'var(--surf)',
                border:        `1px solid ${isFlashing ? '#ef4444' : 'var(--border)'}`,
                borderRadius:  'var(--r)',
                overflow:      'hidden',
                cursor:        'pointer',
              }}
              onClick={() => isOnline && isConnected && setExpanded(cam.id)}
            >
              {/* Camera header */}
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px' }}>{TYPE_ICONS[cam.type]}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>{cam.name}</span>
                {/* Status dot */}
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#6b7280', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '9px', color: isOnline ? '#10b981' : 'var(--text3)', fontWeight: 700 }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                {/* Type badge */}
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: `${TYPE_COLORS[cam.type]}22`, color: TYPE_COLORS[cam.type] }}>
                  {cam.type}
                </span>
              </div>

              {/* Feed placeholder */}
              <div style={{ position: 'relative', height: '120px', background: '#060405', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CameraOverlay type={cam.type} />
                {isConnected && isOnline ? (
                  <>
                    <span style={{ fontSize: '28px', opacity: 0.3, position: 'relative', zIndex: 1 }}>📹</span>
                    <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace', position: 'relative', zIndex: 1 }}>{cam.rtsp}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text3)', position: 'relative', zIndex: 1 }}>{cam.location}</span>
                    {isRec && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '8px', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}
                      >
                        ● REC
                      </motion.span>
                    )}
                    <span style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '8px', color: 'var(--text3)' }}>
                      {new Date().toLocaleTimeString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '28px', opacity: 0.2 }}>📷</span>
                    <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{isOnline ? 'Not Connected' : 'Camera Offline'}</span>
                  </>
                )}
              </div>

              {/* Bottom toolbar */}
              <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid var(--border)' }}>
                {/* Connect/Disconnect */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleConnect(cam.id) }}
                  style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: isConnected ? 'var(--surf2)' : 'var(--accent)', color: isConnected ? 'var(--text2)' : '#fff' }}
                >
                  {isConnected ? 'DISCONNECT' : 'CONNECT'}
                </button>
                <div style={{ flex: 1 }} />
                {/* Screenshot */}
                <button
                  onClick={(e) => { e.stopPropagation() }}
                  title="Screenshot"
                  style={{ fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', opacity: isConnected ? 1 : 0.3 }}
                >
                  📸
                </button>
                {/* Record */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRecording(cam.id) }}
                  title="Record"
                  style={{ fontSize: '10px', fontWeight: 700, background: isRec ? 'rgba(239,68,68,0.15)' : 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 6px', borderRadius: '4px', color: isRec ? '#ef4444' : 'var(--text3)' }}
                >
                  {isRec ? '⏹' : '⏺'}
                </button>
                {/* Detection */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleDetection(cam.id) }}
                  title="Motion Detection"
                  style={{ fontSize: '9px', fontWeight: 700, background: isDet ? 'rgba(196,72,90,0.15)' : 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 6px', borderRadius: '4px', color: isDet ? 'var(--accent)' : 'var(--text3)' }}
                >
                  AI
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Fullscreen expand modal */}
      <AnimatePresence>
        {expanded && expandedCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}
            onClick={() => setExpanded(null)}
          >
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', width: '80vw', maxWidth: '900px', overflow: 'hidden' }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>{expandedCamera.name}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '4px', background: `${TYPE_COLORS[expandedCamera.type]}22`, color: TYPE_COLORS[expandedCamera.type] }}>{expandedCamera.type}</span>
                <button onClick={() => setExpanded(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '18px' }}>✕</button>
              </div>
              <div style={{ position: 'relative', height: '400px', background: '#060405', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <CameraOverlay type={expandedCamera.type} />
                <span style={{ fontSize: '48px', opacity: 0.2 }}>📹</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'monospace' }}>{expandedCamera.rtsp}</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>RTSP Stream — Full Resolution 1920×1080</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
