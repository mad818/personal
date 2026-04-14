// ── api/weather ─────────────────────────────────────────────
// Weather API: real-time and forecast meteorological data.

import { NextRequest } from "next/server";
import { connectorJson } from "@/lib/connectorResponse";
import {
  parseBoundedFloatParam,
  RequestValidationError,
} from "@/lib/security/inputGuards";
// https://api.open-meteo.com/v1/forecast

export const dynamic = "force-dynamic";

const DEFAULT_LAT = 34.0522;
const DEFAULT_LON = -118.2437;

// WMO Weather interpretation codes → human-readable description
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

function wmoDescription(code: number | null): string {
  if (code === null) return "Unknown";
  return WMO_DESCRIPTIONS[code] ?? `WMO ${code}`;
}

function cToF(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(((value * 9) / 5 + 32) * 10) / 10;
}

function kmhToMph(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 0.621371 * 10) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseBoundedFloatParam(searchParams, "lat", {
      min: -90,
      max: 90,
      defaultValue: DEFAULT_LAT,
    });
    const lon = parseBoundedFloatParam(searchParams, "lon", {
      min: -180,
      max: 180,
      defaultValue: DEFAULT_LON,
    });

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "weather_code",
      ].join(","),
      hourly: ["temperature_2m", "weather_code"].join(","),
      daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"].join(
        ",",
      ),
      timezone: "auto",
      forecast_days: "7",
    });

    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!r.ok) {
      return connectorJson(
        {
          latitude: lat,
          longitude: lon,
          timezone: "Unknown",
          timezone_abbreviation: "",
          current: null,
          hourly: [],
          daily: [],
          error: `Open-Meteo API error: ${r.status}`,
        },
        {
          source: "weather",
          maxAgeSeconds: 60,
          degraded: true,
          warnings: [`Open-Meteo returned HTTP ${r.status}.`],
          status: 200,
        },
      );
    }

    const data = (await r.json()) as {
      latitude?: number;
      longitude?: number;
      timezone?: string;
      timezone_abbreviation?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
      current_units?: Record<string, string>;
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        weather_code?: number[];
      };
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };

    // Shape current conditions
    const current = data.current
      ? {
          time: data.current.time ?? null,
          temperature_2m: data.current.temperature_2m ?? null,
          temperature_c: data.current.temperature_2m ?? null,
          temperature_f: cToF(data.current.temperature_2m ?? null),
          apparent_temperature: data.current.apparent_temperature ?? null,
          relative_humidity_2m: data.current.relative_humidity_2m ?? null,
          humidity_pct: data.current.relative_humidity_2m ?? null,
          wind_speed_10m: data.current.wind_speed_10m ?? null,
          wind_speed_kmh: data.current.wind_speed_10m ?? null,
          wind_speed_mph: kmhToMph(data.current.wind_speed_10m ?? null),
          weather_code: data.current.weather_code ?? null,
          condition: wmoDescription(data.current.weather_code ?? null),
        }
      : null;

    // Shape hourly (next 24h)
    const hourlyTimes = data.hourly?.time ?? [];
    const hourlyTemps = data.hourly?.temperature_2m ?? [];
    const hourlyCodes = data.hourly?.weather_code ?? [];
    const hourly = hourlyTimes.slice(0, 24).map((time, i) => ({
      time,
      temperature_2m: hourlyTemps[i] ?? null,
      temperature_c: hourlyTemps[i] ?? null,
      temperature_f: cToF(hourlyTemps[i] ?? null),
      weather_code: hourlyCodes[i] ?? null,
      condition: wmoDescription(hourlyCodes[i] ?? null),
    }));

    // Shape daily (7 days)
    const dailyTimes = data.daily?.time ?? [];
    const dailyCodes = data.daily?.weather_code ?? [];
    const dailyMaxes = data.daily?.temperature_2m_max ?? [];
    const dailyMins = data.daily?.temperature_2m_min ?? [];
    const daily = dailyTimes.map((time, i) => ({
      date: time,
      weather_code: dailyCodes[i] ?? null,
      condition: wmoDescription(dailyCodes[i] ?? null),
      temperature_2m_max: dailyMaxes[i] ?? null,
      temperature_2m_min: dailyMins[i] ?? null,
      temp_max_c: dailyMaxes[i] ?? null,
      temp_min_c: dailyMins[i] ?? null,
      temp_max_f: cToF(dailyMaxes[i] ?? null),
      temp_min_f: cToF(dailyMins[i] ?? null),
    }));

    const warnings: string[] = [];
    if (!current) {
      warnings.push("Open-Meteo returned no current conditions.");
    }
    if (hourly.length === 0) {
      warnings.push("Open-Meteo returned no hourly forecast points.");
    }
    if (daily.length === 0) {
      warnings.push("Open-Meteo returned no daily forecast points.");
    }

    return connectorJson(
      {
        latitude: data.latitude ?? lat,
        longitude: data.longitude ?? lon,
        timezone: data.timezone ?? "Unknown",
        timezone_abbreviation: data.timezone_abbreviation ?? "",
        current,
        hourly,
        daily,
      },
      {
        source: "weather",
        maxAgeSeconds: 300,
        degraded: warnings.length > 0,
        warnings,
      },
    );
  } catch (e: unknown) {
    if (e instanceof RequestValidationError) {
      return connectorJson(
        {
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LON,
          timezone: "Unknown",
          timezone_abbreviation: "",
          current: null,
          hourly: [],
          daily: [],
          error: e.message,
        },
        {
          source: "weather",
          maxAgeSeconds: 60,
          degraded: true,
          warnings: [e.message],
          status: 400,
        },
      );
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return connectorJson(
      {
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LON,
        timezone: "Unknown",
        timezone_abbreviation: "",
        current: null,
        hourly: [],
        daily: [],
        error: `Weather fetch failed: ${msg}`,
      },
      {
        source: "weather",
        maxAgeSeconds: 60,
        degraded: true,
        warnings: [msg],
        status: 200,
      },
    );
  }
}
