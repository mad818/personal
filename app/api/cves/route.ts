import { NextResponse } from 'next/server'

// Server-side proxy for NVD CVE API — browser fetch fails with CORS.
// Returns last 30 days of CVEs, sorted by severity.

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const since =
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + '.000'

    const apiKey = process.env.NVD_KEY ?? ''
    const headers: Record<string, string> = {}
    if (apiKey) headers['apiKey'] = apiKey

    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=40&pubStartDate=${since}`

    const r = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(50000), // NVD free tier can take 30-45s
    })

    if (!r.ok) {
      return NextResponse.json({ vulnerabilities: [], error: `NVD ${r.status}` }, { status: 200 })
    }

    const d = await r.json()
    return NextResponse.json({ vulnerabilities: d.vulnerabilities ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ vulnerabilities: [], error: msg }, { status: 200 })
  }
}
