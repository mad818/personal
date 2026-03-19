'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { useStore } from '@/store/useStore'

// ── FX pairs to display ───────────────────────────────────────────────────────
const FX_PAIRS = [
  { key: 'EUR', label: 'EUR/USD', invert: true  },
  { key: 'GBP', label: 'GBP/USD', invert: true  },
  { key: 'JPY', label: 'USD/JPY', invert: false },
  { key: 'CNY', label: 'USD/CNY', invert: false },
  { key: 'CHF', label: 'USD/CHF', invert: false },
  { key: 'CAD', label: 'USD/CAD', invert: false },
  { key: 'AUD', label: 'AUD/USD', invert: true  },
]

// ── Precious metals from FX rates ─────────────────────────────────────────────
// open.er-api.com includes XAU, XAG, XPT as currency codes.
// Rate = "how many troy oz per 1 USD" → invert to get USD/troy oz.
const METAL_KEYS = [
  { key: 'XAU', label: 'Gold',     icon: '🥇', unit: '/oz' },
  { key: 'XAG', label: 'Silver',   icon: '⚪', unit: '/oz' },
  { key: 'XPT', label: 'Platinum', icon: '🔵', unit: '/oz' },
]

// ── FRED energy series (optional — needs user's FRED key) ─────────────────────
const ENERGY_SERIES = [
  { id: 'DCOILWTICO',   label: 'WTI Crude',  icon: '🛢️', unit: '/bbl'   },
  { id: 'DCOILBRENTEU', label: 'Brent',       icon: '⛽', unit: '/bbl'   },
  { id: 'DHHNGSP',      label: 'Nat Gas',     icon: '🔥', unit: '/MMBtu' },
]

// ── Change bar ────────────────────────────────────────────────────────────────
function ChgBar({ chg }: { chg: number }) {
  const capped  = Math.max(-3, Math.min(3, chg))
  const isUp    = chg >= 0
  const fillPct = Math.abs(capped) / 3 * 50
  const col     = isUp ? '#10b981' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: '60px', height: '4px', background: 'var(--surf3)', borderRadius: '2px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'var(--border2)' }} />
      <div style={{
        position: 'absolute', top: 0, height: '100%',
        width: `${fillPct}%`,
        left:  isUp ? '50%' : `${50 - fillPct}%`,
        background: col, borderRadius: '2px',
      }} />
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FXRates { [key: string]: number }
interface Quote   { id: string; label: string; icon: string; price: number; chg: number; unit: string }

// ── FRED helper (client-side, CORS open) ──────────────────────────────────────
async function fetchFredSeries(id: string, key: string): Promise<{ latest: number; prev: number }> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&limit=3&sort_order=desc&api_key=${key}&file_type=json`
  const r   = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`FRED ${id} ${r.status}`)
  const d   = await r.json()
  const obs  = (d.observations ?? []).filter((o: { value: string }) => o.value !== '.')
  const latest = parseFloat(obs[0]?.value ?? '0')
  const prev   = parseFloat(obs[1]?.value ?? obs[0]?.value ?? '0')
  return { latest, prev }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MarketRates() {
  const fredKey = useStore((s) => s.settings.fredKey)

  const [fxRates,   setFxRates]   = useState<FXRates>({})
  const [quotes,    setQuotes]    = useState<Quote[]>([])
  const [loading,   setLoading]   = useState(false)
  const [updatedAt, setUpdatedAt] = useState('')

  // Remember previous metal prices between refreshes to derive % change
  const prevMetals = useRef<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // ── FX and metals in parallel ──────────────────────────────────────────
      const [fxRes, metalsRes] = await Promise.all([
        apiFetch('/api/fx'),
        apiFetch('/api/metals'),
      ])
      const fxData    = await fxRes.json()
      const metalsData = await metalsRes.json()
      const rates: FXRates = fxData.rates ?? {}
      setFxRates(rates)
      if (fxData.time_last_update_utc) setUpdatedAt(fxData.time_last_update_utc.slice(0, 16))

      // Metals: CoinGecko PAXG (gold) + goldprice.org (silver/platinum)
      const metalQuotes: Quote[] = (metalsData.metals ?? []).map((m: Quote) => {
        const prev  = prevMetals.current[m.id] ?? m.price
        const chg   = m.chg !== 0 ? m.chg : (prev !== 0 ? ((m.price - prev) / prev) * 100 : 0)
        prevMetals.current[m.id] = m.price
        return { ...m, chg }
      })

      // ── Energy from FRED (only if key is configured) ──────────────────────
      let energyQuotes: Quote[] = []
      if (fredKey) {
        const results = await Promise.allSettled(
          ENERGY_SERIES.map(async (s) => {
            const { latest, prev } = await fetchFredSeries(s.id, fredKey)
            const chg = prev !== 0 ? ((latest - prev) / prev) * 100 : 0
            return { id: s.id, label: s.label, icon: s.icon, price: latest, chg, unit: s.unit } satisfies Quote
          })
        )
        energyQuotes = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<Quote>).value)
      }

      setQuotes([...metalQuotes, ...energyQuotes])
    } catch {
      // silent — FX failing will leave metals empty too, which is correct
    } finally {
      setLoading(false)
    }
  }, [fredKey])

  useEffect(() => { load() }, [load])

  const hasFX     = Object.keys(fxRates).length > 0
  const hasQuotes = quotes.length > 0

  return (
    <div style={{ marginTop: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
          💱 FX &amp; Commodities
        </span>
        {updatedAt && (
          <span style={{ fontSize: '10px', color: 'var(--text3)' }}>· {updatedAt} UTC</span>
        )}
        <button onClick={load} disabled={loading} style={{
          marginLeft: 'auto', height: '24px', padding: '0 10px', borderRadius: '6px',
          background: 'transparent', border: '1px solid var(--border2)',
          color: 'var(--text3)', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
        }}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* ── FX panel ── */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>
            FX Rates · USD base
          </div>
          {!hasFX && (
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
              {loading ? 'Fetching rates…' : 'No data'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {FX_PAIRS.map(({ key, label, invert }) => {
              const raw = fxRates[key]
              if (!raw) return null
              const rate = invert ? 1 / raw : raw
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', minWidth: '68px', fontFamily: 'monospace' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)', flex: 1 }}>
                    {rate.toFixed(4)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Commodities panel ── */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>
            Spot Prices{fredKey ? ' · Metals + Energy' : ' · Precious Metals'}
          </div>
          {!hasQuotes && (
            <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
              {loading ? 'Fetching prices…' : 'No data'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {quotes.map((q) => {
              const col = q.chg >= 0 ? '#10b981' : '#ef4444'
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>{q.icon}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 600, minWidth: '60px' }}>
                    {q.label}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)', flex: 1 }}>
                    ${q.price < 10 ? q.price.toFixed(3) : q.price < 100 ? q.price.toFixed(2) : Math.round(q.price).toLocaleString()}
                    <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 400 }}>{q.unit}</span>
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: col, minWidth: '46px', textAlign: 'right' }}>
                    {q.chg !== 0 ? `${q.chg >= 0 ? '+' : ''}${q.chg.toFixed(2)}%` : '—'}
                  </span>
                  {q.chg !== 0 && <ChgBar chg={q.chg} />}
                </div>
              )
            })}
          </div>
          {!fredKey && hasQuotes && (
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              Add a FRED key in Settings to also see WTI, Brent &amp; Nat Gas.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
