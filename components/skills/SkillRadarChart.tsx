'use client'

// ── components/skills/SkillRadarChart.tsx ─────────────────────────────────────
// Recharts RadarChart showing AI agent proficiency across 6 skill domains

import { CHART, TOOLTIP_STYLE } from '@/lib/chartTheme'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'

const SKILL_DATA = [
  { domain: 'Pattern Recognition', value: 78 },
  { domain: 'Threat Analysis',     value: 85 },
  { domain: 'Market Intelligence', value: 72 },
  { domain: 'Natural Language',    value: 91 },
  { domain: 'Reasoning',           value: 68 },
  { domain: 'Adaptation',          value: 82 },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { domain: string; value: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      ...TOOLTIP_STYLE.contentStyle,
      minWidth: '140px',
    }}>
      <div style={{ ...TOOLTIP_STYLE.labelStyle, marginBottom: '6px' }}>{d.domain}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: CHART.rose, flexShrink: 0,
        }} />
        <span style={{ ...TOOLTIP_STYLE.itemStyle as React.CSSProperties }}>
          Proficiency: <strong style={{ color: CHART.text }}>{d.value}%</strong>
        </span>
      </div>
    </div>
  )
}

export default function SkillRadarChart() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{
        background: CHART.surf2,
        border: `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '80px', height: '80px',
        background: `radial-gradient(circle at top right, ${CHART.rose}14, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.rose, fontSize: '9px' }}>◆</span>
          Skill Proficiency Radar
        </div>
        <div style={{ fontSize: '10px', color: CHART.text3, marginTop: '3px' }}>
          AI agent capability matrix — 6 core domains
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart
          data={SKILL_DATA}
          margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
        >
          <PolarGrid
            stroke={CHART.border2}
            strokeDasharray="3 3"
            radialLines
          />
          <PolarAngleAxis
            dataKey="domain"
            tick={{
              fontSize: 10,
              fontFamily: 'monospace',
              fill: CHART.text2,
              fontWeight: 600,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={5}
            tick={{
              fontSize: 9,
              fontFamily: 'monospace',
              fill: CHART.text3,
            }}
            stroke={CHART.border}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Radar
            name="Proficiency"
            dataKey="value"
            stroke={CHART.rose}
            strokeWidth={2}
            fill={CHART.rose}
            fillOpacity={0.3}
            dot={{
              fill: CHART.rose,
              r: 4,
              strokeWidth: 1.5,
              stroke: CHART.surf2,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '16px',
        marginTop: '8px', flexWrap: 'wrap',
      }}>
        {SKILL_DATA.map((d) => (
          <div key={d.domain} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '9px', color: CHART.text2, fontFamily: 'monospace',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: d.value >= 85 ? CHART.rose : d.value >= 75 ? CHART.gold : CHART.text3,
            }} />
            {d.domain.split(' ')[0]}
            <span style={{ color: d.value >= 85 ? CHART.rose : CHART.gold, fontWeight: 700 }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
