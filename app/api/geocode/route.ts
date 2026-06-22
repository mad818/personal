import { NextResponse } from "next/server";
import { createCache } from "@/lib/apiCache";
import {
  normalizeGeocodeSearchQuery,
  parseNominatimReverseResult,
  parseNominatimSearchResults,
  type GeocodeLookupResponse,
} from "@/lib/geoCoordinateLookup";

export const dynamic = "force-dynamic";

const cache = createCache<GeocodeLookupResponse>({
  defaultTTL: 300_000,
  registryId: "geocode",
});

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "NexusPrime/1.0 (geocoding-playground; local intelligence dashboard)";

async function nominatimFetch(path: string) {
  const r = await fetch(`${NOMINATIM_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`nominatim_${r.status}`);
  }
  return r.json();
}

/**
 * GET /api/geocode?q=... | ?lat=...&lng=...
 * Bounded geocoding proxy for RECON/OPS playground (Nominatim, free tier).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizeGeocodeSearchQuery(searchParams.get("q") ?? "");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  const cacheKey =
    query.length > 0
      ? `search:${query.toLowerCase()}`
      : Number.isFinite(lat) && Number.isFinite(lng)
        ? `reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`
        : "";

  if (!cacheKey) {
    return NextResponse.json(
      {
        results: [],
        status: "error",
        message: "Provide q= for search or lat= and lng= for reverse lookup.",
      } satisfies GeocodeLookupResponse,
      { status: 400 },
    );
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    let results;
    if (query.length > 0) {
      const payload = await nominatimFetch(
        `/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
      );
      results = parseNominatimSearchResults(payload);
    } else {
      const payload = await nominatimFetch(
        `/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
      );
      results = parseNominatimReverseResult(payload);
    }

    const response: GeocodeLookupResponse = {
      results,
      status: results.length > 0 ? "ok" : "empty",
      message:
        results.length > 0
          ? undefined
          : "No geocoding matches returned for that input.",
    };
    cache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        results: [],
        status: "error",
        message: "Geocoding lookup failed. Try again in a moment.",
      } satisfies GeocodeLookupResponse,
      { status: 200 },
    );
  }
}
