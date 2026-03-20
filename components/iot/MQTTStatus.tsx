'use client'

// MQTTStatus.tsx — MQTT broker status bar: connection state, messages/sec,
// active topics, connected devices, and animated data-flow indicator.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function MQTTStatus() {
  const [msgPerSec, setMsgPerSec]  = useState(14)
  const [connected, setConnected]  = useState(true)

  // Simulate fluctuating message rate
  useEffect(() => {
    const id = setInterval(() => {
      setMsgPerSec((prev) => Math.max(0, prev + Math.round((Math.random() - 0.5) * 6)))
    }, 1200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      background:   'var(--surf2)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--rs)',
      padding:      '8px 14px',
      display:      'flex',
      alignItems:   'center',
      gap:          '14px',
      flexWrap:     'wrap',
      marginBottom: '14px',
    }}>
      {/* Broker status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <motion.span
          animate={{ opacity: connected ? [1, 0.4, 1] : 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: '7px', height: '7px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }}
        />
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)' }}>MQTT Broker</span>
        <span style={{ fontSize: '9px', color: connected ? '#10b981' : '#ef4444', fontWeight: 700 }}>
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace' }}>
          broker.local:1883
        </span>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Messages/sec */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>msg/s</span>
        <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent2)', fontFamily: 'monospace' }}>{msgPerSec}</span>
        {/* Animated data-flow dots */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}
            />
          ))}
        </div>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Active topics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Topics</span>
        <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace' }}>23</span>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Connected devices */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Devices</span>
        <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace' }}>5</span>
        <span style={{ fontSize: '9px', color: 'var(--text3)' }}>online</span>
      </div>

      {/* Disconnect/reconnect toggle */}
      <button
        onClick={() => setConnected((v) => !v)}
        style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', border: 'none',
          background: connected ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color:      connected ? '#ef4444' : '#10b981',
          cursor:     'pointer' }}
      >
        {connected ? 'DISCONNECT' : 'RECONNECT'}
      </button>
    </div>
  )
}
