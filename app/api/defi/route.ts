import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type DefiType = 'tvl' | 'stablecoins' | 'yields'

interface Protocol {
  name: string
  symbol: string
  tvl: number
  chain: string
  category: string
  change_1h: number | null
  change_1d: number | null
  change_7d: number | null
  url: string
}

interface Stablecoin {
  name: string
  symbol: string
  pegMechanism: string
  priceSource: string
  circulating: number
  circulatingPrevDay: number | null
  chains: string[]
}

interface YieldPool {
  pool: string
  project: string
  symbol: string
  chain: string
  apy: number
  apyBase: number | null
  apyReward: number | null
  tvlUsd: number
  ilRisk: string
}

async function fetchTVL(): Promise<Protocol[]> {
  const r = await fetch('https://api.llama.fi/v2/protocols', {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' },
  })

  if (!r.ok) throw new Error(`DeFiLlama TVL error: ${r.status}`)

  const data = await r.json() as Array<Record<string, unknown>>

  return data
    .filter((p) => typeof p.tvl === 'number' && p.tvl > 0)
    .sort((a, b) => (b.tvl as number) - (a.tvl as number))
    .slice(0, 20)
    .map((p) => ({
      name: String(p.name ?? ''),
      symbol: String(p.symbol ?? ''),
      tvl: p.tvl as number,
      chain: String(p.chain ?? 'Multi'),
      category: String(p.category ?? ''),
      change_1h: typeof p.change_1h === 'number' ? p.change_1h : null,
      change_1d: typeof p.change_1d === 'number' ? p.change_1d : null,
      change_7d: typeof p.change_7d === 'number' ? p.change_7d : null,
      url: String(p.url ?? ''),
    }))
}

async function fetchStablecoins(): Promise<Stablecoin[]> {
  const r = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' },
  })

  if (!r.ok) throw new Error(`DeFiLlama stablecoins error: ${r.status}`)

  const data = await r.json() as { peggedAssets: Array<Record<string, unknown>> }
  const assets = data.peggedAssets ?? []

  return assets
    .filter((s) => {
      const circ = s.circulating as Record<string, number> | undefined
      return circ && typeof circ.peggedUSD === 'number' && circ.peggedUSD > 0
    })
    .sort((a, b) => {
      const aVal = ((a.circulating as Record<string, number>)?.peggedUSD ?? 0)
      const bVal = ((b.circulating as Record<string, number>)?.peggedUSD ?? 0)
      return bVal - aVal
    })
    .slice(0, 20)
    .map((s) => {
      const circ = s.circulating as Record<string, number>
      const prevDay = s.circulatingPrevDay as Record<string, number> | undefined
      const chains = s.chains as string[] | undefined
      return {
        name: String(s.name ?? ''),
        symbol: String(s.symbol ?? ''),
        pegMechanism: String(s.pegMechanism ?? ''),
        priceSource: String(s.priceSource ?? ''),
        circulating: circ?.peggedUSD ?? 0,
        circulatingPrevDay: prevDay?.peggedUSD ?? null,
        chains: chains ?? [],
      }
    })
}

async function fetchYields(): Promise<YieldPool[]> {
  const r = await fetch('https://yields.llama.fi/pools', {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' },
  })

  if (!r.ok) throw new Error(`DeFiLlama yields error: ${r.status}`)

  const data = await r.json() as { data: Array<Record<string, unknown>> }
  const pools = data.data ?? []

  return pools
    .filter((p) => typeof p.apy === 'number' && p.apy > 0 && typeof p.tvlUsd === 'number')
    .sort((a, b) => (b.tvlUsd as number) - (a.tvlUsd as number))
    .slice(0, 20)
    .map((p) => ({
      pool: String(p.pool ?? ''),
      project: String(p.project ?? ''),
      symbol: String(p.symbol ?? ''),
      chain: String(p.chain ?? ''),
      apy: p.apy as number,
      apyBase: typeof p.apyBase === 'number' ? p.apyBase : null,
      apyReward: typeof p.apyReward === 'number' ? p.apyReward : null,
      tvlUsd: p.tvlUsd as number,
      ilRisk: String(p.ilRisk ?? 'NO'),
    }))
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') ?? 'tvl') as DefiType

  try {
    switch (type) {
      case 'tvl': {
        const protocols = await fetchTVL()
        return NextResponse.json({ type: 'tvl', protocols })
      }
      case 'stablecoins': {
        const stablecoins = await fetchStablecoins()
        return NextResponse.json({ type: 'stablecoins', stablecoins })
      }
      case 'yields': {
        const pools = await fetchYields()
        return NextResponse.json({ type: 'yields', pools })
      }
      default: {
        return NextResponse.json(
          { error: `Unknown type '${type}'. Use: tvl | stablecoins | yields` },
          { status: 400 },
        )
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg, type }, { status: 200 })
  }
}
