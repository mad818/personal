'use client'

// SensorFusion.tsx — Multi-sensor fusion status panel showing active sensors,
// object detection summary, confidence score, and processing pipeline latencies.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SensorStatus {
  name:    string
  active:  boolean
  latency: number
  icon:    string
}

interface PipelineStage {
  name:    string
  latency: number
  ok:      boolean
}

const INITIAL_SENSORS: SensorStatus[] = [
  { name: 'RGB',        active: true,  latency: 8,  icon: '📷' },
  { name: 'NV',         active: true,  latency: 9,  icon: '🌙' },
  { name: 'Thermal',    active: true,  latency: 12, icon: '🔥' },
  { name: 'LiDAR',      active: true,  latency: 14, icon: '📡' },
  { name: 'Ultrasonic', active: true,  latency: 5,  icon: '🔊' },
  { name: 'IMU',        active: true,  latency: 2,  icon: '⚖️' },
  { name: 'GPS',        active: true,  latency: 50, icon: '🛰️' },
]

const INITIAL_PIPELINE: PipelineStage[] = [
  { name: 'Input',          latency: 3,  ok: true },
  { name: 'Detection',      latency: 18, ok: true },
  { name: 'Classification', latency: 12, ok: true },
  { name: 'Tracking',       latency: 7,  ok: true },
  { name: 'Decision',       latency: 4,  ok: true },
]

export default function SensorFusion() {
  const [sensors, setSensors]   = useState<SensorStatus[]>(INITIAL_SENSORS)
  const [pipeline, setPipeline] = useState<PipelineStage[]>(INITIAL_PIPELINE)
  const [confidence, setConf]   = useState(91.4)
  const [objects, setObjects]   = useState({ people: 3, vehicles: 2, obstacles: 1 })

  // Simulate latency drift
  useEffect(() => {
    const id = setInterval(() => {
      setSensors((prev) => prev.map((s) => ({
        ...s,
        latency: Math.max(1, s.latency + Math.round((Math.random() - 0.5) * 2)),
      })))
      setPipeline((prev) => prev.map((p) => ({
        ...p,
        latency: Math.max(1, p.latency + Math.round((Math.random() - 0.5) * 2)),
      })))
      setConf((prev) => Math.max(70, Math.min(99, prev + (Math.random() - 0.5) * 0.8)))
      if (Math.random() < 0.05) {
        setObjects((prev) => ({
          people:    Math.max(0, prev.people    + (Math.random() < 0.5 ? 1 : -1)),
          vehicles:  Math.max(0, prev.vehicles  + (Math.random() < 0.5 ? 1 : -1)),
          obstacles: Math.max(0, prev.obstacles + (Math.random() < 0.5 ? 1 : -1)),
        }))
      }
    }, 900)
    return () => clearInterval(id)
  }, [])

  const activeSensors   = sensors.filter((s) => s.active).length
  const totalLatency    = pipeline.reduce((a, p) => a + p.latency, 0)
  const confColor       = confidence > 85 ? '#10b981' : confidence > 70 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Sensor Fusion
      </div>

      {/* Sensor list */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Active Sensors — {activeSensors}/{sensors.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sensors.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', width: '16px' }}>{s.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text)', width: '80px' }}>{s.name}</span>
              <span style={{ fontSize: '11px', color: s.active ? '#10b981' : '#6b7280', fontWeight: 700 }}>
                {s.active ? '✅' : '❌'}
              </span>
              {s.active && (
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text3)', marginLeft: 'auto' }}>
                  {s.latency}ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Object detection summary */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Object Detection</div>
        <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{objects.people}</span> people detected ·{' '}
          <span style={{ fontWeight: 800, color: 'var(--accent2)' }}>{objects.vehicles}</span> vehicles ·{' '}
          <span style={{ fontWeight: 800, color: '#f59e0b' }}>{objects.obstacles}</span> obstacle{objects.obstacles !== 1 ? 's' : ''}
        </div>
        {/* Fusion confidence */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fusion Confidence</span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: confColor, fontFamily: 'monospace' }}>{confidence.toFixed(1)}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.4 }}
              style={{ height: '100%', background: confColor, borderRadius: '2px' }}
            />
          </div>
        </div>
      </div>

      {/* Processing pipeline */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Processing Pipeline</div>
          <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent2)' }}>{totalLatency}ms total</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          {pipeline.map((stage, i) => (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div style={{
                background:   stage.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border:       `1px solid ${stage.ok ? '#10b98133' : '#ef444433'}`,
                borderRadius: '5px', padding: '5px 8px', textAlign: 'center', minWidth: '68px',
              }}>
                <div style={{ fontSize: '8px', color: stage.ok ? '#10b981' : '#ef4444', fontWeight: 700 }}>{stage.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace' }}>{stage.latency}ms</div>
              </div>
              {i < pipeline.length - 1 && (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  style={{ fontSize: '12px', color: 'var(--accent)', flexShrink: 0 }}
                >
                  →
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
