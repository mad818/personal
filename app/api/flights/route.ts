import { NextRequest, NextResponse } from 'next/server'

// OpenSky Network API — FREE, no auth required for basic access.
// https://opensky-network.org/api/states/all
//
// Optional: Set OPENSKY_USER and OPENSKY_PASS env vars for authenticated
// access (higher rate limits, more complete data).
//
// Usage:
//   GET /api/flights                                       → top 50 aircraft globally
//   GET /api/flights?lamin=33&lomin=-118&lamax=35&lomax=-116 → bounding box

export const dynamic = 'force-dynamic'

// Raw state vector from OpenSky (positional array format)
// Index: [icao24, callsign, origin_country, time_position, last_contact,
//         longitude, latitude, baro_altitude, on_ground, velocity,
//         true_track, vertical_rate, sensors, geo_altitude, squawk,
//         spi, position_source, category]
type OpenSkyState = [
  string,       // 0: icao24
  string | null,// 1: callsign
  string,       // 2: origin_country
  number | null,// 3: time_position
  number,       // 4: last_contact
  number | null,// 5: longitude
  number | null,// 6: latitude
  number | null,// 7: baro_altitude (meters)
  boolean,      // 8: on_ground
  number | null,// 9: velocity (m/s)
  number | null,// 10: true_track
  number | null,// 11: vertical_rate
  number[] | null,// 12: sensors
  number | null,// 13: geo_altitude
  string | null,// 14: squawk
  boolean,      // 15: spi
  number,       // 16: position_source
  number | null,// 17: category
]

interface OpenSkyResponse {
  time?: number
  states?: OpenSkyState[]
}

interface FlightRecord {
  icao24: string
  callsign: string | null
  origin_country: string
  longitude: number | null
  latitude: number | null
  baro_altitude_m: number | null
  baro_altitude_ft: number | null
  velocity_ms: number | null
  velocity_knots: number | null
  true_track: number | null
  vertical_rate: number | null
  on_ground: boolean
  squawk: string | null
  last_contact: number
  geo_altitude_m: number | null
}

function metersToFeet(m: number | null): number | null {
  if (m === null) return null
  return Math.round(m * 3.28084)
}

function msToKnots(ms: number | null): number | null {
  if (ms === null) return null
  return Math.round(ms * 1.94384)
}

function buildAuthHeader(): Record<string, string> {
  const user = process.env.OPENSKY_USER
  const pass = process.env.OPENSKY_PASS
  if (user && pass) {
    const encoded = Buffer.from(`${user}:${pass}`).toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Optional bounding box
    const lamin = searchParams.get('lamin')
    const lomin = searchParams.get('lomin')
    const lamax = searchParams.get('lamax')
    const lomax = searchParams.get('lomax')

    const openSkyParams = new URLSearchParams()
    if (lamin && lomin && lamax && lomax) {
      const laMinN = parseFloat(lamin)
      const loMinN = parseFloat(lomin)
      const laMaxN = parseFloat(lamax)
      const loMaxN = parseFloat(lomax)
      if (!isNaN(laMinN) && !isNaN(loMinN) && !isNaN(laMaxN) && !isNaN(loMaxN)) {
        openSkyParams.set('lamin', String(laMinN))
        openSkyParams.set('lomin', String(loMinN))
        openSkyParams.set('lamax', String(laMaxN))
        openSkyParams.set('lomax', String(loMaxN))
      }
    }

    const queryString = openSkyParams.toString()
    const url = `https://opensky-network.org/api/states/all${queryString ? `?${queryString}` : ''}`

    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...buildAuthHeader(),
      },
      signal: AbortSignal.timeout(8000),
    })

    if (r.status === 429) {
      return NextResponse.json(
        { error: 'OpenSky rate limit exceeded. Try again later or set OPENSKY_USER/OPENSKY_PASS for higher limits.', flights: [] },
        { status: 429 }
      )
    }

    if (!r.ok) {
      return NextResponse.json(
        { error: `OpenSky API error: ${r.status}`, flights: [] },
        { status: r.status }
      )
    }

    const data = await r.json() as OpenSkyResponse
    const states = data.states ?? []

    // Map state vectors to structured objects
    const flights: FlightRecord[] = states
      .filter((s): s is OpenSkyState => Array.isArray(s) && s.length >= 17)
      .map((s): FlightRecord => ({
        icao24: s[0],
        callsign: s[1]?.trim() || null,
        origin_country: s[2],
        longitude: s[5],
        latitude: s[6],
        baro_altitude_m: s[7],
        baro_altitude_ft: metersToFeet(s[7]),
        velocity_ms: s[9],
        velocity_knots: msToKnots(s[9]),
        true_track: s[10],
        vertical_rate: s[11],
        on_ground: s[8],
        squawk: s[14],
        last_contact: s[4],
        geo_altitude_m: s[13],
      }))

    // Sort by baro_altitude descending (highest/most interesting first)
    // Put on-ground aircraft last
    const sorted = flights.sort((a, b) => {
      if (a.on_ground && !b.on_ground) return 1
      if (!a.on_ground && b.on_ground) return -1
      const altA = a.baro_altitude_m ?? -1
      const altB = b.baro_altitude_m ?? -1
      return altB - altA
    })

    const top50 = sorted.slice(0, 50)

    return NextResponse.json({
      timestamp: data.time ?? Math.floor(Date.now() / 1000),
      total_tracked: flights.length,
      returned: top50.length,
      authenticated: Boolean(process.env.OPENSKY_USER),
      flights: top50,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `Flight data fetch failed: ${msg}`, flights: [] },
      { status: 500 }
    )
  }
}
