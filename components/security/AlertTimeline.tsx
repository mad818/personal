'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme'

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generateSyntheticAlerts() {
  // Higher frequency at night (23-3), lower during day
  return Array.from({ length: 24 }, (_, h) => {
    const isNight = h >= 23 || h <= 3
    const base = isNight ? 5 + seededRand(h * 13) * 8 : 0 + seededRand(h * 7) * 3
    return {
      hour: h,
      label: h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : h === 18 ? '6pm' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
      alerts: Math.round(base),
    }
  })
}

export default function AlertTimeline() {
  const securityAlerts = useStore((s) => s.securityAlerts)

  const data = useMemo(() => {
    if (securityAlerts.length > 0) {
      const byHour: Record<number, number> = {}
      for (const a of securityAlerts) {
        const h = new Date(a.timestamp).getHours()
        byHour[h] = (byHour[h] || 0) + 1
      }
      return Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : h === 18 ? '6pm' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
        alerts: byHour[h] || 0,
      }))
    }
    return generateSyntheticAlerts()
  }, [securityAlerts])

  const max = Math.max(...data.map((d) => d.alerts), 1)

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Alert Frequency · 24h
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART.rose} stopOpacity={0.5} />
              <stop offset="95%" stopColor={CHART.rose} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: CHART.border }} interval={5} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} domain={[0, max + 1]} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: unknown) => [`${v} alerts`, 'Alerts']}
            labelFormatter={(l: unknown) => `Hour: ${l}`}
          />
          <Area
            type="monotone"
            dataKey="alerts"
            stroke={CHART.rose}
            strokeWidth={2}
            fill="url(#alertGrad)"
            dot={false}
            activeDot={{ r: 4, fill: CHART.rose, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
