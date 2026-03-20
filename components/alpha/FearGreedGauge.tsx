'use client'

import { useStore } from '@/store/useStore'

function fgColor(value: number): string {
  if (value <= 25) return '#ef4444'       // Extreme Fear
  if (value <= 45) return '#f59e0b'       // Fear
  if (value <= 55) return 'var(--text2)'  // Neutral
  if (value <= 75) return '#10b981'       // Greed
  return '#00d97e'                        // Extreme Greed (bright)
}

function fgLabel(value: number): string {
  if (value <= 25) return 'Extreme Fear'
  if (value <= 45) return 'Fear'
  if (value <= 55) return 'Neutral'
  if (value <= 75) return 'Greed'
  return 'Extreme Greed'
}

export default function FearGreedGauge() {
  const fearGreed = useStore((s) => s.fearGreed)

  if (!fearGreed?.current) {
    return (
      <div style={{
        background: 'var(--surf2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '20px', textAlign: 'center',
        color: 'var(--text3)', fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>😐</div>
        Loading Fear & Greed…
      </div>
    )
  }

  const val   = Number(fearGreed.current.value ?? fearGreed.current)
  const col   = fgColor(val)
  const label = fearGreed.current.value_classification ?? fgLabel(val)
  const hist  = fearGreed.history ?? []

  // Show up to 30 days of history as mini bars
  const barData = hist.slice(0, 30).reverse()
  const maxVal  = 100

  return (
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px 18px',
    }}>
      {/* Title */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px',
      }}>
        😱 Fear & Greed Index
      </div>

      {/* Current value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          fontSize: '52px', fontWeight: 900, color: col,
          fontFamily: 'monospace', lineHeight: 1,
        }}>
          {val}
        </span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: col }}>{label}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>out of 100</div>
        </div>
      </div>

      {/* Gauge bar */}
      <div style={{
        position: 'relative', height: '6px', borderRadius: '3px',
        background: 'var(--surf3)', marginBottom: '14px', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '3px',
          background: 'linear-gradient(to right, #ef4444, #f59e0b, var(--text2), #10b981, #00d97e)',
          opacity: 0.45,
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${Math.min(100, Math.max(0, val))}%`,
          width: '10px', height: '10px', borderRadius: '50%',
          background: col, border: '2px solid var(--surf)', boxShadow: `0 0 6px ${col}88`,
        }} />
      </div>

      {/* 30-day sparkline using CSS bars */}
      {barData.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '6px', fontWeight: 700 }}>
            30-DAY HISTORY
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '2px', height: '36px',
          }}>
            {barData.map((entry: any, i: number) => {
              const v   = Number(entry.value ?? entry)
              const pct = Math.max(4, (v / maxVal) * 100)
              const c   = fgColor(v)
              return (
                <div
                  key={i}
                  title={`${v} — ${fgLabel(v)}${entry.timestamp ? ` · ${new Date(entry.timestamp * 1000).toLocaleDateString()}` : ''}`}
                  style={{
                    flex: 1, height: `${pct}%`, borderRadius: '2px 2px 0 0',
                    background: c, opacity: 0.75, minWidth: '2px',
                    transition: 'height .3s',
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
