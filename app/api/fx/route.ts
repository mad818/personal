import { NextResponse } from 'next/server'

// Server-side proxy for open.er-api.com (free, no key required)
// Returns major USD pairs so the client can derive FX rates.

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) {
      return NextResponse.json({ error: `FX API ${r.status}`, rates: {} }, { status: 200 })
    }
    const data = await r.json()
    return NextResponse.json({ rates: data.rates ?? {}, time_last_update_utc: data.time_last_update_utc ?? '' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: msg, rates: {} }, { status: 200 })
  }
}
