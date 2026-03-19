import { NextResponse } from 'next/server'

// Server-side commodity prices.
// Precious metals + copper: metals.live (free, no key, real-time spot prices)
// Energy (WTI crude, nat gas): FRED API if FRED_KEY is set
//
// metals.live returns spot prices in USD — no % change available, so we
// cache the previous response in memory to derive an approximate 1h delta.

export const dynamic = 'force-dynamic'

// Simple in-process cache to derive % change between fetches
const _prev: Record<string, number> = {}

interface MetalsResp { [metal: string]: number }

// Map metals.live keys to display metadata
const METALS_META: Record<string, { label: string; icon: string; unit: string; sym: string }> = {
  gold:      { label: 'Gold',     icon: '🥇', unit: '/oz', sym: 'XAU' },
  silver:    { label: 'Silver',   icon: '⚪', unit: '/oz', sym: 'XAG' },
  platinum:  { label: 'Platinum', icon: '🔵', unit: '/oz', sym: 'XPT' },
  copper:    { label: 'Copper',   icon: '🔶', unit: '/lb', sym: 'HG'  },
}

async function fetchMetals() {
  const r = await fetch(
    'https://api.metals.live/v1/spot/gold,silver,platinum,copper',
    { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }
  )
  if (!r.ok) throw new Error(`metals.live ${r.status}`)
  return (await r.json()) as MetalsResp[]
}

// FRED series for energy
const ENERGY_SERIES: { id: string; label: string; icon: string; unit: string; scale: number }[] = [
  { id: 'DCOILWTICO', label: 'WTI Crude',  icon: '🛢️', unit: '/bbl', scale: 1 },
  { id: 'DHHNGSP',    label: 'Nat Gas',    icon: '🔥', unit: '/MMBtu', scale: 1 },
  { id: 'DCOILBRENTEU', label: 'Brent',    icon: '⛽', unit: '/bbl', scale: 1 },
]

async function fetchEnergyFromFRED(fredKey: string) {
  const results = await Promise.allSettled(
    ENERGY_SERIES.map(async (s) => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&limit=2&sort_order=desc&api_key=${fredKey}&file_type=json`
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!r.ok) throw new Error(`FRED ${s.id} ${r.status}`)
      const d = await r.json()
      const obs = (d.observations ?? []).filter((o: { value: string }) => o.value !== '.')
      if (obs.length < 1) throw new Error('No obs')
      const latest = parseFloat(obs[0].value)
      const prev   = obs.length >= 2 ? parseFloat(obs[1].value) : latest
      const chg    = prev !== 0 ? ((latest - prev) / prev) * 100 : 0
      return { symbol: s.id, name: s.label, price: latest * s.scale, chg, icon: s.icon, unit: s.unit }
    })
  )
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<{ symbol: string; name: string; price: number; chg: number; icon: string; unit: string }>).value)
}

export async function GET() {
  const fredKey = process.env.FRED_KEY ?? ''

  try {
    // Fetch metals (always available)
    const metalData = await fetchMetals()
    // metals.live returns an array of { "gold": 1234.56 } objects — merge into one record
    const merged: MetalsResp = Object.assign({}, ...metalData)

    const metalQuotes = Object.entries(METALS_META).map(([key, meta]) => {
      const price  = merged[key] ?? 0
      const prevP  = _prev[key] ?? price
      const chg    = prevP !== 0 ? ((price - prevP) / prevP) * 100 : 0
      _prev[key]   = price
      // Copper from metals.live is $/troy oz — convert to $/lb (1 troy oz ≈ 0.0686 lb)
      const display = key === 'copper' ? price * 0.0686 : price
      return {
        symbol:   meta.sym,
        name:     meta.label,
        icon:     meta.icon,
        price:    display,
        chg,
        unit:     meta.unit,
        currency: 'USD',
      }
    })

    // Fetch energy from FRED if key available
    let energyQuotes: typeof metalQuotes = []
    if (fredKey) {
      const energy = await fetchEnergyFromFRED(fredKey)
      energyQuotes = energy.map((e) => ({
        symbol:   e.symbol,
        name:     e.name,
        icon:     e.icon,
        price:    e.price,
        chg:      e.chg,
        unit:     e.unit,
        currency: 'USD',
      }))
    }

    return NextResponse.json({ quotes: [...metalQuotes, ...energyQuotes] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: msg, quotes: [] }, { status: 200 })
  }
}
