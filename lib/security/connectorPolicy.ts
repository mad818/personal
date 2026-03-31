export const CONNECTOR_KEYS = [
  "news",
  "gdelt",
  "conflict",
  "cisaKev",
  "cves",
  "threatIntel",
  "secFilings",
  "prices",
  "metals",
  "commodities",
  "fx",
  "fearGreed",
  "defi",
  "polymarket",
  "weather",
  "earthquakes",
  "fires",
  "flights",
  "maritime",
  "geoScan",
  "hackerNews",
  "headers",
] as const;

export type ConnectorKey = (typeof CONNECTOR_KEYS)[number];
export type ConnectorPolicy = Record<ConnectorKey, boolean>;

const CONNECTOR_PREFIX: Record<ConnectorKey, string> = {
  news: "/api/news",
  gdelt: "/api/gdelt",
  conflict: "/api/conflict",
  cisaKev: "/api/cisa-kev",
  cves: "/api/cves",
  threatIntel: "/api/threat-intel",
  secFilings: "/api/sec-filings",
  prices: "/api/prices",
  metals: "/api/metals",
  commodities: "/api/commodities",
  fx: "/api/fx",
  fearGreed: "/api/fear-greed",
  defi: "/api/defi",
  polymarket: "/api/polymarket",
  weather: "/api/weather",
  earthquakes: "/api/earthquakes",
  fires: "/api/fires",
  flights: "/api/flights",
  maritime: "/api/maritime",
  geoScan: "/api/geo-scan",
  hackerNews: "/api/hacker-news",
  headers: "/api/headers",
};

export const DEFAULT_CONNECTOR_POLICY: ConnectorPolicy = Object.fromEntries(
  CONNECTOR_KEYS.map((k) => [k, true]),
) as ConnectorPolicy;

export function parseConnectorPolicy(raw: string | undefined): ConnectorPolicy {
  if (!raw || !raw.trim()) return DEFAULT_CONNECTOR_POLICY;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged: ConnectorPolicy = { ...DEFAULT_CONNECTOR_POLICY };
    for (const key of CONNECTOR_KEYS) {
      if (typeof parsed[key] === "boolean") merged[key] = parsed[key] as boolean;
    }
    return merged;
  } catch {
    return DEFAULT_CONNECTOR_POLICY;
  }
}

export function readConnectorPolicy(): ConnectorPolicy {
  return parseConnectorPolicy(process.env.NEXUS_CONNECTOR_POLICY_JSON);
}

export function findConnectorKeyForPath(pathname: string): ConnectorKey | null {
  for (const key of CONNECTOR_KEYS) {
    if (pathname.startsWith(CONNECTOR_PREFIX[key])) return key;
  }
  return null;
}

