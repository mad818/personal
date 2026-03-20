import { NextResponse } from 'next/server'

// NASA FIRMS Active Fire Data — requires a free MAP_KEY from NASA.
// Register at: https://firms.modaps.eosdis.nasa.gov/api/
//
// With FIRMS_MAP_KEY:   fetches live VIIRS SNPP NRT fire data (last 24h, world)
// Without FIRMS_MAP_KEY: returns sample data + instructions for getting a key
//
// Response fields per fire point:
//   latitude, longitude, brightness, scan, track, acq_date, acq_time,
//   satellite, confidence, frp, daynight

export const dynamic = 'force-dynamic'

interface FireRecord {
  latitude: number
  longitude: number
  brightness: number
  scan: number
  track: number
  acq_date: string
  acq_time: string
  satellite: string
  instrument?: string
  confidence: string
  version?: string
  bright_t31?: number
  frp: number
  daynight: string
}

// Sample data (fallback when no API key) — represents a real-looking response
const SAMPLE_FIRES: FireRecord[] = [
  {
    latitude: 34.1478,
    longitude: -118.2562,
    brightness: 320.5,
    scan: 0.39,
    track: 0.36,
    acq_date: '2026-03-20',
    acq_time: '1030',
    satellite: 'N',
    instrument: 'VIIRS',
    confidence: 'nominal',
    frp: 8.2,
    daynight: 'D',
  },
  {
    latitude: 37.7749,
    longitude: -122.4194,
    brightness: 335.1,
    scan: 0.42,
    track: 0.38,
    acq_date: '2026-03-20',
    acq_time: '1045',
    satellite: 'N',
    instrument: 'VIIRS',
    confidence: 'high',
    frp: 15.4,
    daynight: 'D',
  },
]

/**
 * Parse NASA FIRMS CSV into structured fire records.
 * FIRMS CSV header (VIIRS SNPP):
 *   latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,
 *   instrument,confidence,version,bright_ti5,frp,daynight
 */
function parseFIRMSCsv(csv: string): FireRecord[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const headerLine = lines[0].trim()
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase())

  const records: FireRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    const get = (field: string): string => {
      const idx = headers.indexOf(field)
      return idx >= 0 ? (values[idx]?.trim() ?? '') : ''
    }

    const lat = parseFloat(get('latitude'))
    const lon = parseFloat(get('longitude'))
    if (isNaN(lat) || isNaN(lon)) continue

    // brightness could be bright_ti4 (VIIRS) or brightness (MODIS)
    const brightnessRaw =
      get('bright_ti4') || get('brightness') || get('bright_t21')
    const brightness = parseFloat(brightnessRaw)

    // frp = fire radiative power
    const frp = parseFloat(get('frp'))

    records.push({
      latitude: lat,
      longitude: lon,
      brightness: isNaN(brightness) ? 0 : brightness,
      scan: parseFloat(get('scan')) || 0,
      track: parseFloat(get('track')) || 0,
      acq_date: get('acq_date'),
      acq_time: get('acq_time'),
      satellite: get('satellite'),
      instrument: get('instrument') || undefined,
      confidence: get('confidence'),
      version: get('version') || undefined,
      bright_t31: get('bright_ti5') ? parseFloat(get('bright_ti5')) : undefined,
      frp: isNaN(frp) ? 0 : frp,
      daynight: get('daynight'),
    })
  }

  return records
}

export async function GET() {
  const mapKey = process.env.FIRMS_MAP_KEY

  if (!mapKey) {
    return NextResponse.json({
      source: 'sample',
      key_required: true,
      message:
        'FIRMS_MAP_KEY not configured. Get a free API key at https://firms.modaps.eosdis.nasa.gov/api/ and set it as FIRMS_MAP_KEY in your .env.local file.',
      count: SAMPLE_FIRES.length,
      fires: SAMPLE_FIRES,
    })
  }

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/world/1`

    const r = await fetch(url, {
      headers: { Accept: 'text/csv,text/plain,*/*' },
      signal: AbortSignal.timeout(8000),
    })

    if (!r.ok) {
      // 401 typically means bad key, 429 = rate limit
      if (r.status === 401) {
        return NextResponse.json(
          {
            error: 'Invalid FIRMS_MAP_KEY. Verify your key at https://firms.modaps.eosdis.nasa.gov/api/',
            fires: [],
          },
          { status: 401 }
        )
      }
      if (r.status === 429) {
        return NextResponse.json(
          { error: 'NASA FIRMS rate limit exceeded. Try again in a few minutes.', fires: [] },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `NASA FIRMS API error: ${r.status}`, fires: [] },
        { status: r.status }
      )
    }

    const csvText = await r.text()

    // NASA may return an error message in the body instead of CSV
    if (csvText.includes('Transaction Rejected') || csvText.includes('Invalid MAP_KEY')) {
      return NextResponse.json(
        {
          error: 'NASA FIRMS rejected the request. Check your MAP_KEY.',
          raw: csvText.slice(0, 300),
          fires: [],
        },
        { status: 403 }
      )
    }

    const fires = parseFIRMSCsv(csvText)

    // Sort by FRP descending (most intense fires first)
    fires.sort((a, b) => b.frp - a.frp)

    return NextResponse.json({
      source: 'nasa_firms',
      satellite: 'VIIRS_SNPP_NRT',
      area: 'world',
      days: 1,
      count: fires.length,
      fires,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `NASA FIRMS fetch failed: ${msg}`, fires: [] },
      { status: 500 }
    )
  }
}
