// ── components/command/NetworkHealth ────────────────────────
// Network health monitor — ping URLs/IPs via HTTP check.
// Pattern from Pouzor/homelable: health endpoint, http, https checks.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface HealthTarget {
  id: string;
  label: string;
  url: string;
  method: "http" | "https" | "health";
}

interface HealthResult {
  id: string;
  status: "ok" | "warn" | "fail" | "checking" | "idle";
  code: number | null;
  ms: number | null;
  lastSeen: string;
  checkedAt: number | null;
}

const DEFAULT_TARGETS: HealthTarget[] = [
  {
    id: "nexus",
    label: "Nexus HQ",
    url: "/api/health",
    method: "health",
  },
  {
    id: "prices",
    label: "Market data route",
    url: "/api/prices?mode=markets&coins=bitcoin,ethereum,solana",
    method: "health",
  },
  {
    id: "risk",
    label: "Conflict monitor",
    url: "/api/conflict",
    method: "health",
  },
  {
    id: "cves",
    label: "Cyber feed",
    url: "/api/cves",
    method: "health",
  },
  {
    id: "sentiment",
    label: "Fear & Greed route",
    url: "/api/fear-greed",
    method: "health",
  },
  {
    id: "seismic",
    label: "Earthquake route",
    url: "/api/earthquakes",
    method: "health",
  },
];

function StatusDot({ status }: { status: HealthResult["status"] }) {
  const col =
    status === "ok"
      ? "#10b981"
      : status === "warn"
        ? "#f59e0b"
        : status === "fail"
          ? "#ef4444"
          : status === "checking"
            ? "#818cf8"
            : "var(--border)";
  const pulse = status === "ok" || status === "checking";
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: col,
        flexShrink: 0,
        boxShadow: pulse ? `0 0 0 2px ${col}44` : "none",
        animation: status === "checking" ? "pulse 1s infinite" : "none",
      }}
    />
  );
}

export default function NetworkHealth() {
  const [targets, setTargets] = useState<HealthTarget[]>(DEFAULT_TARGETS);
  const [results, setResults] = useState<Record<string, HealthResult>>({});
  const [running, setRunning] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [expanded, setExpanded] = useState(false);

  const setResult = useCallback((id: string, patch: Partial<HealthResult>) => {
    setResults((r) => {
      const prev = r[id] ?? {
        id,
        status: "idle" as const,
        code: null,
        ms: null,
        lastSeen: "",
        checkedAt: null,
      };
      return { ...r, [id]: { ...prev, ...patch } };
    });
  }, []);

  async function checkOne(t: HealthTarget) {
    setResult(t.id, { status: "checking" });
    const start = Date.now();
    try {
      const requestInit = {
        method: "GET",
        signal: AbortSignal.timeout(6000),
        cache: "no-store" as RequestCache,
      };
      const r = t.url.startsWith("/api/")
        ? await apiFetch(t.url, requestInit)
        : await fetch(t.url, requestInit);
      const ms = Date.now() - start;
      setResult(t.id, {
        status: r.ok ? "ok" : "warn",
        code: r.status,
        ms,
        lastSeen: new Date().toLocaleTimeString(),
        checkedAt: Date.now(),
      });
    } catch {
      setResult(t.id, {
        status: "fail",
        code: null,
        ms: Date.now() - start,
        lastSeen: new Date().toLocaleTimeString(),
        checkedAt: Date.now(),
      });
    }
  }

  async function checkAll() {
    setRunning(true);
    await Promise.allSettled(targets.map((t) => checkOne(t)));
    setRunning(false);
  }

  function addTarget() {
    const label = newLabel.trim();
    const url = newUrl.trim();
    if (!label || !url) return;
    const id = `custom-${Date.now()}`;
    setTargets((t) => [
      ...t,
      {
        id,
        label,
        url: url.startsWith("http") ? url : `https://${url}`,
        method: "https",
      },
    ]);
    setNewLabel("");
    setNewUrl("");
  }

  function removeTarget(id: string) {
    setTargets((t) => t.filter((x) => x.id !== id));
    setResults((r) => {
      const n = { ...r };
      delete n[id];
      return n;
    });
  }

  const INPUT: React.CSSProperties = {
    background: "var(--surf2)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text)",
    fontSize: "11px",
    padding: "5px 8px",
    outline: "none",
  };

  const okCount = targets.filter((t) => results[t.id]?.status === "ok").length;
  const warnCount = targets.filter(
    (t) => results[t.id]?.status === "warn",
  ).length;
  const failCount = targets.filter(
    (t) => results[t.id]?.status === "fail",
  ).length;
  const checkingCount = targets.filter(
    (t) => results[t.id]?.status === "checking",
  ).length;
  const lastChecked = useMemo(() => {
    const latest = Object.values(results).reduce<number | null>(
      (max, result) =>
        result.checkedAt && (!max || result.checkedAt > max)
          ? result.checkedAt
          : max,
      null,
    );
    return latest
      ? new Date(latest).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  }, [results]);
  const previewTargets = useMemo(
    () =>
      targets
        .map((target) => ({
          target,
          result: results[target.id] ?? {
            id: target.id,
            status: "idle" as const,
            code: null,
            ms: null,
            lastSeen: "",
            checkedAt: null,
          },
        }))
        .filter(({ result }) =>
          ["checking", "fail", "warn"].includes(result.status),
        )
        .slice(0, 3),
    [results, targets],
  );

  useEffect(() => {
    if (checkingCount > 0) {
      setExpanded(true);
    }
  }, [checkingCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div
            style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
          >
            Route probes
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginTop: "2px",
            }}
          >
            {lastChecked
              ? `Last checked ${lastChecked} · ${targets.length} tracked routes`
              : `${targets.length} tracked routes · not checked yet`}
          </div>
        </div>
        <button
          onClick={() => void checkAll()}
          disabled={running}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            background: running ? "var(--surf3)" : "var(--accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "11px",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Checking…" : "Check all"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: "6px",
        }}
      >
        {[
          { label: "Up", value: okCount, color: "#10b981" },
          { label: "Degraded", value: warnCount, color: "#f59e0b" },
          { label: "Down", value: failCount, color: "#ef4444" },
          { label: "Checking", value: checkingCount, color: "#818cf8" },
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
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>
              {stat.label}
            </div>
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

      {previewTargets.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {previewTargets.map(({ target, result }) => (
            <div
              key={target.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <StatusDot status={result.status} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {target.label}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {result.status === "checking"
                    ? "Checking now"
                    : result.code
                      ? `HTTP ${result.code}`
                      : result.lastSeen || "Awaiting first probe"}
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                {result.ms != null ? `${result.ms}ms` : "Pending"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          No degraded routes right now. Run a probe sweep to refresh local route
          posture.
        </div>
      )}

      <details
        className="nexus-surface-disclosure"
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary>Open route probes</summary>
        <div className="nexus-surface-disclosure__body">
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginBottom: "10px",
            }}
          >
            Monitor the actual Nexus routes that power the live tabs and only
            widen into add/remove controls when the brief needs deeper probe
            work.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginBottom: "12px",
            }}
          >
            {targets.map((t) => {
              const r = results[t.id];
              return (
                <div
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "10px 1fr auto auto auto",
                    gap: "10px",
                    alignItems: "center",
                    background: "var(--surf2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                >
                  <StatusDot status={r?.status ?? "idle"} />
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text3)",
                        wordBreak: "break-all",
                      }}
                    >
                      {t.url}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "40px" }}>
                    {r?.code && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: r.code < 400 ? "#10b981" : "#ef4444",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.code}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: "45px" }}>
                    {r?.ms != null && (
                      <span
                        style={{
                          fontSize: "10px",
                          color:
                            r.ms < 500
                              ? "#10b981"
                              : r.ms < 2000
                                ? "#f59e0b"
                                : "#ef4444",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.ms}ms
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeTarget(t.id)}
                    aria-label="Remove network target"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text3)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "2px 4px",
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <input
              aria-label="Network health target label"
              style={{ ...INPUT, flex: "0 0 130px" }}
              placeholder="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              aria-label="Network health target URL"
              style={{ ...INPUT, flex: 1, minWidth: "160px" }}
              placeholder="https://api.example.com/health"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTarget();
              }}
            />
            <button
              onClick={addTarget}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                background: "var(--surf3)",
                color: "var(--text2)",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              + Add
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
