// ── components/security/SecurityAlerts ─────────────────────
// Real-time security alert feed with filtering and dismissal actions.

"use client";
// filter controls, per-alert acknowledge functionality, and weather-based alerts.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";

type DetectionType = "Person" | "Vehicle" | "Animal" | "Unknown" | "WEATHER";
type FilterType = "All" | "Person" | "Vehicle" | "Motion";

interface Alert {
  id: string;
  timestamp: string;
  camera: string;
  type: DetectionType;
  confidence: number;
  detail: string;
  acknowledged: boolean;
  isNight: boolean;
  isWeather?: boolean;
}

interface WeatherData {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

const DEMO_ALERTS: Alert[] = [
  {
    id: "a1",
    timestamp: "03:42:17",
    camera: "Front Gate",
    type: "Person",
    confidence: 94,
    detail: "Male figure, approaching from north",
    acknowledged: false,
    isNight: true,
  },
  {
    id: "a2",
    timestamp: "03:38:55",
    camera: "Rear Compound",
    type: "Vehicle",
    confidence: 88,
    detail: "SUV parked outside perimeter",
    acknowledged: false,
    isNight: true,
  },
  {
    id: "a3",
    timestamp: "03:31:02",
    camera: "Side Entrance",
    type: "Person",
    confidence: 76,
    detail: "Unidentified individual, stationary",
    acknowledged: false,
    isNight: true,
  },
  {
    id: "a4",
    timestamp: "03:15:44",
    camera: "Front Gate",
    type: "Animal",
    confidence: 91,
    detail: "Large canine detected near fence",
    acknowledged: true,
    isNight: true,
  },
  {
    id: "a5",
    timestamp: "02:58:11",
    camera: "Side Entrance",
    type: "Unknown",
    confidence: 62,
    detail: "Motion without clear classification",
    acknowledged: true,
    isNight: true,
  },
  {
    id: "a6",
    timestamp: "14:22:33",
    camera: "Rear Compound",
    type: "Vehicle",
    confidence: 97,
    detail: "Delivery truck — authorized zone",
    acknowledged: true,
    isNight: false,
  },
];

function alertBorderColor(alert: Alert): string {
  if (alert.isWeather) return "#818cf8";
  if (alert.type === "Person" && alert.isNight) return "#ef4444";
  if (alert.type === "Vehicle") return "var(--gold)";
  if (alert.type === "Animal") return "var(--text2)";
  return "var(--border)";
}

function alertBgColor(alert: Alert): string {
  if (alert.isWeather) return "rgba(129,140,248,0.06)";
  if (alert.type === "Person" && alert.isNight) return "rgba(239,68,68,0.06)";
  if (alert.type === "Vehicle") return "rgba(212,149,106,0.06)";
  return "var(--surf2)";
}

function typeIcon(type: DetectionType): string {
  if (type === "Person") return "🚶";
  if (type === "Vehicle") return "🚗";
  if (type === "Animal") return "🐕";
  if (type === "WEATHER") return "⛈️";
  return "❓";
}

function alertPriority(alert: Alert): number {
  const base = alert.acknowledged ? 0 : 1000;
  const typeBoost =
    alert.isWeather ? 280 : alert.type === "Person" ? 220 : alert.type === "Vehicle" ? 160 : 60;
  const nightBoost = alert.isNight ? 40 : 0;
  return base + typeBoost + nightBoost + alert.confidence;
}

function AlertPreviewCard({ alert }: { alert: Alert }) {
  return (
    <div
      style={{
        background: alertBgColor(alert),
        border: `1px solid ${alertBorderColor(alert)}`,
        borderRadius: "var(--rs)",
        padding: "9px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "12px" }}>{typeIcon(alert.type)}</span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            color: alert.isWeather ? "#818cf8" : "var(--text)",
          }}
        >
          {alert.camera}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color: "var(--text3)",
            fontFamily: "monospace",
          }}
        >
          {alert.timestamp}
        </span>
      </div>
      <div style={{ fontSize: "10px", color: "var(--text2)" }}>{alert.detail}</div>
    </div>
  );
}

function AlertFeedCard({
  alert,
  onAcknowledge,
}: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
}) {
  return (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: alert.acknowledged ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: alertBgColor(alert),
        border: `1px solid ${alertBorderColor(alert)}`,
        borderRadius: "var(--rs)",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "13px" }}>{typeIcon(alert.type)}</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: alert.isWeather ? "#818cf8" : "var(--text)",
          }}
        >
          {alert.isWeather ? "WEATHER" : alert.type}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            fontFamily: "monospace",
            color: "var(--text3)",
            marginLeft: "2px",
          }}
        >
          {alert.confidence}% conf
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            fontFamily: "monospace",
            color: "var(--text3)",
          }}
        >
          {alert.isNight ? "🌙 " : ""}
          {alert.timestamp}
        </span>
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text2)",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: alert.isWeather ? "#818cf8" : "var(--accent2)",
          }}
        >
          {alert.camera}
        </span>
        {" — "}
        {alert.detail}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            flex: 1,
            height: "3px",
            background: "var(--surf3)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${alert.confidence}%`,
              height: "100%",
              background: alertBorderColor(alert),
              borderRadius: "2px",
            }}
          />
        </div>
        {!alert.acknowledged ? (
          <button
            onClick={() => onAcknowledge(alert.id)}
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              border: "none",
              background: "var(--surf3)",
              color: "var(--text2)",
              cursor: "pointer",
            }}
          >
            ACK
          </button>
        ) : (
          <span
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              fontWeight: 700,
            }}
          >
            ✓ ACK
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Build weather alerts from current conditions ──────────────────────────────
function buildWeatherAlerts(weather: WeatherData): Alert[] {
  const alerts: Alert[] = [];
  const c = weather.current;
  if (!c) return alerts;

  const now = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tempF = c.temperature_2m != null ? (c.temperature_2m * 9) / 5 + 32 : 0;
  const windMph = c.wind_speed_10m != null ? c.wind_speed_10m * 0.621371 : 0;
  const code = c.weather_code ?? 0;

  // Wind > 40 mph
  if (windMph > 40) {
    alerts.push({
      id: `weather-wind-${Date.now()}`,
      timestamp: now,
      camera: "Weather Station",
      type: "WEATHER",
      confidence: 100,
      detail: `HIGH WIND ALERT — Drone operations unsafe (${windMph.toFixed(1)} mph)`,
      acknowledged: false,
      isNight: false,
      isWeather: true,
    });
  }

  // Temp > 100°F
  if (tempF > 100) {
    alerts.push({
      id: `weather-heat-${Date.now()}`,
      timestamp: now,
      camera: "Weather Station",
      type: "WEATHER",
      confidence: 100,
      detail: `HEAT ALERT — Camera sensors may overheat (${tempF.toFixed(1)}°F)`,
      acknowledged: false,
      isNight: false,
      isWeather: true,
    });
  }

  // Thunderstorm codes 95-99
  if (code >= 95 && code <= 99) {
    alerts.push({
      id: `weather-storm-${Date.now()}`,
      timestamp: now,
      camera: "Weather Station",
      type: "WEATHER",
      confidence: 100,
      detail: `STORM ALERT — Secure outdoor equipment (WMO code ${code})`,
      acknowledged: false,
      isNight: false,
      isWeather: true,
    });
  }

  return alerts;
}

const FILTER_LABELS: FilterType[] = ["All", "Person", "Vehicle", "Motion"];

export default function SecurityAlerts() {
  const [baseAlerts, setBaseAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [weatherAlerts, setWeatherAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null);
  const [feedExpanded, setFeedExpanded] = useState(false);

  // Read from Zustand store
  const storeWeather = useStore(
    (s) => ((s as any).weather as WeatherData | null) ?? null,
  );
  const storeSecurityAlerts = useStore(
    (s) => ((s as any).securityAlerts as any[]) ?? [],
  );

  const weather = storeWeather ?? localWeather;

  // Fallback: fetch weather locally if store doesn't have it
  useEffect(() => {
    if (!storeWeather && !localWeather) {
      apiFetch("/api/weather?lat=34.05&lon=-118.24")
        .then((r) => r.json())
        .then((d: WeatherData) => setLocalWeather(d))
        .catch(() => {
          /* graceful fail */
        });
    }
  }, [storeWeather, localWeather]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build weather-based alerts whenever weather data changes
  useEffect(() => {
    if (weather?.current) {
      const newWeatherAlerts = buildWeatherAlerts(weather);
      setWeatherAlerts(newWeatherAlerts);
    }
  }, [weather]);

  // Prefer store-provided securityAlerts when present, otherwise fall back to demo list.
  // Store alerts are normalized into this component's Alert shape.
  const storeAlerts: Alert[] = (
    Array.isArray(storeSecurityAlerts) ? storeSecurityAlerts : []
  ).map((a: any) => {
    const ts = typeof a?.ts === "number" ? new Date(a.ts) : new Date();
    return {
      id: String(
        a?.id ??
          `store-${ts.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      ),
      timestamp: ts.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      camera: String(a?.camera ?? a?.cameraId ?? "Unknown Camera"),
      type: (a?.type ?? "Unknown") as DetectionType,
      confidence:
        typeof a?.confidence === "number" ? Math.round(a.confidence) : 0,
      detail: String(a?.detail ?? a?.message ?? "Security alert"),
      acknowledged: Boolean(a?.acknowledged ?? false),
      isNight: Boolean(a?.isNight ?? false),
    };
  });

  const effectiveBase = storeAlerts.length > 0 ? storeAlerts : baseAlerts;
  const allAlerts = [...weatherAlerts, ...effectiveBase];
  const unreadCount = allAlerts.filter((alert) => !alert.acknowledged).length;
  const weatherCount = weatherAlerts.filter((alert) => !alert.acknowledged).length;
  const acknowledgedCount = allAlerts.filter((alert) => alert.acknowledged).length;

  const acknowledge = (id: string) => {
    if (id.startsWith("weather-")) {
      setWeatherAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      );
    } else {
      setBaseAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      );
    }
  };

  const filtered = allAlerts.filter((a) => {
    if (filter === "All") return true;
    if (filter === "Motion") return !a.acknowledged;
    return a.type === filter;
  });
  const previewAlerts = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => alertPriority(b) - alertPriority(a))
        .slice(0, 3),
    [filtered],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "10px",
        }}
      >
        Detection Alerts
        {weatherCount > 0 && (
          <span
            style={{
              marginLeft: "8px",
              padding: "1px 6px",
              borderRadius: "4px",
              background: "#818cf822",
              color: "#818cf8",
              fontSize: "9px",
              fontWeight: 700,
            }}
          >
            {weatherCount} weather
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "6px",
        }}
      >
        {[
          { label: "Unread", value: unreadCount, color: "var(--accent)" },
          { label: "Acknowledged", value: acknowledgedCount, color: "var(--text2)" },
          { label: "Weather", value: weatherCount, color: "#818cf8" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surf)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>{stat.label}</div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "13px",
                fontWeight: 700,
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        {FILTER_LABELS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "3px 10px",
              borderRadius: "5px",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid var(--border2)",
              background: filter === f ? "var(--accent)" : "transparent",
              color: filter === f ? "#fff" : "var(--text2)",
            }}
          >
            {f}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--text3)",
          lineHeight: "26px",
        }}
      >
          {unreadCount} unread
        </span>
      </div>

      {previewAlerts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {previewAlerts.map((alert) => (
            <AlertPreviewCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "16px 14px",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            color: "var(--text3)",
            fontSize: "11px",
          }}
        >
          No incidents match the current filter.
        </div>
      )}

      <details
        className="nexus-surface-disclosure"
        open={feedExpanded}
        onToggle={(event) => setFeedExpanded(event.currentTarget.open)}
      >
        <summary>Open incident feed</summary>
        <div className="nexus-surface-disclosure__body">
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginBottom: "10px",
            }}
          >
            Review the full queue, acknowledge incidents, and keep the compact
            preview above focused on the highest-priority alerts.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "360px",
              overflowY: "auto",
            }}
          >
            <AnimatePresence>
              {filtered.map((alert) => (
                <AlertFeedCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={acknowledge}
                />
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--text3)",
                  fontSize: "12px",
                }}
              >
                No alerts for this filter
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
