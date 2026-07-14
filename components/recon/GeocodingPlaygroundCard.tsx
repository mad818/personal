"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { designTokens } from "@/lib/designTokens";
import type { GeocodeResult } from "@/lib/geoCoordinateLookup";

const INPUT: React.CSSProperties = {
  background: "var(--surf2)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text)",
  fontSize: "11px",
  padding: "6px 8px",
  outline: "none",
  width: "100%",
};

export default function GeocodingPlaygroundCard() {
  const [query, setQuery] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRunning(true);
    try {
      const response = await apiFetch(
        `/api/geocode?q=${encodeURIComponent(trimmed)}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      const payload = (await response.json()) as {
        results?: GeocodeResult[];
        message?: string;
      };
      setResults(payload.results ?? []);
      setMessage(payload.message ?? "");
    } catch {
      setResults([]);
      setMessage("Geocoding lookup failed.");
    } finally {
      setRunning(false);
    }
  }

  async function runReverse() {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
    setRunning(true);
    try {
      const response = await apiFetch(
        `/api/geocode?lat=${encodeURIComponent(String(parsedLat))}&lng=${encodeURIComponent(String(parsedLng))}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      const payload = (await response.json()) as {
        results?: GeocodeResult[];
        message?: string;
      };
      setResults(payload.results ?? []);
      setMessage(payload.message ?? "");
    } catch {
      setResults([]);
      setMessage("Reverse geocoding failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "10px", color: "var(--text3)" }}>
        Bounded Nominatim proxy — search addresses or reverse lookup coordinates.
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          aria-label="Address or place"
          style={{ ...INPUT, flex: 1, minWidth: "180px" }}
          placeholder="Search address or place"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void runSearch();
          }}
        />
        <button
          onClick={() => void runSearch()}
          disabled={running}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "var(--accent)",
            color: designTokens.textOnAccent,
            fontWeight: 700,
            fontSize: "11px",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          Search
        </button>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          aria-label="Latitude"
          style={{ ...INPUT, flex: "0 0 110px" }}
          placeholder="Lat"
          value={lat}
          onChange={(event) => setLat(event.target.value)}
        />
        <input
          aria-label="Longitude"
          style={{ ...INPUT, flex: "0 0 110px" }}
          placeholder="Lng"
          value={lng}
          onChange={(event) => setLng(event.target.value)}
        />
        <button
          onClick={() => void runReverse()}
          disabled={running}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "var(--surf3)",
            color: "var(--text2)",
            fontWeight: 700,
            fontSize: "11px",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          Reverse
        </button>
      </div>

      {message ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>{message}</div>
      ) : null}

      {results.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {results.map((result, index) => (
            <div
              key={`${result.label}-${index}`}
              style={{
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text)" }}>
                {result.label}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "4px" }}>
                {result.lat.toFixed(4)}, {result.lng.toFixed(4)} · {result.kind}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
