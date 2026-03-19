import { NextResponse } from 'next/server'

// Precious metal spot prices via CoinGecko.
// PAXG (Pax Gold) is backed 1:1 by 1 troy oz of physical gold — price ≈ gold spot.
// XAUT (Tether Gold) is the same concept but from Tether.
// For silver we use a separate free endpoint from goldprice.org.

export const dynamic = 'force-dynamic'

const BASE = 'https://api.coingecko.com/api/v3'

// CoinGecko IDs for commodity-backed tokens
const METAL_IDS = ['pax-gold', 'tether-gold']

interface CGCoin {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
}

export async function GET() {
  try {
    const cgKey    = process.env.COINGECKO_KEY ?? ''
    const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : ''

    const url = `${BASE}/coins/markets?vs_currency=usd&ids=${METAL_IDS.join(',')}&order=market_cap_desc&per_page=10&sparkline=false${keyParam}`
    const r   = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(12000),
    })

    if (!r.ok) {
      return NextResponse.json({ error: `CoinGecko ${r.status}`, metals: [] }, { status: 200 })
    }

    const coins: CGCoin[] = await r.json()

    // Use PAXG as gold price (more liquid than XAUT)
    const paxg = coins.find((c) => c.id === 'pax-gold')
    const xaut = coins.find((c) => c.id === 'tether-gold')
    const gold = paxg ?? xaut

    const metals = gold
      ? [{ id: 'XAU', label: 'Gold', icon: '🥇', unit: '/oz', price: gold.current_price, chg: gold.price_change_percentage_24h ?? 0 }]
      : []

    // Also try goldprice.org for silver (free, no key, CORS-blocked from browser but fine server-side)
    try {
      const gpRes = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (gpRes.ok) {
        const gpData = await gpRes.json()
        // goldprice.org returns { xauPrice, xagPrice, ... } in USD/oz
        if (gpData.xagPrice) {
          metals.push({ id: 'XAG', label: 'Silver', icon: '⚪', unit: '/oz', price: gpData.xagPrice, chg: 0 })
        }
        if (gpData.xauPrice && !gold) {
          // Fallback: use goldprice.org gold if CoinGecko didn't return anything
          metals.unshift({ id: 'XAU', label: 'Gold', icon: '🥇', unit: '/oz', price: gpData.xauPrice, chg: 0 })
        }
        if (gpData.xptPrice) {
          metals.push({ id: 'XPT', label: 'Platinum', icon: '🔵', unit: '/oz', price: gpData.xptPrice, chg: 0 })
        }
      }
    } catch {
      // goldprice.org failed — gold from CoinGecko still shows
    }

    return NextResponse.json({ metals })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: msg, metals: [] }, { status: 200 })
  }
}
