// ── api/headers ─────────────────────────────────────────────
// Server-side proxy: fetch HTTP response headers for a URL.
// Client cannot do this directly due to CORS — server fetches and returns.

import { NextResponse } from 'next/server'

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'x-xss-protection',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const r = await fetch(parsed.href, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })

    const all: Record<string, string> = {}
    r.headers.forEach((val, key) => { all[key.toLowerCase()] = val })

    const security: Record<string, string | null> = {}
    SECURITY_HEADERS.forEach(h => { security[h] = all[h] ?? null })

    return NextResponse.json({
      url:       parsed.href,
      status:    r.status,
      ok:        r.ok,
      all,
      security,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
