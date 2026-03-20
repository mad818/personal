'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
} from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, SERIES_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme'

function fmtTvl(value: number): string {
  if (!value || isNaN(value)) return '—'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// Custom bar label
function BarLabel({ x, y, width, height, value }: any) {
  if (!value) return null
  return (
    <text x={(x ?? 0) + (width ?? 0) + 5} y={(y ?? 0) + (height ?? 0) / 2 + 4}
      fill={CHART.text2} fontSize={9} fontFamily="monospace" fontWeight={700}>
      {fmtTvl(value)}
    </text>
  )
}

export default function DefiOverview() {
  const protocols   = useStore((s) => s.defiData.protocols)
  const stablecoins = useStore((s) => s.defiData.stablecoins)

  // Top 5 protocols by TVL for bar chart
  const barData = useMemo(() =>
    protocols
      .slice(0, 5)
      .map((p: any, i: number) => ({
        name:  (p.name ?? p.slug ?? '?').slice(0, 12),
        tvl:   p.tvl ?? p.totalValueLocked ?? 0,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
      }))
      .sort((a, b) => b.tvl - a.tvl)
  , [protocols])

  // Stablecoin pie data
  const pieData = useMemo(() => {
    if (!stablecoins || stablecoins.length === 0) return []
    return stablecoins.slice(0, 6).map((sc: any, i: number) => ({
      name:  (sc.name ?? sc.symbol ?? `SC${i}`).slice(0, 8),
      value: sc.circulating ?? sc.marketCap ?? sc.tvl ?? 0,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    })).filter((d) => d.value > 0)
  }, [stablecoins])

  if (!protocols.length) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '10px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🏦</div>
        Loading DeFi data…
      </div>
    )
  }

  return (
    <div style={{
      background: CHART.surf2, border: `1px solid ${CHART.border}`,
      borderRadius: '10px', padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px',
      }}>
        🏦 DeFi — Top Protocols by TVL
      </div>

      {/* Horizontal Bar Chart */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '9.5px', fontWeight: 700, color: CHART.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
          Top 5 by TVL
        </div>
        <ResponsiveContainer width="100%" height={barData.length * 32 + 8}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ ...AXIS_STYLE }}
              width={70}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE.contentStyle}
              itemStyle={TOOLTIP_STYLE.itemStyle}
              labelStyle={TOOLTIP_STYLE.labelStyle}
              formatter={(v: any) => [fmtTvl(v), 'TVL']}
            />
            <Bar dataKey="tvl" radius={[0, 4, 4, 0]} maxBarSize={20} label={<BarLabel />}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stablecoin Pie Chart */}
      {pieData.length > 0 && (
        <div style={{ borderTop: `1px solid ${CHART.border}`, paddingTop: '14px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: CHART.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
            Stablecoin Market Share
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <defs>
                {pieData.map((entry, i) => (
                  <filter key={i} id={`pie-glow-${i}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
                animationBegin={200}
                animationDuration={900}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    fillOpacity={0.85}
                    stroke={CHART.surf2}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                itemStyle={TOOLTIP_STYLE.itemStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                formatter={(v: any) => [fmtTvl(v), 'Market Cap']}
              />
              <Legend
                iconType="circle"
                iconSize={6}
                formatter={(value) => (
                  <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fallback table row for protocols beyond chart */}
      <div style={{ borderTop: `1px solid ${CHART.border}`, paddingTop: '10px', marginTop: '4px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '16px 1fr 90px 60px',
          gap: '6px', padding: '0 2px 5px',
          fontSize: '9px', fontWeight: 700, color: CHART.text3,
          textTransform: 'uppercase', letterSpacing: '.4px',
          borderBottom: `1px solid ${CHART.border}`,
          marginBottom: '4px',
        }}>
          <span>#</span>
          <span>Protocol</span>
          <span style={{ textAlign: 'right' }}>TVL</span>
          <span style={{ textAlign: 'right' }}>1d %</span>
        </div>
        {protocols.slice(0, 5).map((p: any, i: number) => {
          const tvl   = p.tvl ?? p.totalValueLocked ?? 0
          const chg1d = p.change_1d ?? p.change1d ?? 0
          const isUp  = chg1d >= 0
          return (
            <div key={p.slug ?? i} style={{
              display: 'grid', gridTemplateColumns: '16px 1fr 90px 60px',
              gap: '6px', alignItems: 'center', padding: '5px 2px',
              borderBottom: i < 4 ? `1px solid ${CHART.border}` : 'none',
            }}>
              <span style={{ fontSize: '9.5px', color: CHART.text3, fontWeight: 700 }}>{i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                {p.logo && (
                  <img src={p.logo} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <span style={{ fontSize: '11px', fontWeight: 700, color: CHART.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name ?? p.slug ?? '—'}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: CHART.text, fontFamily: 'monospace', textAlign: 'right' }}>
                {fmtTvl(tvl)}
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: 700, fontFamily: 'monospace', color: isUp ? CHART.emerald : CHART.red, textAlign: 'right' }}>
                {chg1d != null ? `${isUp ? '+' : ''}${Number(chg1d).toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
