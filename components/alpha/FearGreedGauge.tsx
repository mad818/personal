'use client'

import { useEffect, useRef } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, TOOLTIP_STYLE, AXIS_STYLE } from '@/lib/chartTheme'

// ── Color helpers ─────────────────────────────────────────────────────────────
function fgColor(value: number): string {
  if (value <= 25) return CHART.red
  if (value <= 45) return CHART.amber
  if (value <= 55) return CHART.text2
  if (value <= 75) return CHART.emerald
  return '#00d97e'
}

function fgLabel(value: number): string {
  if (value <= 25) return 'Extreme Fear'
  if (value <= 45) return 'Fear'
  if (value <= 55) return 'Neutral'
  if (value <= 75) return 'Greed'
  return 'Extreme Greed'
}

// ── SVG Arc Gauge ─────────────────────────────────────────────────────────────
// Semicircle: 180° arc from 9 o'clock to 3 o'clock
const W = 220
const H = 130
const CX = W / 2
const CY = H - 20     // baseline near bottom
const R_OUTER = 95
const R_INNER = 70
const START_DEG = 180  // leftmost (extreme fear)
const END_DEG   = 0    // rightmost (extreme greed)

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToXY(cx, cy, r, startDeg)
  const e = polarToXY(cx, cy, r, endDeg)
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  const sweep = startDeg > endDeg ? 0 : 1
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x} ${e.y}`
}

// Build the 5-segment gradient arc
const SEGMENTS = [
  { label: 'Extreme Fear', from: 180, to: 144, color: CHART.red    },
  { label: 'Fear',         from: 144, to: 108, color: CHART.orange },
  { label: 'Neutral',      from: 108, to:  72, color: CHART.amber  },
  { label: 'Greed',        from:  72, to:  36, color: CHART.emerald},
  { label: 'Ext. Greed',   from:  36, to:   0, color: '#00d97e'    },
]

// Value 0–100 maps to angle 180° → 0°
function valToDeg(val: number): number {
  return 180 - (val / 100) * 180
}

interface NeedleProps {
  value: number
  color: string
}

function Needle({ value, color }: NeedleProps) {
  const deg    = valToDeg(value)
  const tipR   = R_OUTER - 4
  const tip    = polarToXY(CX, CY, tipR, deg)
  const baseL  = polarToXY(CX, CY, 12, deg + 90)
  const baseR  = polarToXY(CX, CY, 12, deg - 90)

  return (
    <g>
      <polygon
        points={`${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}`}
        fill={color}
        opacity={0.92}
        style={{
          filter: `drop-shadow(0 0 4px ${color}88)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: 'all 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
      <circle cx={CX} cy={CY} r="8" fill={CHART.surf} stroke={color} strokeWidth="2" />
    </g>
  )
}

export default function FearGreedGauge() {
  const fearGreed = useStore((s) => s.fearGreed)

  if (!fearGreed?.current) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '10px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
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

  // Build 7-day area chart data
  const histData = hist.slice(0, 7).reverse().map((entry: any, i: number) => ({
    day: i,
    value: Number(entry.value ?? entry),
    date: entry.timestamp
      ? new Date(entry.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `D${i}`,
  }))

  return (
    <div style={{
      background: CHART.surf2, border: `1px solid ${CHART.border}`,
      borderRadius: '10px', padding: '16px 18px',
    }}>
      {/* Title */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        😱 Fear & Greed Index
      </div>

      {/* SVG Arc Gauge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label={`Fear & Greed: ${val} — ${label}`}>
          <defs>
            <filter id="fg-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Track */}
          {SEGMENTS.map((seg, i) => (
            <path
              key={i}
              d={arcPath(CX, CY, (R_OUTER + R_INNER) / 2, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={R_OUTER - R_INNER}
              strokeOpacity={0.25}
            />
          ))}

          {/* Active segment glow */}
          <path
            d={arcPath(CX, CY, (R_OUTER + R_INNER) / 2, 180, valToDeg(val))}
            fill="none"
            stroke={col}
            strokeWidth={R_OUTER - R_INNER - 4}
            strokeOpacity={0.55}
            style={{ filter: 'url(#fg-glow)' }}
          />

          {/* Needle */}
          <Needle value={val} color={col} />

          {/* Center value text */}
          <text x={CX} y={CY - 20} textAnchor="middle" fill={col} fontSize="22" fontWeight="900" fontFamily="monospace">
            {val}
          </text>
        </svg>
      </div>

      {/* Label below gauge */}
      <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: col }}>{label}</span>
        <span style={{ fontSize: '10px', color: CHART.text3, marginLeft: '6px' }}>/ 100</span>
      </div>

      {/* 7-day history area chart */}
      {histData.length > 1 && (
        <div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: CHART.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
            7-Day History
          </div>
          <ResponsiveContainer width="100%" height={52}>
            <AreaChart data={histData} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="fg-hist-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={col} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ ...AXIS_STYLE }} interval={0} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                itemStyle={TOOLTIP_STYLE.itemStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                formatter={(v: any) => [v, 'Index']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={col}
                strokeWidth={1.5}
                fill="url(#fg-hist-fill)"
                dot={false}
                activeDot={{ r: 3, fill: col }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
