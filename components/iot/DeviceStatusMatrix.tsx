'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CHART } from '@/lib/chartTheme'

interface Device {
  id: number
  name: string
  icon: string
  status: 'online' | 'standby' | 'offline'
}

const DEVICE_TEMPLATES = [
  { name: 'Living Light',  icon: '💡' },
  { name: 'Bedroom Light', icon: '💡' },
  { name: 'Kitchen Light', icon: '💡' },
  { name: 'Thermostat',    icon: '🌡️' },
  { name: 'Front Lock',    icon: '🔒' },
  { name: 'Back Lock',     icon: '🔒' },
  { name: 'Cam NW',        icon: '📷' },
  { name: 'Cam NE',        icon: '📷' },
  { name: 'Cam SW',        icon: '📷' },
  { name: 'Cam SE',        icon: '📷' },
  { name: 'Garage Door',   icon: '🚪' },
  { name: 'Smoke Sensor',  icon: '🔥' },
]

function seededStatus(i: number): 'online' | 'standby' | 'offline' {
  const r = ((i * 2654435761) >>> 0) % 100
  if (r < 80) return 'online'
  if (r < 95) return 'standby'
  return 'offline'
}

const STATUS_COLOR = {
  online:  CHART.emerald,
  standby: CHART.amber,
  offline: CHART.red,
}

const STATUS_LABEL = {
  online:  'Online',
  standby: 'Standby',
  offline: 'Offline',
}

export default function DeviceStatusMatrix() {
  const devices: Device[] = useMemo(() =>
    DEVICE_TEMPLATES.map((d, i) => ({ ...d, id: i, status: seededStatus(i) })),
  [])

  const container = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.05 } },
  }
  const item = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  const counts = {
    online:  devices.filter((d) => d.status === 'online').length,
    standby: devices.filter((d) => d.status === 'standby').length,
    offline: devices.filter((d) => d.status === 'offline').length,
  }

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Device Status Matrix
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['online','standby','offline'] as const).map((s) => (
            <span key={s} style={{ fontSize: '10px', color: STATUS_COLOR[s], fontFamily: 'monospace' }}>
              {STATUS_LABEL[s]}: {counts[s]}
            </span>
          ))}
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}
      >
        {devices.map((dev) => (
          <motion.div
            key={dev.id}
            variants={item}
            style={{
              background: CHART.surf2,
              border: `1px solid ${CHART.border}`,
              borderRadius: '8px',
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              position: 'relative',
            }}
          >
            {/* Status dot */}
            <motion.div
              animate={dev.status === 'online' ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: STATUS_COLOR[dev.status],
                boxShadow: `0 0 6px ${STATUS_COLOR[dev.status]}`,
              }}
            />
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{dev.icon}</span>
            <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.3 }}>
              {dev.name}
            </span>
            <span style={{ fontSize: '9px', color: STATUS_COLOR[dev.status], fontFamily: 'monospace' }}>
              {STATUS_LABEL[dev.status]}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
