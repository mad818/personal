'use client'

/**
 * AuthGate — Sadie Sink themed token gate.
 */

import { useState, useEffect, useCallback } from 'react'
import { getSessionToken, validateAndStoreToken } from '@/lib/apiFetch'

interface Props {
  children: React.ReactNode
}

export default function AuthGate({ children }: Props) {
  const [authed,  setAuthed]  = useState<boolean | null>(null)
  const [token,   setToken]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const existing = getSessionToken()
    if (existing) {
      fetch('/api/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: existing }),
      })
        .then((r) => r.json())
        .then((d) => setAuthed(!!d.ok))
        .catch(() => setAuthed(false))
    } else {
      setAuthed(false)
    }
  }, [])

  const submit = useCallback(async () => {
    if (!token.trim()) { setError('Enter your access token.'); return }
    setLoading(true)
    setError('')
    const ok = await validateAndStoreToken(token.trim())
    if (ok) {
      setAuthed(true)
    } else {
      setError('Invalid token. Check your .env.local NEXUS_TOKEN.')
    }
    setLoading(false)
  }, [token])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }, [submit])

  // Still checking sessionStorage
  if (authed === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <span style={{ color: 'var(--text3)', fontSize: '13px' }}>Checking session…</span>
      </div>
    )
  }

  // Authenticated — show the app
  if (authed) return <>{children}</>

  // Lock screen — Sadie Sink themed
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/theme/sadie-portrait.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        opacity: 0.2,
        filter: 'blur(1px) saturate(0.7)',
      }} />
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, var(--bg) 80%),
          linear-gradient(180deg, rgba(10,7,8,.4) 0%, rgba(10,7,8,.9) 100%)
        `,
      }} />

      <div style={{
        width: '380px',
        background: 'rgba(17, 13, 14, 0.85)',
        border: '1px solid rgba(196,72,90,0.2)',
        borderRadius: '16px',
        padding: '36px 28px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 60px rgba(196,72,90,.08), 0 25px 60px rgba(0,0,0,.6)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px',
            filter: 'drop-shadow(0 0 8px rgba(196,72,90,.4))',
          }}>🔐</div>
          <div style={{
            fontWeight: 900,
            fontSize: '20px',
            color: 'var(--text)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #f5e6ea, #c4485a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NEXUS PRIME
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px', fontStyle: 'italic' }}>
            Enter your access token to continue
          </div>
        </div>

        {/* Token input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Paste your NEXUS_TOKEN…"
            autoFocus
            style={{
              background: 'rgba(26, 18, 20, 0.8)',
              border: `1px solid ${error ? 'var(--flo)' : 'rgba(196,72,90,0.2)'}`,
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              padding: '11px 14px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196,72,90,0.5)'
              e.currentTarget.style.boxShadow = '0 0 16px rgba(196,72,90,.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? 'var(--flo)' : 'rgba(196,72,90,0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {error && (
            <span style={{ fontSize: '11px', color: 'var(--flo)' }}>{error}</span>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading}
          style={{
            height: '40px',
            borderRadius: '8px',
            background: loading
              ? 'var(--border2)'
              : 'linear-gradient(135deg, #c4485a 0%, #d4956a 100%)',
            border: 'none',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all var(--t)',
            letterSpacing: '0.5px',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(196,72,90,.25)',
          }}
        >
          {loading ? 'Checking…' : 'Connect'}
        </button>

        <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
          Your NEXUS_TOKEN is set in <code style={{ background: 'var(--surf2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text2)' }}>.env.local</code> on the server.
        </div>
      </div>
    </div>
  )
}
