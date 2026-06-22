export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  kind: "search" | "reverse";
  confidence: "high" | "medium" | "low";
  source: "nominatim";
}

export interface GeocodeLookupResponse {
  results: GeocodeResult[];
  status: "ok" | "empty" | "error";
  message?: string;
}

function clampCoord(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGeocodeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function parseNominatimSearchResults(payload: unknown): GeocodeResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, 5)
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      const label =
        typeof row.display_name === "string"
          ? row.display_name.slice(0, 180)
          : "Unknown location";
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const result: GeocodeResult = {
        label,
        lat: clampCoord(lat, -90, 90),
        lng: clampCoord(lng, -180, 180),
        kind: "search",
        confidence: "medium",
        source: "nominatim",
      };
      return result;
    })
    .filter((entry): entry is GeocodeResult => entry !== null);
}

export function parseNominatimReverseResult(payload: unknown): GeocodeResult[] {
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  const label =
    typeof row.display_name === "string"
      ? row.display_name.slice(0, 180)
      : "Unknown location";
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return [
    {
      label,
      lat: clampCoord(lat, -90, 90),
      lng: clampCoord(lng, -180, 180),
      kind: "reverse",
      confidence: "high",
      source: "nominatim",
    },
  ];
}
