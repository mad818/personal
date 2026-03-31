/**
 * Live map (Intel → OpsMap) — free public data only. No Google Maps billing, no per-tile paid APIs.
 *
 * - Tiles: Carto Dark Matter (free tier) + OSM data — attribution required.
 * - Quakes: USGS public GeoJSON (no key).
 * - Flights: OpenSky Network (free; anonymous tier is rate-limited — stay sparse).
 * - Fires: NASA FIRMS (free API key from NASA; not a paid commercial API).
 *
 * Auto-refresh only hits these free endpoints, at conservative intervals (user can turn off).
 */
export const OPSMAP_QUAKE_AUTO_REFRESH_MS = 5 * 60_000; // 5 min — USGS all-day feed
export const OPSMAP_FLIGHT_AUTO_REFRESH_MS = 120_000; // 2 min — conservative for anonymous OpenSky
export const OPSMAP_FIRE_AUTO_REFRESH_MS = 10 * 60_000; // 10 min — FIRMS NRT; no need to hammer

/** Master toggle: auto-refresh any active free layer at the intervals above. */
export const OPSMAP_FREE_AUTO_REFRESH_DEFAULT = true;

export const OPSMAP_DATA_ATTRIBUTION =
  "Free data: © OpenStreetMap © CARTO · Quakes USGS · Flights OpenSky Network · Fires NASA FIRMS (optional free key). No paid map APIs in Nexus.";
