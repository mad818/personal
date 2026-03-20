'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

interface GaugeProps {
  label: string
  value: number
  min: number
  max: number
  unit: string
  color: string
}

function SemiGauge({ label, value, min, max, unit, color }: GaugeProps) {
  const R = 52
  const CX = 70
  const CY = 70
  const startAngle = Math.PI         // 180° = left
  const endAngle   = 0               // 0° = right
  const pct  = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const angle = Math.PI + pct * Math.PI  // from 180° to 360°(=0°)

  // Arc path: always draw the filled portion
  const arcStart = { x: CX + R * Math.cos(startAngle), y: CY + R * Math.sin(startAngle) }
  const arcEnd   = { x: CX + R * Math.cos(angle),      y: CY + R * Math.sin(angle) }
  const largeArc = pct > 0.5 ? 1 : 0

  // Full background arc
  const bgEnd = { x: CX + R * Math.cos(0), y: CY + R * Math.sin(0) }

  // Needle tip
  const nx = CX + (R - 8) * Math.cos(angle)
  const ny = CY + (R - 8) * Math.sin(angle)

  const displayVal = Number.isFinite(value) ? (value % 1 === 0 ? value : value.toFixed(1)) : '--'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '120px' }}>
      <svg width="140" height="84" viewBox="0 0 140 84" style={{ overflow: 'visible' }}>
        <defs>
          <filter id={`glow-gauge-${label}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={`arcGrad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* BG arc */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={CHART.surf3}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {pct > 0.01 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke={`url(#arcGrad-${label})`}
            strokeWidth="8"
            strokeLinecap="round"
            filter={`url(#glow-gauge-${label})`}
          />
        )}

        {/* Needle dot */}
        <circle cx={nx} cy={ny} r="4" fill={color} filter={`url(#glow-gauge-${label})`} />
        <circle cx={CX} cy={CY} r="3" fill={CHART.text3} />

        {/* Center value */}
        <text x={CX} y={CY - 6} textAnchor="middle" fill={CHART.text} fontSize="16" fontWeight="700" fontFamily="monospace">
          {displayVal}
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace">
          {unit}
        </text>

        {/* Min/Max labels */}
        <text x={CX - R - 2} y={CY + 14} textAnchor="middle" fill={CHART.text3} fontSize="8" fontFamily="monospace">{min}</text>
        <text x={CX + R + 2} y={CY + 14} textAnchor="middle" fill={CHART.text3} fontSize="8" fontFamily="monospace">{max}</text>
      </svg>
      <div style={{ fontSize: '10px', color: CHART.text2, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  )
}

export default function SensorGauges() {
  const weather = useStore((s) => s.weather)

  const temp     = weather?.main?.temp      ?? weather?.temperature ?? 22
  const humidity = weather?.main?.humidity  ?? weather?.humidity    ?? 65
  const pressure = weather?.main?.pressure  ?? weather?.pressure    ?? 1013

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Live Sensor Readings
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <SemiGauge label="Temperature" value={temp}     min={0}   max={50}   unit="°C"  color={CHART.rose}    />
        <SemiGauge label="Humidity"    value={humidity} min={0}   max={100}  unit="%"   color={CHART.teal}    />
        <SemiGauge label="Pressure"    value={pressure} min={950} max={1050} unit="hPa" color={CHART.violet}  />
      </div>
    </div>
  )
}
