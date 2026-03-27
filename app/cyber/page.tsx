// ── cyber/page ──────────────────────────────────────────────
// CYBER tab: CVEs, OTX threat intel, CISA advisories, attack vectors.

'use client'

import { useState } from 'react'
import CVEFeed             from '@/components/cyber/CVEFeed'
import OTXFeed             from '@/components/cyber/OTXFeed'
import CISAFeed            from '@/components/cyber/CISAFeed'
import CyberHeatmap        from '@/components/cyber/CyberHeatmap'
import CyberArticleHeatmap from '@/components/cyber/CyberArticleHeatmap'
import { CVEsLoader, OTXLoader } from '@/components/ui/DataLoader'

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

export default function CyberPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 80px' }}>
      <CVEsLoader />
      <OTXLoader />

      <div style={{ fontSize: '18px', fontWeight: 900 }}>🔒 CYBER</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        CVE vulnerabilities · CISA KEV catalog · OTX threat pulses · Adversary intelligence
      </div>

      {/* ── Primary: article threat heat grid ── */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Threat Intelligence Signals
        </div>
        <CyberArticleHeatmap />
      </div>

      <div style={{ margin: '24px 0', height: '1px', background: 'var(--border)' }} />

      {/* ── CVE + OTX severity matrix ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          CVE + OTX Severity Matrix
        </div>
        <CyberHeatmap />
      </div>

      <div style={{ margin: '24px 0', height: '1px', background: 'var(--border)' }} />

      {/* ── Collapsible raw feeds ── */}
      <CollapsibleSection title="NVD Vulnerabilities (Raw CVE Feed)">
        <CVEFeed />
      </CollapsibleSection>

      <CollapsibleSection title="AlienVault OTX — Threat Pulses">
        <OTXFeed />
      </CollapsibleSection>

      <CollapsibleSection title="CISA Known Exploited Vulnerabilities (KEV)">
        <CISAFeed />
      </CollapsibleSection>

    </div>
  )
}
