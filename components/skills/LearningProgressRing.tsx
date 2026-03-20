'use client'

// ── components/skills/LearningProgressRing.tsx ────────────────────────────────
// 3 animated SVG ring gauges showing learning metrics with count-up numbers

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { CHART } from '@/lib/chartTheme'

interface RingMetric {
  label:    string
  value:    number
  max:      number
  unit:     string
  color:    string
  subLabel: string
}

const METRICS: RingMetric[] = [
  {
    label:    'Skills Acquired',
    value:    24,
    max:      30,
    unit:     '/30',
    color:    CHART.rose,
    subLabel: '80% complete',
  },
  {
    label:    'Accuracy Rate',
    value:    94,
    max:      100,
    unit:     '%',
    color:    CHART.gold,
    subLabel: 'high confidence',
  },
  {
    label:    'Adaptations',
    value:    156,
    max:      200,
    unit:     '',
    color:    CHART.teal,
    subLabel: 'total events',
  },
]

// ── Animated count-up using requestAnimationFrame ─────────────────────────────
function useCountUp(target: number, duration: number, active: boolean) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    startRef.current = null

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(ease * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, active])

  return current
}

// ── Single ring gauge ─────────────────────────────────────────────────────────
interface RingProps {
  metric: RingMetric
  delay:  number
  active: boolean
}

function RingGauge({ metric, delay, active }: RingProps) {
  const R_OUTER = 52
  const R_INNER = 40
  const STROKE_W_OUTER = 7
  const STROKE_W_INNER = 5
  const SIZE = 130
  const CX = SIZE / 2
  const CY = SIZE / 2

  const circumference = 2 * Math.PI * R_OUTER
  const pct = metric.value / metric.max
  const dashOffset = circumference * (1 - pct)

  const innerCircumference = 2 * Math.PI * R_INNER
  const innerPct = Math.min(pct * 0.85, 1)
  const innerOffset = innerCircumference * (1 - innerPct)

  const countValue = useCountUp(metric.value, 1200, active)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        flex: 1,
      }}
    >
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background rings */}
          <circle
            cx={CX} cy={CY} r={R_OUTER}
            fill="none"
            stroke={CHART.border2}
            strokeWidth={STROKE_W_OUTER}
          />
          <circle
            cx={CX} cy={CY} r={R_INNER}
            fill="none"
            stroke={CHART.border}
            strokeWidth={STROKE_W_INNER}
          />

          {/* Outer progress ring */}
          <circle
            cx={CX} cy={CY} r={R_OUTER}
            fill="none"
            stroke={metric.color}
            strokeWidth={STROKE_W_OUTER}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: active ? 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              filter: `drop-shadow(0 0 4px ${metric.color}88)`,
            }}
          />

          {/* Inner progress ring */}
          <circle
            cx={CX} cy={CY} r={R_INNER}
            fill="none"
            stroke={`${metric.color}66`}
            strokeWidth={STROKE_W_INNER}
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerOffset}
            style={{
              transition: active ? 'stroke-dashoffset 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s' : 'none',
            }}
          />
        </svg>

        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: metric.color,
            letterSpacing: '-0.5px',
          }}>
            {countValue}
            <span style={{ fontSize: '12px', fontWeight: 700, color: CHART.text2, marginLeft: '1px' }}>
              {metric.unit}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            color: CHART.text3,
            fontFamily: 'monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginTop: '2px',
          }}>
            {metric.subLabel}
          </div>
        </div>

        {/* Glow dot at progress end */}
        <motion.div
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: metric.color,
            boxShadow: `0 0 8px ${metric.color}`,
            top: CY - R_OUTER - STROKE_W_OUTER / 2 - 1,
            left: CX - 5,
            transformOrigin: `5px ${R_OUTER + STROKE_W_OUTER / 2 + 1}px`,
          }}
          animate={active ? { rotate: pct * 360 - 90 } : { rotate: -90 }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: CHART.text,
          letterSpacing: '0.3px',
          fontFamily: 'monospace',
        }}>
          {metric.label}
        </div>
        <div style={{
          marginTop: '4px',
          height: '2px',
          width: '48px',
          background: `linear-gradient(to right, ${metric.color}, transparent)`,
          borderRadius: '1px',
          margin: '4px auto 0',
        }} />
      </div>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LearningProgressRing() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{
        background: CHART.surf2,
        border: `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient accent */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: '100%', height: '40px',
        background: `linear-gradient(to top, ${CHART.surf}80, transparent)`,
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.gold, fontSize: '9px' }}>◆</span>
          Learning Progress Metrics
        </div>
        <div style={{ fontSize: '10px', color: CHART.text3, marginTop: '3px' }}>
          Autonomous skill acquisition & adaptation tracking
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {METRICS.map((metric, i) => (
          <RingGauge
            key={metric.label}
            metric={metric}
            delay={i * 0.12}
            active={isInView}
          />
        ))}
      </div>
    </motion.div>
  )
}
