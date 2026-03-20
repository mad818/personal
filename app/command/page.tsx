'use client'

import KPICards          from '@/components/command/KPICards'
import FocusPanel         from '@/components/command/FocusPanel'
import AIBriefing         from '@/components/command/AIBriefing'
import EventRadar         from '@/components/command/EventRadar'
import ThreatHeatmap      from '@/components/command/ThreatHeatmap'
import SystemStatusRing   from '@/components/command/SystemStatusRing'
import WorldEventMap      from '@/components/command/WorldEventMap'
import ActivityTimeline   from '@/components/ui/ActivityTimeline'
import { PricesLoader, FearGreedLoader, WorldRiskLoader } from '@/components/ui/DataLoader'
import PageTransition     from '@/components/ui/PageTransition'

export default function CommandPage() {
  return (
    <PageTransition>
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

        {/* World Event Map */}
        <WorldEventMap />

        {/* New visualization row: Threat Heatmap + System Status Ring */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <ThreatHeatmap />
          <SystemStatusRing />
        </div>

        <FocusPanel />
        <AIBriefing />
        <EventRadar />

        {/* Activity Timeline */}
        <ActivityTimeline />
      </div>
    </PageTransition>
  )
}
