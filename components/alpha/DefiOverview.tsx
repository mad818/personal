'use client'

import { useStore } from '@/store/useStore'

function fmtTvl(value: number): string {
  if (!value || isNaN(value)) return '—'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function chgColor(chg: number): string {
  if (chg > 0) return 'var(--fhi)'
  if (chg < 0) return 'var(--flo)'
  return 'var(--text3)'
}

export default function DefiOverview() {
  const protocols = useStore((s) => s.defiData.protocols)

  if (!protocols.length) {
    return (
      <div style={{
        background: 'var(--surf2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '20px', textAlign: 'center',
        color: 'var(--text3)', fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🏦</div>
        Loading DeFi data…
      </div>
    )
  }

  const top10 = protocols.slice(0, 10)

  return (
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px',
      }}>
        🏦 DeFi — Top Protocols by TVL
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr 90px 60px 60px',
        gap: '8px', padding: '0 2px 6px',
        fontSize: '9.5px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.4px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '6px',
      }}>
        <span>#</span>
        <span>Protocol</span>
        <span style={{ textAlign: 'right' }}>TVL</span>
        <span style={{ textAlign: 'right' }}>1d %</span>
        <span style={{ textAlign: 'right' }}>Chain</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {top10.map((p: any, i: number) => {
          const tvl    = p.tvl ?? p.totalValueLocked ?? 0
          const chg1d  = p.change_1d ?? p.change1d ?? p.changePercentDay ?? 0
          const chain  = p.chain ?? p.chains?.[0] ?? '—'
          const name   = p.name ?? p.slug ?? '—'

          return (
            <div key={p.slug ?? p.name ?? i} style={{
              display: 'grid',
              gridTemplateColumns: '16px 1fr 90px 60px 60px',
              gap: '8px', alignItems: 'center',
              padding: '7px 2px',
              borderBottom: i < top10.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>
                {i + 1}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                {p.logo && (
                  <img
                    src={p.logo}
                    alt=""
                    style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <span style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {name}
                </span>
              </div>
              <span style={{
                fontSize: '11.5px', fontWeight: 700, color: 'var(--text)',
                fontFamily: 'monospace', textAlign: 'right',
              }}>
                {fmtTvl(tvl)}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 700, fontFamily: 'monospace',
                color: chgColor(chg1d), textAlign: 'right',
              }}>
                {chg1d != null ? `${chg1d >= 0 ? '+' : ''}${Number(chg1d).toFixed(1)}%` : '—'}
              </span>
              <span style={{
                fontSize: '9.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                background: 'var(--surf3)', color: 'var(--text3)',
                textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chain}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
