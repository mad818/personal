'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART, SERIES_COLORS, TOOLTIP_STYLE, AXIS_STYLE } from '@/lib/chartTheme'

// Custom animated bar shape — grows from left
function AnimatedBar(props: any) {
  const { x, y, width, height, fill } = props
  return (
    <motion.rect
      x={x}
      y={y}
      height={height}
      rx={3}
      ry={3}
      fill={fill}
      fillOpacity={0.85}
      initial={{ width: 0 }}
      animate={{ width }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: (props.index ?? 0) * 0.08 }}
    />
  )
}

export default function AttackVectorChart() {
  const threatIntel = useStore((s) => s.threatIntel)
  const iocs = threatIntel?.threatfox ?? []

  // Group by ioc_type or malware_type, top 8
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const ioc of iocs) {
      // Prefer malware_printable, then threat_type, then ioc_type
      const cat = (ioc.malware_printable ?? ioc.malware ?? ioc.threat_type ?? ioc.ioc_type ?? 'Unknown')
        .toString()
        .slice(0, 20)
      counts[cat] = (counts[cat] ?? 0) + 1
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], i) => ({
        name: name.length > 16 ? name.slice(0, 14) + '…' : name,
        fullName: name,
        count,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
      }))
  }, [iocs])

  if (chartData.length === 0) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '12px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🧬</div>
        Loading attack vectors…
      </div>
    )
  }

  const maxCount = Math.max(...chartData.map((d) => d.count))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
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
        <span style={{ color: CHART.amber }}>◈</span> Attack Vectors
        <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 400, marginLeft: 'auto' }}>
          IOC type breakdown
        </span>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 30 + 12}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 36, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, maxCount * 1.1]} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...AXIS_STYLE, fill: CHART.text2 }}
            width={100}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            itemStyle={TOOLTIP_STYLE.itemStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(v: any, name: any, props: any) => [
              `${v} IOCs`,
              props?.payload?.fullName ?? name,
            ]}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
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
