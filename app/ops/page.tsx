'use client'

import { useState } from 'react'
import dynamic             from 'next/dynamic'
import ConflictFeed        from '@/components/ops/ConflictFeed'
import MarketRates         from '@/components/ops/MarketRates'
import GeoHeatmap          from '@/components/ops/GeoHeatmap'
import WorldTopicHeatmap   from '@/components/ops/WorldTopicHeatmap'

const OpsMap = dynamic(() => import('@/components/ops/OpsMap'), { ssr: false })

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          width: '100%', background: 'var(--surf2)',
          border: '1px solid var(--border)', borderRadius: open ? '8px 8px 0 0' : '8px',
          padding: '9px 14px', cursor: 'pointer', textAlign: 'left',
          transition: 'border-radius .15s',
        }}
      >
        <span style={{ fontSize: '9px', color: 'var(--text3)', transition: 'transform .15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</span>
      </button>
      {open && (
        <div style={{ padding: '16px', background: 'var(--surf2)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function OpsPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 80px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🌍 GEOPOLITICAL</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        Conflict intelligence · Live earthquake map · FX rates · OSINT
      </div>

      {/* ── Primary: article topic heat grid ── */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Intelligence Signals
        </div>
        <WorldTopicHeatmap />
      </div>

      <div style={{ margin: '24px 0', height: '1px', background: 'var(--border)' }} />

      {/* ── Conflict impact matrix ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Conflict Impact Assessment
        </div>
        <GeoHeatmap />
      </div>

      <div style={{ margin: '24px 0', height: '1px', background: 'var(--border)' }} />

      {/* ── Collapsible raw feeds ── */}
      <CollapsibleSection title="Raw Conflict Feed (GDELT)">
        <ConflictFeed />
      </CollapsibleSection>

      <CollapsibleSection title="FX Rates &amp; Commodities">
        <MarketRates />
      </CollapsibleSection>

      <CollapsibleSection title="Live Map — Quakes · Flights · Fires" defaultOpen={true}>
        <OpsMap />
      </CollapsibleSection>
    </div>
  )
}
