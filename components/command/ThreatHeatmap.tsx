'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

// ── Types ─────────────────────────────────────────────────────────────────────
interface HeatCell {
  value: number   // 0–100
  label: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function cellColor(v: number): string {
  if (v >= 80) return CHART.red
  if (v >= 60) return CHART.orange
  if (v >= 40) return CHART.amber
  if (v >= 20) return CHART.teal
  return CHART.surf3
}

function cellBg(v: number): string {
  const base = cellColor(v)
  return `${base}33`
}

const HOURS = ['-6h', '-5h', '-4h', '-3h', '-2h', '-1h']

const CATEGORY_LABELS = ['Cyber', 'Seismic', 'Market', 'Weather']

// Generate synthetic trending data toward a current value
function syntheticRow(current: number, variance = 12): number[] {
  const base = Math.max(0, current - variance * 2)
  return Array.from({ length: 6 }, (_, i) => {
    const progress = i / 5
    const noise = (Math.random() - 0.5) * variance
    return Math.min(100, Math.max(0, Math.round(base + (current - base) * progress + noise)))
  })
}

export default function ThreatHeatmap() {
  const earthquakes = useStore((s) => s.earthquakes)
  const threatIntel = useStore((s) => s.threatIntel)
  const fearGreed   = useStore((s) => s.fearGreed)
  const weather     = useStore((s) => s.weather as any)

  // Derive current threat scores (0–100)
  const cyberScore = useMemo(() => {
    const high = threatIntel.threatfox.filter((ioc: any) => {
      const c = ioc.confidence_level ?? ioc.confidence ?? 0
      return c >= 75
    }).length
    return Math.min(100, Math.round((high / Math.max(1, threatIntel.threatfox.length)) * 200))
  }, [threatIntel])

  const seismicScore = useMemo(() => {
    const big = earthquakes.filter((eq: any) => {
      const m = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
      return m >= 5
    }).length
    return Math.min(100, big * 8)
  }, [earthquakes])

  const marketScore = useMemo(() => {
    const fgVal = fearGreed?.current?.value != null ? Number(fearGreed.current.value) : 50
    // Market threat is inverse of greed (extreme fear = high threat)
    return Math.round(100 - fgVal)
  }, [fearGreed])

  const weatherScore = useMemo(() => {
    const code = weather?.current?.weathercode ?? 0
    // WMO codes: 0=clear, 45+=fog, 80+=heavy rain, 95+=thunderstorm
    if (code >= 95) return 85
    if (code >= 80) return 65
    if (code >= 45) return 40
    return 15
  }, [weather])

  const scores = [cyberScore, seismicScore, marketScore, weatherScore]

  const rows: HeatCell[][] = useMemo(() =>
    scores.map((score) => syntheticRow(score).map((value) => ({ value, label: `${value}` })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [cyberScore, seismicScore, marketScore, weatherScore])

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '12px',
      padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ color: CHART.rose }}>◈</span> Threat Heatmap
        <span style={{ fontSize: '9px', color: CHART.text3, marginLeft: 'auto', fontWeight: 400 }}>
          Last 6 hours
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px 0' }}>

        {/* Header row */}
        <div />
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${HOURS.length}, 1fr)`,
          gap: '3px', marginBottom: '4px',
        }}>
          {HOURS.map((h) => (
            <div key={h} style={{
              fontSize: '8.5px', color: CHART.text3, fontFamily: 'monospace',
              textAlign: 'center', fontWeight: 600,
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {CATEGORY_LABELS.map((cat, rowIdx) => (
          <>
            <div key={`label-${cat}`} style={{
              fontSize: '10px', fontWeight: 700, color: CHART.text2,
              display: 'flex', alignItems: 'center',
              paddingRight: '8px',
            }}>
              {cat}
            </div>
            <div key={`row-${cat}`} style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${HOURS.length}, 1fr)`,
              gap: '3px', marginBottom: '3px',
            }}>
              {rows[rowIdx]?.map((cell, colIdx) => {
                const col = cellColor(cell.value)
                const bg  = cellBg(cell.value)
                const isHigh = cell.value >= 60
                return (
                  <motion.div
                    key={colIdx}
                    initial={{ opacity: 0, scaleY: 0.3 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: (rowIdx * 6 + colIdx) * 0.04, duration: 0.35, ease: 'easeOut' }}
                    title={`${cat} at ${HOURS[colIdx]}: ${cell.value}`}
                    style={{
                      height: '28px', borderRadius: '4px',
                      background: bg,
                      border: `1px solid ${col}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', fontWeight: 700, color: col, fontFamily: 'monospace',
                      cursor: 'default',
                      boxShadow: isHigh ? `0 0 8px ${col}55` : 'none',
                      animation: isHigh ? 'nex-pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {cell.value}
                  </motion.div>
                )
              })}
            </div>
          </>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '12px', marginTop: '12px',
        borderTop: `1px solid ${CHART.border}`, paddingTop: '10px',
      }}>
        {[
          { label: 'Critical', color: CHART.red },
          { label: 'High', color: CHART.orange },
          { label: 'Medium', color: CHART.amber },
          { label: 'Low', color: CHART.teal },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
