'use client'

import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { fmtPrice, fmtPct } from '@/lib/helpers'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Signal {
  id:      string
  sym:     string
  price:   number
  chg24h:  number
  score:   number
  label:   'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'
  trend:   number   // % 7-day move
  vol:     number
  mcap:    number
}

// ── Score label ───────────────────────────────────────────────────────────────
function toLabel(score: number): Signal['label'] {
  if (score >= 80) return 'STRONG BUY'
  if (score >= 60) return 'BUY'
  if (score >= 40) return 'NEUTRAL'
  if (score >= 20) return 'SELL'
  return 'STRONG SELL'
}

const LABEL_COLOR: Record<Signal['label'], string> = {
  'STRONG BUY':  '#10b981',
  'BUY':         '#34d399',
  'NEUTRAL':     '#818cf8',
  'SELL':        '#f59e0b',
  'STRONG SELL': '#ef4444',
}

// ── Momentum scoring ──────────────────────────────────────────────────────────
/**
 * Score: 0–100 from four components.
 *
 * 1. Trend strength (35pts) — linear regression slope of 7-day sparkline.
 *    Positive slope + tight range = higher score.
 *
 * 2. Velocity (25pts) — % move from day[0] to day[6].
 *    Capped at ±40% mapped to 0–25.
 *
 * 3. 24h momentum (25pts) — signed % change today.
 *    +10% → 25pts, -10% → 0pts, linear between.
 *
 * 4. Volume confirmation (15pts) — vol/mcap ratio.
 *    Higher relative volume → confirms the move.
 */
function computeScore(
  sparkline: number[],
  chg24h: number,
  vol: number,
  mcap: number,
): number {
  if (!sparkline || sparkline.length < 2) return 50

  const n = sparkline.length

  // 1. Linear regression slope
  const mean_x = (n - 1) / 2
  const mean_y = sparkline.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - mean_x) * (sparkline[i] - mean_y)
    den += (i - mean_x) ** 2
  }
  const slope     = den !== 0 ? num / den : 0
  const priceRange = Math.max(...sparkline) - Math.min(...sparkline) || 1
  // normalise slope relative to range (avoid magnitude effects)
  const normSlope = slope / (priceRange / n)     // positive = uptrend
  const trendScore = Math.min(35, Math.max(0, (normSlope + 1) * 17.5))

  // 2. Velocity: % move over window
  const pctMove   = ((sparkline[n - 1] - sparkline[0]) / sparkline[0]) * 100
  const velCapped = Math.max(-40, Math.min(40, pctMove))
  const velScore  = ((velCapped + 40) / 80) * 25

  // 3. 24h change mapped to 0–25
  const chgCapped = Math.max(-10, Math.min(10, chg24h))
  const chgScore  = ((chgCapped + 10) / 20) * 25

  // 4. Volume confirmation
  const volRatio = mcap > 0 ? vol / mcap : 0
  // Typical: 3–8% daily volume/mcap = healthy
  const volNorm  = Math.min(15, (volRatio / 0.08) * 15)

  return Math.round(trendScore + velScore + chgScore + volNorm)
}

// ── Signal bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, score))
  const label = toLabel(score)
  const color = LABEL_COLOR[label]
  return (
    <div style={{ width: '100%', height: '4px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease', borderRadius: '2px' }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MomentumScanner() {
  const prices     = useStore((s) => s.prices)
  const sparklines = useStore((s) => s.sparklines)

  const signals: Signal[] = useMemo(() => {
    return Object.entries(prices)
      .map(([id, p]) => {
        const spark = sparklines[id] ?? []
        const score = computeScore(spark, p.chg ?? 0, p.vol ?? 0, p.mcap ?? 1)
        const trend = spark.length >= 2
          ? ((spark[spark.length - 1] - spark[0]) / spark[0]) * 100
          : 0
        return {
          id,
          sym:    p.sym || id.slice(0, 5).toUpperCase(),
          price:  p.price,
          chg24h: p.chg,
          score,
          label:  toLabel(score),
          trend,
          vol:    p.vol,
          mcap:   p.mcap,
        } satisfies Signal
      })
      .sort((a, b) => b.score - a.score)
  }, [prices, sparklines])

  if (!signals.length) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
        Loading market data…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr 72px 72px 72px 100px',
        gap: '8px', padding: '0 12px 6px',
        fontSize: '10px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border)',
      }}>
        <span>Symbol</span>
        <span>Signal</span>
        <span style={{ textAlign: 'right' }}>Price</span>
        <span style={{ textAlign: 'right' }}>24h</span>
        <span style={{ textAlign: 'right' }}>7d</span>
        <span style={{ textAlign: 'right' }}>Score</span>
      </div>

      {signals.map((s) => {
        const labelColor = LABEL_COLOR[s.label]
        return (
          <div key={s.id} style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr 72px 72px 72px 100px',
            gap: '8px', alignItems: 'center',
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '9px 12px',
          }}>
            {/* Symbol */}
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
              {s.sym}
            </span>

            {/* Signal label + bar */}
            <div>
              <span style={{
                fontSize: '9.5px', fontWeight: 800, padding: '1px 7px', borderRadius: '6px',
                background: `${labelColor}22`, color: labelColor, letterSpacing: '0.3px',
              }}>
                {s.label}
              </span>
              <div style={{ marginTop: '4px' }}>
                <ScoreBar score={s.score} />
              </div>
            </div>

            {/* Price */}
            <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
              {fmtPrice(s.price)}
            </span>

            {/* 24h % */}
            <span style={{
              fontSize: '11.5px', fontWeight: 700, fontFamily: 'monospace',
              color: s.chg24h >= 0 ? 'var(--fhi)' : 'var(--flo)', textAlign: 'right',
            }}>
              {fmtPct(s.chg24h)}
            </span>

            {/* 7d % */}
            <span style={{
              fontSize: '11.5px', fontWeight: 700, fontFamily: 'monospace',
              color: s.trend >= 0 ? 'var(--fhi)' : 'var(--flo)', textAlign: 'right',
            }}>
              {fmtPct(s.trend)}
            </span>

            {/* Numeric score */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: labelColor,
              }}>
                {s.score}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text3)' }}>/100</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
