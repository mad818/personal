export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface OpsDensityAlert {
  id: string;
  cellKey: string;
  count: number;
  severity: "watch" | "elevated" | "hot";
  centerLat: number;
  centerLng: number;
  summary: string;
}

const CELL_DEGREES = 5;

function binKey(lat: number, lng: number): string {
  const cy = Math.round(lat / CELL_DEGREES) * CELL_DEGREES;
  const cx = Math.round(lng / CELL_DEGREES) * CELL_DEGREES;
  return `${cy},${cx}`;
}

export function buildOpsDensityAlerts(
  points: GeoPoint[],
  opts: { hotThreshold?: number; elevatedThreshold?: number } = {},
): OpsDensityAlert[] {
  const hotThreshold = opts.hotThreshold ?? 12;
  const elevatedThreshold = opts.elevatedThreshold ?? 6;
  const bins = new Map<string, { count: number; lat: number; lng: number }>();

  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
    const key = binKey(point.lat, point.lng);
    const cy = Math.round(point.lat / CELL_DEGREES) * CELL_DEGREES;
    const cx = Math.round(point.lng / CELL_DEGREES) * CELL_DEGREES;
    const prev = bins.get(key);
    bins.set(key, {
      count: (prev?.count ?? 0) + 1,
      lat: cy,
      lng: cx,
    });
  }

  return Array.from(bins.entries())
    .map(([cellKey, bin]) => {
      const severity: OpsDensityAlert["severity"] =
        bin.count >= hotThreshold
          ? "hot"
          : bin.count >= elevatedThreshold
            ? "elevated"
            : "watch";
      return {
        id: `density-${cellKey}`,
        cellKey,
        count: bin.count,
        severity,
        centerLat: bin.lat,
        centerLng: bin.lng,
        summary: `${bin.count} live events clustered near ${bin.lat.toFixed(1)}, ${bin.lng.toFixed(1)}`,
      };
    })
    .filter((alert) => alert.severity !== "watch" || alert.count >= 4)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
