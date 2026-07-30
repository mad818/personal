export const OPS_MAP_MIN_ZOOM = 1;
export const OPS_MAP_MAX_ZOOM = 18;
export const OPS_TACTICAL_ZOOM_DELTA = 2;

export interface OpsMapViewport {
  lat: number;
  lng: number;
  zoom: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLongitude(value: number) {
  if (value >= -180 && value <= 180) return value;
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function normalizeOpsMapViewport(
  viewport: OpsMapViewport,
): OpsMapViewport {
  const lat = Number.isFinite(viewport.lat) ? viewport.lat : 0;
  const lng = Number.isFinite(viewport.lng) ? viewport.lng : 0;
  const zoom = Number.isFinite(viewport.zoom)
    ? viewport.zoom
    : OPS_MAP_MIN_ZOOM;
  return {
    lat: clamp(lat, -85, 85),
    lng: normalizeLongitude(lng),
    zoom: clamp(Math.round(zoom), OPS_MAP_MIN_ZOOM, OPS_MAP_MAX_ZOOM),
  };
}

export function resolveTacticalViewport(
  overview: OpsMapViewport,
): OpsMapViewport {
  const normalized = normalizeOpsMapViewport(overview);
  return {
    ...normalized,
    zoom: clamp(
      normalized.zoom + OPS_TACTICAL_ZOOM_DELTA,
      OPS_MAP_MIN_ZOOM,
      OPS_MAP_MAX_ZOOM,
    ),
  };
}

export function resolveOverviewViewport(
  tactical: OpsMapViewport,
): OpsMapViewport {
  const normalized = normalizeOpsMapViewport(tactical);
  return {
    ...normalized,
    zoom: clamp(
      normalized.zoom - OPS_TACTICAL_ZOOM_DELTA,
      OPS_MAP_MIN_ZOOM,
      OPS_MAP_MAX_ZOOM,
    ),
  };
}
