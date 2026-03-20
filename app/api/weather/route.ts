import { NextRequest, NextResponse } from 'next/server'

// Open-Meteo weather API — FREE, no key required.
// https://api.open-meteo.com/v1/forecast

export const dynamic = 'force-dynamic'

const DEFAULT_LAT = 34.0522
const DEFAULT_LON = -118.2437

// WMO Weather interpretation codes → human-readable description
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

function wmoDescription(code: number | null): string {
  if (code === null) return 'Unknown'
  return WMO_DESCRIPTIONS[code] ?? `WMO ${code}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT))
    const lon = parseFloat(searchParams.get('lon') ?? String(DEFAULT_LON))

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid lat/lon parameters.' },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'weather_code',
      ].join(','),
      hourly: ['temperature_2m', 'weather_code'].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
      ].join(','),
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      timezone: 'auto',
      forecast_days: '7',
    })

    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!r.ok) {
      return NextResponse.json(
        { error: `Open-Meteo API error: ${r.status}` },
        { status: r.status }
      )
    }

    const data = await r.json() as {
      latitude?: number
      longitude?: number
      timezone?: string
      timezone_abbreviation?: string
      current?: {
        time?: string
        temperature_2m?: number
        relative_humidity_2m?: number
        wind_speed_10m?: number
        weather_code?: number
      }
      current_units?: Record<string, string>
      hourly?: {
        time?: string[]
        temperature_2m?: number[]
        weather_code?: number[]
      }
      daily?: {
        time?: string[]
        weather_code?: number[]
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
      }
    }

    // Shape current conditions
    const current = data.current
      ? {
          time: data.current.time ?? null,
          temperature_f: data.current.temperature_2m ?? null,
          humidity_pct: data.current.relative_humidity_2m ?? null,
          wind_speed_mph: data.current.wind_speed_10m ?? null,
          weather_code: data.current.weather_code ?? null,
          condition: wmoDescription(data.current.weather_code ?? null),
        }
      : null

    // Shape hourly (next 24h)
    const hourlyTimes = data.hourly?.time ?? []
    const hourlyTemps = data.hourly?.temperature_2m ?? []
    const hourlyCodes = data.hourly?.weather_code ?? []
    const hourly = hourlyTimes.slice(0, 24).map((time, i) => ({
      time,
      temperature_f: hourlyTemps[i] ?? null,
      weather_code: hourlyCodes[i] ?? null,
      condition: wmoDescription(hourlyCodes[i] ?? null),
    }))

    // Shape daily (7 days)
    const dailyTimes = data.daily?.time ?? []
    const dailyCodes = data.daily?.weather_code ?? []
    const dailyMaxes = data.daily?.temperature_2m_max ?? []
    const dailyMins = data.daily?.temperature_2m_min ?? []
    const daily = dailyTimes.map((time, i) => ({
      date: time,
      weather_code: dailyCodes[i] ?? null,
      condition: wmoDescription(dailyCodes[i] ?? null),
      temp_max_f: dailyMaxes[i] ?? null,
      temp_min_f: dailyMins[i] ?? null,
    }))

    return NextResponse.json({
      latitude: data.latitude ?? lat,
      longitude: data.longitude ?? lon,
      timezone: data.timezone ?? 'Unknown',
      timezone_abbreviation: data.timezone_abbreviation ?? '',
      current,
      hourly,
      daily,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: `Weather fetch failed: ${msg}` }, { status: 500 })
  }
}
