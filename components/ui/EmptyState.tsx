'use client'

import { CSSProperties } from 'react'

interface EmptyStateProps {
  icon:         string
  title:        string
  subtitle:     string
  actionLabel?: string
  onAction?:    () => void
  style?:       CSSProperties
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '40px 24px',
      textAlign:      'center',
      ...style,
    }}>
      {/* Bobbing icon */}
      <div style={{
        fontSize:  '40px',
        lineHeight: 1,
        marginBottom: '16px',
        animation: 'nex-float 3s ease-in-out infinite',
      }}>
        {icon}
      </div>

      {/* Title */}
      <div style={{
        fontSize:    '14px',
        fontWeight:  700,
        color:       'var(--text)',
        marginBottom: '6px',
        letterSpacing: '0.1px',
      }}>
        {title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize:  '12px',
        color:     'var(--text3)',
        maxWidth:  '280px',
        lineHeight: 1.5,
        marginBottom: actionLabel ? '20px' : 0,
      }}>
        {subtitle}
      </div>

      {/* Optional action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding:      '7px 18px',
            borderRadius: '8px',
            border:       '1px solid rgba(196,72,90,0.4)',
            background:   'rgba(196,72,90,0.12)',
            color:        '#c4485a',
            fontSize:     '12px',
            fontWeight:   700,
            cursor:       'pointer',
            transition:   'background 0.15s, border-color 0.15s',
          }}
        >
          {actionLabel}
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes nex-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      ` }} />
    </div>
  )
}
