'use client'

import { useStore } from '@/store/useStore'

interface Props {
  onOpenTab: (tab: string) => void
}

function relTime(ts: number): string {
  const d = Date.now() - ts
  const min = Math.floor(d / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function ModeBriefingPanel({ onOpenTab }: Props) {
  const briefings = useStore((s) => s.modeBriefings.slice(0, 4))

  return (
    <div
      style={{
        background: 'rgba(10,15,30,0.9)',
        border: '1px solid #1A2040',
        borderRadius: 10,
        padding: '8px 10px',
        width: 'min(440px, 48vw)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: '#00DDFF' }}>
          MODE BRIEFINGS
        </span>
      </div>

      {briefings.length === 0 ? (
        <div style={{ fontSize: 10, color: '#6875a0' }}>No mode outputs yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
          {briefings.map((b) => (
            <div
              key={b.id}
              style={{
                border: '1px solid #1A2040',
                borderRadius: 8,
                padding: '6px 8px',
                background: '#080d18',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ccd6f6' }}>{b.jobName}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    color: b.status === 'ok' ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                  }}
                >
                  {b.status === 'ok' ? 'OK' : 'ERROR'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#8892b0', marginTop: 2, lineHeight: 1.35 }}>{b.summary}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: '#6875a0' }}>
                  {String(b.mode).toUpperCase()} · {relTime(b.createdAt)}
                </span>
                <button
                  onClick={() => onOpenTab(b.relatedTab)}
                  style={{
                    marginLeft: 'auto',
                    borderRadius: 999,
                    border: '1px solid #00DDFF55',
                    background: 'rgba(0,221,255,0.1)',
                    color: '#00DDFF',
                    padding: '2px 8px',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Open {String(b.relatedTab).toUpperCase()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

