'use client'

/**
 * components/system/ErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME error boundary component.
 * Catches React render errors, logs them to the eventBus 'system:error' channel,
 * and displays a styled fallback UI matching the Sadie Sink rose/gold theme.
 * Includes a "Retry" button to unmount/remount children and attempt recovery.
 *
 * Usage:
 *   <ErrorBoundary label="SensorGrid">
 *     <SensorGrid />
 *   </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { eventBus } from '@/lib/eventBus'

// ── Props & State ──────────────────────────────────────────────────────────────
interface Props {
  children:  ReactNode
  label?:    string                    // Descriptive name for error reporting
  fallback?: ReactNode                 // Custom fallback (overrides default)
  onError?:  (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error:    Error | null
  errorKey: number                     // Increment to remount children
}

// ── ErrorBoundary class ────────────────────────────────────────────────────────
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { label = 'unknown', onError } = this.props

    // Emit to global event bus for diagnostics
    eventBus.emit('system:error', {
      source: `ErrorBoundary:${label}`,
      error:  error.message,
      stack:  `${error.stack}\n\nComponent Stack:\n${info.componentStack}`,
      ts:     Date.now(),
    })

    // Call optional custom handler
    onError?.(error, info)

    // Also log to console in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ErrorBoundary:${label}]`, error, info)
    }
  }

  handleRetry = (): void => {
    this.setState((s) => ({
      hasError: false,
      error:    null,
      errorKey: s.errorKey + 1,
    }))
  }

  render(): ReactNode {
    const { hasError, error, errorKey } = this.state
    const { children, label = 'Component', fallback } = this.props

    if (!hasError) {
      return (
        <React.Fragment key={errorKey}>
          {children}
        </React.Fragment>
      )
    }

    if (fallback) return fallback

    return <ErrorFallback label={label} error={error} onRetry={this.handleRetry} />
  }
}

// ── Fallback UI ────────────────────────────────────────────────────────────────
function ErrorFallback({
  label,
  error,
  onRetry,
}: {
  label:   string
  error:   Error | null
  onRetry: () => void
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div
      role="alert"
      style={{
        background:   'var(--surf)',
        border:       '1px solid var(--accent)',
        borderRadius: 'var(--r)',
        padding:      '20px 24px',
        margin:       '8px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Subtle accent glow strip */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       0,
        right:      0,
        height:     '2px',
        background: 'linear-gradient(90deg, var(--accent), var(--accent2), transparent)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{
          fontSize:   '16px',
          lineHeight: 1,
        }}>⚠</span>
        <div>
          <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '13px', letterSpacing: '.02em' }}>
            SYSTEM FAULT — {label.toUpperCase()}
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '2px' }}>
            A render error was caught and logged to diagnostics.
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background:   'var(--bg)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--rs)',
          padding:      '10px 12px',
          marginBottom: '14px',
          color:        'var(--blush)',
          fontSize:     '12px',
          fontFamily:   'monospace',
          wordBreak:    'break-word',
        }}>
          {error.message}
        </div>
      )}

      {/* Stack trace toggle */}
      {error?.stack && (
        <div style={{ marginBottom: '14px' }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: 'none',
              border:     'none',
              color:      'var(--text2)',
              fontSize:   '11px',
              cursor:     'pointer',
              padding:    '0',
              textDecoration: 'underline',
              textDecorationColor: 'var(--border2)',
            }}
          >
            {expanded ? '▲ Hide stack trace' : '▼ Show stack trace'}
          </button>
          {expanded && (
            <pre style={{
              marginTop:    '8px',
              padding:      '10px',
              background:   'var(--bg)',
              border:       '1px solid var(--border)',
              borderRadius: 'var(--rs)',
              fontSize:     '10px',
              color:        'var(--text3)',
              overflowX:    'auto',
              maxHeight:    '200px',
              overflowY:    'scroll',
              whiteSpace:   'pre-wrap',
            }}>
              {error.stack}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRetry}
          style={{
            background:   'var(--accent)',
            color:        'var(--text)',
            border:       'none',
            borderRadius: 'var(--rs)',
            padding:      '7px 16px',
            fontSize:     '12px',
            fontWeight:   600,
            cursor:       'pointer',
            letterSpacing: '.04em',
            transition:   'opacity .15s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = '.8')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
        >
          RETRY
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            background:   'var(--surf2)',
            color:        'var(--text2)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--rs)',
            padding:      '7px 16px',
            fontSize:     '12px',
            fontWeight:   500,
            cursor:       'pointer',
            letterSpacing: '.04em',
            transition:   'border-color .15s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.borderColor = 'var(--border2)')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.borderColor = 'var(--border)')}
        >
          RELOAD PAGE
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary
