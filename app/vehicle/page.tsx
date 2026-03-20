'use client'

// app/vehicle/page.tsx — NEXUS PRIME Autonomous Vehicle Command tab
// Multi-spectrum sensor fusion, navigation, and autonomous operations

import CameraArray   from '@/components/vehicle/CameraArray'
import TelemetryPanel from '@/components/vehicle/TelemetryPanel'
import ControlPanel  from '@/components/vehicle/ControlPanel'
import SensorFusion  from '@/components/vehicle/SensorFusion'

export default function VehiclePage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>

      <div style={{ fontSize: '18px', fontWeight: 900 }}>🚗 AUTONOMOUS VEHICLE COMMAND</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        Multi-spectrum sensor fusion, navigation, and autonomous operations
      </div>

      {/* Camera feeds — full width top strip */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', marginBottom: '16px' }}>
        <CameraArray />
      </div>

      {/* Telemetry + Controls — 2 column bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Left — Telemetry + Sensor Fusion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <TelemetryPanel />
          </div>
        </div>

        {/* Right — Controls + Sensor Fusion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <ControlPanel />
          </div>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <SensorFusion />
          </div>
        </div>

      </div>
    </div>
  )
}
