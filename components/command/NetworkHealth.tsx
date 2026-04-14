// ── components/command/NetworkHealth ────────────────────────
// Network health monitor — ping URLs/IPs via HTTP check.
// Pattern from Pouzor/homelable: health endpoint, http, https checks.

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";

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
  note: string | null;
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

function isLocalHealthTarget(url: string) {
  return url.trim().startsWith("/api/");
}

function normalizeHealthTargetUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Target URL is required.");
  }

  if (trimmed.startsWith("/api/")) {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.hash) {
      throw new Error("Hash fragments are not allowed.");
    }
    if (!parsed.pathname.startsWith("/api/")) {
      throw new Error("Local checks must target /api/* routes.");
    }
    if (parsed.pathname === "/api/network-health/check") {
      throw new Error("Recursive health checks are blocked.");
    }
    return `${parsed.pathname}${parsed.search}`;
  }

  const normalized = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http and https targets are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing targets are blocked.");
  }
  parsed.hash = "";
  return parsed.toString();
}

export default function NetworkHealth() {
  const [targets, setTargets] = useState<HealthTarget[]>(DEFAULT_TARGETS);
  const [results, setResults] = useState<Record<string, HealthResult>>({});
  const [running, setRunning] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [inputError, setInputError] = useState("");
  const { internetReachable } = useInternetAvailability();

  const setResult = useCallback((id: string, patch: Partial<HealthResult>) => {
    setResults((r) => {
      const prev = r[id] ?? {
        id,
        status: "idle" as const,
        code: null,
        ms: null,
        lastSeen: "",
        note: null,
      };
      return { ...r, [id]: { ...prev, ...patch } };
    });
  }, []);

  async function checkOne(t: HealthTarget) {
    const localTarget = isLocalHealthTarget(t.url);
    if (!localTarget && !internetReachable) {
      setResult(t.id, {
        note: "Browser offline — keeping the last retained external snapshot until reconnect.",
      });
      return;
    }

    setResult(t.id, { status: "checking" });
    try {
      const r = await apiFetch("/api/network-health/check", {
        method: "POST",
        body: JSON.stringify({ url: t.url }),
      });
      const payload = (await r.json().catch(() => null)) as
        | {
            ok?: boolean;
            kind?: "local" | "external";
            statusCode?: number | null;
            ms?: number | null;
            note?: string | null;
          }
        | null;
      const targetOk = payload?.ok === true;
      const code = payload?.statusCode ?? null;
      const note = payload?.note ?? null;
      setResult(t.id, {
        status: targetOk ? "ok" : r.status === 400 ? "fail" : "warn",
        code,
        ms: payload?.ms ?? null,
        lastSeen: new Date().toLocaleTimeString(),
        note,
      });
    } catch {
      setResult(t.id, {
        status: "fail",
        code: null,
        ms: null,
        lastSeen: new Date().toLocaleTimeString(),
        note: "Unable to reach the local network-check route.",
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
    if (!label) {
      setInputError("Label is required.");
      return;
    }

    let url = "";
    try {
      url = normalizeHealthTargetUrl(newUrl);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "Invalid target.");
      return;
    }

    const duplicate = targets.some(
      (target) => target.url.toLowerCase() === url.toLowerCase(),
    );
    if (duplicate) {
      setInputError("That target is already being monitored.");
      return;
    }

    const id = `custom-${Date.now()}`;
    setTargets((t) => [
      ...t,
      {
        id,
        label,
        url,
        method: isLocalHealthTarget(url) ? "health" : "https",
      },
    ]);
    setNewLabel("");
    setNewUrl("");
    setInputError("");
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
  const failCount = targets.filter(
    (t) => results[t.id]?.status === "fail",
  ).length;
  const hasRetainedResults = targets.some((t) => Boolean(results[t.id]?.lastSeen));

  return (
    <div>
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
            style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}
          >
            Network Health
            {okCount + failCount > 0 && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "11px",
                  fontWeight: 400,
                  color: "var(--text3)",
                }}
              >
                <span style={{ color: "#10b981" }}>{okCount} up</span>
                {failCount > 0 && (
                  <span style={{ color: "#ef4444", marginLeft: "6px" }}>
                    {failCount} down
                  </span>
                )}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginTop: "2px",
            }}
          >
            Monitor the actual Nexus routes that power the live tabs
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
          {running ? "Checking…" : "⚡ Check All"}
        </button>
      </div>

      {!internetReachable ? (
        <SurfaceCallout
          tone={hasRetainedResults ? "info" : "warning"}
          compact
          icon="↺"
          title={
            hasRetainedResults
              ? "Internet offline · showing retained check snapshots"
              : "Internet offline · no retained check snapshot yet"
          }
          description={
            hasRetainedResults
              ? "Existing results stay visible locally. Local Nexus routes can still be checked, but internet-backed or external targets may fail until reconnect."
              : "You can still probe local Nexus routes, but internet-backed or external targets may fail until reconnect."
          }
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {/* Target list */}
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
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text3)",
                    marginTop: "4px",
                  }}
                >
                  {isLocalHealthTarget(t.url) ? "Local route" : "External target"}
                  {" · "}
                  {r?.status === "checking"
                    ? "checking now"
                    : r?.lastSeen
                      ? `last checked ${r.lastSeen}`
                      : "awaiting first check"}
                </div>
                {r?.note ? (
                  <div
                    style={{
                      fontSize: "9px",
                      color:
                        r.status === "ok" ? "var(--text3)" : "var(--fmd)",
                      marginTop: "4px",
                      lineHeight: 1.45,
                    }}
                  >
                    {r.note}
                  </div>
                ) : null}
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
              {t.id.startsWith("custom-") ? (
                <button
                  onClick={() => removeTarget(t.id)}
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
              ) : (
                <span style={{ width: "12px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Add target row */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          style={{ ...INPUT, flex: "0 0 130px" }}
          placeholder="Label"
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            if (inputError) setInputError("");
          }}
        />
        <input
          style={{ ...INPUT, flex: 1, minWidth: "160px" }}
          placeholder="https://api.example.com/health"
          value={newUrl}
          onChange={(e) => {
            setNewUrl(e.target.value);
            if (inputError) setInputError("");
          }}
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
      {inputError ? (
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "var(--fmd)",
            lineHeight: 1.45,
          }}
        >
          {inputError}
        </div>
      ) : (
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "var(--text3)",
            lineHeight: 1.45,
          }}
        >
          Add a local <code>/api/...</code> route or a safe public http/https
          target. Private-network hosts and duplicates are blocked automatically.
        </div>
      )}
    </div>
  );
}
