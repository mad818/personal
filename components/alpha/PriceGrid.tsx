'use client'

import { useStore } from '@/store/useStore'
import { fmtPrice, fmtVol } from '@/lib/helpers'

// ── SVG sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null
  const W = 80, H = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const color = positive ? '#10b981' : '#ef4444'
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

export default function PriceGrid() {
  const prices     = useStore((s) => s.prices)
  const sparklines = useStore((s) => s.sparklines)
  const entries    = Object.entries(prices)

  if (!entries.length) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      Loading prices…
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
      {entries.map(([id, p]) => (
        <div key={id} style={{
          background: 'var(--surf2)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' }}>
              {p.sym || id.slice(0, 5).toUpperCase()}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px',
              background: p.chg >= 0 ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.12)',
              color: p.chg >= 0 ? 'var(--fhi)' : 'var(--flo)',
            }}>
              {p.chg >= 0 ? '+' : ''}{p.chg?.toFixed(2)}%
            </span>
          </div>

          {/* Price */}
          <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)' }}>
            {fmtPrice(p.price)}
          </div>

          {/* Sparkline */}
          {sparklines[id] && (
            <div style={{ margin: '6px 0 4px' }}>
              <Sparkline data={sparklines[id]} positive={p.chg >= 0} />
            </div>
          )}

          {/* Volume */}
          <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '2px' }}>
            Vol {fmtVol(p.vol)}
          </div>
        </div>
      ))}
    </div>
  )
}
