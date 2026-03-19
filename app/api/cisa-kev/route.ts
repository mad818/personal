import { NextResponse } from 'next/server'

// Server-side proxy for CISA Known Exploited Vulnerabilities catalog
// Free JSON feed — no key required.

export const dynamic = 'force-dynamic'

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

export async function GET() {
  try {
    const r = await fetch(KEV_URL, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) {
      return NextResponse.json({ error: `CISA KEV ${r.status}`, vulnerabilities: [] }, { status: 200 })
    }
    const data = await r.json()
    // Sort by dateAdded descending and return the most recent 50
    const sorted = (data.vulnerabilities ?? [])
      .sort((a: { dateAdded: string }, b: { dateAdded: string }) =>
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      )
      .slice(0, 50)
    return NextResponse.json({
      vulnerabilities: sorted,
      catalogVersion:  data.catalogVersion ?? '',
      dateReleased:    data.dateReleased ?? '',
      total:           data.count ?? 0,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: msg, vulnerabilities: [] }, { status: 200 })
  }
}
