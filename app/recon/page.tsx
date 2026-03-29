// ── recon/page ──────────────────────────────────────────────
// RECON tab: full OSINT suite — lookups, HTTP audit, metadata, OPSEC.

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const LazyReconLookup      = dynamic(() => import('@/components/recon/ReconLookup'),      { ssr: false })
const LazyOpsecPanel       = dynamic(() => import('@/components/recon/OpsecPanel'),       { ssr: false })
const LazyHeadersAudit     = dynamic(() => import('@/components/recon/HeadersAudit'),     { ssr: false })
const LazyMetadataExtractor = dynamic(() => import('@/components/recon/MetadataExtractor'), { ssr: false })

type View = 'osint' | 'headers' | 'metadata' | 'opsec'

const VIEWS: { id: View; label: string; tip: string }[] = [
  { id: 'osint',    label: '🔍 OSINT Lookup',     tip: 'Domain · IP · Email · Username · Hash' },
  { id: 'headers',  label: '🛡 HTTP Headers',     tip: 'Security header audit' },
  { id: 'metadata', label: '📎 Metadata',         tip: 'EXIF extraction — local only' },
  { id: 'opsec',    label: '🔒 OPSEC Check',      tip: 'WebRTC · fingerprint · HTTPS' },
]

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
      {children}
    </div>
  )
}

export default function ReconPage() {
  const [view, setView] = useState<View>('osint')

  return (
    <div style={{ padding: '18px 16px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', margin: 0 }}>🕵️ RECON</h1>
        <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '4px 0 0' }}>
          Privacy-first OSINT suite. Free by default — no data leaves your browser except lookup targets you enter.
        </p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            title={v.tip}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '12px', fontWeight: 700,
              background: view === v.id ? 'var(--accent)' : 'var(--surf2)',
              color:      view === v.id ? '#fff' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <Card>
        {view === 'osint'    && <LazyReconLookup />}
        {view === 'headers'  && <LazyHeadersAudit />}
        {view === 'metadata' && <LazyMetadataExtractor />}
        {view === 'opsec'    && <LazyOpsecPanel />}
      </Card>

    </div>
  )
}
