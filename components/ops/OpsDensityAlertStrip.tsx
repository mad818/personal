"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { opsDensitySeverityColor } from "@/lib/designTokens";
import {
  buildOpsDensityAlerts,
  type OpsDensityAlert,
} from "@/lib/opsDensityAlerts";

function severityColor(severity: OpsDensityAlert["severity"]): string {
  return opsDensitySeverityColor(severity);
}

export default function OpsDensityAlertStrip() {
  const [alerts, setAlerts] = useState<OpsDensityAlert[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [quakesRes, flightsRes, firesRes] = await Promise.allSettled([
          apiFetch("/api/earthquakes", { signal: AbortSignal.timeout(10_000) }),
          apiFetch("/api/flights", { signal: AbortSignal.timeout(10_000) }),
          apiFetch("/api/fires", { signal: AbortSignal.timeout(10_000) }),
        ]);

        const points: Array<{ lat: number; lng: number }> = [];

        if (quakesRes.status === "fulfilled" && quakesRes.value.ok) {
          const payload = (await quakesRes.value.json()) as {
            earthquakes?: Array<{ latitude?: number; longitude?: number }>;
          };
          for (const quake of payload.earthquakes ?? []) {
            if (
              typeof quake.latitude === "number" &&
              typeof quake.longitude === "number"
            ) {
              points.push({ lat: quake.latitude, lng: quake.longitude });
            }
          }
        }

        if (flightsRes.status === "fulfilled" && flightsRes.value.ok) {
          const payload = (await flightsRes.value.json()) as {
            flights?: Array<{
              latitude?: number;
              longitude?: number;
              on_ground?: boolean;
            }>;
          };
          for (const flight of payload.flights ?? []) {
            if (
              !flight.on_ground &&
              typeof flight.latitude === "number" &&
              typeof flight.longitude === "number"
            ) {
              points.push({ lat: flight.latitude, lng: flight.longitude });
            }
          }
        }

        if (firesRes.status === "fulfilled" && firesRes.value.ok) {
          const payload = (await firesRes.value.json()) as {
            fires?: Array<{ lat?: number; lng?: number }>;
          };
          for (const fire of payload.fires ?? []) {
            if (typeof fire.lat === "number" && typeof fire.lng === "number") {
              points.push({ lat: fire.lat, lng: fire.lng });
            }
          }
        }

        setAlerts(buildOpsDensityAlerts(points));
      } catch {
        setAlerts([]);
      }
    })();
  }, []);

  if (!alerts.length) {
    return (
      <div
        style={{
          fontSize: "10px",
          color: "var(--text3)",
          border: "1px dashed var(--border)",
          borderRadius: "8px",
          padding: "10px 12px",
        }}
      >
        No elevated density clusters right now.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            background: "var(--surf2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--text)" }}>
            {alert.summary}
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: severityColor(alert.severity),
              textTransform: "uppercase",
            }}
          >
            {alert.severity}
          </span>
        </div>
      ))}
    </div>
  );
}
