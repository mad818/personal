'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART, SERIES_COLORS, TOOLTIP_STYLE, AXIS_STYLE } from '@/lib/chartTheme'

// Custom animated bar growing from left
function GrowBar(props: any) {
  const { x, y, width, height, fill, index } = props
  return (
    <motion.rect
      x={x}
      y={y}
      height={Math.max(0, height)}
      rx={3}
      ry={3}
      fill={fill}
      fillOpacity={0.85}
      initial={{ width: 0 }}
      animate={{ width: Math.max(0, width) }}
      transition={{ duration: 0.65, ease: 'easeOut', delay: (index ?? 0) * 0.08 }}
    />
  )
}

export default function ConflictDensityBar() {
  const gdeltEvents = useStore((s) => s.gdeltEvents)

  const chartData = useMemo(() => {
    if (!gdeltEvents.length) return []

    const counts: Record<string, number> = {}
    for (const ev of gdeltEvents) {
      const source = String(ev.domain ?? ev.source ?? ev.sourcedomain ?? 'Unknown')
      // Normalize: take domain root
      const key = source.replace(/^www\./, '').slice(0, 22)
      counts[key] = (counts[key] ?? 0) + 1
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], i) => ({
        name: name.length > 18 ? name.slice(0, 16) + '…' : name,
        fullName: name,
        count,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
      }))
  }, [gdeltEvents])

  if (chartData.length === 0) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '12px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🌍</div>
        Loading conflict data…
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        background: CHART.surf2,
        border: `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ color: CHART.rose }}>◈</span> Conflict Event Density
        <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 400, marginLeft: 'auto' }}>
          Top 6 sources
        </span>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 32 + 8}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 32, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...AXIS_STYLE, fill: CHART.text2 }}
            width={110}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            itemStyle={TOOLTIP_STYLE.itemStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(v: any, name: any, props: any) => [
              `${v} events`,
              props?.payload?.fullName ?? name,
            ]}
          />
          <Bar
            dataKey="count"
            maxBarSize={20}
            shape={<GrowBar />}
            label={{
              position: 'right',
              style: { fontSize: '9px', fill: CHART.text2, fontFamily: 'monospace' },
              formatter: (v: any) => v,
            }}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
