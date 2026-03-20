import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface VesselPosition {
  mmsi: string
  name: string
  lat: number
  lon: number
  speed: number
  course: number
  ship_type: string
  destination: string
  last_update: string
}

const SHIP_TYPES = [
  'Cargo', 'Tanker', 'Passenger', 'Container Ship', 'Bulk Carrier',
  'Fishing', 'Tug', 'Research Vessel', 'Naval', 'Yacht',
]

const DESTINATIONS = [
  'ROTTERDAM', 'SINGAPORE', 'SHANGHAI', 'LOS ANGELES', 'HAMBURG',
  'DUBAI', 'BUSAN', 'HONG KONG', 'ANTWERP', 'NEW YORK',
  'ISTANBUL', 'PIRAEUS', 'MARSEILLE', 'BARCELONA', 'MUMBAI',
]

const VESSEL_NAMES = [
  'MSC AURORA', 'EVER GIVEN II', 'MAERSK ELBA', 'CMA CGM TITAN',
  'COSCO SHIPPING', 'HAPAG LLOYD EXPRESS', 'NYK NEBULA', 'MOL TRIUMPH',
  'NORDIC ORION', 'ATLANTIC NAVIGATOR', 'PACIFIC GLORY', 'CASPIAN SEA',
  'ADRIATIC STAR', 'BALTIC WIND', 'ARCTIC VOYAGER', 'DESERT ROSE',
  'OCEAN PIONEER', 'SEA EMPRESS', 'BLUE HORIZON', 'GOLDEN GATE',
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateVessels(lat: number, lon: number, radius: number): VesselPosition[] {
  const count = 15
  const vessels: VesselPosition[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5 + lat * 10 + lon * 10
    const rng1 = seededRandom(seed)
    const rng2 = seededRandom(seed + 1)
    const rng3 = seededRandom(seed + 2)
    const rng4 = seededRandom(seed + 3)
    const rng5 = seededRandom(seed + 4)
    const rng6 = seededRandom(seed + 5)
    const rng7 = seededRandom(seed + 6)

    // Scatter within radius (degrees approximation)
    const latOffset = (rng1 - 0.5) * 2 * radius
    const lonOffset = (rng2 - 0.5) * 2 * radius

    const mmsi = String(200000000 + Math.floor(rng3 * 600000000)).slice(0, 9)
    const vesselLat = Math.max(-85, Math.min(85, lat + latOffset))
    const vesselLon = ((lon + lonOffset + 180) % 360) - 180

    const offsetMinutes = Math.floor(rng7 * 120)
    const updateTime = new Date(now.getTime() - offsetMinutes * 60000)

    vessels.push({
      mmsi,
      name: VESSEL_NAMES[Math.floor(rng4 * VESSEL_NAMES.length)],
      lat: Math.round(vesselLat * 10000) / 10000,
      lon: Math.round(vesselLon * 10000) / 10000,
      speed: Math.round(rng5 * 20 * 10) / 10,        // 0–20 knots
      course: Math.round(rng6 * 360),                 // 0–360°
      ship_type: SHIP_TYPES[Math.floor(rng3 * 7 * SHIP_TYPES.length) % SHIP_TYPES.length],
      destination: DESTINATIONS[Math.floor(rng4 * 3 * DESTINATIONS.length) % DESTINATIONS.length],
      last_update: updateTime.toISOString(),
    })
  }

  return vessels
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)

    const lat = parseFloat(searchParams.get('lat') ?? '0')
    const lon = parseFloat(searchParams.get('lon') ?? '0')
    const radius = parseFloat(searchParams.get('radius') ?? '5')

    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
      return NextResponse.json(
        { vessels: [], error: 'Invalid lat/lon/radius parameters' },
        { status: 400 },
      )
    }

    const hasAISKey = Boolean(process.env.AISSTREAM_KEY)

    const vessels = generateVessels(lat, lon, Math.min(radius, 20))

    return NextResponse.json({
      vessels,
      meta: {
        lat,
        lon,
        radius,
        count: vessels.length,
        source: hasAISKey
          ? 'demo_with_aisstream_available'
          : 'demo',
        note: hasAISKey
          ? 'AISSTREAM_KEY detected. Real-time data available via WebSocket at wss://stream.aisstream.io/v0/stream. This REST endpoint returns representative demo data.'
          : 'No AISSTREAM_KEY configured. Set AISSTREAM_KEY for real WebSocket integration at wss://stream.aisstream.io/v0/stream',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ vessels: [], error: msg }, { status: 200 })
  }
}
