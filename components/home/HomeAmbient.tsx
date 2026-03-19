'use client'

import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/helpers'

export default function HomeAmbient() {
  const prices   = useStore((s) => s.prices)
  const signals  = useStore((s) => s.signals)
  const articles = useStore((s) => s.articles)

  const btc = prices['bitcoin']
  const eth = prices['ethereum']
  const fg  = signals?.fg

  const pills = []

  if (btc) pills.push({
    label: '₿ BTC',
    val:   fmtPrice(btc.price),
    chg:   btc.chg,
  })
  if (eth) pills.push({
    label: 'Ξ ETH',
    val:   fmtPrice(eth.price),
    chg:   eth.chg,
  })
  if (fg?.value != null) pills.push({
    label: '😱 F&G',
    val:   String(fg.value),
    sub:   fg.label,
    chg:   fg.value >= 60 ? 1 : fg.value <= 35 ? -1 : 0,
  })

  const headline = articles[0]?.title

  if (!pills.length && !headline) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '16px 0 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center' }}>
        {pills.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 11px', borderRadius: '99px',
            background: 'var(--surf2)', border: '1px solid var(--border)',
            fontSize: '11px', color: 'var(--text2)',
          }}>
            {p.label}&nbsp;
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{p.val}</span>
            {p.chg !== undefined && (
              <span style={{ color: p.chg > 0 ? 'var(--fhi)' : p.chg < 0 ? 'var(--flo)' : 'var(--text3)' }}>
                {p.chg > 0 ? '▲' : p.chg < 0 ? '▼' : '—'}
              </span>
            )}
            {p.sub && <span style={{ color: 'var(--text3)' }}>&nbsp;{p.sub}</span>}
          </div>
        ))}
      </div>
      {headline && (
        <p style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', maxWidth: '380px', fontStyle: 'italic' }}>
          📰 {headline.slice(0, 90)}{headline.length > 90 ? '…' : ''}
        </p>
      )}
    </div>
  )
}
