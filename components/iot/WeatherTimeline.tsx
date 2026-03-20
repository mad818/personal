'use client'

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceDot,
} from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme'

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export default function WeatherTimeline() {
  const weather = useStore((s) => s.weather)
  const baseTemp = weather?.main?.temp ?? weather?.temperature ?? 22
  const currentHour = new Date().getHours()

  const data = useMemo(() => {
    const pts = []
    for (let h = 0; h < 24; h++) {
      const delta = (seededRand(h * 7 + 13) - 0.5) * 6
      const diurnal = Math.sin((h - 6) * Math.PI / 12) * 4  // cooler at night, warmer midday
      pts.push({
        hour: h,
        label: h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : h === 18 ? '6pm' : h === 23 ? '11pm' : `${h > 12 ? h-12 : h}${h >= 12 ? 'pm':'am'}`,
        temp: Math.round((baseTemp + diurnal + delta) * 10) / 10,
        isCurrent: h === currentHour,
      })
    }
    return pts
  }, [baseTemp, currentHour])

  const minY = Math.min(...data.map(d => d.temp)) - 2
  const maxY = Math.max(...data.map(d => d.temp)) + 2
  const currentPoint = data[currentHour]

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        24-Hour Temperature Forecast
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART.rose} stopOpacity={0.4} />
              <stop offset="95%" stopColor={CHART.rose} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART.border }}
            interval={5}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            domain={[minY, maxY]}
            tickFormatter={(v: number) => `${v}°`}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: unknown) => [`${v}°C`, 'Temperature']}
            labelFormatter={(label: unknown) => `Time: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="temp"
            stroke={CHART.rose}
            strokeWidth={2}
            fill="url(#tempGrad)"
            dot={false}
            activeDot={{ r: 4, fill: CHART.rose, strokeWidth: 0 }}
          />
          {currentPoint && (
            <ReferenceDot
              x={currentPoint.label}
              y={currentPoint.temp}
              r={5}
              fill={CHART.gold}
              stroke={CHART.bg}
              strokeWidth={2}
              label={{ value: 'NOW', position: 'top', fontSize: 9, fill: CHART.gold, fontFamily: 'monospace' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
