'use client'

import { useEffect, useRef, useState } from 'react'
import { CHART } from '@/lib/chartTheme'

// 4 cameras at corners with sweep arcs oscillating back and forth
const CAMERAS = [
  { id: 0, x: 24,  y: 24,  startAngle: 315, motion: false },
  { id: 1, x: 196, y: 24,  startAngle: 225, motion: true  },
  { id: 2, x: 24,  y: 156, startAngle: 45,  motion: false },
  { id: 3, x: 196, y: 156, startAngle: 135, motion: false },
]

function degToRad(d: number) { return d * Math.PI / 180 }

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = degToRad(startDeg)
  const e = degToRad(endDeg)
  const x1 = cx + r * Math.cos(s)
  const y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e)
  const y2 = cy + r * Math.sin(e)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export default function PerimeterSweep() {
  const [offsets, setOffsets] = useState([0, 0, 0, 0])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(Date.now())

  useEffect(() => {
    let running = true
    let elapsed = 0
    function tick() {
      if (!running) return
      const now = Date.now()
      elapsed += now - lastRef.current
      lastRef.current = now
      // Each camera oscillates ±25° at slightly different speeds
      setOffsets([
        Math.sin(elapsed / 1800) * 25,
        Math.sin(elapsed / 1500 + 1) * 25,
        Math.sin(elapsed / 2000 + 2) * 25,
        Math.sin(elapsed / 1700 + 3) * 25,
      ])
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const W = 220, H = 180

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Perimeter Surveillance
        </span>
        <span style={{ fontSize: '10px', color: CHART.amber, fontFamily: 'monospace' }}>
          ⚠ Motion: Zone NE
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <filter id="perimGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Perimeter rectangle */}
          <rect x="24" y="24" width="172" height="132" fill="#0d120d" stroke="#1f3d1f" strokeWidth="1.5" rx="2" />
          {/* Floor plan rooms hint */}
          <line x1="110" y1="24"  x2="110" y2="156" stroke="#1a2e1a" strokeWidth="0.8" strokeDasharray="4 4" />
          <line x1="24"  y1="90"  x2="196" y2="90"  stroke="#1a2e1a" strokeWidth="0.8" strokeDasharray="4 4" />

          {/* Camera sweep arcs */}
          {CAMERAS.map((cam, i) => {
            const sweep = cam.startAngle + offsets[i]
            const color = cam.motion ? CHART.amber : CHART.emerald
            const fillOp = cam.motion ? 0.25 : 0.12
            return (
              <g key={cam.id}>
                <path
                  d={arcPath(cam.x, cam.y, 48, sweep - 25, sweep + 25)}
                  fill={color}
                  fillOpacity={fillOp}
                  stroke={color}
                  strokeWidth="0.5"
                  strokeOpacity={0.5}
                  filter="url(#perimGlow)"
                />
                <circle cx={cam.x} cy={cam.y} r="5" fill={color} />
                <text x={cam.x} y={cam.y} textAnchor="middle" dominantBaseline="middle" fontSize="5" fill={CHART.bg}>📷</text>
              </g>
            )
          })}

          {/* Motion zone pulse on cam1 */}
          <circle cx={CAMERAS[1].x} cy={CAMERAS[1].y} r="9" fill="none" stroke={CHART.amber} strokeWidth="1.5" opacity="0.6">
            <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Corner labels */}
          <text x="32" y="37" fill={CHART.text3} fontSize="7" fontFamily="monospace">NW</text>
          <text x="178" y="37" fill={CHART.text3} fontSize="7" fontFamily="monospace">NE</text>
          <text x="32" y="150" fill={CHART.text3} fontSize="7" fontFamily="monospace">SW</text>
          <text x="178" y="150" fill={CHART.text3} fontSize="7" fontFamily="monospace">SE</text>
        </svg>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
        {CAMERAS.map((cam) => (
          <div key={cam.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: cam.motion ? CHART.amber : CHART.emerald,
              boxShadow: `0 0 5px ${cam.motion ? CHART.amber : CHART.emerald}`,
            }} />
            <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace' }}>
              Cam {['NW','NE','SW','SE'][cam.id]}: {cam.motion ? 'MOTION' : 'Clear'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
