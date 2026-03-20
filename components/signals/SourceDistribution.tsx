'use client'

import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, SERIES_COLORS, TOOLTIP_STYLE } from '@/lib/chartTheme'

export default function SourceDistribution() {
  const articles = useStore((s) => s.articles)

  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of articles) {
      const src = a.src || 'Unknown'
      counts[src] = (counts[src] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [articles])

  const fallback = [
    { name: 'Reuters',    value: 24 },
    { name: 'Bloomberg',  value: 18 },
    { name: 'CoinDesk',   value: 15 },
    { name: 'BBC',        value: 12 },
    { name: 'Guardian',   value: 10 },
    { name: 'Wired',      value: 9  },
    { name: 'TechCrunch', value: 7  },
    { name: 'Other',      value: 5  },
  ]

  const chartData = data.length > 0 ? data : fallback
  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Source Distribution
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(value: unknown, name: unknown) => [`${value} articles`, String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', marginTop: '8px' }}>
        {chartData.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '110px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: SERIES_COLORS[i % SERIES_COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: CHART.text2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.name}
            </span>
            <span style={{ fontSize: '10px', color: CHART.text3, fontFamily: 'monospace', marginLeft: 'auto' }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
