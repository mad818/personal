'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART, TOOLTIP_STYLE } from '@/lib/chartTheme'

// Map confidence level to severity tier
function confToSeverity(confidence: number): 'critical' | 'high' | 'medium' | 'low' {
  if (confidence >= 100) return 'critical'
  if (confidence >= 75)  return 'high'
  if (confidence >= 50)  return 'medium'
  return 'low'
}

const SEV_META = {
  critical: { label: 'Critical', color: CHART.red,    order: 0 },
  high:     { label: 'High',     color: CHART.orange,  order: 1 },
  medium:   { label: 'Medium',   color: CHART.gold,    order: 2 },
  low:      { label: 'Low',      color: CHART.teal,    order: 3 },
}

// Center label for the donut
function CenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <g>
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        fill={CHART.text}
        fontSize="22"
        fontWeight="900"
        fontFamily="monospace"
      >
        {total}
      </text>
      <text
        x={cx} y={cy + 10}
        textAnchor="middle"
        fill={CHART.text3}
        fontSize="8"
        fontWeight="700"
      >
        TOTAL IOCs
      </text>
    </g>
  )
}

export default function ThreatSeverityDonut() {
  const threatIntel = useStore((s) => s.threatIntel)
  const iocs = threatIntel?.threatfox ?? []

  const pieData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const ioc of iocs) {
      const conf = ioc.confidence_level ?? ioc.confidence ?? 0
      counts[confToSeverity(conf)]++
    }
    return (['critical', 'high', 'medium', 'low'] as const)
      .map((key) => ({
        name:  SEV_META[key].label,
        value: counts[key],
        color: SEV_META[key].color,
        key,
      }))
      .filter((d) => d.value > 0)
  }, [iocs])

  const total = iocs.length

  if (total === 0) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '12px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🔴</div>
        Loading threat data…
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
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
        <span style={{ color: CHART.red }}>◉</span> Threat Severity
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Donut */}
        <div style={{ flexShrink: 0 }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <defs>
                {pieData.map((d, i) => (
                  <filter key={i} id={`donut-glow-${i}`} x="-15%" y="-15%" width="130%" height="130%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                animationBegin={0}
                animationDuration={1000}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    fillOpacity={0.9}
                    stroke={CHART.surf}
                    strokeWidth={2}
                    style={{ filter: `url(#donut-glow-${i})` }}
                  />
                ))}
                {/* Center label via customized label */}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                itemStyle={TOOLTIP_STYLE.itemStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                formatter={(v: any, name: any) => [`${v} IOCs`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with counts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['critical', 'high', 'medium', 'low'] as const).map((key) => {
            const meta = SEV_META[key]
            const d    = pieData.find((x) => x.key === key)
            const cnt  = d?.value ?? 0
            const pct  = total > 0 ? Math.round((cnt / total) * 100) : 0
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', color: CHART.text2, fontWeight: 600 }}>{meta.label}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: meta.color, fontWeight: 700, fontFamily: 'monospace' }}>
                    {cnt}
                  </span>
                </div>
                <div style={{ height: '3px', background: CHART.surf3, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: meta.color,
                    borderRadius: '2px',
                    transition: 'width 1s ease-out',
                    boxShadow: `0 0 4px ${meta.color}88`,
                  }} />
                </div>
              </div>
            )
          })}
          <div style={{
            marginTop: '4px', paddingTop: '8px',
            borderTop: `1px solid ${CHART.border}`,
            fontSize: '10px', color: CHART.text3,
          }}>
            <span style={{ fontWeight: 700, color: CHART.text }}>{total}</span> total IOCs
          </div>
        </div>
      </div>
    </motion.div>
  )
}
