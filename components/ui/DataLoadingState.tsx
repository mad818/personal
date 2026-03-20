'use client'

import { CSSProperties } from 'react'

interface DataLoadingStateProps {
  dataName: string
  height?:  number
  style?:   CSSProperties
}

const DOT_DELAYS = ['0s', '0.18s', '0.36s']

export default function DataLoadingState({
  dataName,
  height = 200,
  style,
}: DataLoadingStateProps) {
  return (
    <div style={{
      height:         `${height}px`,
      borderRadius:   '10px',
      border:         '1px solid var(--border)',
      background:     'var(--surf2)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '14px',
      overflow:       'hidden',
      position:       'relative',
      ...style,
    }}>
      {/* Shimmer bar */}
      <div style={{
        position: 'absolute',
        inset:    0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(196,72,90,0.04) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'nexus-shimmer 1.8s ease-in-out infinite',
      }} />

      {/* Pulsing dots */}
      <div style={{ display: 'flex', gap: '6px', position: 'relative', zIndex: 1 }}>
        {DOT_DELAYS.map((delay, i) => (
          <div
            key={i}
            style={{
              width:        '7px',
              height:       '7px',
              borderRadius: '50%',
              background:   'rgba(196,72,90,0.7)',
              animation:    `nexus-pulse-dot 1.2s ease-in-out ${delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div style={{
        fontSize:   '11px',
        fontWeight: 600,
        color:      'var(--text3)',
        position:   'relative',
        zIndex:     1,
        fontFamily: 'monospace',
        letterSpacing: '0.4px',
      }}>
        Loading {dataName}...
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes nexus-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes nexus-pulse-dot {
          0%, 80%, 100% { transform: scale(1);   opacity: 0.5; }
          40%           { transform: scale(1.4); opacity: 1;   }
        }
      ` }} />
    </div>
  )
}
