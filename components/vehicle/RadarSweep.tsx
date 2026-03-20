'use client'

import { useEffect, useRef, useState } from 'react'
import { CHART } from '@/lib/chartTheme'

interface Blip {
  id: number
  x: number
  y: number
  born: number
}

function seededPos(seed: number, range: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 10000
  return ((x - Math.floor(x)) * 2 - 1) * range
}

const INITIAL_BLIPS: Blip[] = Array.from({ length: 7 }, (_, i) => ({
  id: i,
  x: seededPos(i * 3, 70),
  y: seededPos(i * 3 + 1, 70),
  born: Date.now() - i * 800,
}))

const RING_RADII = [20, 42, 64, 86]
const RING_LABELS = ['50m', '100m', '200m', '500m']

export default function RadarSweep() {
  const [blips] = useState<Blip[]>(INITIAL_BLIPS)
  const [angle, setAngle] = useState(0)
  const [time, setTime] = useState(Date.now())
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(Date.now())

  useEffect(() => {
    let running = true
    function tick() {
      if (!running) return
      const now = Date.now()
      const dt = now - lastRef.current
      lastRef.current = now
      setAngle((a) => (a + dt * 0.12) % 360)
      setTime(now)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const CX = 110, CY = 110, R = 96

  // Sweep gradient: from current angle backwards ~60°
  const sweepAngleRad = (angle - 90) * (Math.PI / 180)

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Radar Sweep · Active
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={220} height={220} viewBox="0 0 220 220">
          <defs>
            <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d1a0d" />
              <stop offset="100%" stopColor={CHART.bg} />
            </radialGradient>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <clipPath id="radarClip">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>

          {/* Background */}
          <circle cx={CX} cy={CY} r={R} fill="url(#radarBg)" stroke="#1a2e1a" strokeWidth="1" />

          {/* Range rings */}
          {RING_RADII.map((r, i) => (
            <g key={r}>
              <circle cx={CX} cy={CY} r={r} fill="none" stroke="#1f3d1f" strokeWidth="0.8" />
              <text x={CX + 2} y={CY - r + 9} fill="#2a5c2a" fontSize="7" fontFamily="monospace">{RING_LABELS[i]}</text>
            </g>
          ))}

          {/* Crosshairs */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#1f3d1f" strokeWidth="0.8" />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#1f3d1f" strokeWidth="0.8" />

          {/* Sweep cone (wedge) */}
          <g clipPath="url(#radarClip)">
            {/* Sweep trail — use a sector */}
            {Array.from({ length: 30 }, (_, i) => {
              const trailAngle = (angle - i * 2 - 90) * (Math.PI / 180)
              const x1 = CX + R * Math.cos(trailAngle)
              const y1 = CY + R * Math.sin(trailAngle)
              return (
                <line
                  key={i}
                  x1={CX} y1={CY}
                  x2={x1} y2={y1}
                  stroke={`rgba(0,255,80,${(0.25 * (1 - i / 30)).toFixed(3)})`}
                  strokeWidth={i === 0 ? 2 : 1}
                />
              )
            })}
          </g>

          {/* Blips */}
          {blips.map((blip) => {
            const age = (time - blip.born) % 4000
            const opacity = Math.max(0, 1 - age / 4000)
            // Only show when sweep has passed this blip's angle
            const blipAngle = Math.atan2(blip.y, blip.x) * (180 / Math.PI) + 90
            const angDiff = ((angle - blipAngle) % 360 + 360) % 360
            const visible = angDiff < 90
            if (!visible) return null
            const bx = CX + blip.x
            const by = CY + blip.y
            const ring = (age / 4000) * 14
            return (
              <g key={blip.id} opacity={opacity}>
                <circle cx={bx} cy={by} r="3" fill="#00ff50" filter="url(#radarGlow)" />
                <circle cx={bx} cy={by} r={ring} fill="none" stroke="#00ff50" strokeWidth="0.8" opacity={1 - ring / 14} />
              </g>
            )
          })}

          {/* Center dot */}
          <circle cx={CX} cy={CY} r="3" fill="#00ff50" />

          {/* Border ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#2a5c2a" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}
