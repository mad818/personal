'use client'

// app/security/page.tsx — NEXUS PRIME Security Operations tab
// Physical security monitoring, surveillance, and threat detection

import CameraGrid     from '@/components/security/CameraGrid'
import SecurityAlerts from '@/components/security/SecurityAlerts'
import DronePanel     from '@/components/security/DronePanel'

export default function SecurityPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>

      <div style={{ fontSize: '18px', fontWeight: 900 }}>🛡️ SECURITY OPERATIONS</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        Physical security monitoring, surveillance, and threat detection
      </div>

      {/* 2-column layout: cameras left, alerts + drone right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Left — Camera Grid */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
          <CameraGrid />
        </div>

        {/* Right — Alerts + Drone stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <SecurityAlerts />
          </div>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px' }}>
            <DronePanel />
          </div>
        </div>

      </div>
    </div>
  )
}
