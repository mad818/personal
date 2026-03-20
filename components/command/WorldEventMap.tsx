'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

// ── Geo helpers: convert lat/lon to SVG coords (Equirectangular projection) ──
const MAP_W = 960
const MAP_H = 420

function latLonToXY(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W
  const y = ((90 - lat) / 180) * MAP_H
  return [x, y]
}

// ── Continent SVG path data (stylized, not precise) ────────────────────────
const CONTINENTS = [
  // North America
  {
    id: 'na',
    d: 'M 130,60 L 195,55 L 235,70 L 250,95 L 260,125 L 240,150 L 220,165 L 200,175 L 185,190 L 175,210 L 165,225 L 150,230 L 140,215 L 125,200 L 115,180 L 105,160 L 100,140 L 108,115 L 118,90 Z',
  },
  // Central America + Caribbean
  {
    id: 'ca',
    d: 'M 175,210 L 185,215 L 192,225 L 188,235 L 178,230 L 170,220 Z',
  },
  // South America
  {
    id: 'sa',
    d: 'M 210,240 L 240,235 L 265,245 L 280,265 L 285,295 L 280,330 L 268,355 L 250,370 L 232,365 L 218,348 L 208,320 L 200,295 L 202,268 Z',
  },
  // Europe
  {
    id: 'eu',
    d: 'M 440,55 L 475,50 L 510,55 L 525,68 L 515,85 L 495,92 L 480,105 L 462,110 L 448,100 L 435,85 L 432,68 Z',
  },
  // Africa
  {
    id: 'af',
    d: 'M 455,120 L 495,115 L 525,125 L 540,148 L 545,175 L 540,205 L 530,230 L 515,255 L 495,270 L 475,268 L 455,250 L 443,225 L 438,198 L 440,168 L 445,145 Z',
  },
  // Middle East
  {
    id: 'me',
    d: 'M 530,90 L 560,85 L 580,95 L 585,110 L 575,120 L 555,125 L 535,118 Z',
  },
  // Asia (large)
  {
    id: 'as',
    d: 'M 530,55 L 580,45 L 635,50 L 690,55 L 740,60 L 780,70 L 810,85 L 820,108 L 810,130 L 790,148 L 760,160 L 730,168 L 700,170 L 665,165 L 635,158 L 605,152 L 575,148 L 548,140 L 530,125 L 520,105 L 522,80 Z',
  },
  // South Asia (India subcontinent)
  {
    id: 'in',
    d: 'M 620,150 L 648,148 L 665,158 L 668,178 L 658,200 L 640,210 L 622,202 L 612,182 L 614,162 Z',
  },
  // Southeast Asia
  {
    id: 'sea',
    d: 'M 700,160 L 740,155 L 760,165 L 765,182 L 750,192 L 730,195 L 710,188 L 698,175 Z',
  },
  // Australia
  {
    id: 'au',
    d: 'M 720,270 L 768,260 L 808,268 L 825,285 L 822,310 L 805,328 L 778,335 L 748,330 L 725,315 L 715,295 Z',
  },
  // Japan & Korea
  {
    id: 'jp',
    d: 'M 800,100 L 820,95 L 830,105 L 825,118 L 810,120 L 798,112 Z',
  },
  // Greenland
  {
    id: 'gl',
    d: 'M 230,20 L 270,15 L 295,25 L 290,45 L 265,52 L 238,45 Z',
  },
]

// ── Landmass pseudo-random coords for GDELT events ─────────────────────────
const GDELT_SEED_COORDS: Array<[number, number]> = [
  [40, 20], [35, 35], [51, 30], [48, 15], [33, 44],
  [25, 45], [15, 30], [10, 5], [5, -75], [19, -100],
  [35, -90], [45, -100], [55, 25], [60, 30], [35, 105],
  [25, 85], [10, 105], [-20, 130], [35, 135], [45, 130],
]

// ── Tooltip types ──────────────────────────────────────────────────────────
interface TooltipState {
  x: number
  y: number
  content: string
  type: 'earthquake' | 'gdelt' | 'weather'
}

// ── Sonar ring animation ───────────────────────────────────────────────────
function SonarPin({
  cx, cy, r, color, delay = 0,
}: {
  cx: number; cy: number; r: number; color: string; delay?: number
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.9} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1}>
        <animate
          attributeName="r"
          from={r}
          to={r * 5}
          dur="2s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.7"
          to="0"
          dur="2s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.5}>
        <animate
          attributeName="r"
          from={r}
          to={r * 8}
          dur="2s"
          begin={`${delay + 0.4}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.4"
          to="0"
          dur="2s"
          begin={`${delay + 0.4}s`}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  )
}

// ── Grid lines (lat/lon) ───────────────────────────────────────────────────
function GridLines() {
  const lines: React.ReactNode[] = []
  // Latitude lines every 30°
  for (let lat = -60; lat <= 90; lat += 30) {
    const [, y] = latLonToXY(lat, 0)
    lines.push(
      <line
        key={`lat-${lat}`}
        x1={0} y1={y} x2={MAP_W} y2={y}
        stroke="#ffffff" strokeWidth={0.3} opacity={0.08}
      />
    )
  }
  // Longitude lines every 30°
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = latLonToXY(0, lon)
    lines.push(
      <line
        key={`lon-${lon}`}
        x1={x} y1={0} x2={x} y2={MAP_H}
        stroke="#ffffff" strokeWidth={0.3} opacity={0.08}
      />
    )
  }
  return <g>{lines}</g>
}

export default function WorldEventMap() {
  const earthquakes = useStore((s) => s.earthquakes)
  const gdeltEvents = useStore((s) => s.gdeltEvents)
  const weather     = useStore((s) => s.weather)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [scanY, setScanY]     = useState(0)
  const svgRef                = useRef<SVGSVGElement>(null)
  const animRef               = useRef<number>(0)

  // Scan-line animation
  useEffect(() => {
    let start: number | null = null
    const duration = 4000
    function tick(ts: number) {
      if (!start) start = ts
      const progress = ((ts - start) % duration) / duration
      setScanY(progress * MAP_H)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Process earthquakes into pins
  const earthquakePins = useMemo(() => {
    return earthquakes
      .slice(0, 40)
      .map((eq: Record<string, unknown>, i: number) => {
        // USGS format: properties.mag, geometry.coordinates [lon, lat, depth]
        const props = (eq.properties as Record<string, unknown>) ?? {}
        const geo   = (eq.geometry  as Record<string, unknown>) ?? {}
        const coords = (geo.coordinates as number[]) ?? [0, 0]
        const mag  = typeof props.mag === 'number' ? props.mag : 2
        const lon  = coords[0] ?? 0
        const lat  = coords[1] ?? 0
        const place = typeof props.place === 'string' ? props.place : 'Unknown'
        const [x, y] = latLonToXY(lat, lon)
        return { x, y, mag, place, id: `eq-${i}` }
      })
      .filter((p) => p.x > 0 && p.x < MAP_W && p.y > 0 && p.y < MAP_H)
  }, [earthquakes])

  // Process GDELT events into pins
  const gdeltPins = useMemo(() => {
    return gdeltEvents.slice(0, 20).map((ev: Record<string, unknown>, i: number) => {
      const seed = GDELT_SEED_COORDS[i % GDELT_SEED_COORDS.length]
      const lat  = seed[0] + (i * 7.3) % 8 - 4
      const lon  = seed[1] + (i * 11.1) % 12 - 6
      const [x, y] = latLonToXY(lat, lon)
      const title  = typeof ev.title === 'string' ? ev.title : 'Conflict event'
      return { x, y, title, id: `gdelt-${i}` }
    })
  }, [gdeltEvents])

  // Weather pin
  const weatherPin = useMemo(() => {
    if (!weather) return null
    // weather may have lat/lon or a city name
    const w = weather as Record<string, unknown>
    const lat = typeof w.lat === 'number' ? w.lat : 34.05
    const lon = typeof w.lon === 'number' ? w.lon : -118.24
    const [x, y] = latLonToXY(lat, lon)
    const name = typeof w.name === 'string' ? w.name : 'Weather Alert'
    return { x, y, name }
  }, [weather])

  const totalEvents = earthquakePins.length + gdeltPins.length + (weatherPin ? 1 : 0)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    void e // prevent unused var lint
  }

  function showTooltip(
    e: React.MouseEvent<SVGElement>,
    content: string,
    type: TooltipState['type']
  ) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      content,
      type,
    })
  }

  return (
    <div style={{
      background:   CHART.surf2,
      border:       `1px solid ${CHART.border2}`,
      borderRadius: '12px',
      padding:      '0',
      marginBottom: '16px',
      overflow:     'hidden',
      position:     'relative',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 16px 10px',
        borderBottom:   `1px solid ${CHART.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: CHART.rose,
            boxShadow: `0 0 8px ${CHART.rose}`,
            display: 'inline-block',
          }}>
            <style>{`@keyframes wem-pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </span>
          <span style={{
            fontSize:      '11px',
            fontWeight:    900,
            letterSpacing: '2px',
            color:         CHART.text,
            fontFamily:    'monospace',
          }}>
            GLOBAL EVENT MONITOR
          </span>
        </div>
        <div style={{
          background:   `${CHART.rose}22`,
          border:       `1px solid ${CHART.rose}55`,
          borderRadius: '20px',
          padding:      '2px 10px',
          fontSize:     '10px',
          fontWeight:   700,
          color:        CHART.rose,
          fontFamily:   'monospace',
        }}>
          {totalEvents} LIVE EVENTS
        </div>
      </div>

      {/* SVG Map */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ width: '100%', height: '400px', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <filter id="wem-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="wem-glow-sm">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Ocean background */}
          <rect width={MAP_W} height={MAP_H} fill={CHART.bg} />
          <rect width={MAP_W} height={MAP_H} fill={`${CHART.burgundy}08`} />

          {/* Grid lines */}
          <GridLines />

          {/* Continents */}
          {CONTINENTS.map((c) => (
            <path
              key={c.id}
              d={c.d}
              fill={`${CHART.burgundy}4d`}
              stroke={`${CHART.rose}44`}
              strokeWidth={0.8}
            />
          ))}

          {/* Scan line */}
          <line
            x1={0} y1={scanY} x2={MAP_W} y2={scanY}
            stroke={CHART.rose}
            strokeWidth={0.5}
            opacity={0.25}
          />
          <rect
            x={0} y={scanY - 20} width={MAP_W} height={20}
            fill={`${CHART.rose}04`}
          />

          {/* GDELT pins (orange) */}
          {gdeltPins.map((p, i) => (
            <g
              key={p.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, p.title, 'gdelt')}
              onMouseLeave={() => setTooltip(null)}
            >
              <SonarPin
                cx={p.x} cy={p.y} r={2.5}
                color={CHART.orange}
                delay={i * 0.15}
              />
            </g>
          ))}

          {/* Weather pin (blue) */}
          {weatherPin && (
            <g
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, weatherPin.name, 'weather')}
              onMouseLeave={() => setTooltip(null)}
            >
              <SonarPin
                cx={weatherPin.x} cy={weatherPin.y} r={4}
                color={CHART.sky}
                delay={0}
              />
            </g>
          )}

          {/* Earthquake pins (red, size by magnitude) */}
          {earthquakePins.map((p, i) => {
            const r = Math.max(2, Math.min(8, (p.mag - 1) * 1.2))
            return (
              <g
                key={p.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) =>
                  showTooltip(e, `M${p.mag.toFixed(1)} — ${p.place}`, 'earthquake')
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <SonarPin
                  cx={p.x} cy={p.y} r={r}
                  color={CHART.red}
                  delay={i * 0.1}
                />
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                position:     'absolute',
                left:         Math.min(tooltip.x + 12, 700),
                top:          Math.max(0, tooltip.y - 30),
                background:   CHART.surf3,
                border:       `1px solid ${
                  tooltip.type === 'earthquake' ? CHART.red
                  : tooltip.type === 'weather'  ? CHART.sky
                  : CHART.orange
                }66`,
                borderRadius: '6px',
                padding:      '5px 10px',
                fontSize:     '10px',
                fontFamily:   'monospace',
                color:        CHART.text,
                pointerEvents: 'none',
                maxWidth:     '260px',
                zIndex:       10,
                lineHeight:   1.4,
                boxShadow:    '0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              <span style={{
                color: tooltip.type === 'earthquake' ? CHART.red
                     : tooltip.type === 'weather'    ? CHART.sky
                     : CHART.orange,
                fontWeight: 700,
                marginRight: '4px',
              }}>
                {tooltip.type === 'earthquake' ? '🔴' : tooltip.type === 'weather' ? '🔵' : '🟠'}
              </span>
              {tooltip.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div style={{
        display:    'flex',
        gap:        '16px',
        padding:    '8px 16px',
        borderTop:  `1px solid ${CHART.border}`,
        flexWrap:   'wrap',
      }}>
        {[
          { color: CHART.red,    label: `Seismic (${earthquakePins.length})` },
          { color: CHART.orange, label: `Conflict (${gdeltPins.length})` },
          { color: CHART.sky,    label: 'Weather' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: color,
              boxShadow: `0 0 4px ${color}`,
            }} />
            <span style={{ fontSize: '9px', color: CHART.text3, fontFamily: 'monospace' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
