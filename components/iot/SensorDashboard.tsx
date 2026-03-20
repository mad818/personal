'use client'

// SensorDashboard.tsx — Grid of IoT sensor cards with live-updating demo values,
// threshold pulse glow animations, sparkline placeholders, and min/max ranges.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Sensor {
  id:        string
  name:      string
  icon:      string
  unit:      string
  value:     number
  min:       number
  max:       number
  threshold: number
  location:  string
  color:     string
}

const INITIAL_SENSORS: Sensor[] = [
  { id: 's1', name: 'Temperature',  icon: '🌡️', unit: '°C',  value: 22.4, min: 15,   max: 45,    threshold: 40,   location: 'Server Room',    color: '#f59e0b' },
  { id: 's2', name: 'Humidity',     icon: '💧', unit: '%',   value: 58.2, min: 30,   max: 90,    threshold: 80,   location: 'Main Lab',       color: '#818cf8' },
  { id: 's3', name: 'Motion',       icon: '🚶', unit: 'det', value: 0,    min: 0,    max: 1,     threshold: 1,    location: 'Hallway B',      color: '#c4485a' },
  { id: 's4', name: 'Door Sensor',  icon: '🚪', unit: '',    value: 0,    min: 0,    max: 1,     threshold: 1,    location: 'East Entrance',  color: '#d4956a' },
  { id: 's5', name: 'Smoke',        icon: '🔥', unit: 'ppm', value: 4.2,  min: 0,    max: 200,   threshold: 50,   location: 'Kitchen',        color: '#ef4444' },
  { id: 's6', name: 'Light Level',  icon: '💡', unit: 'lux', value: 420,  min: 0,    max: 2000,  threshold: 1800, location: 'Greenhouse',     color: '#fbbf24' },
  { id: 's7', name: 'Air Quality',  icon: '🌬️', unit: 'ppm', value: 420,  min: 300,  max: 2000,  threshold: 1000, location: 'Office Area',    color: '#10b981' },
  { id: 's8', name: 'Pressure',     icon: '📊', unit: 'hPa', value: 1013, min: 950,  max: 1100,  threshold: 1080, location: 'Weather Station',color: '#6875a0' },
]

function SparklinePlaceholder({ color }: { color: string }) {
  // Simple SVG sparkline placeholder
  const points = Array.from({ length: 12 }, (_, i) => {
    const x = (i / 11) * 80
    const y = 12 - Math.sin(i * 0.8 + Math.random() * 0.5) * 5 - Math.random() * 3
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </svg>
  )
}

export default function SensorDashboard() {
  const [sensors, setSensors] = useState<Sensor[]>(INITIAL_SENSORS)

  // Simulate sensor value updates
  useEffect(() => {
    const id = setInterval(() => {
      setSensors((prev) => prev.map((s) => {
        if (s.unit === 'det' || s.unit === '') {
          // Binary sensors — occasional flip
          return Math.random() < 0.02 ? { ...s, value: s.value === 0 ? 1 : 0 } : s
        }
        const delta = (Math.random() - 0.5) * (s.max - s.min) * 0.01
        const next  = Math.max(s.min, Math.min(s.max, s.value + delta))
        return { ...s, value: next }
      }))
    }, 1200)
    return () => clearInterval(id)
  }, [])

  const formatValue = (s: Sensor) => {
    if (s.unit === 'det')  return s.value >= 1 ? 'DETECTED' : 'CLEAR'
    if (s.unit === '')     return s.value >= 1 ? 'OPEN' : 'CLOSED'
    if (Number.isInteger(s.value) || Math.abs(s.value) >= 100) return s.value.toFixed(0)
    return s.value.toFixed(1)
  }

  const isAlert = (s: Sensor) => s.value >= s.threshold

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Sensor Network — {sensors.length} Devices
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {sensors.map((s) => {
          const alert    = isAlert(s)
          const pct      = Math.max(0, Math.min(100, ((s.value - s.min) / (s.max - s.min)) * 100))
          const boolVal  = s.unit === 'det' || s.unit === ''

          return (
            <motion.div
              key={s.id}
              animate={alert ? {
                boxShadow: ['0 0 0 1px var(--border)', `0 0 8px 2px ${s.color}66`, '0 0 0 1px var(--border)'],
              } : { boxShadow: '0 0 0 1px var(--border)' }}
              transition={alert ? { duration: 1.5, repeat: Infinity } : {}}
              style={{
                background:   'var(--surf2)',
                border:       `1px solid ${alert ? s.color : 'var(--border)'}`,
                borderRadius: 'var(--r)',
                padding:      '12px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>{s.name}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text3)' }}>{s.location}</div>
                </div>
                {alert && (
                  <span style={{ marginLeft: 'auto', fontSize: '8px', fontWeight: 700, color: s.color, background: `${s.color}22`, padding: '1px 5px', borderRadius: '3px' }}>
                    ALERT
                  </span>
                )}
              </div>

              {/* Value */}
              <div style={{ fontSize: boolVal ? '16px' : '24px', fontWeight: 900, color: alert ? s.color : 'var(--text)', marginBottom: '4px', fontFamily: 'monospace' }}>
                {formatValue(s)}{!boolVal && <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text2)', marginLeft: '3px' }}>{s.unit}</span>}
              </div>

              {/* Sparkline */}
              {!boolVal && (
                <div style={{ marginBottom: '6px' }}>
                  <SparklinePlaceholder color={s.color} />
                </div>
              )}

              {/* Range bar */}
              {!boolVal && (
                <div>
                  <div style={{ height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '8px', color: 'var(--text3)' }}>min {s.min}{s.unit}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text3)' }}>max {s.max}{s.unit}</span>
                  </div>
                </div>
              )}

              {/* Last updated */}
              <div style={{ marginTop: '4px', fontSize: '8px', color: 'var(--text3)' }}>
                Updated {new Date().toLocaleTimeString()}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
