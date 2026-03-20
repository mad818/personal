import { NextResponse } from 'next/server'

// USGS Earthquake API — FREE, no key required.
// Merges two feeds:
//   - significant_week: significant earthquakes in the past week
//   - 4.5_day: all M4.5+ in the past day
// Deduplicates by id, returns sorted by time descending.

export const dynamic = 'force-dynamic'

interface USGSFeature {
  id: string
  properties: {
    mag: number | null
    place: string | null
    time: number | null
    updated: number | null
    tz: number | null
    url: string | null
    detail: string | null
    felt: number | null
    cdi: number | null
    mmi: number | null
    alert: string | null
    status: string | null
    tsunami: number | null
    sig: number | null
    net: string | null
    code: string | null
    ids: string | null
    sources: string | null
    types: string | null
    nst: number | null
    dmin: number | null
    rms: number | null
    gap: number | null
    magType: string | null
    type: string | null
    title: string | null
  }
  geometry: {
    type: string
    coordinates: [number, number, number] | []
  }
}

interface USGSGeoJSON {
  features?: USGSFeature[]
}

interface EarthquakeRecord {
  id: string
  magnitude: number | null
  place: string | null
  time: number | null
  updated: number | null
  longitude: number | null
  latitude: number | null
  depth_km: number | null
  tsunami: boolean
  alert: string | null
  sig: number | null
  url: string | null
  title: string | null
  magType: string | null
  status: string | null
  felt: number | null
}

function extractEarthquakes(geojson: USGSGeoJSON): Map<string, EarthquakeRecord> {
  const map = new Map<string, EarthquakeRecord>()
  for (const feature of (geojson.features ?? [])) {
    const p = feature.properties
    const coords = feature.geometry?.coordinates
    map.set(feature.id, {
      id: feature.id,
      magnitude: p.mag,
      place: p.place,
      time: p.time,
      updated: p.updated,
      longitude: Array.isArray(coords) && coords.length >= 2 ? (coords[0] ?? null) : null,
      latitude: Array.isArray(coords) && coords.length >= 2 ? (coords[1] ?? null) : null,
      depth_km: Array.isArray(coords) && coords.length >= 3 ? (coords[2] ?? null) : null,
      tsunami: p.tsunami === 1,
      alert: p.alert,
      sig: p.sig,
      url: p.url,
      title: p.title,
      magType: p.magType,
      status: p.status,
      felt: p.felt,
    })
  }
  return map
}

export async function GET() {
  try {
    const [significantRes, recentRes] = await Promise.allSettled([
      fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      ),
      fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      ),
    ])

    const merged = new Map<string, EarthquakeRecord>()

    if (significantRes.status === 'fulfilled' && significantRes.value.ok) {
      const data = await significantRes.value.json() as USGSGeoJSON
      Array.from(extractEarthquakes(data)).forEach(([id, eq]) => {
        merged.set(id, eq)
      })
    }

    if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
      const data = await recentRes.value.json() as USGSGeoJSON
      Array.from(extractEarthquakes(data)).forEach(([id, eq]) => {
        if (!merged.has(id)) {
          merged.set(id, eq)
        }
      })
    }

    if (merged.size === 0) {
      return NextResponse.json(
        { error: 'Both USGS feeds failed or returned no data', earthquakes: [] },
        { status: 200 }
      )
    }

    // Sort by time descending (most recent first)
    const earthquakes = Array.from(merged.values()).sort((a, b) => {
      const ta = a.time ?? 0
      const tb = b.time ?? 0
      return tb - ta
    })

    return NextResponse.json({
      count: earthquakes.length,
      earthquakes,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `Earthquake fetch failed: ${msg}`, earthquakes: [] },
      { status: 500 }
    )
  }
}
