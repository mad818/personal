'use client'

import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/helpers'

interface KPICard {
  icon:  string
  label: string
  val:   string
  sub:   string
  cls?:  'up' | 'dn' | 'neutral'
}

// Inline momentum score — same formula as MomentumScanner, no extra imports needed
function quickScore(spark: number[], chg24h: number, vol: number, mcap: number): number {
  if (!spark || spark.length < 2) return 50
  const n = spark.length
  const mean_x = (n - 1) / 2
  const mean_y = spark.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (i - mean_x) * (spark[i] - mean_y); den += (i - mean_x) ** 2 }
  const slope = den !== 0 ? num / den : 0
  const range = Math.max(...spark) - Math.min(...spark) || 1
  const trendScore = Math.min(35, Math.max(0, (slope / (range / n) + 1) * 17.5))
  const pctMove    = ((spark[n - 1] - spark[0]) / spark[0]) * 100
  const velScore   = ((Math.max(-40, Math.min(40, pctMove)) + 40) / 80) * 25
  const chgScore   = ((Math.max(-10, Math.min(10, chg24h)) + 10) / 20) * 25
  const volScore   = Math.min(15, ((mcap > 0 ? vol / mcap : 0) / 0.08) * 15)
  return Math.round(trendScore + velScore + chgScore + volScore)
}

export default function KPICards() {
  const prices     = useStore((s) => s.prices)
  const sparklines = useStore((s) => s.sparklines)
  const signals    = useStore((s) => s.signals)
  const cves       = useStore((s) => s.cves)
  const worldRisk  = useStore((s) => s.worldRisk)

  const btc = prices['bitcoin']
  const fg  = signals?.fg

  // Count assets with momentum score ≥ 60 (BUY or STRONG BUY)
  const buySignals = useMemo(() => {
    return Object.entries(prices).filter(([id, p]) => {
      const score = quickScore(sparklines[id] ?? [], p.chg ?? 0, p.vol ?? 0, p.mcap ?? 1)
      return score >= 60
    }).length
  }, [prices, sparklines])

  const cards: KPICard[] = [
    {
      icon: '🌍', label: 'World Risk',
      val: worldRisk > 0 ? String(worldRisk) : '—',
      sub: worldRisk > 0 ? 'Critical/High events' : 'Open OPS tab',
      cls: worldRisk > 15 ? 'dn' : worldRisk > 5 ? 'neutral' : 'up',
    },
    {
      icon: '📈', label: 'BTC',
      val: btc ? fmtPrice(btc.price) : '—',
      sub: btc ? `${btc.chg >= 0 ? '+' : ''}${btc.chg?.toFixed(2)}% 24h` : 'No data',
      cls: btc ? (btc.chg >= 0 ? 'up' : 'dn') : 'neutral',
    },
    {
      icon: '🎯', label: 'Buy Signals',
      val: Object.keys(prices).length > 0 ? String(buySignals) : '—',
      sub: buySignals > 0 ? `of ${Object.keys(prices).length} assets` : 'Loading…',
      cls: buySignals >= 7 ? 'up' : buySignals >= 4 ? 'neutral' : 'dn',
    },
    {
      icon: '🔒', label: 'CVE Threats',
      val: cves.length ? String(cves.length) : '—',
      sub: cves.length ? 'Last 30 days' : 'Loading…',
      cls: cves.length > 20 ? 'dn' : cves.length > 10 ? 'neutral' : 'up',
    },
    {
      icon: '🔔', label: 'Alerts',
      val: '—', sub: 'No alerts',
    },
    {
      icon: '😱', label: 'Fear & Greed',
      val: fg?.value != null ? String(fg.value) : '—',
      sub: fg?.label ?? 'Market mood',
      cls: fg?.value != null ? (fg.value >= 60 ? 'up' : fg.value <= 35 ? 'dn' : 'neutral') : 'neutral',
    },
  ]

  const color = (cls?: string) =>
    cls === 'up' ? 'var(--fhi)' : cls === 'dn' ? 'var(--flo)' : 'var(--text)'

  // Spectrum bar: dot on a gradient track, used for Fear & Greed (0-100)
  function FGMeter({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, value))
    const dotCol = value >= 60 ? '#10b981' : value <= 35 ? '#ef4444' : '#f59e0b'
    return (
      <div style={{ position: 'relative', height: '4px', borderRadius: '2px', background: 'var(--surf3)', marginTop: '6px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '2px',
          background: 'linear-gradient(to right, #ef4444, #f59e0b, #10b981)', opacity: 0.4,
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${pct}%`, width: '8px', height: '8px', borderRadius: '50%',
          background: dotCol, border: '1.5px solid var(--surf)', boxShadow: `0 0 4px ${dotCol}88`,
        }} />
      </div>
    )
  }

  // Threat bar: simple fill for World Risk (0 = safe, 30+ = saturated)
  function RiskMeter({ value }: { value: number }) {
    const pct = Math.min(100, (value / 30) * 100)
    const col = value > 15 ? '#ef4444' : value > 5 ? '#f59e0b' : '#10b981'
    return (
      <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surf3)', marginTop: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width .4s' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '10px',
      marginBottom: '14px',
    }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: 'var(--surf2)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <div style={{ fontSize: '18px', marginBottom: '4px' }}>{c.icon}</div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{c.label}</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: color(c.cls), fontFamily: 'monospace', margin: '2px 0' }}>{c.val}</div>
          <div style={{ fontSize: '10.5px', color: 'var(--text3)' }}>{c.sub}</div>
          {c.label === 'Fear & Greed' && fg?.value != null && <FGMeter value={fg.value} />}
          {c.label === 'World Risk' && worldRisk > 0 && <RiskMeter value={worldRisk} />}
        </div>
      ))}
    </div>
  )
}
