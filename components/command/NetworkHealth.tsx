// ── components/command/NetworkHealth ────────────────────────
// Network health monitor — ping URLs/IPs via HTTP check.
// Pattern from Pouzor/homelable: health endpoint, http, https checks.

"use client";

import { useState, useCallback } from "react";

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
}

const DEFAULT_TARGETS: HealthTarget[] = [
  {
    id: "nexus",
    label: "Nexus HQ",
    url: "http://localhost:3000/api/health",
    method: "health",
  },
  {
    id: "cg",
    label: "CoinGecko API",
    url: "https://api.coingecko.com/api/v3/ping",
    method: "https",
  },
  {
    id: "nvd",
    label: "NVD / NIST",
    url: "https://services.nvd.nist.gov",
    method: "https",
  },
  {
    id: "altme",
    label: "Fear & Greed",
    url: "https://api.alternative.me/fng/?limit=1",
    method: "https",
  },
  {
    id: "mempool",
    label: "Mempool.space",
    url: "https://mempool.space/api/v1/fees/recommended",
    method: "https",
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

  const setResult = useCallback((id: string, patch: Partial<HealthResult>) => {
    setResults((r) => {
      const prev = r[id] ?? {
        id,
        status: "idle" as const,
        code: null,
        ms: null,
        lastSeen: "",
      };
      return { ...r, [id]: { ...prev, ...patch } };
    });
  }, []);

  async function checkOne(t: HealthTarget) {
    setResult(t.id, { status: "checking" });
    const start = Date.now();
    try {
      const r = await fetch(t.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      const ms = Date.now() - start;
      setResult(t.id, {
        status: r.ok ? "ok" : "warn",
        code: r.status,
        ms,
        lastSeen: new Date().toLocaleTimeString(),
      });
    } catch {
      setResult(t.id, {
        status: "fail",
        code: null,
        ms: Date.now() - start,
        lastSeen: new Date().toLocaleTimeString(),
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
  const failCount = targets.filter(
    (t) => results[t.id]?.status === "fail",
  ).length;

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
            Monitor Nexus data sources and internal services
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

      {/* Add target row */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          style={{ ...INPUT, flex: "0 0 130px" }}
          placeholder="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <input
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
  );
}
