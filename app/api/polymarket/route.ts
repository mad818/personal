import { NextResponse } from 'next/server'

// Server-side proxy for Polymarket Gamma API — direct browser fetch hits CORS.

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = 'https://gamma-api.polymarket.com/events?active=true&limit=40&order=volume&ascending=false'
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(12000),
    })

    if (!r.ok) {
      return NextResponse.json({ events: [], error: `Polymarket ${r.status}` }, { status: 200 })
    }

    const d = await r.json()
    const events = Array.isArray(d) ? d : (d.events ?? [])
    return NextResponse.json({ events })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ events: [], error: msg }, { status: 200 })
  }
}
