'use client'

// app/iot/page.tsx — NEXUS PRIME IoT Command Center tab
// Device management, sensor networks, and home automation

import MQTTStatus         from '@/components/iot/MQTTStatus'
import SensorDashboard    from '@/components/iot/SensorDashboard'
import DeviceRegistry     from '@/components/iot/DeviceRegistry'
import AutomationRules    from '@/components/iot/AutomationRules'
import SensorGauges       from '@/components/iot/SensorGauges'
import WeatherTimeline    from '@/components/iot/WeatherTimeline'
import DeviceStatusMatrix from '@/components/iot/DeviceStatusMatrix'

export default function IoTPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>

      <div style={{ fontSize: '18px', fontWeight: 900 }}>📡 IoT COMMAND CENTER</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '16px' }}>
        Device management, sensor networks, and home automation
      </div>

      {/* MQTT status bar — top of page */}
      <MQTTStatus />

      {/* Sensor Gauges — animated SVG semicircles */}
      <SensorGauges />

      {/* Weather Timeline — 24h forecast */}
      <WeatherTimeline />

      {/* Device Status Matrix */}
      <DeviceStatusMatrix />

      {/* Sensor grid — existing */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', marginBottom: '16px', marginTop: '16px' }}>
        <SensorDashboard />
      </div>

      {/* Device list — middle */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', marginBottom: '16px' }}>
        <DeviceRegistry />
      </div>

      {/* Automation rules — bottom */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
        <AutomationRules />
      </div>

    </div>
  )
}
