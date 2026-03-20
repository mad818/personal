'use client'

// ── components/ui/LoadingSkeleton.tsx ─────────────────────────────────────────
// Reusable skeleton loading component with shimmer animation

import { CHART } from '@/lib/chartTheme'
import React from 'react'

export interface LoadingSkeletonProps {
  width?:   string | number
  height?:  string | number
  variant?: 'card' | 'chart' | 'text' | 'circle'
  style?:   React.CSSProperties
}

const SHIMMER_KEYFRAMES = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
`

const SHIMMER_GRADIENT = `linear-gradient(
  90deg,
  ${CHART.surf2} 0%,
  ${CHART.surf3} 40%,
  ${CHART.surf2} 80%,
  ${CHART.surf2} 100%
)`

function getVariantStyle(variant: LoadingSkeletonProps['variant']): React.CSSProperties {
  switch (variant) {
    case 'circle':
      return { borderRadius: '50%' }
    case 'text':
      return { borderRadius: '4px', height: '12px' }
    case 'chart':
      return { borderRadius: '8px', minHeight: '200px' }
    case 'card':
    default:
      return { borderRadius: '10px' }
  }
}

export function LoadingSkeleton({
  width   = '100%',
  height  = '100%',
  variant = 'card',
  style,
}: LoadingSkeletonProps) {
  const variantStyle = getVariantStyle(variant)

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        style={{
          width,
          height,
          background:           SHIMMER_GRADIENT,
          backgroundSize:       '200% 100%',
          animation:            'skeleton-shimmer 1.8s ease-in-out infinite',
          border:               `1px solid ${CHART.border}`,
          ...variantStyle,
          ...style,
        }}
        aria-hidden="true"
      />
    </>
  )
}

// ── Preset: chart area skeleton ────────────────────────────────────────────────
export function ChartSkeleton({ height = 280, style }: { height?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:   CHART.surf2,
      border:       `1px solid ${CHART.border}`,
      borderRadius: '12px',
      padding:      '20px',
      ...style,
    }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <LoadingSkeleton variant="text" width="35%" height={12} />
        <LoadingSkeleton variant="text" width="55%" height={10} />
      </div>

      {/* Chart area skeleton */}
      <LoadingSkeleton variant="chart" height={height} />

      {/* Footer skeleton */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <LoadingSkeleton variant="text" width="18%" height={9} />
        <LoadingSkeleton variant="text" width="18%" height={9} />
        <LoadingSkeleton variant="text" width="18%" height={9} />
      </div>
    </div>
  )
}

export default LoadingSkeleton
