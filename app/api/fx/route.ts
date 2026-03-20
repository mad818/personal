import { NextResponse } from 'next/server'

// Server-side FX proxy with free-first fallback chain:
//   1. Frankfurter API (primary, no key) — https://api.frankfurter.dev/v1/latest
//   2. fawazahmed0 CDN (fallback, no key) — jsdelivr CDN
//   3. open.er-api.com (last resort, no key)
//
// Response shape (unchanged from prior version):
//   { rates: Record<string, number>, time_last_update_utc: string }

export const dynamic = 'force-dynamic'

interface FxResult {
  rates: Record<string, number>
  time_last_update_utc: string
}

async function fetchFrankfurter(): Promise<FxResult> {
  const r = await fetch('https://api.frankfurter.dev/v1/latest?from=USD', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`Frankfurter ${r.status}`)
  const data = await r.json() as {
    rates?: Record<string, number>
    date?: string
  }
  if (!data.rates) throw new Error('Frankfurter: missing rates')
  // Frankfurter doesn't include USD itself, add it
  const rates: Record<string, number> = { USD: 1, ...data.rates }
  const time_last_update_utc = data.date
    ? new Date(data.date + 'T00:00:00Z').toUTCString()
    : new Date().toUTCString()
  return { rates, time_last_update_utc }
}

async function fetchFawazahmed0(): Promise<FxResult> {
  // fawazahmed0 currency API — returns { usd: { eur: 0.92, ... } }
  const r = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!r.ok) throw new Error(`fawazahmed0 ${r.status}`)
  const data = await r.json() as {
    date?: string
    usd?: Record<string, number>
  }
  if (!data.usd) throw new Error('fawazahmed0: missing usd key')
  // Convert keys to uppercase to match open.er-api format
  const rates: Record<string, number> = {}
  for (const [k, v] of Object.entries(data.usd)) {
    rates[k.toUpperCase()] = v
  }
  const time_last_update_utc = data.date
    ? new Date(data.date + 'T00:00:00Z').toUTCString()
    : new Date().toUTCString()
  return { rates, time_last_update_utc }
}

async function fetchOpenErApi(): Promise<FxResult> {
  const r = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`open.er-api ${r.status}`)
  const data = await r.json() as {
    rates?: Record<string, number>
    time_last_update_utc?: string
  }
  if (!data.rates) throw new Error('open.er-api: missing rates')
  return {
    rates: data.rates,
    time_last_update_utc: data.time_last_update_utc ?? new Date().toUTCString(),
  }
}

export async function GET() {
  const attempts: Array<() => Promise<FxResult>> = [
    fetchFrankfurter,
    fetchFawazahmed0,
    fetchOpenErApi,
  ]

  let lastError = 'All FX sources failed'

  for (const attempt of attempts) {
    try {
      const result = await attempt()
      return NextResponse.json(result)
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }

  return NextResponse.json({ error: lastError, rates: {} }, { status: 200 })
}
