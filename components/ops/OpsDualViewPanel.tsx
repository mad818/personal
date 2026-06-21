"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { designTokens } from "@/lib/designTokens";
import {
  buildDualViewSyncState,
  buildTrajectoryTracksFromFlights,
  type TrajectoryTrack,
} from "@/lib/trafficlabTrajectory";

function TrajectorySvg({ tracks }: { tracks: TrajectoryTrack[] }) {
  const width = 280;
  const height = 140;
  if (!tracks.length) {
    return (
      <div
        style={{
          height,
          display: "grid",
          placeItems: "center",
          fontSize: "10px",
          color: "var(--text3)",
          border: "1px dashed var(--border)",
          borderRadius: "8px",
        }}
      >
        Tactical panel awaiting live flight tracks
      </div>
    );
  }

  const lats = tracks.flatMap((track) => track.points.map((point) => point.lat));
  const lngs = tracks.flatMap((track) => track.points.map((point) => point.lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const project = (lat: number, lng: number) => {
    const x =
      maxLng === minLng
        ? width / 2
        : ((lng - minLng) / (maxLng - minLng)) * (width - 24) + 12;
    const y =
      maxLat === minLat
        ? height / 2
        : height - ((lat - minLat) / (maxLat - minLat)) * (height - 24) - 12;
    return { x, y };
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {tracks.map((track) => {
        const points = track.points
          .map((point) => {
            const projected = project(point.lat, point.lng);
            return `${projected.x},${projected.y}`;
          })
          .join(" ");
        const head = project(track.lat, track.lng);
        return (
          <g key={track.id}>
            <polyline
              points={points}
              fill="none"
              stroke={designTokens.trajectory}
              strokeWidth="1.5"
              opacity="0.85"
            />
            <circle cx={head.x} cy={head.y} r="3.5" fill={designTokens.success} />
          </g>
        );
      })}
    </svg>
  );
}

export default function OpsDualViewPanel() {
  const [tracks, setTracks] = useState<TrajectoryTrack[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch("/api/flights", {
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { flights?: unknown[] };
        const flights = ((payload.flights ?? []) as Array<Record<string, unknown>>)
          .filter((row) => row.latitude != null && row.longitude != null && !row.on_ground)
          .slice(0, 12)
          .map((row) => ({
            icao: String(row.icao24 ?? ""),
            callsign: String(row.callsign ?? "").trim(),
            lat: Number(row.latitude),
            lng: Number(row.longitude),
            vel: Number(row.velocity_ms ?? 0),
            hdg: Number(row.true_track ?? 0),
            alt: Number(row.geo_altitude_m ?? row.baro_altitude_m ?? 0),
          }));
        setTracks(buildTrajectoryTracksFromFlights(flights));
      } catch {
        setTracks([]);
      }
    })();
  }, []);

  const sync = useMemo(() => buildDualViewSyncState(tracks), [tracks]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "10px",
      }}
    >
      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "10px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
          Overview
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          {sync.overviewLabel}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "8px" }}>
          Center {sync.centerLat.toFixed(2)}, {sync.centerLng.toFixed(2)}
        </div>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "10px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
          Tactical trajectories
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          {sync.tacticalLabel}
        </div>
        <div style={{ marginTop: "8px" }}>
          <TrajectorySvg tracks={tracks} />
        </div>
      </div>
    </div>
  );
}
