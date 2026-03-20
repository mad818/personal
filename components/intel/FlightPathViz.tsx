'use client'

// ── components/intel/FlightPathViz.tsx ────────────────────────────────────────
// Custom SVG flight path visualization with animated plane icons

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

interface City {
  id:    string
  label: string
  x:     number
  y:     number
}

interface FlightRoute {
  from:  string
  to:    string
  color: string
}

const W = 680
const H = 340

// City positions on a stylized world map projection
const CITIES: City[] = [
  { id: 'NYC', label: 'NYC', x: 180, y: 130 },
  { id: 'LAX', label: 'LAX', x: 90,  y: 155 },
  { id: 'LHR', label: 'LHR', x: 355, y: 100 },
  { id: 'NRT', label: 'NRT', x: 572, y: 125 },
  { id: 'SIN', label: 'SIN', x: 535, y: 215 },
  { id: 'DXB', label: 'DXB', x: 445, y: 165 },
]

const ROUTES: FlightRoute[] = [
  { from: 'NYC', to: 'LHR', color: CHART.rose  },
  { from: 'LAX', to: 'NRT', color: CHART.gold  },
  { from: 'LHR', to: 'DXB', color: CHART.teal  },
  { from: 'DXB', to: 'SIN', color: CHART.violet},
  { from: 'NRT', to: 'SIN', color: CHART.blush },
  { from: 'NYC', to: 'LAX', color: CHART.cyan  },
]

function getCity(id: string): City {
  return CITIES.find(c => c.id === id) || CITIES[0]
}

// Quadratic bezier midpoint with upward arc
function getBezierMidpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const mx   = (x1 + x2) / 2
  const my   = (y1 + y2) / 2
  const dist = Math.hypot(x2 - x1, y2 - y1)
  // Pull the control point upward
  const cx   = mx
  const cy   = my - dist * 0.35
  return [cx, cy]
}

function buildPath(c1: City, c2: City): string {
  const [cx, cy] = getBezierMidpoint(c1.x, c1.y, c2.x, c2.y)
  return `M ${c1.x} ${c1.y} Q ${cx} ${cy} ${c2.x} ${c2.y}`
}

// ── Animated plane along a bezier ─────────────────────────────────────────────
interface PlaneProps {
  route: FlightRoute
  index: number
}

function AnimatedPlane({ route, index }: PlaneProps) {
  const from = getCity(route.from)
  const to   = getCity(route.to)
  const [cx, cy] = getBezierMidpoint(from.x, from.y, to.x, to.y)

  // Sample points along the bezier for animation
  const STEPS = 60
  const points = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t  = i / STEPS
    const ot = 1 - t
    return {
      x:  ot * ot * from.x + 2 * ot * t * cx + t * t * to.x,
      y:  ot * ot * from.y + 2 * ot * t * cy + t * t * to.y,
    }
  })

  const [pos, setPos] = useState(0)

  useEffect(() => {
    const duration = 4000 + index * 800
    const offset   = (index * 0.3) % 1
    let start: number | null = null

    let raf: number

    function step(ts: number) {
      if (start === null) start = ts - offset * duration
      const elapsed = (ts - start) % duration
      const t       = elapsed / duration
      const idx     = Math.min(Math.floor(t * STEPS), STEPS - 1)
      setPos(idx)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [index])

  const pt      = points[pos]
  const nextPt  = points[Math.min(pos + 1, STEPS)]
  const angle   = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI)

  return (
    <g transform={`translate(${pt.x}, ${pt.y}) rotate(${angle})`}>
      {/* Simple plane icon */}
      <polygon
        points="-6,0 0,-3 6,0 0,8"
        fill={route.color}
        opacity={0.9}
        style={{ filter: `drop-shadow(0 0 3px ${route.color}88)` }}
      />
      <polygon
        points="-8,3 -4,1 4,1 8,3"
        fill={route.color}
        opacity={0.6}
      />
    </g>
  )
}

// ── Grid lines for dark map background ────────────────────────────────────────
function MapGrid() {
  const gridLines: React.ReactNode[] = []
  // Horizontal lines (lat)
  for (let y = 0; y <= H; y += H / 4) {
    gridLines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y}
        stroke={CHART.border} strokeWidth={0.5} strokeDasharray="4 8" />
    )
  }
  // Vertical lines (lon)
  for (let x = 0; x <= W; x += W / 8) {
    gridLines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H}
        stroke={CHART.border} strokeWidth={0.5} strokeDasharray="4 8" />
    )
  }
  // Equator
  gridLines.push(
    <line key="equator" x1={0} y1={H / 2} x2={W} y2={H / 2}
      stroke={CHART.border2} strokeWidth={1} />
  )
  return <>{gridLines}</>
}

export default function FlightPathViz() {
  const flights    = useStore(s => s.flights)
  const hasFlights = flights && flights.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background:   CHART.surf2,
        border:       `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding:      '20px',
        position:     'relative',
        overflow:     'hidden',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.cyan, fontSize: '9px' }}>◆</span>
          Global Flight Paths
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '4px', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ fontSize: '10px', color: CHART.text3 }}>
            {hasFlights
              ? `${flights.length} live ADS-B tracks`
              : `${ROUTES.length} simulated intercontinental routes`}
          </div>
          {!hasFlights && (
            <div style={{
              fontSize: '9px', color: CHART.text3, padding: '2px 8px',
              borderRadius: '4px', border: `1px solid ${CHART.border}`,
              fontFamily: 'monospace',
            }}>
              SIMULATED
            </div>
          )}
        </div>
      </div>

      {/* Route legend */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap',
      }}>
        {ROUTES.map(r => (
          <div key={`${r.from}-${r.to}`} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <div style={{
              width: '16px', height: '2px',
              background: r.color,
              borderRadius: '1px',
              boxShadow: `0 0 4px ${r.color}66`,
            }} />
            <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace' }}>
              {r.from}→{r.to}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Map */}
      <div style={{
        background: `linear-gradient(135deg, ${CHART.surf} 0%, ${CHART.surf2} 100%)`,
        border: `1px solid ${CHART.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="0%"   stopColor={CHART.surf}   stopOpacity="0" />
              <stop offset="100%" stopColor={CHART.surf}    stopOpacity="0.6" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill={CHART.surf} />

          {/* Grid */}
          <MapGrid />

          {/* Arc paths */}
          {ROUTES.map((route, i) => {
            const from = getCity(route.from)
            const to   = getCity(route.to)
            const d    = buildPath(from, to)
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={route.color}
                strokeWidth={1}
                strokeDasharray="5 4"
                opacity={0.55}
                style={{ filter: `drop-shadow(0 0 2px ${route.color}44)` }}
              />
            )
          })}

          {/* Animated planes */}
          {ROUTES.map((route, i) => (
            <AnimatedPlane key={i} route={route} index={i} />
          ))}

          {/* Cities */}
          {CITIES.map(city => (
            <g key={city.id}>
              {/* Outer pulse ring */}
              <circle
                cx={city.x} cy={city.y} r={8}
                fill="none"
                stroke={CHART.rose}
                strokeWidth={0.8}
                opacity={0.3}
                style={{ animation: 'nex-pulse 3s ease-in-out infinite' }}
              />
              {/* City dot */}
              <circle
                cx={city.x} cy={city.y} r={4}
                fill={CHART.surf2}
                stroke={CHART.rose}
                strokeWidth={1.5}
              />
              <circle
                cx={city.x} cy={city.y} r={1.5}
                fill={CHART.rose}
              />
              {/* City label */}
              <text
                x={city.x + 6}
                y={city.y - 6}
                fontSize={9}
                fontFamily="monospace"
                fontWeight={700}
                fill={CHART.text}
              >
                {city.label}
              </text>
            </g>
          ))}

          {/* Vignette overlay */}
          <rect width={W} height={H} fill="url(#map-vignette)" />
        </svg>
      </div>
    </motion.div>
  )
}
