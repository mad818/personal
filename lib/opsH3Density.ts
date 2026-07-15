import { designTokens } from "@/lib/designTokens";

export const H3_DENSITY_CELL_DEG = 5;

export function hexVertices(
  lat: number,
  lng: number,
  radiusDeg: number,
): [number, number][] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return [
      lat + radiusDeg * Math.sin(angle),
      lng + radiusDeg * Math.cos(angle),
    ] as [number, number];
  });
}

export function buildDensityBins(
  points: { lat: number; lng: number }[],
  cellDeg = H3_DENSITY_CELL_DEG,
): Map<string, number> {
  const bins = new Map<string, number>();
  for (const point of points) {
    const cy = Math.round(point.lat / cellDeg) * cellDeg;
    const cx = Math.round(point.lng / cellDeg) * cellDeg;
    const key = `${cy},${cx}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  return bins;
}

export function densityColorForRatio(ratio: number): string {
  if (ratio > 0.7) return designTokens.critical;
  if (ratio > 0.4) return designTokens.warning;
  if (ratio > 0.15) return designTokens.success;
  return designTokens.info;
}

export function densityFillOpacity(ratio: number): number {
  return Math.min(0.12 + ratio * 0.45, 0.6);
}
