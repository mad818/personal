'use client'

import { useMemo, useEffect, useRef } from 'react'
import { motion, useSpring, useMotionValue, animate } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/helpers'
import { CHART } from '@/lib/chartTheme'

interface KPICard {
  icon:  string
  label: string
  val:   string
  numVal?: number   // numeric for animated counter
  sub:   string
  cls?:  'up' | 'dn' | 'neutral'
}

// Inline momentum score
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

// Generate 8-point sparkline trending toward a final value
function genSparkline(finalVal: number, range = 0.08): number[] {
  const base = finalVal * (1 - range)
  return Array.from({ length: 8 }, (_, i) => {
    const progress = i / 7
    const noise = (Math.random() - 0.5) * finalVal * (range * 0.5)
    return Math.max(0, base + (finalVal - base) * progress + noise)
  })
}

// Inline SVG Sparkline
function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block', marginTop: '6px' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 2px ${color}88)` }}
      />
      {/* End dot */}
      {(() => {
        const lastPt = pts.split(' ').pop()!
        const [lx, ly] = lastPt.split(',').map(Number)
        return <circle cx={lx} cy={ly} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      })()}
    </svg>
  )
}

// Animated numeric counter
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionVal = useMotionValue(0)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v))
      },
    })
    return controls.stop
  }, [value, motionVal])

  return <span ref={ref} className={className}>0</span>
}

export default function KPICards() {
  const prices      = useStore((s) => s.prices)
  const sparklines  = useStore((s) => s.sparklines)
  const signals     = useStore((s) => s.signals)
  const cves        = useStore((s) => s.cves)
  const worldRisk   = useStore((s) => s.worldRisk)
  const earthquakes = useStore((s) => s.earthquakes)
  const threatIntel = useStore((s) => s.threatIntel)
  const weather     = useStore((s) => s.weather as any)
  const fearGreed   = useStore((s) => s.fearGreed)

  const btc = prices['bitcoin']
  const fg  = signals?.fg

  const buySignals = useMemo(() => {
    return Object.entries(prices).filter(([id, p]) => {
      const score = quickScore(sparklines[id] ?? [], p.chg ?? 0, p.vol ?? 0, p.mcap ?? 1)
      return score >= 60
    }).length
  }, [prices, sparklines])

  const fgVal   = fearGreed?.current?.value != null
    ? Number(fearGreed.current.value)
    : fg?.value ?? null
  const fgLabel = fearGreed?.current?.value_classification
    ?? fg?.label
    ?? 'Market mood'

  const weatherTemp = weather?.current?.temperature_2m
    ?? weather?.current?.temp
    ?? weather?.temp
    ?? null
  const weatherDesc = weather?.current?.weathercode != null
    ? `Code ${weather.current.weathercode}`
    : weather?.description
    ?? weather?.current?.condition?.text
    ?? ''

  const cards: KPICard[] = [
    {
      icon: '🌍', label: 'World Risk',
      val: worldRisk > 0 ? String(worldRisk) : '—',
      numVal: worldRisk > 0 ? worldRisk : undefined,
      sub: worldRisk > 0 ? 'Critical/High events' : 'Open OPS tab',
      cls: worldRisk > 15 ? 'dn' : worldRisk > 5 ? 'neutral' : 'up',
    },
    {
      icon: '📈', label: 'BTC',
      val: btc ? fmtPrice(btc.price) : '—',
      numVal: btc?.price,
      sub: btc ? `${btc.chg >= 0 ? '+' : ''}${btc.chg?.toFixed(2)}% 24h` : 'No data',
      cls: btc ? (btc.chg >= 0 ? 'up' : 'dn') : 'neutral',
    },
    {
      icon: '🎯', label: 'Buy Signals',
      val: Object.keys(prices).length > 0 ? String(buySignals) : '—',
      numVal: Object.keys(prices).length > 0 ? buySignals : undefined,
      sub: buySignals > 0 ? `of ${Object.keys(prices).length} assets` : 'Loading…',
      cls: buySignals >= 7 ? 'up' : buySignals >= 4 ? 'neutral' : 'dn',
    },
    {
      icon: '🔒', label: 'CVE Threats',
      val: cves.length ? String(cves.length) : '—',
      numVal: cves.length || undefined,
      sub: cves.length ? 'Last 30 days' : 'Loading…',
      cls: cves.length > 20 ? 'dn' : cves.length > 10 ? 'neutral' : 'up',
    },
    {
      icon: '🌊', label: 'Seismic Events',
      val: earthquakes.length ? String(earthquakes.length) : '—',
      numVal: earthquakes.length || undefined,
      sub: earthquakes.length ? 'Recent earthquakes' : 'Loading…',
      cls: earthquakes.length > 30 ? 'dn' : earthquakes.length > 10 ? 'neutral' : 'up',
    },
    {
      icon: '🦠', label: 'Active Threats',
      val: threatIntel.threatfox.length ? String(threatIntel.threatfox.length) : '—',
      numVal: threatIntel.threatfox.length || undefined,
      sub: threatIntel.threatfox.length ? 'ThreatFox IOCs' : 'Loading…',
      cls: threatIntel.threatfox.length > 50 ? 'dn' : threatIntel.threatfox.length > 20 ? 'neutral' : 'up',
    },
    ...(weatherTemp != null ? [{
      icon: '🌡️', label: 'Weather',
      val: `${Math.round(weatherTemp)}°`,
      numVal: Math.round(weatherTemp),
      sub: weatherDesc || 'Current conditions',
      cls: 'neutral' as const,
    }] : []),
    {
      icon: '😱', label: 'Fear & Greed',
      val: fgVal != null ? String(fgVal) : '—',
      numVal: fgVal != null ? fgVal : undefined,
      sub: fgLabel,
      cls: fgVal != null ? (fgVal >= 60 ? 'up' : fgVal <= 35 ? 'dn' : 'neutral') : 'neutral',
    },
  ]

  const color = (cls?: string) =>
    cls === 'up' ? CHART.emerald : cls === 'dn' ? CHART.red : CHART.text

  // Sparkline color
  const sparkColor = (cls?: string) =>
    cls === 'up' ? CHART.emerald : cls === 'dn' ? CHART.red : CHART.gold

  // Build sparkline data for each card
  const sparkData = useMemo(() =>
    cards.map((c) => {
      if (c.numVal == null) return []
      // For BTC, use real sparkline from store if available
      if (c.label === 'BTC' && sparklines['bitcoin']?.length > 2) return sparklines['bitcoin'].slice(-8)
      return genSparkline(c.numVal)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [worldRisk, buySignals, cves.length, earthquakes.length, threatIntel.threatfox.length, fgVal, weatherTemp, btc?.price])

  // Spectrum bar
  function FGMeter({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, value))
    const dotCol = value >= 60 ? CHART.emerald : value <= 35 ? CHART.red : CHART.amber
    return (
      <div style={{ position: 'relative', height: '4px', borderRadius: '2px', background: CHART.surf3, marginTop: '6px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '2px',
          background: `linear-gradient(to right, ${CHART.red}, ${CHART.amber}, ${CHART.emerald})`, opacity: 0.4,
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${pct}%`, width: '8px', height: '8px', borderRadius: '50%',
          background: dotCol, border: `1.5px solid ${CHART.surf}`, boxShadow: `0 0 4px ${dotCol}88`,
        }} />
      </div>
    )
  }

  // Risk bar
  function RiskMeter({ value }: { value: number }) {
    const pct = Math.min(100, (value / 30) * 100)
    const col = value > 15 ? CHART.red : value > 5 ? CHART.amber : CHART.emerald
    return (
      <div style={{ height: '4px', borderRadius: '2px', background: CHART.surf3, marginTop: '6px', overflow: 'hidden' }}>
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
      {cards.map((c, idx) => {
        const isCritical = c.cls === 'dn'
        const glowColor  = color(c.cls)
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.4, ease: 'easeOut' }}
            style={{
              background: CHART.surf2,
              border: `1px solid ${isCritical ? CHART.burgundy : CHART.border}`,
              borderRadius: '10px',
              padding: '12px 14px',
              animation: isCritical ? 'nex-glow 2.5s ease-in-out infinite' : 'none',
              // @ts-ignore -- CSS custom property
              '--accent': CHART.rose,
            }}
          >
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{c.icon}</div>
            <div style={{ fontSize: '10px', color: CHART.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: color(c.cls), fontFamily: 'monospace', margin: '2px 0' }}>
              {c.numVal != null ? (
                <AnimatedNumber value={c.numVal} />
              ) : (
                c.val
              )}
            </div>
            <div style={{ fontSize: '10.5px', color: CHART.text3 }}>{c.sub}</div>

            {/* Sparkline */}
            {sparkData[idx] && sparkData[idx].length > 1 && (
              <Sparkline data={sparkData[idx]} color={sparkColor(c.cls)} />
            )}

            {c.label === 'Fear & Greed' && fgVal != null && <FGMeter value={fgVal} />}
            {c.label === 'World Risk' && worldRisk > 0 && <RiskMeter value={worldRisk} />}
          </motion.div>
        )
      })}
    </div>
  )
}
