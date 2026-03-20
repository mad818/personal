import { NextRequest, NextResponse } from 'next/server'

// GDELT DOC API v2 — FREE, no key required.
// https://api.gdeltproject.org/api/v2/doc/doc
//
// Usage:
//   GET /api/gdelt                          → default artlist, last 24H, "conflict OR crisis OR war"
//   GET /api/gdelt?query=ukraine&timespan=1W → custom query
//   GET /api/gdelt?mode=timeline            → volume timeline using timelinevolnorm
//   GET /api/gdelt?query=...&mode=artlist&timespan=24H&maxrecords=50

export const dynamic = 'force-dynamic'

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'

// Valid GDELT modes
const ARTLIST_MODES = ['artlist', 'artgallery', 'imagecollage'] as const
const TIMELINE_MODES = [
  'timelinevolnorm',
  'timelinevol',
  'timelinelang',
  'timelinesourcecountry',
] as const

type ArtlistMode = (typeof ARTLIST_MODES)[number]
type TimelineMode = (typeof TIMELINE_MODES)[number]
type GDELTMode = ArtlistMode | TimelineMode

// Valid GDELT timespan values (subset)
const VALID_TIMESPANS = ['15M', '1H', '6H', '12H', '24H', '1D', '2D', '3D', '1W', '2W', '1M']

function sanitizeQuery(query: string): string {
  // Trim and limit length to avoid abuse
  return query.slice(0, 500).trim()
}

function resolveMode(modeParam: string | null): GDELTMode {
  if (!modeParam) return 'artlist'
  // 'timeline' is a shorthand we map to timelinevolnorm
  if (modeParam === 'timeline') return 'timelinevolnorm'
  const allModes: string[] = [...ARTLIST_MODES, ...TIMELINE_MODES]
  if (allModes.includes(modeParam)) return modeParam as GDELTMode
  return 'artlist'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = sanitizeQuery(searchParams.get('query') ?? 'conflict OR crisis OR war')
    const modeParam = searchParams.get('mode')
    const mode = resolveMode(modeParam)
    const timespan = VALID_TIMESPANS.includes(searchParams.get('timespan') ?? '')
      ? (searchParams.get('timespan') as string)
      : '24H'
    const maxrecords = Math.min(
      Math.max(1, parseInt(searchParams.get('maxrecords') ?? '50', 10)),
      250
    )

    const params = new URLSearchParams({
      query,
      mode,
      timespan,
      maxrecords: String(maxrecords),
      format: 'json',
    })

    const url = `${GDELT_BASE}?${params.toString()}`

    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!r.ok) {
      const text = await r.text()
      return NextResponse.json(
        { error: `GDELT API error: ${r.status}`, detail: text.slice(0, 200) },
        { status: r.status }
      )
    }

    // GDELT sometimes returns malformed JSON for empty results — handle gracefully
    const text = await r.text()
    if (!text || text.trim() === '' || text.trim() === 'null') {
      return NextResponse.json({
        query,
        mode,
        timespan,
        articles: [],
        timeline: null,
        count: 0,
      })
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      // If GDELT returns non-JSON (can happen), return raw text wrapped
      return NextResponse.json({
        query,
        mode,
        timespan,
        raw: text.slice(0, 5000),
        count: 0,
        articles: [],
      })
    }

    // Augment with request metadata
    const isTimeline = TIMELINE_MODES.includes(mode as TimelineMode)
    return NextResponse.json({
      query,
      mode,
      timespan,
      maxrecords: isTimeline ? null : maxrecords,
      articles: isTimeline ? [] : ((data as { articles?: unknown[] })?.articles ?? []),
      timeline: isTimeline ? data : null,
      count: isTimeline
        ? null
        : ((data as { articles?: unknown[] })?.articles?.length ?? 0),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `GDELT fetch failed: ${msg}`, articles: [], timeline: null },
      { status: 500 }
    )
  }
}
