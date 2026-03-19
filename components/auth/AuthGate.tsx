'use client'

/**
 * AuthGate — OpenClaw-style token gate.
 *
 * On first load the app checks sessionStorage for a valid token.
 * If none is found, this component renders a lock screen.
 * The user enters the NEXUS_TOKEN (set in .env.local / server-side).
 * The token is validated against /api/token. On success it is stored
 * in sessionStorage and the gate opens.
 *
 * Token never goes to localStorage — it resets every browser session,
 * just like OpenClaw's connect screen.
 */

import { useState, useEffect, useCallback } from 'react'
import { getSessionToken, validateAndStoreToken } from '@/lib/apiFetch'

interface Props {
  children: React.ReactNode
}

export default function AuthGate({ children }: Props) {
  const [authed,  setAuthed]  = useState<boolean | null>(null) // null = checking
  const [token,   setToken]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // On mount — check if we already have a valid session token
  useEffect(() => {
    const existing = getSessionToken()
    if (existing) {
      // Quick server-side ping to confirm token is still valid
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

  // Lock screen
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>
      <div style={{
        width: '360px',
        background: 'var(--surf)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '32px 28px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div>
          <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.5px' }}>
            NEXUS PRIME
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            Enter your access token to continue
          </div>
        </div>

        {/* Token input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
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
              background: 'var(--surf2)',
              border: `1px solid ${error ? 'var(--flo)' : 'var(--border2)'}`,
              borderRadius: '7px',
              color: 'var(--text)',
              fontSize: '13px',
              padding: '10px 12px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
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
            height: '38px',
            borderRadius: '7px',
            background: loading ? 'var(--border2)' : 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background var(--t)',
          }}
        >
          {loading ? 'Checking…' : 'Connect'}
        </button>

        <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
          Your NEXUS_TOKEN is set in <code style={{ background: 'var(--surf2)', padding: '1px 5px', borderRadius: '4px' }}>.env.local</code> on the server.
        </div>
      </div>
    </div>
  )
}
