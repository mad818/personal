// ── recon/page ──────────────────────────────────────────────
// RECON tab: privacy-first OSINT toolkit + local OPSEC check panel.

'use client'

import dynamic from 'next/dynamic'

const LazyReconLookup = dynamic(() => import('@/components/recon/ReconLookup'), { ssr: false })
const LazyOpsecPanel  = dynamic(() => import('@/components/recon/OpsecPanel'),  { ssr: false })

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
      {title && (
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

export default function ReconPage() {
  return (
    <div style={{ padding: '18px 16px', maxWidth: '1300px', margin: '0 auto' }}>

      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', margin: 0 }}>🕵️ RECON</h1>
        <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '4px 0 0' }}>
          OSINT toolkit — domain, IP, email, hash, and URL intelligence. Free by default.
        </p>
      </div>

      <Card title="OSINT Lookup">
        <LazyReconLookup />
      </Card>

      <Card title="Local OPSEC Analysis">
        <LazyOpsecPanel />
      </Card>

    </div>
  )
}
