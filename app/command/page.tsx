// ── command/page ────────────────────────────────────────────
// COMMAND tab: mission-control dashboard — KPIs, AI briefing, event radar,
// threat heatmap, world events, business intelligence, job-risk analyser.

'use client'

import dynamic from 'next/dynamic'
import { PricesLoader, FearGreedLoader, CVEsLoader, WorldRiskLoader } from '@/components/ui/DataLoader'

const LazyKPICards         = dynamic(() => import('@/components/command/KPICards'),         { ssr: false })
const LazyAIBriefing       = dynamic(() => import('@/components/command/AIBriefing'),       { ssr: false })
const LazyEventRadar       = dynamic(() => import('@/components/command/EventRadar'),       { ssr: false })
const LazyThreatHeatmap    = dynamic(() => import('@/components/command/ThreatHeatmap'),    { ssr: false })
const LazyWorldEventMap    = dynamic(() => import('@/components/command/WorldEventMap'),    { ssr: false })
const LazySystemStatusRing = dynamic(() => import('@/components/command/SystemStatusRing'), { ssr: false })
const LazyBusinessBuilder  = dynamic(() => import('@/components/command/BusinessBuilder'),  { ssr: false })
const LazyJobRiskAnalyzer  = dynamic(() => import('@/components/command/JobRiskAnalyzer'),  { ssr: false })
const LazyFocusPanel       = dynamic(() => import('@/components/command/FocusPanel'),       { ssr: false })
const LazyNetworkHealth    = dynamic(() => import('@/components/command/NetworkHealth'),    { ssr: false })

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background:   'var(--surf)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      padding:      '16px',
      marginBottom: '14px',
    }}>
      {children}
    </div>
  )
}

export default function CommandPage() {
  return (
    <>
      <PricesLoader />
      <FearGreedLoader />
      <CVEsLoader />
      <WorldRiskLoader />

      <div style={{ padding: '18px 16px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Row 1 — KPIs + status ring */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', marginBottom: '14px', alignItems: 'start' }}>
          <Section><LazyKPICards /></Section>
          <Section><LazySystemStatusRing /></Section>
        </div>

        {/* Row 2 — AI briefing + event radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <Section><LazyAIBriefing /></Section>
          <Section><LazyEventRadar /></Section>
        </div>

        {/* Row 3 — Threat heatmap */}
        <Section><LazyThreatHeatmap /></Section>

        {/* Row 4 — World event map */}
        <Section><LazyWorldEventMap /></Section>

        {/* Row 5 — Business builder + job risk */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <Section><LazyBusinessBuilder /></Section>
          <Section><LazyJobRiskAnalyzer /></Section>
        </div>

        {/* Row 6 — Network health + deep focus */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <Section><LazyNetworkHealth /></Section>
          <Section><LazyFocusPanel /></Section>
        </div>

      </div>
    </>
  )
}
