'use client'

import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, ZAxis,
} from 'recharts'
import { useStore } from '@/store/useStore'
import { CHART, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme'

function magColor(mag: number): string {
  if (mag >= 7) return CHART.red
  if (mag >= 6) return CHART.orange
  if (mag >= 5) return CHART.amber
  return CHART.emerald
}

function fmtTime(ts: number | string): string {
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
}

// Custom dot colored by magnitude
function MagDot(props: any) {
  const { cx, cy, payload } = props
  const col  = magColor(payload.mag)
  const size = Math.max(4, payload.mag * payload.mag * 0.8)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={col}
      fillOpacity={0.75}
      stroke={col}
      strokeWidth={1}
      style={{ filter: `drop-shadow(0 0 ${size / 2}px ${col}88)` }}
    />
  )
}

// Custom tooltip
function MagTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      ...TOOLTIP_STYLE.contentStyle,
      minWidth: '160px',
    }}>
      <div style={{ fontWeight: 700, color: magColor(d.mag), marginBottom: '4px', fontFamily: 'monospace' }}>
        M{d.mag.toFixed(1)} — {magColor(d.mag) === CHART.red ? 'MAJOR' : d.mag >= 6 ? 'STRONG' : d.mag >= 5 ? 'MODERATE' : 'LIGHT'}
      </div>
      <div style={{ fontSize: '11px', color: CHART.text, marginBottom: '3px' }}>{d.place}</div>
      <div style={{ fontSize: '10px', color: CHART.text3 }}>{fmtTime(d.ts)}</div>
    </div>
  )
}

export default function EarthquakeChart() {
  const earthquakes = useStore((s) => s.earthquakes)

  const data = useMemo(() => {
    return earthquakes
      .map((eq: any) => {
        const mag   = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
        const place = eq.place ?? eq.location ?? eq.properties?.place ?? 'Unknown'
        const ts    = eq.time ?? eq.properties?.time ?? eq.date ?? Date.now()
        return { mag: typeof mag === 'number' ? mag : parseFloat(mag), place, ts }
      })
      .filter((d) => !isNaN(d.mag) && d.mag > 0)
      .sort((a, b) => {
        const ta = typeof a.ts === 'number' ? a.ts : new Date(a.ts).getTime()
        const tb = typeof b.ts === 'number' ? b.ts : new Date(b.ts).getTime()
        return ta - tb
      })
      .slice(-50)
      .map((d, i) => ({
        ...d,
        x: i,
        y: d.mag,
        z: d.mag ** 2,
      }))
  }, [earthquakes])

  if (data.length === 0) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '12px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>🌊</div>
        Loading seismic data…
      </div>
    )
  }

  return (
    <div style={{
      background: CHART.surf2, border: `1px solid ${CHART.border}`,
      borderRadius: '12px', padding: '16px 18px', marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ color: CHART.amber }}>◉</span> Seismic Scatter
        <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 400, marginLeft: 'auto' }}>
          Last {data.length} events · dot size = magnitude²
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
          <XAxis
            dataKey="x"
            type="number"
            tick={false}
            axisLine={{ stroke: CHART.border }}
            tickLine={false}
            label={{ value: 'Time →', position: 'insideRight', fontSize: 9, fill: CHART.text3, fontFamily: 'monospace' }}
          />
          <YAxis
            dataKey="y"
            type="number"
            tick={{ ...AXIS_STYLE }}
            domain={[0, 'auto']}
            label={{ value: 'Mag', angle: -90, position: 'insideLeft', fontSize: 9, fill: CHART.text3, fontFamily: 'monospace' }}
            width={32}
          />
          <ZAxis dataKey="z" range={[12, 120]} />
          <Tooltip content={<MagTooltip />} />
          <ReferenceLine
            y={5}
            stroke={CHART.amber}
            strokeDasharray="4 3"
            label={{ value: 'M5 Significant', position: 'right', fontSize: 8, fill: CHART.amber, fontFamily: 'monospace' }}
          />
          <Scatter
            data={data}
            shape={<MagDot />}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
        {[
          { label: 'Minor (<5)', color: CHART.emerald },
          { label: 'Mod (5–6)', color: CHART.amber   },
          { label: 'Strong (6–7)', color: CHART.orange },
          { label: 'Major (7+)', color: CHART.red     },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
