'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import { timeAgo } from '@/lib/helpers'

interface ConflictItem {
  title:    string
  url:      string
  impact:   'critical' | 'high' | 'medium' | 'low'
  category: string
  date:     string
}

const IMPACT_COLORS = {
  critical: { bg: 'rgba(239,68,68,.2)',   text: '#ef4444' },
  high:     { bg: 'rgba(245,158,11,.18)', text: '#f59e0b' },
  medium:   { bg: 'rgba(99,102,241,.18)', text: '#818cf8' },
  low:      { bg: 'rgba(16,185,129,.12)', text: '#10b981' },
}

const IMPACT_LEVEL: Record<ConflictItem['impact'], number> = {
  low: 1, medium: 2, high: 3, critical: 4,
}

/** 4-segment escalation meter */
function ImpactMeter({ impact }: { impact: ConflictItem['impact'] }) {
  const level = IMPACT_LEVEL[impact]
  const col   = IMPACT_COLORS[impact].text
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginTop: '5px' }}>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} style={{
          flex: 1, height: '3px', borderRadius: '2px',
          background: n <= level ? col : 'var(--surf3)',
        }} />
      ))}
    </div>
  )
}

const CRITICAL_KW = ['nuclear','strike','killed','casualties','airstrike','invasion','bomb','missile','attack']
const HIGH_KW     = ['troops','offensive','sanctions','drone','rocket','blockade','coup','war','conflict']
const MEDIUM_KW   = ['tension','threat','diplomacy','protest','dispute','standoff','warning','crisis']

function scoreImpact(title: string): ConflictItem['impact'] {
  const t = title.toLowerCase()
  if (CRITICAL_KW.some((k) => t.includes(k))) return 'critical'
  if (HIGH_KW.some((k) => t.includes(k)))     return 'high'
  if (MEDIUM_KW.some((k) => t.includes(k)))   return 'medium'
  return 'low'
}

// ── GDELT Intelligence section ───────────────────────────────────────────────

function GdeltSection() {
  const gdeltEvents = useStore((s) => s.gdeltEvents)

  if (!gdeltEvents.length) return null

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px',
      }}>
        🛰️ GDELT Intelligence
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {gdeltEvents.slice(0, 20).map((article: any, i: number) => {
          const domain = article.domain ?? (article.url ? (() => {
            try { return new URL(article.url).hostname.replace('www.', '') } catch { return '' }
          })() : '')
          const ts = article.seendate ?? article.publishdate ?? ''
          return (
            <a
              key={i}
              href={article.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column', gap: '4px',
                background: 'var(--surf2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '10px 12px', textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                {article.title}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {domain && (
                  <span style={{
                    fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px',
                    background: 'var(--surf3)', color: 'var(--text3)',
                  }}>
                    {domain}
                  </span>
                )}
                {ts && (
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
                    {timeAgo(ts)}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default function ConflictFeed() {
  const [items,   setItems]   = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState<string>('all')
  const [error,   setError]   = useState('')
  const setWorldRisk = useStore((s) => s.setWorldRisk)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Proxied through Next.js server route — GDELT blocks direct browser fetches (CORS)
      const r   = await apiFetch('/api/conflict', { signal: AbortSignal.timeout(15000) })
      const d   = await r.json()
      if (d.error && !d.articles?.length) {
        setError('Could not load conflict data.')
        setLoading(false)
        return
      }
      const raw = (d.articles ?? []) as { title: string; url: string; seendate?: string }[]
      const parsed = raw.map((a) => ({
        title:    a.title,
        url:      a.url,
        impact:   scoreImpact(a.title),
        category: 'Geopolitical',
        date:     a.seendate ?? '',
      }))
      setItems(parsed)
      // Publish risk count to store so COMMAND tab KPI card can read it
      const riskCount = parsed.filter((i) => i.impact === 'critical' || i.impact === 'high').length
      setWorldRisk(riskCount)
    } catch {
      setError('Could not load conflict data.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load on first mount
  useEffect(() => { load() }, [load])

  const visible = filter === 'all' ? items : items.filter((i) => i.impact === filter)
  const FILTERS = ['all', 'critical', 'high', 'medium', 'low']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
          ⚡ Conflict Intelligence
        </span>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              height: '24px', padding: '0 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700,
              border: '1px solid var(--border2)', cursor: 'pointer',
              background: filter === f ? 'var(--accent)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text3)',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={load} disabled={loading} style={{
            height: '24px', padding: '0 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700,
            border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer',
          }}>
            {loading ? '…' : '↻ Load'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--flo)', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}

      {!items.length && !loading && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          No conflict events found.
        </div>
      )}
      {!items.length && loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Loading conflict intelligence…
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {visible.map((item, i) => {
          const col = IMPACT_COLORS[item.impact]
          return (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'var(--surf2)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '10px 12px', textDecoration: 'none',
            }}>
              <span style={{
                flexShrink: 0, fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px',
                background: col.bg, color: col.text, textTransform: 'uppercase', marginTop: '2px',
              }}>
                {item.impact}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.4 }}>{item.title}</span>
                <ImpactMeter impact={item.impact} />
              </div>
            </a>
          )
        })}
      </div>

      {/* GDELT real-time intelligence — from global store */}
      <GdeltSection />
    </div>
  )
}
