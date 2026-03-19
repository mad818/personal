'use client'

import { useStore } from '@/store/useStore'

import type { CVE } from '@/hooks/useCVEs'

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#818cf8',
  LOW:      '#10b981',
  NONE:     '#6b7280',
}

/** CVSS score bar: 0–10 scale, colour shifts from green → amber → red */
function CVSSBar({ score, severity }: { score: number; severity: string }) {
  const pct = Math.min(100, (score / 10) * 100)
  const col = SEV_COLOR[severity] ?? '#6b7280'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
      <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 700, minWidth: '28px' }}>CVSS</span>
      <div style={{ flex: 1, height: '4px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: col, minWidth: '22px', textAlign: 'right' }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

export default function CVEFeed() {
  const cves       = useStore((s) => s.cves) as CVE[]
  const cvesLoaded = useStore((s) => s.cvesLoaded)

  if (!cves.length && !cvesLoaded) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
      <div>Fetching CVEs from NVD…</div>
      <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text3)' }}>
        Free tier takes ~30–45s. Add an NVD API key in Settings to speed this up.
      </div>
    </div>
  )

  if (!cves.length && cvesLoaded) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
      NVD returned no results — try refreshing. Add an NVD API key in Settings for better rate limits.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {cves.map((c) => (
        <a
          key={c.id}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px 14px', textDecoration: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)' }}>
              {c.id}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px',
              background: `${SEV_COLOR[c.severity] ?? '#6b7280'}22`,
              color: SEV_COLOR[c.severity] ?? 'var(--text3)',
            }}>
              {c.severity} {c.score ? `· ${c.score}` : ''}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
              {c.published ? new Date(c.published).toLocaleDateString() : ''}
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5 }}>
            {c.description?.slice(0, 200)}{(c.description?.length ?? 0) > 200 ? '…' : ''}
          </div>
          {c.score > 0 && <CVSSBar score={c.score} severity={c.severity} />}
        </a>
      ))}
    </div>
  )
}
