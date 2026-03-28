import { NextResponse } from 'next/server'

/**
 * GET /api/geo-scan
 *
 * Proxies to the local GeoDeep AI service (localhost:5050).
 * Returns detected objects from the most recent satellite tile scan.
 *
 * If the service is not running, returns an empty detections array
 * with a status hint — the client renders gracefully with no markers.
 *
 * Setup: see docs/deployment/geodep.md
 */
export async function GET() {
  const GEODEP_URL = process.env.GEODEP_SERVICE_URL ?? 'http://localhost:5050'

  try {
    const r = await fetch(`${GEODEP_URL}/scan`, {
      signal: AbortSignal.timeout(14000),
      headers: { 'Content-Type': 'application/json' },
    })

    if (!r.ok) {
      return NextResponse.json(
        { detections: [], status: 'error', message: `GeoDeep service returned ${r.status}` },
        { status: 200 }
      )
    }

    const data = await r.json()

    // Validate + sanitise: only pass through expected shape
    const detections = (Array.isArray(data.detections) ? data.detections : [])
      .filter(
        (d: unknown) =>
          typeof d === 'object' &&
          d !== null &&
          typeof (d as Record<string, unknown>).lat === 'number' &&
          typeof (d as Record<string, unknown>).lng === 'number'
      )
      .slice(0, 2000) // hard cap — never send unbounded data to client
      .map((d: Record<string, unknown>) => ({
        lat:        d.lat,
        lng:        d.lng,
        label:      typeof d.label === 'string' ? d.label.slice(0, 64) : 'Detection',
        confidence: typeof d.confidence === 'number' ? Math.min(1, Math.max(0, d.confidence)) : 0,
      }))

    return NextResponse.json({ detections, status: 'ok' })
  } catch (err) {
    // Service not running — return empty, not an error (graceful degradation)
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      {
        detections: [],
        status: 'unavailable',
        message: isTimeout ? 'GeoDeep service timed out' : 'GeoDeep service not reachable — start scripts/geodep-service.py',
      },
      { status: 200 }
    )
  }
}
