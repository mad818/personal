'use client'

// TelemetryPanel.tsx — Real-time autonomous vehicle telemetry dashboard:
// speed, heading, GPS, battery, motor status, CPU/GPU temp, AI model, obstacles.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Telemetry {
  speed:          number
  heading:        number
  lat:            number
  lng:            number
  battery:        number
  motorFL:        string
  motorFR:        string
  motorRL:        string
  motorRR:        string
  cpuTemp:        number
  gpuTemp:        number
  aiModel:        string
  inferenceMs:    number
  obstacleCount:  number
  signalStrength: number
}

const INITIAL: Telemetry = {
  speed:          12.4,
  heading:        247,
  lat:            34.05221,
  lng:            -118.24372,
  battery:        82,
  motorFL:        'OK',
  motorFR:        'OK',
  motorRL:        'OK',
  motorRR:        'WARN',
  cpuTemp:        61,
  gpuTemp:        74,
  aiModel:        'YOLOv8-nano',
  inferenceMs:    18,
  obstacleCount:  3,
  signalStrength: 87,
}

function headingToLabel(h: number): string {
  if (h >= 337.5 || h < 22.5)  return 'N'
  if (h < 67.5)  return 'NE'
  if (h < 112.5) return 'E'
  if (h < 157.5) return 'SE'
  if (h < 202.5) return 'S'
  if (h < 247.5) return 'SW'
  if (h < 292.5) return 'W'
  return 'NW'
}

export default function TelemetryPanel() {
  const [t, setT] = useState<Telemetry>(INITIAL)

  useEffect(() => {
    const id = setInterval(() => {
      setT((prev) => ({
        ...prev,
        speed:          Math.max(0, Math.min(30, prev.speed + (Math.random() - 0.5) * 0.8)),
        heading:        (prev.heading + (Math.random() - 0.5) * 2 + 360) % 360,
        lat:            prev.lat + (Math.random() - 0.5) * 0.00002,
        lng:            prev.lng + (Math.random() - 0.5) * 0.00002,
        battery:        Math.max(0, prev.battery - 0.002),
        cpuTemp:        Math.max(40, Math.min(95, prev.cpuTemp + (Math.random() - 0.5) * 0.5)),
        gpuTemp:        Math.max(50, Math.min(95, prev.gpuTemp + (Math.random() - 0.5) * 0.5)),
        inferenceMs:    Math.max(10, Math.min(60, prev.inferenceMs + (Math.random() - 0.5) * 2)),
        obstacleCount:  Math.max(0, Math.min(10, prev.obstacleCount + (Math.random() < 0.1 ? Math.round(Math.random() - 0.4) : 0))),
        signalStrength: Math.max(0, Math.min(100, prev.signalStrength + (Math.random() - 0.5) * 2)),
      }))
    }, 600)
    return () => clearInterval(id)
  }, [])

  const batteryColor = t.battery > 50 ? '#10b981' : t.battery > 20 ? '#f59e0b' : '#ef4444'
  const cpuAlert     = t.cpuTemp > 80
  const gpuAlert     = t.gpuTemp > 80
  const battAlert    = t.battery < 20

  const metrics = [
    { label: 'Speed',      value: `${t.speed.toFixed(1)}`,    unit: 'km/h',   color: 'var(--text)',   icon: '🚗',  alert: false },
    { label: 'Heading',    value: `${Math.round(t.heading)}°`,unit: headingToLabel(t.heading), color: 'var(--accent2)', icon: '🧭', alert: false },
    { label: 'Battery',    value: `${t.battery.toFixed(0)}`,  unit: '%',      color: batteryColor,    icon: '🔋',  alert: battAlert },
    { label: 'Obstacles',  value: `${t.obstacleCount}`,       unit: 'nearby', color: t.obstacleCount > 5 ? '#ef4444' : 'var(--text)', icon: '⚠️', alert: t.obstacleCount > 5 },
    { label: 'CPU Temp',   value: `${t.cpuTemp.toFixed(0)}`,  unit: '°C',     color: cpuAlert ? '#ef4444' : '#10b981', icon: '💻', alert: cpuAlert },
    { label: 'GPU Temp',   value: `${t.gpuTemp.toFixed(0)}`,  unit: '°C',     color: gpuAlert ? '#ef4444' : '#10b981', icon: '🖥️', alert: gpuAlert },
    { label: 'Inference',  value: `${t.inferenceMs.toFixed(0)}`, unit: 'ms',  color: 'var(--accent2)', icon: '🤖', alert: false },
    { label: 'Signal',     value: `${t.signalStrength.toFixed(0)}`, unit: '%',color: t.signalStrength > 60 ? '#10b981' : '#f59e0b', icon: '📡', alert: t.signalStrength < 30 },
  ]

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Vehicle Telemetry
      </div>

      {/* GPS row */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '8px 12px', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px' }}>📍</span>
        <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GPS</span>
        <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent2)' }}>
          {t.lat.toFixed(5)}°N, {Math.abs(t.lng).toFixed(5)}°W
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#10b981', fontWeight: 700 }}>3D FIX</span>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            animate={m.alert ? { boxShadow: ['0 0 0 1px var(--border)', '0 0 6px 2px rgba(239,68,68,0.4)', '0 0 0 1px var(--border)'] } : {}}
            transition={m.alert ? { duration: 1.2, repeat: Infinity } : {}}
            style={{
              background:   'var(--surf2)',
              border:       `1px solid ${m.alert ? '#ef444466' : 'var(--border)'}`,
              borderRadius: 'var(--rs)',
              padding:      '8px 10px',
              textAlign:    'center',
            }}
          >
            <div style={{ fontSize: '14px', marginBottom: '2px' }}>{m.icon}</div>
            <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: m.color, fontFamily: 'monospace', lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: '8px', color: 'var(--text3)', marginTop: '1px' }}>{m.unit}</div>
          </motion.div>
        ))}
      </div>

      {/* Motor status */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '8px 12px', marginBottom: '10px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Motor Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {[
            { label: 'FL', val: t.motorFL }, { label: 'FR', val: t.motorFR },
            { label: 'RL', val: t.motorRL }, { label: 'RR', val: t.motorRR },
          ].map((m) => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--surf)', padding: '4px 8px', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 700 }}>{m.label}</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: m.val === 'OK' ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: m.val === 'OK' ? '#10b981' : '#f59e0b' }}>{m.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI model status */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px' }}>🤖</span>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Model</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent2)', fontFamily: 'monospace' }}>{t.aiModel}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Inference</div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace' }}>{t.inferenceMs.toFixed(0)}<span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 400 }}>ms</span></div>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>RUNNING</span>
        </div>
      </div>
    </div>
  )
}
