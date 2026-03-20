'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { CHART, SERIES_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme'

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export default function TelemetryChart() {
  const data = useMemo(() => {
    const pts = []
    for (let i = 0; i < 20; i++) {
      const t = 20 - i
      const speed     = 60 + seededRand(i * 3 + 1) * 20           // 60-80
      const battery   = 87 - (i / 20) * 5 + (seededRand(i + 5) - 0.5) * 0.5
      const engineTemp = 85 + seededRand(i * 7 + 2) * 7            // 85-92
      pts.push({
        label: `${t}m`,
        Speed:      Math.round(speed * 10) / 10,
        Battery:    Math.round(battery * 10) / 10,
        EngineTemp: Math.round(engineTemp * 10) / 10,
      })
    }
    return pts
  }, [])

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Telemetry · Last 20 min
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={SERIES_COLORS[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={SERIES_COLORS[1]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[1]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={SERIES_COLORS[2]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[2]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: CHART.border }} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: CHART.text2, paddingTop: '8px' }}
          />
          <Area type="monotone" dataKey="Speed"      fill="url(#speedGrad)" stroke="none" />
          <Area type="monotone" dataKey="Battery"    fill="url(#battGrad)"  stroke="none" />
          <Area type="monotone" dataKey="EngineTemp" fill="url(#engGrad)"   stroke="none" />
          <Line type="monotone" dataKey="Speed"      stroke={SERIES_COLORS[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Battery"    stroke={SERIES_COLORS[1]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="EngineTemp" stroke={SERIES_COLORS[2]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
