'use client'

// DeviceRegistry.tsx — Table of registered IoT devices with expandable rows,
// status indicators, Add Device modal (UI only), and device management actions.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Protocol = 'MQTT' | 'HTTP' | 'BLE' | 'Zigbee'
type DevStatus = 'Online' | 'Offline' | 'Error'

interface Device {
  id:        string
  name:      string
  type:      string
  protocol:  Protocol
  status:    DevStatus
  ip:        string
  lastSeen:  string
  firmware:  string
  location:  string
  extra:     string
}

const DEVICES: Device[] = [
  { id: 'd1', name: 'ESP32-Sensor-A', type: 'Environmental Sensor', protocol: 'MQTT',   status: 'Online',  ip: '192.168.1.101', lastSeen: '2s ago',    firmware: 'v2.1.4', location: 'Lab Room',      extra: 'Temp: 22.4°C · Humidity: 58%' },
  { id: 'd2', name: 'PiCam-01',       type: 'IP Camera (Pi Zero)',  protocol: 'HTTP',   status: 'Online',  ip: '192.168.1.102', lastSeen: '1s ago',    firmware: 'v3.0.1', location: 'Front Gate',    extra: '1080p · 15fps · H.264' },
  { id: 'd3', name: 'SmartPlug-01',   type: 'Smart Plug',           protocol: 'Zigbee', status: 'Online',  ip: '192.168.1.103', lastSeen: '12s ago',   firmware: 'v1.8.0', location: 'Server Room',   extra: 'Power: 42W · Voltage: 120V' },
  { id: 'd4', name: 'ESP32-Door-B',   type: 'Door/Window Sensor',   protocol: 'MQTT',   status: 'Offline', ip: '192.168.1.104', lastSeen: '4m ago',    firmware: 'v2.0.9', location: 'East Entrance', extra: 'Last state: Closed' },
  { id: 'd5', name: 'PiCam-02',       type: 'IP Camera (Pi 4)',     protocol: 'HTTP',   status: 'Error',   ip: '192.168.1.105', lastSeen: '32s ago',   firmware: 'v3.0.1', location: 'Rear Compound', extra: 'Error: RTSP timeout · Reconnecting…' },
  { id: 'd6', name: 'ESP32-Air-C',    type: 'Air Quality Monitor',  protocol: 'MQTT',   status: 'Online',  ip: '192.168.1.106', lastSeen: '3s ago',    firmware: 'v2.3.0', location: 'Office Area',   extra: 'CO2: 420ppm · VOC: 0.12mg/m³' },
]

const STATUS_COLOR: Record<DevStatus, string> = {
  Online:  '#10b981',
  Offline: '#6b7280',
  Error:   '#f59e0b',
}

const PROTO_COLOR: Record<Protocol, string> = {
  MQTT:   '#818cf8',
  HTTP:   '#10b981',
  BLE:    '#60a5fa',
  Zigbee: '#f472b6',
}

function AddDeviceModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '24px', width: '360px', maxWidth: '90vw' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>Add IoT Device</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '18px' }}>✕</button>
        </div>

        {[
          { label: 'Device Name',  placeholder: 'e.g. ESP32-Sensor-D',     type: 'text' },
          { label: 'Device Type',  placeholder: 'e.g. Temperature Sensor', type: 'text' },
          { label: 'IP Address',   placeholder: '192.168.1.x',             type: 'text' },
          { label: 'Location',     placeholder: 'e.g. Server Room',        type: 'text' },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{field.label}</div>
            <input
              type={field.type}
              placeholder={field.placeholder}
              style={{ width: '100%', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '7px 10px', fontSize: '12px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Protocol</div>
          <select style={{ width: '100%', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '7px 10px', fontSize: '12px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }}>
            <option>MQTT</option><option>HTTP</option><option>BLE</option><option>Zigbee</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 'var(--rs)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            Cancel
          </button>
          <button onClick={onClose} style={{ flex: 2, padding: '8px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
            Register Device
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DeviceRegistry() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd]   = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Device Registry — {DEVICES.length} Registered
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--rs)', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
        >
          + Add Device
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {DEVICES.map((dev) => {
          const isExp = expanded === dev.id
          return (
            <div key={dev.id}
              style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', overflow: 'hidden' }}>
              {/* Main row */}
              <div
                onClick={() => setExpanded(isExp ? null : dev.id)}
                style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                {/* Status dot */}
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[dev.status], flexShrink: 0, display: 'inline-block' }} />

                {/* Name + type */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{dev.name}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{dev.type}</div>
                </div>

                {/* Protocol badge */}
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                  background: `${PROTO_COLOR[dev.protocol]}22`, color: PROTO_COLOR[dev.protocol] }}>
                  {dev.protocol}
                </span>

                {/* Status text */}
                <span style={{ fontSize: '9px', fontWeight: 700, color: STATUS_COLOR[dev.status] }}>{dev.status}</span>

                {/* IP */}
                <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace', display: 'none' }}>{dev.ip}</span>

                {/* Last seen */}
                <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text3)' }}>{dev.lastSeen}</span>

                {/* Expand chevron */}
                <span style={{ fontSize: '10px', color: 'var(--text3)', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
                  >
                    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'IP Address', value: dev.ip },
                        { label: 'Firmware',   value: dev.firmware },
                        { label: 'Location',   value: dev.location },
                      ].map((m) => (
                        <div key={m.label}>
                          <div style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{m.label}</div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)', background: 'var(--surf3)', margin: '0 12px 10px', borderRadius: 'var(--rs)', padding: '7px 10px' }}>
                      {dev.extra}
                    </div>
                    <div style={{ padding: '0 12px 10px', display: 'flex', gap: '6px' }}>
                      <button style={{ fontSize: '9px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', border: 'none',
                        background: 'var(--surf)', color: 'var(--text2)', cursor: 'pointer', borderColor: 'var(--border)' }}>
                        Configure
                      </button>
                      <button style={{ fontSize: '9px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', border: 'none',
                        background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
