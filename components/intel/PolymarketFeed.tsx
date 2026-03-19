'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/apiFetch'

interface Market {
  id:          string
  title:       string
  probability: number
  volume:      number
  category:    string
  endDate:     string
}

export default function PolymarketFeed() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Proxied through server route — Polymarket blocks direct browser fetches (CORS)
      const r = await apiFetch('/api/polymarket')
      const d = await r.json()
      const raw = d.events ?? []
      setMarkets(raw.slice(0, 30).map((e: any) => ({
        id:          e.id ?? '',
        title:       e.title ?? e.question ?? '',
        probability: e.markets?.[0]?.outcomePrices
          ? Math.round(parseFloat(JSON.parse(e.markets[0].outcomePrices)[0] ?? '0.5') * 100)
          : 50,
        volume:   Math.round(parseFloat(e.volume ?? '0')),
        category: e.category ?? 'General',
        endDate:  e.endDate ?? '',
      })))
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load on first mount
  useEffect(() => { load() }, [load])

  const cats    = ['all', ...Array.from(new Set(markets.map((m) => m.category)))]
  const visible = filter === 'all' ? markets : markets.filter((m) => m.category === filter)

  const probColor = (p: number) => p >= 70 ? 'var(--fhi)' : p <= 30 ? 'var(--flo)' : 'var(--fmd)'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
          🎲 Polymarket — Prediction Markets
        </span>
        <button onClick={load} disabled={loading} style={{
          marginLeft: 'auto', height: '26px', padding: '0 12px', borderRadius: '6px',
          background: 'var(--accent)', border: 'none', color: '#fff',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        }}>
          {loading ? 'Loading…' : '↻ Load Markets'}
        </button>
      </div>

      {markets.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)} style={{
              height: '24px', padding: '0 9px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700,
              border: '1px solid var(--border2)', cursor: 'pointer',
              background: filter === c ? 'var(--accent)' : 'transparent',
              color: filter === c ? '#fff' : 'var(--text3)',
            }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {!markets.length && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Hit Load Markets to fetch live prediction market odds.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '9px' }}>
        {visible.map((m) => (
          <div key={m.id} style={{
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px 14px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '5px', fontWeight: 600 }}>
              {m.category}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.4, marginBottom: '8px' }}>
              {m.title.slice(0, 90)}{m.title.length > 90 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: probColor(m.probability) }}>
                {m.probability}%
              </span>
              <div style={{ flex: 1, height: '4px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${m.probability}%`, height: '100%', background: probColor(m.probability), borderRadius: '2px' }} />
              </div>
            </div>
            {m.volume > 0 && (
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                Vol ${m.volume.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
