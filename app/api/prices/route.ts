import { NextResponse } from 'next/server'

// Server-side proxy for CoinGecko — avoids browser rate limits and
// lets us attach the API key server-side (never exposed to the browser).

export const dynamic = 'force-dynamic'

const DEFAULT_COINS = [
  'bitcoin','ethereum','solana','binancecoin','ripple',
  'cardano','avalanche-2','polkadot','chainlink','uniswap',
].join(',')

const BASE    = 'https://api.coingecko.com/api/v3'
const HEADERS = { 'Accept': 'application/json' }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode  = searchParams.get('mode')  ?? 'markets' // 'markets' | 'sparklines'
  // Optional custom coin list from client — falls back to defaults
  const coins = searchParams.get('coins') ?? DEFAULT_COINS

  try {
    const cgKey    = process.env.COINGECKO_KEY ?? ''
    const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : ''

    const sparkline = mode === 'sparklines' ? 'true' : 'false'
    const url = `${BASE}/coins/markets?vs_currency=usd&ids=${coins}&order=market_cap_desc&per_page=50&sparkline=${sparkline}${keyParam}`

    const r = await fetch(url, {
      headers: HEADERS,
      signal:  AbortSignal.timeout(12000),
    })

    if (!r.ok) {
      return NextResponse.json(
        { error: `CoinGecko ${r.status}`, data: [] },
        { status: 200 }
      )
    }

    const data = await r.json()
    return NextResponse.json({ data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: msg, data: [] }, { status: 200 })
  }
}
