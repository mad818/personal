'use client'

// app/vehicle/page.tsx — NEXUS PRIME Autonomous Vehicle Command tab
// Multi-spectrum sensor fusion, navigation, and autonomous operations

import CameraArray        from '@/components/vehicle/CameraArray'
import TelemetryPanel     from '@/components/vehicle/TelemetryPanel'
import ControlPanel       from '@/components/vehicle/ControlPanel'
import SensorFusion       from '@/components/vehicle/SensorFusion'
import RadarSweep         from '@/components/vehicle/RadarSweep'
import TelemetryChart     from '@/components/vehicle/TelemetryChart'
import SensorHealthRadial from '@/components/vehicle/SensorHealthRadial'
import PageTransition     from '@/components/ui/PageTransition'

export default function VehiclePage() {
  return (
    <PageTransition>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>

        <div style={{ fontSize: '18px', fontWeight: 900 }}>🚗 AUTONOMOUS VEHICLE COMMAND</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
          Multi-spectrum sensor fusion, navigation, and autonomous operations
        </div>

        {/* Camera feeds + RadarSweep — top row 2-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <CameraArray />
          </div>
          <RadarSweep />
        </div>

        {/* Telemetry Chart — full width */}
        <TelemetryChart />

        {/* Bottom row: Telemetry + Controls + SensorHealthRadial */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'start', marginTop: '16px' }}>

          {/* Telemetry Panel */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <TelemetryPanel />
          </div>

          {/* Control Panel */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <ControlPanel />
          </div>

          {/* Sensor Health Radial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SensorHealthRadial />
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
              <SensorFusion />
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
