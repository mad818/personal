'use client'

// ── components/intel/OddsDistribution.tsx ─────────────────────────────────────
// Recharts horizontal BarChart showing prediction market odds / probabilities

import { CHART, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { motion } from 'framer-motion'

interface MarketEntry {
  question: string
  short:    string
  prob:     number
}

const SYNTHETIC_MARKETS: MarketEntry[] = [
  { question: 'US inflation falls below 3% by Q3 2026',          short: 'Inflation < 3%',    prob: 72 },
  { question: 'Fed cuts rates at least once before June 2026',    short: 'Fed rate cut',       prob: 64 },
  { question: 'BTC exceeds $120k by end of 2026',                 short: 'BTC > $120k',        prob: 58 },
  { question: 'AI regulation bill passes US Senate 2026',         short: 'AI Bill Senate',     prob: 44 },
  { question: 'SPX closes above 6500 by year-end 2026',           short: 'SPX > 6500',         prob: 67 },
  { question: 'Recession declared in any G7 country by 2027',     short: 'G7 Recession',       prob: 38 },
  { question: 'GPT-5 releases publicly before end of 2026',       short: 'GPT-5 release',      prob: 82 },
  { question: 'Climate tipping point event before 2030',          short: 'Climate Event',      prob: 29 },
]

function getProbColor(prob: number): string {
  if (prob >= 60) return CHART.emerald
  if (prob >= 40) return CHART.amber
  return CHART.red
}

function getProbLabel(prob: number): string {
  if (prob >= 60) return 'LIKELY'
  if (prob >= 40) return 'TOSS-UP'
  return 'UNLIKELY'
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: Array<{ value: number; payload: MarketEntry }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const c = getProbColor(d.prob)
  return (
    <div style={{ ...TOOLTIP_STYLE.contentStyle, maxWidth: '220px' }}>
      <div style={{ ...TOOLTIP_STYLE.labelStyle, marginBottom: '6px', lineHeight: 1.4 }}>
        {d.question}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '2px', background: c }} />
        <span style={{ ...TOOLTIP_STYLE.itemStyle as React.CSSProperties }}>
          Probability: <strong style={{ color: c }}>{d.prob}%</strong>
        </span>
        <span style={{
          fontSize: '8px', color: c, fontWeight: 700,
          padding: '1px 5px', borderRadius: '3px',
          border: `1px solid ${c}44`, background: `${c}11`,
          fontFamily: 'monospace',
        }}>
          {getProbLabel(d.prob)}
        </span>
      </div>
    </div>
  )
}

export default function OddsDistribution() {
  // Sort by probability descending
  const sorted = [...SYNTHETIC_MARKETS].sort((a, b) => b.prob - a.prob)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background:   CHART.surf2,
        border:       `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding:      '20px',
        marginBottom: '16px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '100px', height: '100px',
        background: `radial-gradient(circle at top right, ${CHART.emerald}0d, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.emerald, fontSize: '9px' }}>◆</span>
          Prediction Market Odds
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '4px', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ fontSize: '10px', color: CHART.text3 }}>
            Probability estimates · sorted by confidence
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([['LIKELY', CHART.emerald], ['TOSS-UP', CHART.amber], ['UNLIKELY', CHART.red]] as const).map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: color,
                }} />
                <span style={{ fontSize: '8px', color: CHART.text3, fontFamily: 'monospace', fontWeight: 600 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 5, left: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid {...GRID_STYLE} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="short"
            tick={{ ...AXIS_STYLE, fontSize: 9, fill: CHART.text2 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={TOOLTIP_STYLE.cursor} />
          <Bar dataKey="prob" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, i) => (
              <Cell
                key={i}
                fill={getProbColor(entry.prob)}
                fillOpacity={0.8}
                style={{ filter: `drop-shadow(0 0 4px ${getProbColor(entry.prob)}44)` }}
              />
            ))}
            <LabelList
              dataKey="prob"
              position="right"
              // eslint-disable-next-line
              content={(props: any) => {
                const { x, y, width, value } = props
                if (value == null) return null
                return (
                  <text
                    x={(x as number) + (width as number) + 6}
                    y={(y as number) + 10}
                    fontSize={9}
                    fontFamily="monospace"
                    fill={CHART.text2}
                    fontWeight={700}
                  >
                    {value}%
                  </text>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
