// ── components/recon/HeadersAudit ───────────────────────────
// HTTP Security Header Audit — graded report of security headers.
// Routes through /api/headers (server proxy) to avoid CORS.

'use client'

import { useState } from 'react'

interface HeaderCheck {
  key:      string
  label:    string
  present:  boolean | null
  value:    string | null
  grade:    'pass' | 'warn' | 'fail'
  tip:      string
}

const CHECKS: { key: string; label: string; required: boolean; tip: string }[] = [
  { key: 'strict-transport-security',    label: 'HSTS',           required: true,  tip: 'Forces HTTPS. Missing means users can be downgraded to HTTP.' },
  { key: 'content-security-policy',      label: 'CSP',            required: true,  tip: 'Prevents XSS and data injection. One of the most important headers.' },
  { key: 'x-frame-options',              label: 'X-Frame-Options', required: true, tip: 'Prevents clickjacking. Should be DENY or SAMEORIGIN.' },
  { key: 'x-content-type-options',       label: 'X-Content-Type', required: true,  tip: 'Prevents MIME sniffing. Should be "nosniff".' },
  { key: 'referrer-policy',              label: 'Referrer-Policy', required: false, tip: 'Controls how much referrer info is shared. Prefer "strict-origin-when-cross-origin".' },
  { key: 'permissions-policy',           label: 'Permissions-Policy', required: false, tip: 'Restricts browser features (camera, mic, geolocation). Good practice.' },
  { key: 'cross-origin-opener-policy',   label: 'COOP',           required: false, tip: 'Isolates browsing context. Prevents cross-origin attacks.' },
  { key: 'cross-origin-embedder-policy', label: 'COEP',           required: false, tip: 'Required for SharedArrayBuffer. Enables process isolation.' },
  { key: 'x-xss-protection',            label: 'X-XSS-Protection', required: false, tip: 'Legacy XSS filter. Modern browsers ignore it, but still scored.' },
]

function gradeHeader(key: string, value: string | null): 'pass' | 'warn' | 'fail' {
  if (!value) return 'fail'
  if (key === 'x-frame-options' && !/(deny|sameorigin)/i.test(value)) return 'warn'
  if (key === 'x-content-type-options' && !/nosniff/i.test(value))    return 'warn'
  if (key === 'strict-transport-security' && !value.includes('max-age')) return 'warn'
  return 'pass'
}

function calcScore(checks: HeaderCheck[]): number {
  const required = checks.filter(c => CHECKS.find(r => r.key === c.key)?.required)
  const optional = checks.filter(c => !CHECKS.find(r => r.key === c.key)?.required)
  const reqPass  = required.filter(c => c.grade === 'pass').length
  const optPass  = optional.filter(c => c.grade === 'pass').length
  return Math.round((reqPass / required.length) * 80 + (optPass / optional.length) * 20)
}

function GradeIcon({ grade }: { grade: 'pass' | 'warn' | 'fail' | null }) {
  if (grade === null) return <span style={{ color: 'var(--text3)' }}>○</span>
  const col = grade === 'pass' ? '#10b981' : grade === 'warn' ? '#f59e0b' : '#ef4444'
  const icon = grade === 'pass' ? '✓' : grade === 'warn' ? '!' : '✗'
  return <span style={{ color: col, fontWeight: 900, fontSize: '13px' }}>{icon}</span>
}

function ScoreRing({ score }: { score: number }) {
  const col = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Secure' : score >= 50 ? 'Moderate' : 'Weak'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
      <div style={{ fontSize: '28px', fontWeight: 900, color: col, fontFamily: 'monospace', lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: col }}>{label}</div>
      <div style={{ fontSize: '9px', color: 'var(--text3)' }}>/ 100</div>
    </div>
  )
}

export default function HeadersAudit() {
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [checks,  setChecks]  = useState<HeaderCheck[] | null>(null)
  const [score,   setScore]   = useState<number | null>(null)
  const [status,  setStatus]  = useState<number | null>(null)
  const [error,   setError]   = useState('')

  async function run() {
    const raw = url.trim()
    if (!raw) return
    setLoading(true)
    setError('')
    setChecks(null)
    setScore(null)
    setStatus(null)
    try {
      const r   = await fetch(`/api/headers?url=${encodeURIComponent(raw)}`)
      const data = await r.json()
      if (data.error) { setError(data.error); setLoading(false); return }

      setStatus(data.status)
      const built: HeaderCheck[] = CHECKS.map(def => {
        const value = data.security[def.key] ?? null
        const grade = gradeHeader(def.key, value)
        return { key: def.key, label: def.label, present: value !== null, value, grade, tip: def.tip }
      })
      setChecks(built)
      setScore(calcScore(built))
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  const INPUT: React.CSSProperties = {
    background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text)', fontSize: '13px', padding: '8px 12px', outline: 'none',
    flex: 1, minWidth: '200px', boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input
          style={INPUT}
          placeholder="example.com or https://example.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void run() }}
        />
        <button onClick={() => void run()} disabled={loading} style={{
          padding: '8px 18px', borderRadius: '8px', border: 'none',
          background: 'var(--accent)', color: '#fff', fontWeight: 700,
          fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        }}>
          {loading ? 'Checking…' : '🔍 Audit Headers'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--flo)', fontSize: '12px', marginBottom: '10px' }}>{error}</div>}

      {checks && score !== null && (
        <div>
          {/* Score row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px',
            background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <ScoreRing score={score} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{url}</div>
              {status !== null && (
                <div style={{ fontSize: '11px', color: status < 400 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                  HTTP {status}
                </div>
              )}
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                {checks.filter(c => c.grade === 'pass').length} passing ·{' '}
                {checks.filter(c => c.grade === 'warn').length} warnings ·{' '}
                {checks.filter(c => c.grade === 'fail').length} missing
              </div>
            </div>
          </div>

          {/* Header table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {checks.map(c => (
              <div key={c.key} style={{
                display: 'grid', gridTemplateColumns: '18px 120px 1fr',
                gap: '8px', alignItems: 'flex-start',
                background: 'var(--surf2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '9px 12px',
              }}>
                <GradeIcon grade={c.grade} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{c.label}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '1px' }}>{c.key}</div>
                </div>
                <div>
                  {c.value
                    ? <div style={{ fontSize: '10px', color: 'var(--text)', wordBreak: 'break-all' }}>{c.value.slice(0, 120)}{c.value.length > 120 ? '…' : ''}</div>
                    : <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{c.tip}</div>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
