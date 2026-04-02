"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import {
  OPSMAP_DATA_ATTRIBUTION,
  OPSMAP_FIRE_AUTO_REFRESH_MS,
  OPSMAP_FLIGHT_AUTO_REFRESH_MS,
  OPSMAP_FREE_AUTO_REFRESH_DEFAULT,
  OPSMAP_QUAKE_AUTO_REFRESH_MS,
} from "@/lib/opsMapFreeTier";

// Quake colors by magnitude
function quakeColor(mag: number): string {
  if (mag >= 6) return "#ef4444";
  if (mag >= 5) return "#f59e0b";
  if (mag >= 4) return "#a78bfa";
  return "#6875a0";
}

interface Quake {
  id: string;
  lat: number;
  lng: number;
  mag: number;
  place: string;
  time: number;
}

interface Fire {
  lat: number;
  lng: number;
  brightness: number;
  acq_date: string;
}

interface Flight {
  icao: string;
  callsign: string;
  lat: number;
  lng: number;
  alt: number;
  vel: number;
  hdg: number;
  squawk: string;
}

async function fetchQuakes(): Promise<Quake[]> {
  try {
    const r = await apiFetch("/api/earthquakes", {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.earthquakes ?? [])
      .map((eq: any) => ({
        id: eq.id,
        lat: eq.latitude ?? 0,
        lng: eq.longitude ?? 0,
        mag: eq.magnitude ?? 0,
        place: eq.place ?? "",
        time: eq.time ?? 0,
      }))
      .filter((eq: Quake) => Number.isFinite(eq.lat) && Number.isFinite(eq.lng));
  } catch {
    return [];
  }
}

async function fetchFlights(): Promise<Flight[]> {
  try {
    const r = await apiFetch("/api/flights", {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return ((d.flights ?? []) as any[])
      .filter((s) => s.longitude != null && s.latitude != null && !s.on_ground)
      .slice(0, 800) // cap to avoid overloading the map
      .map((s) => ({
        icao: s.icao24 ?? "",
        callsign: (s.callsign ?? "").trim(),
        lat: s.latitude,
        lng: s.longitude,
        alt: s.geo_altitude_m ?? s.baro_altitude_m ?? 0,
        vel: s.velocity_ms ?? 0,
        hdg: typeof s.true_track === "number" ? s.true_track : 0,
        squawk: s.squawk != null ? String(s.squawk) : "",
      }));
  } catch {
    return [];
  }
}

/** Rotated plane marker showing true track from north. */
function flightDivIcon(
  L: { divIcon: (o: Record<string, unknown>) => unknown },
  f: Flight,
) {
  const heading = Number.isFinite(f.hdg) ? f.hdg : 0;
  const sq = f.squawk?.trim();
  const emergency = sq === "7700" || sq === "7600";
  const color = emergency ? "#ef4444" : "#60a5fa";
  const glow = emergency ? "rgba(239,68,68,0.75)" : "rgba(96,165,250,0.55)";
  return L.divIcon({
    className: "ops-flight-marker",
    html: `<svg width="14" height="14" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style="transform:rotate(${heading}deg);transform-origin:center center;filter:drop-shadow(0 0 3px ${glow})">
      <polygon points="6,0 4.5,5 0,6 4.5,7.5 4,12 6,10.5 8,12 7.5,7.5 12,6 7.5,5" fill="${color}" opacity="0.9"/>
    </svg>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

async function fetchFires(): Promise<Fire[]> {
  try {
    const r = await apiFetch("/api/fires", {
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.fires ?? [])
      .slice(0, 500)
      .map((f: any) => ({
        lat: f.latitude ?? 0,
        lng: f.longitude ?? 0,
        brightness: f.brightness ?? 0,
        acq_date: f.acq_date ?? "",
      }))
      .filter((f: Fire) => !Number.isNaN(f.lat) && !Number.isNaN(f.lng));
  } catch {
    return [];
  }
}

interface GeoDepDetection {
  lat: number;
  lng: number;
  label: string;
  confidence: number;
}

async function fetchGeoDepData(): Promise<GeoDepDetection[]> {
  try {
    const r = await apiFetch("/api/geo-scan", {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.detections ?? []) as GeoDepDetection[];
  } catch {
    return [];
  }
}

// Layer types
// Hex density helpers
/** Six flat-top hex vertices around (lat, lng) with half-width r degrees. */
function hexVertices(lat: number, lng: number, r: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return [lat + r * Math.sin(angle), lng + r * Math.cos(angle)] as [
      number,
      number,
    ];
  });
}

/** Build a Leaflet layerGroup of coloured hex polygons sized by event density. */
function buildDensityLayer(
  L: any,
  points: { lat: number; lng: number }[],
): any {
  const CELL = 5; // ~500 km grid cells
  const bins = new Map<string, number>();
  points.forEach((p) => {
    const cy = Math.round(p.lat / CELL) * CELL;
    const cx = Math.round(p.lng / CELL) * CELL;
    bins.set(`${cy},${cx}`, (bins.get(`${cy},${cx}`) ?? 0) + 1);
  });
  const maxCount = Math.max(...Array.from(bins.values()), 1);
  const group = L.layerGroup();
  bins.forEach((count, key) => {
    const [cy, cx] = key.split(",").map(Number);
    const t = count / maxCount;
    const color =
      t > 0.7
        ? "#ef4444"
        : t > 0.4
          ? "#f59e0b"
          : t > 0.15
            ? "#10b981"
            : "#60a5fa";
    L.polygon(hexVertices(cy, cx, CELL * 0.52), {
      color,
      fillColor: color,
      fillOpacity: Math.min(0.12 + t * 0.45, 0.6),
      weight: 0.5,
      opacity: 0.3,
    })
      .bindPopup(`${count} event${count !== 1 ? "s" : ""} in this cell`)
      .addTo(group);
  });
  return group;
}

type LayerKey = "quakes" | "flights" | "fires" | "geodep";

const LAYER_META: Record<
  LayerKey,
  { label: string; icon: string; needsKey?: string; serviceRequired?: boolean }
> = {
  quakes: { label: "Quakes", icon: "Q" },
  flights: { label: "Flights", icon: "F" },
  fires: { label: "Fires", icon: "H" },
  geodep: { label: "AI Scan", icon: "AI", serviceRequired: true },
};

export default function OpsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Record<string, any>>({});

  const firmsKey = useStore((s) => s.settings.firmsKey);

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(
    new Set<LayerKey>(["quakes"]),
  );
  const [layerLoading, setLayerLoading] = useState<Record<string, boolean>>({});
  const [mapReady, setMapReady] = useState(false);
  /** Auto-refresh only free APIs (USGS / OpenSky / FIRMS) at conservative intervals. */
  const [freeDataAutoRefresh, setFreeDataAutoRefresh] = useState(
    OPSMAP_FREE_AUTO_REFRESH_DEFAULT,
  );
  const [showDensity, setShowDensity] = useState(false);

  const toggleLayer = useCallback(async (key: LayerKey) => {
    const map = mapRef.current;
    if (!map) return;

    setActiveLayers((prev) => {
      const next = new Set<LayerKey>(prev);
      if (next.has(key)) {
        // Remove layer
        if (layerRefs.current[key]) {
          map.removeLayer(layerRefs.current[key]);
          delete layerRefs.current[key];
        }
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const paintFlightsLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLayerLoading((p) => ({ ...p, flights: true }));
    try {
      const L = await import("leaflet");
      const flights = await fetchFlights();
      if (!mapRef.current) return;
      const group = L.layerGroup();
      flights.forEach((f) => {
        const sq = f.squawk?.trim();
        const tip = `<b>${(f.callsign || f.icao || "?").trim()}</b>${sq ? `<br>Squawk ${sq}` : ""}<br>Alt ${Math.round(f.alt)} m · ${Math.round(f.vel * 3.6)} km/h · Hdg ${Math.round(f.hdg)} deg`;
        L.marker([f.lat, f.lng], {
          icon: flightDivIcon(L, f) as import("leaflet").DivIcon,
        })
          .bindPopup(tip)
          .addTo(group);
      });
      if (layerRefs.current.flights) {
        map.removeLayer(layerRefs.current.flights);
      }
      group.addTo(map);
      layerRefs.current.flights = group;
    } finally {
      setLayerLoading((p) => ({ ...p, flights: false }));
    }
  }, []);

  const refreshQuakes = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !activeLayers.has("quakes")) return;
    setLayerLoading((p) => ({ ...p, quakes: true }));
    try {
      const L = await import("leaflet");
      const quakes = await fetchQuakes();
      if (!mapRef.current) return;
      const group = L.layerGroup();
      quakes
        .filter((q) => q.mag >= 2.5)
        .forEach((q) => {
          L.circleMarker([q.lat, q.lng], {
            radius: Math.max(4, q.mag * 3),
            color: quakeColor(q.mag),
            fillColor: quakeColor(q.mag),
            fillOpacity: 0.5,
            weight: 1,
          })
            .addTo(group)
            .bindPopup(
              `<b>M${q.mag.toFixed(1)}</b><br>${q.place}<br><small>${new Date(q.time).toUTCString()}</small>`,
            );
        });
      if (layerRefs.current.quakes) {
        map.removeLayer(layerRefs.current.quakes);
      }
      group.addTo(map);
      layerRefs.current.quakes = group;
    } finally {
      setLayerLoading((p) => ({ ...p, quakes: false }));
    }
  }, [activeLayers]);

  const refreshFires = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !activeLayers.has("fires")) return;
    setLayerLoading((p) => ({ ...p, fires: true }));
    try {
      const L = await import("leaflet");
      const fires = await fetchFires();
      if (!mapRef.current) return;
      const group = L.layerGroup();
      fires.forEach((f) => {
        L.circleMarker([f.lat, f.lng], {
          radius: 3,
          color: "#f97316",
          fillColor: "#f97316",
          fillOpacity: 0.6,
          weight: 0,
        })
          .addTo(group)
          .bindPopup(
            `<b>Fire hotspot</b><br>Brightness: ${f.brightness}K<br>${f.acq_date}`,
          );
      });
      if (layerRefs.current.fires) {
        map.removeLayer(layerRefs.current.fires);
      }
      group.addTo(map);
      layerRefs.current.fires = group;
    } finally {
      setLayerLoading((p) => ({ ...p, fires: false }));
    }
  }, [activeLayers]);

  const refreshGeodep = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !activeLayers.has("geodep")) return;
    setLayerLoading((p) => ({ ...p, geodep: true }));
    try {
      const L = await import("leaflet");
      const detections = await fetchGeoDepData();
      if (!mapRef.current) return;
      const group = L.layerGroup();
      detections.forEach((d) => {
        L.circleMarker([d.lat, d.lng], {
          radius: 6,
          color: "#a78bfa",
          fillColor: "#7c3aed",
          fillOpacity: 0.7,
          weight: 1.5,
        })
          .addTo(group)
          .bindPopup(
            `<b>${d.label}</b><br>Confidence: ${Math.round(d.confidence * 100)}%`,
          );
      });
      if (layerRefs.current.geodep) {
        map.removeLayer(layerRefs.current.geodep);
      }
      group.addTo(map);
      layerRefs.current.geodep = group;
    } finally {
      setLayerLoading((p) => ({ ...p, geodep: false }));
    }
  }, [activeLayers]);

  /** Collect lat/lng from all visible Leaflet layer groups and repaint density hexes. */
  const computeAndPaintDensity = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const L = await import("leaflet");
    const points: { lat: number; lng: number }[] = [];
    (["quakes", "fires", "flights"] as const).forEach((key) => {
      const group = layerRefs.current[key];
      if (!group) return;
      group.getLayers().forEach((layer: any) => {
        if (typeof layer.getLatLng === "function") {
          const ll = layer.getLatLng();
          points.push({ lat: ll.lat, lng: ll.lng });
        }
      });
    });
    if (layerRefs.current.density) {
      map.removeLayer(layerRefs.current.density);
      delete layerRefs.current.density;
    }
    if (!points.length) return;
    const densityGroup = buildDensityLayer(L, points);
    densityGroup.addTo(map);
    layerRefs.current.density = densityGroup;
  }, []);

  // Load quakes + fires when activeLayers changes (flights handled separately)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    import("leaflet").then((L) => {
      activeLayers.forEach(async (key) => {
        if (key === "flights" || key === "geodep") return;
        if (layerRefs.current[key]) return; // already loaded
        setLayerLoading((p) => ({ ...p, [key]: true }));

        if (key === "quakes") {
          const quakes = await fetchQuakes();
          const group = L.layerGroup();
          quakes
            .filter((q) => q.mag >= 2.5)
            .forEach((q) => {
              L.circleMarker([q.lat, q.lng], {
                radius: Math.max(4, q.mag * 3),
                color: quakeColor(q.mag),
                fillColor: quakeColor(q.mag),
                fillOpacity: 0.5,
                weight: 1,
              })
                .addTo(group)
                .bindPopup(
                  `<b>M${q.mag.toFixed(1)}</b><br>${q.place}<br><small>${new Date(q.time).toUTCString()}</small>`,
                );
            });
          group.addTo(map);
          layerRefs.current[key] = group;
        } else if (key === "fires") {
          const fires = await fetchFires();
          const group = L.layerGroup();
          fires.forEach((f) => {
            L.circleMarker([f.lat, f.lng], {
              radius: 3,
              color: "#f97316",
              fillColor: "#f97316",
              fillOpacity: 0.6,
              weight: 0,
            })
              .addTo(group)
              .bindPopup(
                `<b>Fire hotspot</b><br>Brightness: ${f.brightness}K<br>${f.acq_date}`,
              );
          });
          group.addTo(map);
          layerRefs.current[key] = group;
        }

        setLayerLoading((p) => ({ ...p, [key]: false }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers, mapReady]);

  useEffect(() => {
    const sid = "ops-flight-marker-css";
    if (!document.getElementById(sid)) {
      const st = document.createElement("style");
      st.id = sid;
      st.textContent =
        ".leaflet-marker-icon.ops-flight-marker{background:transparent!important;border:none!important;margin-left:-7px!important;margin-top:-7px!important;}";
      document.head.appendChild(st);
    }
  }, []);

  // Flights: load once when layer turns on; optional slow auto-refresh (opt-in)
  useEffect(() => {
    if (!mapReady || !activeLayers.has("flights")) return;
    void paintFlightsLayer();
    return () => {
      const m = mapRef.current;
      if (m && layerRefs.current.flights) {
        m.removeLayer(layerRefs.current.flights);
        delete layerRefs.current.flights;
      }
    };
  }, [activeLayers, mapReady, paintFlightsLayer]);

  // Geodep: load once when layer turns on - no auto-refresh (expensive ML call, manual only)
  useEffect(() => {
    if (!mapReady || !activeLayers.has("geodep")) return;
    void refreshGeodep();
    return () => {
      const m = mapRef.current;
      if (m && layerRefs.current.geodep) {
        m.removeLayer(layerRefs.current.geodep);
        delete layerRefs.current.geodep;
      }
    };
  }, [activeLayers, mapReady, refreshGeodep]);

  // Density overlay: repaint whenever toggled on or active layers change
  useEffect(() => {
    if (!mapReady) return;
    if (!showDensity) {
      const map = mapRef.current;
      if (map && layerRefs.current.density) {
        map.removeLayer(layerRefs.current.density);
        delete layerRefs.current.density;
      }
      return;
    }
    void computeAndPaintDensity();
  }, [showDensity, activeLayers, mapReady, computeAndPaintDensity]);

  // Auto-refresh active free layers only (polite cadence; toggle off anytime)
  useEffect(() => {
    if (!mapReady || !freeDataAutoRefresh) return;
    const ids: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.has("quakes")) {
      ids.push(
        setInterval(() => void refreshQuakes(), OPSMAP_QUAKE_AUTO_REFRESH_MS),
      );
    }
    if (activeLayers.has("flights")) {
      ids.push(
        setInterval(
          () => void paintFlightsLayer(),
          OPSMAP_FLIGHT_AUTO_REFRESH_MS,
        ),
      );
    }
    if (activeLayers.has("fires") && firmsKey) {
      ids.push(
        setInterval(() => void refreshFires(), OPSMAP_FIRE_AUTO_REFRESH_MS),
      );
    }
    return () => ids.forEach(clearInterval);
  }, [
    mapReady,
    freeDataAutoRefresh,
    activeLayers,
    firmsKey,
    refreshQuakes,
    paintFlightsLayer,
    refreshFires,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }
    if (mapRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      ).addTo(map);

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRefs.current = {};
      }
      if (container) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  return (
    <div style={{ marginTop: "18px" }}>
      {/* Header + layer toggles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Live map
        </span>

        {(Object.keys(LAYER_META) as LayerKey[]).map((key) => {
          const meta = LAYER_META[key];
          const active = activeLayers.has(key);
          const loading = layerLoading[key];
          const locked = meta.needsKey === "firmsKey" && !firmsKey;
          const svcHint = meta.serviceRequired
            ? "Requires local GeoDeep AI service - see docs/deployment/geodep.md"
            : undefined;
          return (
            <button
              key={key}
              onClick={() => !locked && toggleLayer(key)}
              title={
                locked
                  ? "Add NASA FIRMS key in Settings to enable fire layer"
                  : svcHint
              }
              style={{
                height: "26px",
                padding: "0 10px",
                borderRadius: "6px",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: locked ? "default" : "pointer",
                border: "1px solid var(--border2)",
                background: active ? "var(--accent)" : "transparent",
                color: active
                  ? "#fff"
                  : locked
                    ? "var(--text3)"
                    : "var(--text2)",
                opacity: locked ? 0.45 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "12px" }}>{meta.icon}</span>
              {loading ? "..." : meta.label}
            </button>
          );
        })}
      </div>

      {/* Manual refresh - free APIs only; you choose when to hit the network */}
      {(activeLayers.has("quakes") ||
        activeLayers.has("flights") ||
        activeLayers.has("fires") ||
        activeLayers.has("geodep")) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
            flexWrap: "wrap",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Map data
          </span>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              userSelect: "none",
              paddingRight: "4px",
              borderRight: "1px solid var(--border2)",
              marginRight: "2px",
            }}
            title="Only free public APIs: USGS (~5 min), OpenSky (~2 min), NASA FIRMS (~10 min). Turn off to fetch only when you click Refresh."
          >
            <input
              type="checkbox"
              checked={freeDataAutoRefresh}
              onChange={(e) => setFreeDataAutoRefresh(e.target.checked)}
            />
            Auto free data
          </label>
          {activeLayers.has("quakes") && (
            <button
              type="button"
              aria-label="Refresh earthquake layer from USGS"
              onClick={() => void refreshQuakes()}
              disabled={!!layerLoading.quakes}
              style={{
                height: "24px",
                padding: "0 10px",
                borderRadius: "6px",
                border: "1px solid var(--border2)",
                background: "var(--surface2)",
                color: "var(--text2)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: layerLoading.quakes ? "wait" : "pointer",
              }}
            >
              {layerLoading.quakes ? "..." : "Refresh quakes"}
            </button>
          )}
          {activeLayers.has("flights") && (
            <button
              type="button"
              aria-label="Refresh flight positions from OpenSky"
              onClick={() => void paintFlightsLayer()}
              disabled={!!layerLoading.flights}
              style={{
                height: "24px",
                padding: "0 10px",
                borderRadius: "6px",
                border: "1px solid var(--border2)",
                background: "var(--surface2)",
                color: "var(--text2)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: layerLoading.flights ? "wait" : "pointer",
              }}
            >
              {layerLoading.flights ? "..." : "Refresh flights"}
            </button>
          )}
          {activeLayers.has("fires") && (
            <button
              type="button"
              aria-label="Refresh fire hotspots from NASA FIRMS"
              onClick={() => void refreshFires()}
              disabled={!!layerLoading.fires}
              style={{
                height: "24px",
                padding: "0 10px",
                borderRadius: "6px",
                border: "1px solid var(--border2)",
                background: "var(--surface2)",
                color: "var(--text2)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: layerLoading.fires ? "wait" : "pointer",
              }}
            >
              {layerLoading.fires ? "..." : "Refresh fires"}
            </button>
          )}
          {activeLayers.has("geodep") && (
            <button
              type="button"
              aria-label="Run AI object detection via local GeoDeep service"
              onClick={() => void refreshGeodep()}
              disabled={!!layerLoading.geodep}
              style={{
                height: "24px",
                padding: "0 10px",
                borderRadius: "6px",
                border: "1px solid var(--border2)",
                background: "var(--surface2)",
                color: "var(--text2)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: layerLoading.geodep ? "wait" : "pointer",
              }}
            >
              {layerLoading.geodep ? "..." : "Run AI scan"}
            </button>
          )}
        </div>
      )}

      {/* Legend - any active layer */}
      {(activeLayers.has("quakes") ||
        activeLayers.has("flights") ||
        activeLayers.has("fires") ||
        activeLayers.has("geodep")) && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          {activeLayers.has("quakes") &&
            [
              { color: "#ef4444", label: "M6+" },
              { color: "#f59e0b", label: "M5-6" },
              { color: "#a78bfa", label: "M4-5" },
              { color: "#6875a0", label: "M2.5-4" },
            ].map((l) => (
              <span
                key={l.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: "var(--text3)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: l.color,
                    display: "inline-block",
                  }}
                />
                {l.label}
              </span>
            ))}
          {activeLayers.has("flights") && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{ fontSize: "11px" }}
                title="Free OpenSky icon points forward based on heading."
              >
                F
              </span>
              Flights - heading aware - free data
              {freeDataAutoRefresh
                ? ` - auto ~${Math.round(OPSMAP_FLIGHT_AUTO_REFRESH_MS / 60_000)} min`
                : " - manual only"}
            </span>
          )}
          {activeLayers.has("fires") && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#f97316",
                  display: "inline-block",
                }}
              />
              Fire hotspots
              {freeDataAutoRefresh && firmsKey
                ? ` - auto ~${Math.round(OPSMAP_FIRE_AUTO_REFRESH_MS / 60_000)} min`
                : ""}
            </span>
          )}
          {activeLayers.has("quakes") && freeDataAutoRefresh && (
            <span style={{ fontSize: "10px", color: "var(--text3)" }}>
              Quakes auto ~{Math.round(OPSMAP_QUAKE_AUTO_REFRESH_MS / 60_000)}{" "}
              min (USGS)
            </span>
          )}
          {activeLayers.has("geodep") && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#7c3aed",
                  display: "inline-block",
                }}
              />
              AI detections - local service - manual refresh only
            </span>
          )}
          {showDensity && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              Density overlay
            </span>
          )}
        </div>
      )}

      <p
        style={{
          margin: "0 0 8px",
          fontSize: "9.5px",
          lineHeight: 1.45,
          color: "var(--text3)",
          maxWidth: "720px",
        }}
      >
        {OPSMAP_DATA_ATTRIBUTION}
      </p>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "420px",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      />

      {!firmsKey && (
        <div
          style={{ marginTop: "6px", fontSize: "10px", color: "var(--text3)" }}
        >
          Add a NASA FIRMS key in Settings for live fire data. Without one, the layer falls back to sample hotspots.
        </div>
      )}
      {activeLayers.has("geodep") && (
        <div
          style={{ marginTop: "6px", fontSize: "10px", color: "var(--text3)" }}
        >
          AI Scan uses a local GeoDeep service. See{" "}
          <code style={{ fontFamily: "monospace", fontSize: "9px" }}>
            docs/deployment/geodep.md
          </code>{" "}
          to set it up.
        </div>
      )}
    </div>
  );
}
