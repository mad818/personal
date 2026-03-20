import KPICards         from '@/components/command/KPICards'
import FocusPanel        from '@/components/command/FocusPanel'
import AIBriefing        from '@/components/command/AIBriefing'
import EventRadar        from '@/components/command/EventRadar'
import ThreatHeatmap     from '@/components/command/ThreatHeatmap'
import SystemStatusRing  from '@/components/command/SystemStatusRing'
import { PricesLoader, FearGreedLoader, WorldRiskLoader } from '@/components/ui/DataLoader'

export default function CommandPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <PricesLoader />
      <FearGreedLoader />
      <WorldRiskLoader />
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-.3px' }}>🏠 DASHBOARD</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Live overview — market signals, world risk, alerts, AI briefing
        </div>
      </div>
      <KPICards />

      {/* New visualization row: Threat Heatmap + System Status Ring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <ThreatHeatmap />
        <SystemStatusRing />
      </div>

      <FocusPanel />
      <AIBriefing />
      <EventRadar />
    </div>
  )
}
