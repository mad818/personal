'use client'

// DronePanel.tsx — Drone command and control panel with MAVLink status,
// ArduPilot telemetry (pitch/roll/yaw), GPS, and flight mode controls.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FlightMode = 'Manual' | 'Auto' | 'RTH' | 'Hover'
type CamFeed    = 'Forward' | 'Downward'

interface DroneTelemetry {
  battery:   number
  altitude:  number
  speed:     number
  lat:       number
  lng:       number
  mode:      FlightMode
  pitch:     number
  roll:      number
  yaw:       number
  gpsFix:    0 | 1 | 2 | 3
  connected: boolean
}

const INITIAL: DroneTelemetry = {
  battery: 78, altitude: 0, speed: 0,
  lat: 34.0522, lng: -118.2437,
  mode: 'Hover', pitch: 1.2, roll: -0.4, yaw: 237,
  gpsFix: 3, connected: true,
}

const GPS_FIX_LABELS = ['No Fix', '1D Fix', '2D Fix', '3D Fix']
const GPS_FIX_COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981']
const MODE_COLORS: Record<FlightMode, string> = {
  Manual: 'var(--gold)',
  Auto:   '#818cf8',
  RTH:    '#10b981',
  Hover:  'var(--accent)',
}

export default function DronePanel() {
  const [telem, setTelem]       = useState<DroneTelemetry>(INITIAL)
  const [camFeed, setCamFeed]   = useState<CamFeed>('Forward')
  const [launched, setLaunched] = useState(false)

  // Simulated telemetry drift
  useEffect(() => {
    if (!launched) return
    const id = setInterval(() => {
      setTelem((prev) => ({
        ...prev,
        altitude: Math.max(0,  prev.altitude + (Math.random() - 0.48) * 0.5),
        speed:    Math.max(0,  prev.speed    + (Math.random() - 0.5)  * 0.3),
        pitch:    Math.max(-15, Math.min(15, prev.pitch + (Math.random() - 0.5) * 0.3)),
        roll:     Math.max(-15, Math.min(15, prev.roll  + (Math.random() - 0.5) * 0.2)),
        yaw:      (prev.yaw + (Math.random() - 0.5) * 1) % 360,
        battery:  Math.max(0, prev.battery - 0.005),
      }))
    }, 800)
    return () => clearInterval(id)
  }, [launched])

  const handleLaunch = () => {
    setLaunched(true)
    setTelem((prev) => ({ ...prev, mode: 'Auto', altitude: 15, speed: 3.2 }))
  }

  const handleRTH = () => {
    setTelem((prev) => ({ ...prev, mode: 'RTH' }))
  }

  const handleHover = () => {
    setTelem((prev) => ({ ...prev, mode: 'Hover', speed: 0 }))
  }

  const handleLand = () => {
    setLaunched(false)
    setTelem((prev) => ({ ...prev, mode: 'Manual', altitude: 0, speed: 0 }))
  }

  const batteryColor = telem.battery > 50 ? '#10b981' : telem.battery > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Drone Command
      </div>

      {/* Status card */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
        {/* Name + MAVLink badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px' }}>🚁</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>NEXUS UAV-1</span>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', marginLeft: 'auto',
            background: telem.connected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color:      telem.connected ? '#10b981' : '#ef4444' }}>
            MAVLink {telem.connected ? '● CONNECTED' : '○ LOST'}
          </span>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
            background: `${MODE_COLORS[telem.mode]}22`, color: MODE_COLORS[telem.mode] }}>
            {telem.mode}
          </span>
        </div>

        {/* Telemetry grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
          {[
            { label: 'Battery',  value: `${telem.battery.toFixed(0)}%`,      color: batteryColor },
            { label: 'Altitude', value: `${telem.altitude.toFixed(1)} m`,    color: 'var(--text)' },
            { label: 'Speed',    value: `${telem.speed.toFixed(1)} m/s`,     color: 'var(--text)' },
            { label: 'Pitch',    value: `${telem.pitch.toFixed(1)}°`,        color: 'var(--accent2)' },
            { label: 'Roll',     value: `${telem.roll.toFixed(1)}°`,         color: 'var(--accent2)' },
            { label: 'Yaw',      value: `${Math.round(telem.yaw)}°`,         color: 'var(--accent2)' },
          ].map((m) => (
            <div key={m.label} style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{m.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Battery bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text3)', marginBottom: '3px' }}>Battery Level</div>
          <div style={{ height: '5px', background: 'var(--surf3)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${telem.battery}%` }} transition={{ duration: 0.4 }}
              style={{ height: '100%', background: batteryColor, borderRadius: '3px' }} />
          </div>
        </div>

        {/* GPS + ArduPilot */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '9px', color: 'var(--text3)' }}>GPS:</span>
          <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', color: GPS_FIX_COLORS[telem.gpsFix] }}>
            {GPS_FIX_LABELS[telem.gpsFix]}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace' }}>
            {telem.lat.toFixed(5)}, {telem.lng.toFixed(5)}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--text3)', background: 'var(--surf)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--border)' }}>
            ArduPilot 4.5
          </span>
        </div>

        {/* Map placeholder */}
        <div style={{ height: '90px', background: '#060405', borderRadius: 'var(--rs)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '10px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(196,72,90,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '8px', color: 'var(--text3)', marginBottom: '4px' }}>GPS POSITION</div>
            <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent2)' }}>
              {telem.lat.toFixed(5)}°N {Math.abs(telem.lng).toFixed(5)}°W
            </div>
            {launched && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.3, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ marginTop: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', margin: '4px auto 0' }}
              />
            )}
          </div>
        </div>

        {/* Camera feed toggle */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {(['Forward', 'Downward'] as CamFeed[]).map((f) => (
            <button key={f} onClick={() => setCamFeed(f)}
              style={{ flex: 1, padding: '5px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', border: 'none',
                background: camFeed === f ? 'var(--accent)' : 'var(--surf)', color: camFeed === f ? '#fff' : 'var(--text2)' }}>
              {f} Cam
            </button>
          ))}
        </div>

        {/* Control buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <button
            onClick={handleLaunch}
            disabled={launched}
            style={{ padding: '7px 4px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: launched ? 'default' : 'pointer', border: 'none',
              background: launched ? 'var(--surf)' : 'var(--accent)', color: launched ? 'var(--text3)' : '#fff', opacity: launched ? 0.4 : 1 }}
          >
            🚀 LAUNCH
          </button>
          <button
            onClick={handleRTH}
            style={{ padding: '7px 4px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', border: 'none',
              background: telem.mode === 'RTH' ? '#10b981' : 'var(--surf2)', color: telem.mode === 'RTH' ? '#fff' : 'var(--text2)' }}
          >
            🏠 RTH
          </button>
          <button
            onClick={handleHover}
            style={{ padding: '7px 4px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', border: 'none',
              background: telem.mode === 'Hover' ? 'rgba(196,72,90,0.25)' : 'var(--surf2)', color: telem.mode === 'Hover' ? 'var(--accent)' : 'var(--text2)' }}
          >
            ✋ HOVER
          </button>
          <button
            onClick={handleLand}
            style={{ padding: '7px 4px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', border: 'none',
              background: 'var(--surf2)', color: 'var(--text2)' }}
          >
            ⬇️ LAND
          </button>
        </div>
      </div>
    </div>
  )
}
