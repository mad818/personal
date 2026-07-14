"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  type EspectreControlPatch,
  type EspectreDetector,
  type EspectreReadiness,
  type EspectreTelemetry,
  type EspectreTrafficMode,
} from "@/lib/espectre";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

type SensorRecord = {
  telemetry: EspectreTelemetry;
  readiness: EspectreReadiness;
};

type EspectrePayload = {
  sensors?: SensorRecord[];
  integration?: {
    ingress?: string;
    control?: string;
    runtimeBoundary?: string;
    rawCsiStored?: boolean;
  };
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: "5px",
  minWidth: 0,
};

const controlStyle: CSSProperties = {
  minWidth: 0,
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  background: "var(--surf2)",
  color: "var(--text)",
  padding: "8px",
  fontSize: "12px",
};

function readinessTone(status: EspectreReadiness["status"]) {
  if (status === "ready") return "success";
  if (status === "simulated") return "accent";
  return "default";
}

export default function EspectreWifiViewer() {
  const [payload, setPayload] = useState<EspectrePayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("Waiting for ESPectre posture.");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/espectre", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const next = (await response.json()) as EspectrePayload;
      setPayload(next);
      setSelectedId((current) => current || next.sensors?.[0]?.telemetry.sensorId || "");
    } catch {
      // External sensing is optional and must not break the IoT route.
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4_000);
    return () => window.clearInterval(timer);
  }, []);

  const sensors = payload?.sensors ?? [];
  const selected =
    sensors.find((sensor) => sensor.telemetry.sensorId === selectedId) ??
    sensors[0];

  async function send(
    action: "calibrate" | "configure",
    patch: EspectreControlPatch = {},
  ) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch("/api/espectre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          sensorId: selected.telemetry.sensorId,
          patch,
        }),
      });
      if (!response.ok) throw new Error("ESPectre command rejected");
      const result = (await response.json()) as { note?: string; error?: string };
      setMessage(result.note ?? result.error ?? "Command envelope prepared.");
    } catch {
      setMessage("Unable to prepare command envelope.");
    } finally {
      setBusy(false);
    }
  }

  const telemetry = selected?.telemetry;
  const readiness = selected?.readiness;

  return (
    <section data-testid="espectre-wifi-viewer" style={{ display: "grid", gap: "12px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="W"
        title="WiFi sensing"
        description="ESPectre reads radio-channel motion and presence posture without camera or audio. It does not identify people or provide literal through-wall vision."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        {sensors.map((sensor) => (
          <button
            key={sensor.telemetry.sensorId}
            type="button"
            onClick={() => setSelectedId(sensor.telemetry.sensorId)}
            style={{
              minWidth: 0,
              padding: "10px",
              textAlign: "left",
              borderRadius: "6px",
              border:
                selected?.telemetry.sensorId === sensor.telemetry.sensorId
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
              background: "var(--surf2)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <SectionLabel detail={sensor.telemetry.zone}>
              {sensor.telemetry.name}
            </SectionLabel>
            <strong style={{ fontSize: "18px" }}>
              {sensor.telemetry.motionState === "motion" ? "MOTION" : "IDLE"}
            </strong>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
              <ShellBadge tone={readinessTone(sensor.readiness.status)}>
                {sensor.readiness.status}
              </ShellBadge>
              <ShellBadge tone="muted">{sensor.telemetry.transport}</ShellBadge>
            </div>
          </button>
        ))}
      </div>

      {telemetry && readiness ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              ["Movement score", telemetry.movementScore.toFixed(1)],
              ["Threshold", telemetry.threshold.toFixed(1)],
              ["Detector", telemetry.detector.toUpperCase()],
              ["Hit filter", `${telemetry.motionOnHits} on / ${telemetry.motionOffHits} off`],
              ["Filters", `${telemetry.nbviEnabled ? "NBVI " : ""}${telemetry.hampelEnabled ? "Hampel " : ""}${telemetry.lowPassEnabled ? "Low-pass" : ""}`.trim() || "Off"],
              ["Locks", `${telemetry.gainLocked ? "Gain " : ""}${telemetry.fftLocked ? "FFT" : ""}`.trim() || "Off"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--surf2)",
                }}
              >
                <SectionLabel detail={label}>{value}</SectionLabel>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <label style={fieldStyle}>
              <span>Threshold</span>
              <input
                type="number"
                min={1}
                max={100}
                defaultValue={telemetry.threshold}
                style={controlStyle}
                onBlur={(event) =>
                  void send("configure", { threshold: Number(event.target.value) })
                }
              />
            </label>
            <label style={fieldStyle}>
              <span>Detector</span>
              <select
                value={telemetry.detector}
                style={controlStyle}
                onChange={(event) =>
                  void send("configure", {
                    detector: event.target.value as EspectreDetector,
                  })
                }
              >
                <option value="mvs">MVS</option>
                <option value="mlp">MLP experimental</option>
              </select>
            </label>
            <label style={fieldStyle}>
              <span>Traffic</span>
              <select
                value={telemetry.trafficMode}
                style={controlStyle}
                onChange={(event) =>
                  void send("configure", {
                    trafficMode: event.target.value as EspectreTrafficMode,
                  })
                }
              >
                <option value="ping">Ping</option>
                <option value="dns">DNS</option>
                <option value="external">External UDP</option>
              </select>
            </label>
            <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={telemetry.consentConfirmed}
                onChange={(event) =>
                  void send("configure", { consentConfirmed: event.target.checked })
                }
              />
              <span>Consent confirmed for this zone</span>
            </label>
            <ShellButton
              active={!busy}
              disabled={busy}
              title="Prepare a review-required recalibration envelope"
              onClick={() => send("calibrate")}
            >
              Calibrate
            </ShellButton>
          </div>

          <div style={{ color: "var(--text2)", fontSize: "12px", lineHeight: 1.5 }}>
            <strong>Consent and readiness:</strong> {readiness.summary} {message}
          </div>
        </>
      ) : (
        <p style={{ margin: 0, color: "var(--text2)" }}>
          ESPectre posture is unavailable. The rest of the IoT desk remains operational.
        </p>
      )}
    </section>
  );
}
