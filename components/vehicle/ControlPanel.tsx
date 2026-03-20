'use client'

// ControlPanel.tsx — Autonomous vehicle mode selector, emergency stop,
// route controls, speed limiter, sensor toggles, and AI override.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type DriveMode = 'Manual' | 'Autonomous' | 'Patrol' | 'Emergency Stop'

const MODE_COLORS: Record<DriveMode, string> = {
  'Manual':         'var(--gold)',
  'Autonomous':     '#818cf8',
  'Patrol':         '#10b981',
  'Emergency Stop': '#ef4444',
}

const SENSOR_TYPES = ['RGB', 'Night Vision', 'Thermal', 'LiDAR', 'Ultrasonic', 'IMU']

export default function ControlPanel() {
  const [mode, setMode]               = useState<DriveMode>('Autonomous')
  const [speedLimit, setSpeedLimit]   = useState(18)
  const [aiOverride, setAiOverride]   = useState<'local' | 'remote'>('local')
  const [sensors, setSensors]         = useState<Record<string, boolean>>(
    Object.fromEntries(SENSOR_TYPES.map((s) => [s, true]))
  )
  const [piConnected, setPiConnected] = useState(true)
  const [eStopActive, setEStopActive] = useState(false)
  const [waypoints, setWaypoints]     = useState(2)

  const handleEStop = () => {
    setEStopActive(true)
    setMode('Emergency Stop')
    setTimeout(() => setEStopActive(false), 3000)
  }

  const handleMode = (m: DriveMode) => {
    if (m === 'Emergency Stop') { handleEStop(); return }
    setMode(m)
  }

  const toggleSensor = (s: string) => {
    setSensors((prev) => ({ ...prev, [s]: !prev[s] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Vehicle Control
      </div>

      {/* Pi connection status */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px' }}>🥧</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)' }}>Raspberry Pi 5</span>
        <motion.span
          animate={{ opacity: piConnected ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: '6px', height: '6px', borderRadius: '50%', background: piConnected ? '#10b981' : '#ef4444', display: 'inline-block', marginLeft: '4px' }}
        />
        <span style={{ fontSize: '9px', color: piConnected ? '#10b981' : '#ef4444', fontWeight: 700 }}>{piConnected ? 'CONNECTED' : 'LOST'}</span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', fontFamily: 'monospace', color: 'var(--text3)' }}>192.168.1.200</span>
        <button
          onClick={() => setPiConnected((v) => !v)}
          style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: piConnected ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            color:      piConnected ? '#ef4444' : '#10b981' }}
        >
          {piConnected ? 'Disconnect' : 'Reconnect'}
        </button>
      </div>

      {/* Drive mode selector */}
      <div>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Drive Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {(['Manual', 'Autonomous', 'Patrol'] as DriveMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleMode(m)}
              style={{
                padding: '8px', borderRadius: 'var(--rs)', cursor: 'pointer', fontWeight: 800, fontSize: '10px',
                background: mode === m ? `${MODE_COLORS[m]}22` : 'var(--surf2)',
                color:      mode === m ? MODE_COLORS[m] : 'var(--text2)',
                border:     mode === m ? `1px solid ${MODE_COLORS[m]}55` : '1px solid var(--border)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* EMERGENCY STOP — dramatic and prominent */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleEStop}
        animate={eStopActive ? {
          boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 12px rgba(239,68,68,0.3)', '0 0 0 0 rgba(239,68,68,0)'],
        } : {}}
        transition={eStopActive ? { duration: 0.6, repeat: 3 } : {}}
        style={{
          width: '100%', padding: '14px', borderRadius: 'var(--r)', cursor: 'pointer',
          background: eStopActive ? '#ef4444' : 'rgba(239,68,68,0.15)',
          color:      '#ef4444',
          fontSize:   '16px', fontWeight: 900, letterSpacing: '2px',
          border:     '2px solid #ef4444',
          textShadow: eStopActive ? '0 0 20px rgba(255,255,255,0.8)' : 'none',
          transition: 'background 0.2s, text-shadow 0.2s',
        }}
      >
        {eStopActive ? '🛑 STOPPED' : '⛔ EMERGENCY STOP'}
      </motion.button>

      {/* Route controls */}
      <div>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Route — {waypoints} Waypoints Active
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setWaypoints((v) => v + 1)}
            style={{ flex: 1, padding: '7px', borderRadius: 'var(--rs)', border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text2)', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}>
            + Waypoint
          </button>
          <button
            onClick={() => setWaypoints(0)}
            style={{ flex: 1, padding: '7px', borderRadius: 'var(--rs)', border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text2)', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}>
            Clear Route
          </button>
          <button
            style={{ flex: 1, padding: '7px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}>
            Return Base
          </button>
        </div>
      </div>

      {/* Speed limiter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speed Limit</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent2)', fontFamily: 'monospace' }}>{speedLimit} <span style={{ fontSize: '9px', fontWeight: 400, color: 'var(--text3)' }}>km/h</span></div>
        </div>
        <input
          type="range" min={0} max={30} value={speedLimit}
          onChange={(e) => setSpeedLimit(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '8px', color: 'var(--text3)' }}>0</span>
          <span style={{ fontSize: '8px', color: 'var(--text3)' }}>30 km/h</span>
        </div>
      </div>

      {/* Sensor toggles */}
      <div>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Sensor Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {SENSOR_TYPES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSensor(s)}
              style={{ padding: '5px 6px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '9px', fontWeight: 700,
                background: sensors[s] ? 'rgba(16,185,129,0.15)' : 'var(--surf2)',
                color:      sensors[s] ? '#10b981' : 'var(--text3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {sensors[s] ? '●' : '○'} {s}
            </button>
          ))}
        </div>
      </div>

      {/* AI Override */}
      <div>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>AI Control Source</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['local', 'remote'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setAiOverride(v)}
              style={{ flex: 1, padding: '7px', borderRadius: 'var(--rs)', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 800,
                background: aiOverride === v ? 'rgba(129,140,248,0.2)' : 'var(--surf2)',
                color:      aiOverride === v ? '#818cf8' : 'var(--text2)' }}
            >
              {v === 'local' ? '🖥️ Local AI' : '☁️ Remote AI'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
