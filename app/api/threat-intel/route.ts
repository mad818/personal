import { NextRequest, NextResponse } from 'next/server'

// Threat Intelligence aggregator — all free-first.
//
// Sources:
//   1. abuse.ch ThreatFox (no key required) — recent IOCs
//   2. Shodan InternetDB (no key required) — IP enrichment
//   3. AlienVault OTX (optional OTX_API_KEY) — subscribed pulses
//
// Usage:
//   GET /api/threat-intel            → recent ThreatFox IOCs + OTX pulses
//   GET /api/threat-intel?ip=1.2.3.4 → above + Shodan InternetDB enrichment

export const dynamic = 'force-dynamic'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface ThreatFoxIOC {
  id?: string
  ioc?: string
  ioc_type?: string
  threat_type?: string
  malware?: string
  malware_printable?: string
  first_seen?: string
  last_seen?: string
  confidence_level?: number
  reference?: string
  tags?: string[] | null
  reporter?: string
}

interface ThreatFoxResponse {
  query_status?: string
  data?: ThreatFoxIOC[] | string
}

interface ShodanInternetDB {
  ip?: string
  ports?: number[]
  hostnames?: string[]
  tags?: string[]
  vulns?: string[]
  cpes?: string[]
}

interface OTXPulse {
  id?: string
  name?: string
  description?: string
  author_name?: string
  created?: string
  modified?: string
  tags?: string[]
  targeted_countries?: string[]
  industries?: string[]
  TLP?: string
}

interface OTXResponse {
  results?: OTXPulse[]
  count?: number
  next?: string | null
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchThreatFoxIOCs(days = 1): Promise<ThreatFoxIOC[]> {
  const r = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'get_iocs', days }),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`ThreatFox ${r.status}`)
  const data = await r.json() as ThreatFoxResponse
  if (data.query_status !== 'ok' || !Array.isArray(data.data)) return []
  return data.data as ThreatFoxIOC[]
}

async function fetchShodanInternetDB(ip: string): Promise<ShodanInternetDB | null> {
  // Validate IP format before sending
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^[0-9a-fA-F:]+$/
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return null
  }

  const r = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (r.status === 404) return { ip, ports: [], hostnames: [], tags: [], vulns: [], cpes: [] }
  if (!r.ok) throw new Error(`Shodan InternetDB ${r.status}`)
  return await r.json() as ShodanInternetDB
}

async function fetchOTXPulses(): Promise<OTXPulse[]> {
  const otxKey = process.env.OTX_API_KEY
  if (!otxKey) return []

  const r = await fetch(
    'https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10',
    {
      headers: {
        Accept: 'application/json',
        'X-OTX-API-KEY': otxKey,
      },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!r.ok) throw new Error(`OTX ${r.status}`)
  const data = await r.json() as OTXResponse
  return data.results ?? []
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ip = searchParams.get('ip')?.trim() ?? null
    const days = Math.min(parseInt(searchParams.get('days') ?? '1', 10), 7)

    // Run ThreatFox and OTX in parallel; Shodan only if IP provided
    const [threatFoxResult, otxResult, shodanResult] = await Promise.allSettled([
      fetchThreatFoxIOCs(days),
      fetchOTXPulses(),
      ip ? fetchShodanInternetDB(ip) : Promise.resolve(null),
    ])

    const iocs =
      threatFoxResult.status === 'fulfilled' ? threatFoxResult.value : []
    const otxError =
      threatFoxResult.status === 'rejected'
        ? (threatFoxResult.reason instanceof Error
            ? threatFoxResult.reason.message
            : 'ThreatFox failed')
        : null

    const pulses =
      otxResult.status === 'fulfilled' ? otxResult.value : []

    const shodanData =
      shodanResult.status === 'fulfilled' ? shodanResult.value : null
    const shodanError =
      shodanResult.status === 'rejected'
        ? (shodanResult.reason instanceof Error
            ? shodanResult.reason.message
            : 'Shodan lookup failed')
        : null

    const response: Record<string, unknown> = {
      ioc_count: iocs.length,
      iocs,
      otx_pulses: pulses,
      otx_available: Boolean(process.env.OTX_API_KEY),
      sources: {
        threatfox: threatFoxResult.status === 'fulfilled' ? 'ok' : otxError,
        otx: otxResult.status === 'fulfilled'
          ? (process.env.OTX_API_KEY ? 'ok' : 'no_key')
          : 'error',
        shodan: ip
          ? (shodanResult.status === 'fulfilled' ? 'ok' : shodanError)
          : 'not_requested',
      },
    }

    if (ip) {
      response.ip_query = ip
      response.shodan = shodanData
    }

    return NextResponse.json(response)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `Threat intel fetch failed: ${msg}`, iocs: [], otx_pulses: [] },
      { status: 500 }
    )
  }
}
