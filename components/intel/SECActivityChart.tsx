'use client'

// ── components/intel/SECActivityChart.tsx ────────────────────────────────────
// Recharts BarChart showing SEC filing activity by type

import { CHART, SERIES_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme'
import { useStore } from '@/store/useStore'
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

// Synthetic fallback data
const SYNTHETIC_DATA = [
  { type: '8-K',     count: 45, color: SERIES_COLORS[0] },
  { type: '10-Q',    count: 28, color: SERIES_COLORS[1] },
  { type: '10-K',    count: 12, color: SERIES_COLORS[2] },
  { type: 'DEF 14A', count: 8,  color: SERIES_COLORS[3] },
  { type: 'S-1',     count: 5,  color: SERIES_COLORS[4] },
]

interface FilingEntry {
  type:  string
  count: number
  color: string
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: Array<{ value: number; payload: FilingEntry }>
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ ...TOOLTIP_STYLE.contentStyle }}>
      <div style={{ ...TOOLTIP_STYLE.labelStyle }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '2px', background: d.payload.color }} />
        <span style={{ ...TOOLTIP_STYLE.itemStyle as React.CSSProperties }}>
          Filings: <strong style={{ color: CHART.text }}>{d.value}</strong>
        </span>
      </div>
    </div>
  )
}

export default function SECActivityChart() {
  const secFilings = useStore(s => s.secFilings)

  // Build chart data — use real data if we can group it, else synthetic
  let chartData: FilingEntry[] = SYNTHETIC_DATA

  if (secFilings && secFilings.length > 0) {
    const counts: Record<string, number> = {}
    secFilings.forEach((f: { type?: string; form?: string }) => {
      const t = (f.type || f.form || 'Other').toUpperCase()
      counts[t] = (counts[t] || 0) + 1
    })
    const entries = Object.entries(counts)
      .map(([type, count], i) => ({ type, count, color: SERIES_COLORS[i % SERIES_COLORS.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    if (entries.length > 0) chartData = entries
  }

  const maxCount = Math.max(...chartData.map(d => d.count))

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
      {/* Decorative corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '120px', height: '120px',
        background: `radial-gradient(circle at top right, ${CHART.gold}0e, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.gold, fontSize: '9px' }}>◆</span>
          SEC Filing Activity
        </div>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginTop:      '6px',
          flexWrap:       'wrap',
          gap:            '8px',
        }}>
          <div style={{ fontSize: '10px', color: CHART.text3 }}>
            Filings grouped by form type · {chartData.reduce((s, d) => s + d.count, 0)} total
          </div>
          {secFilings.length === 0 && (
            <div style={{
              fontSize:     '9px',
              color:        CHART.text3,
              padding:      '2px 8px',
              borderRadius: '4px',
              border:       `1px solid ${CHART.border}`,
              fontFamily:   'monospace',
            }}>
              SYNTHETIC DATA
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{
        display:      'grid',
        gridTemplateColumns: `repeat(${Math.min(chartData.length, 5)}, 1fr)`,
        gap:          '8px',
        marginBottom: '20px',
      }}>
        {chartData.map(d => (
          <div key={d.type} style={{
            background:   `${d.color}0d`,
            border:       `1px solid ${d.color}33`,
            borderRadius: '8px',
            padding:      '8px 10px',
            textAlign:    'center',
          }}>
            <div style={{
              fontSize:    '16px',
              fontWeight:  900,
              fontFamily:  'monospace',
              color:       d.color,
              lineHeight:  1,
            }}>
              {d.count}
            </div>
            <div style={{
              fontSize:      '9px',
              color:         CHART.text2,
              fontFamily:    'monospace',
              marginTop:     '3px',
              fontWeight:    600,
            }}>
              {d.type}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="type"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.ceil(maxCount * 1.15)]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={TOOLTIP_STYLE.cursor} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                style={{ filter: `drop-shadow(0 2px 6px ${entry.color}44)` }}
              />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{
                fontSize:    9,
                fontFamily:  'monospace',
                fill:        CHART.text2,
                fontWeight:  700,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
