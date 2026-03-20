'use client'

// ── components/ui/AnimatedCounter.tsx ─────────────────────────────────────────
// Reusable animated number component using requestAnimationFrame

import { useEffect, useRef, useState } from 'react'
import React from 'react'

export interface AnimatedCounterProps {
  value:     number
  duration?: number           // ms, default 1000
  prefix?:   string
  suffix?:   string
  decimals?: number
  style?:    React.CSSProperties
  className?: string
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function AnimatedCounter({
  value,
  duration = 1000,
  prefix   = '',
  suffix   = '',
  decimals = 0,
  style,
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState<number>(0)
  const rafRef        = useRef<number | null>(null)
  const startRef      = useRef<number | null>(null)
  const prevValueRef  = useRef<number>(0)

  useEffect(() => {
    const startValue = prevValueRef.current
    startRef.current = null

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed  = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easeOutCubic(progress)
      const current  = startValue + (value - startValue) * eased

      setDisplayed(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevValueRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  const formatted = displayed.toFixed(decimals)

  return (
    <span
      style={{
        fontFamily:  'monospace',
        fontVariantNumeric: 'tabular-nums',
        display:     'inline-block',
        ...style,
      }}
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
