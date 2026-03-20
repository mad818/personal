'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { CHART, TOOLTIP_STYLE } from '@/lib/chartTheme'

const SENSORS = [
  { subject: 'LiDAR',      health: 95 },
  { subject: 'RGB Cam',    health: 100 },
  { subject: 'Night Vision', health: 88 },
  { subject: 'Thermal',    health: 92 },
  { subject: 'GPS',        health: 99 },
  { subject: 'Ultrasonic', health: 85 },
]

export default function SensorHealthRadial() {
  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        Sensor System Health
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={SENSORS} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={CHART.border} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: CHART.text2, fontSize: 9, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: CHART.text3, fontSize: 8, fontFamily: 'monospace' }}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            dataKey="health"
            stroke={CHART.rose}
            strokeWidth={2}
            fill={CHART.rose}
            fillOpacity={0.2}
            dot={{ fill: CHART.rose, r: 3, strokeWidth: 0 }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: unknown) => [`${v}%`, 'Health']}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Health labels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
        {SENSORS.map((s) => {
          const color = s.health >= 95 ? CHART.emerald : s.health >= 88 ? CHART.gold : CHART.red
          return (
            <div key={s.subject} style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '110px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace' }}>{s.subject}</span>
              <span style={{ fontSize: '9px', color, fontFamily: 'monospace', marginLeft: 'auto' }}>{s.health}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
