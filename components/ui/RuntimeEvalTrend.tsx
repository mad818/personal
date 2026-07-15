"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { fetchJsonCached } from "@/lib/apiCache";
import { evalGradeColor, gradeFromEvalScore } from "@/lib/helpers";
import {
  RUNTIME_CACHE_TTL_MS,
  RUNTIME_POLL_MS,
  staggerDelayMs,
} from "@/lib/runtimeConfig";
import {
  parseRuntimeEvalPayload,
  parseStatusPayload,
  type RuntimeEvalPayload,
} from "@/lib/runtimeTypes";

export default function RuntimeEvalTrend() {
  const [data, setData] = useState<RuntimeEvalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string>("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [statusPayload, setStatusPayload] = useState<unknown>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const refresh = useCallback(async (): Promise<RuntimeEvalPayload> => {
    const raw = await fetchJsonCached(
      "runtime-eval:limit=24",
      async () => {
        const r = await apiFetch("/api/metrics/runtime-eval?limit=24");
        return await r.json();
      },
      RUNTIME_CACHE_TTL_MS.runtimeEvalLimit24,
    );
    const payload = parseRuntimeEvalPayload(raw);
    setData(payload);
    setLastUpdatedAt(Date.now());
    return payload;
  }, []);

  useEffect(() => {
    let live = true;
    const firstRun = window.setTimeout(() => {
      void (async () => {
        try {
          await refresh();
        } catch {
          if (!live) return;
          setData({ latest: null, history: [], points: 0 });
        } finally {
          if (!live) return;
          setLoading(false);
        }
      })();
    }, staggerDelayMs("runtime-eval-trend"));
    const timer = window.setInterval(() => {
      void (async () => {
        if (typeof document !== "undefined" && document.hidden) return;
        try {
          const snapshot = await refresh();
          const staleNow = Boolean(snapshot?.freshness?.stale);
          const nextEligibleAt = snapshot?.runner?.nextEligibleAt
            ? new Date(snapshot.runner.nextEligibleAt).getTime()
            : 0;
          const eligibleNow = nextEligibleAt <= Date.now();
          if (staleNow && eligibleNow) {
            const response = await apiFetch("/api/metrics/runtime-eval/run", {
              method: "POST",
              body: JSON.stringify({}),
            });
            if (!response.ok) {
              throw new Error(
                `Runtime evaluation failed (${response.status}).`,
              );
            }
            await refresh();
          }
        } catch {
          // silent
        }
      })();
    }, RUNTIME_POLL_MS.runtimeEvalPanel);
    const onVisible = () => {
      if (!document.hidden) {
        void (async () => {
          try {
            await refresh();
          } catch {
            // silent
          }
        })();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      window.clearTimeout(firstRun);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const spark = useMemo(() => {
    const arr = (data?.history ?? []).map((h) =>
      Math.max(0, Math.min(100, Number(h.score || 0))),
    );
    if (!arr.length) return "";
    const chars = "▁▂▃▄▅▆▇█";
    return arr
      .map(
        (v) =>
          chars[
            Math.min(
              chars.length - 1,
              Math.floor((v / 100) * (chars.length - 1)),
            )
          ],
      )
      .join("");
  }, [data?.history]);

  const latest = data?.latest;
  const latestExperiment = data?.experiments?.latest ?? null;
  const threshold = latest?.minScore ?? 85;
  const latestScore = latest?.score ?? 0;
  const pass = latest ? latestScore >= threshold : false;
  const latestCategories = latest?.categories ?? {};
  const categoryEntries = Object.entries(latestCategories);
  const ageMin = data?.freshness?.ageMinutes ?? null;
  const stale = Boolean(data?.freshness?.stale);
  const grade = gradeFromEvalScore(latestScore, { stale });
  const gradeColor = stale ? "#f59e0b" : evalGradeColor(grade);
  const failureCount =
    (data?.failures?.checks?.length ?? 0) +
    (data?.failures?.categories?.length ?? 0);

  const runNow = async (force = false) => {
    setRunning(true);
    setRunMsg("");
    try {
      const r = await apiFetch("/api/metrics/runtime-eval/run", {
        method: "POST",
        body: JSON.stringify({ force }),
      });
      const d = (await r.json()) as {
        ok?: boolean;
        skipped?: boolean;
        reason?: string;
        output?: string;
      };
      if (!r.ok || !d.ok) {
        setRunMsg(`Run failed: ${(d.output || "unknown error").slice(0, 180)}`);
      } else if (d.skipped) {
        setRunMsg(`Skipped: ${d.reason ?? "cooldown active"}`);
        await refresh();
      } else {
        setRunMsg("Runtime eval executed and recorded.");
        await refresh();
      }
    } catch {
      setRunMsg("Run failed: could not reach eval route.");
    } finally {
      setRunning(false);
    }
  };

  const copyDiagnostics = async () => {
    const payload = {
      latest: data?.latest ?? null,
      freshness: data?.freshness ?? null,
      failures: data?.failures ?? null,
      runner: data?.runner ?? null,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setRunMsg("Diagnostics copied to clipboard.");
    } catch {
      setRunMsg("Copy failed.");
    }
  };

  const exportDiagnostics = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      latest: data?.latest ?? null,
      freshness: data?.freshness ?? null,
      failures: data?.failures ?? null,
      runner: data?.runner ?? null,
    };
    const requested = requestTextDownload({
      filename: `runtime-eval-diagnostics-${Date.now()}.json`,
      content: JSON.stringify(payload, null, 2),
      label: "Runtime diagnostics",
      mimeType: "application/json",
      announce: false,
    });
    setRunMsg(
      requested
        ? "Diagnostics download requested."
        : "Diagnostics download failed.",
    );
  };

  const refreshStatusDrawer = useCallback(async () => {
    setStatusLoading(true);
    try {
      const d = await fetchJsonCached(
        "status:readiness",
        async () => {
          const r = await apiFetch("/api/status");
          return await r.json();
        },
        RUNTIME_CACHE_TTL_MS.statusReadiness,
      );
      setStatusPayload(parseStatusPayload(d));
    } catch {
      setStatusPayload({ error: "Failed to load /api/status diagnostics." });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const openStatusDrawer = async () => {
    setStatusDrawerOpen(true);
    await refreshStatusDrawer();
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surf2)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 8,
        }}
      >
        Runtime Eval Trend
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          Loading runtime metrics…
        </div>
      ) : !latest ? (
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          No recorded eval yet. Run `npm run eval:agent-runtime:record`.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: gradeColor,
              }}
            >
              {latestScore}/100
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>
              threshold {threshold}
            </span>
            {ageMin !== null && (
              <span
                style={{
                  fontSize: 11,
                  color: stale ? "#f59e0b" : "var(--text3)",
                }}
              >
                {stale ? `stale ${ageMin}m` : `fresh ${ageMin}m`}
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 700,
                color: gradeColor,
              }}
            >
              {pass
                ? "PASS"
                : `DEGRADED${failureCount > 0 ? ` (${failureCount})` : ""}`}
            </span>
          </div>
          {lastUpdatedAt && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text3)",
                marginTop: -4,
                marginBottom: 6,
              }}
            >
              updated {new Date(lastUpdatedAt).toLocaleTimeString()}
            </div>
          )}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#7ba7d4",
              background: "rgba(13,18,32,0.65)",
              border: "1px solid #1A2040",
              borderRadius: 6,
              padding: "6px 8px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {spark || "—"}
          </div>
          {categoryEntries.length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {categoryEntries.map(([name, value]) => {
                const score = Math.max(
                  0,
                  Math.min(100, Number(value?.score ?? 0)),
                );
                return (
                  <div
                    key={name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "88px 1fr 34px",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        textTransform: "capitalize",
                      }}
                    >
                      {name}
                    </span>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: "#1A2040",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${score}%`,
                          height: "100%",
                          background:
                            score >= 85
                              ? "#10b981"
                              : score >= 70
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        textAlign: "right",
                      }}
                    >
                      {Math.round(score)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {data?.failures?.checks?.length ||
          data?.failures?.categories?.length ? (
            <div
              style={{
                marginTop: 8,
                padding: "6px 8px",
                border: "1px solid #3a2530",
                borderRadius: 6,
                background: "rgba(239,68,68,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#f59e0b",
                  marginBottom: 4,
                  fontWeight: 700,
                }}
              >
                Why degraded
              </div>
              {(data.failures?.checks ?? []).map((f, i) => (
                <div
                  key={`c-${i}`}
                  style={{ fontSize: 10, color: "var(--text3)" }}
                >
                  check: {f.name ?? "unknown"} ({f.category ?? "unknown"})
                </div>
              ))}
              {(data.failures?.categories ?? []).map((f, i) => (
                <div
                  key={`k-${i}`}
                  style={{ fontSize: 10, color: "var(--text3)" }}
                >
                  category: {f.name ?? "unknown"} score{" "}
                  {Math.round(Number(f.score ?? 0))} / min{" "}
                  {Math.round(Number(f.threshold ?? 0))}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
            last {Math.max(0, data?.points ?? 0)} run(s)
          </div>
          {latestExperiment ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                border: "1px solid #1f315e",
                borderRadius: 8,
                background: "rgba(30,64,175,0.08)",
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#7ba7d4",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  Latest experiment
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color:
                      latestExperiment.recommendation === "candidate_win"
                        ? "#10b981"
                        : latestExperiment.recommendation === "review"
                          ? "#f59e0b"
                          : "#ef4444",
                    fontWeight: 700,
                  }}
                >
                  {latestExperiment.recommendation}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text)" }}>
                {latestExperiment.title}
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>
                {latestExperiment.variantKind?.replaceAll("_", " ")} · score
                delta {Number(latestExperiment.scoreDelta ?? 0) >= 0 ? "+" : ""}
                {latestExperiment.scoreDelta ?? 0}
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>
                {latestExperiment.summary}
              </div>
            </div>
          ) : null}
          {data?.runner?.nextEligibleAt && (
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
              cooldown {data.runner.cooldownMin ?? 30}m
              {typeof data.runner.effectiveCooldownMin === "number"
                ? ` (effective ${data.runner.effectiveCooldownMin}m)`
                : ""}
              {typeof data.runner.failureStreak === "number" &&
              data.runner.failureStreak > 0
                ? ` · backoff x${2 ** data.runner.failureStreak}`
                : ""}
              {" · "}
              next {new Date(data.runner.nextEligibleAt).toLocaleTimeString()}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                void runNow(false);
              }}
              disabled={running}
              style={{
                borderRadius: 8,
                border: "1px solid #1f315e",
                background: running
                  ? "rgba(26,32,64,0.6)"
                  : "rgba(13,18,32,0.96)",
                color: "#7ba7d4",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 700,
                cursor: running ? "not-allowed" : "pointer",
              }}
            >
              {running ? "Running…" : "Run Runtime Eval"}
            </button>
            <button
              type="button"
              onClick={() => {
                void runNow(true);
              }}
              disabled={running}
              style={{
                borderRadius: 8,
                border: "1px solid #5a2e44",
                background: running
                  ? "rgba(26,32,64,0.6)"
                  : "rgba(36,14,26,0.96)",
                color: "#f59e0b",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 700,
                cursor: running ? "not-allowed" : "pointer",
              }}
              title="Bypass cooldown and run immediately"
            >
              Force Run
            </button>
            <button
              type="button"
              onClick={() => {
                void copyDiagnostics();
              }}
              style={{
                borderRadius: 8,
                border: "1px solid #2a3a6b",
                background: "rgba(13,18,32,0.96)",
                color: "#7ba7d4",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Copy degraded diagnostics JSON"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={exportDiagnostics}
              style={{
                borderRadius: 8,
                border: "1px solid #2a3a6b",
                background: "rgba(13,18,32,0.96)",
                color: "#7ba7d4",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Export degraded diagnostics JSON"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                void openStatusDrawer();
              }}
              style={{
                borderRadius: 8,
                border: "1px solid #2a3a6b",
                background: "rgba(13,18,32,0.96)",
                color: "#7ba7d4",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Open in-app status diagnostics drawer"
            >
              Open Status
            </button>
            {runMsg && (
              <span
                role="status"
                style={{ fontSize: 10, color: "var(--text3)" }}
              >
                {runMsg}
              </span>
            )}
          </div>
        </>
      )}

      {statusDrawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onClick={() => setStatusDrawerOpen(false)}
        >
          <div
            style={{
              width: "min(940px, 95vw)",
              maxHeight: "85vh",
              overflow: "auto",
              borderRadius: 10,
              border: "1px solid #1f315e",
              background: "#0b1220",
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
              padding: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#7ba7d4",
                  letterSpacing: ".04em",
                }}
              >
                Status Diagnostics
              </div>
              <button
                type="button"
                onClick={() => {
                  void refreshStatusDrawer();
                }}
                style={{
                  marginLeft: 8,
                  borderRadius: 8,
                  border: "1px solid #2a3a6b",
                  background: "rgba(13,18,32,0.96)",
                  color: "#7ba7d4",
                  padding: "4px 9px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setStatusDrawerOpen(false)}
                style={{
                  marginLeft: "auto",
                  borderRadius: 8,
                  border: "1px solid #2a3a6b",
                  background: "rgba(13,18,32,0.96)",
                  color: "#7ba7d4",
                  padding: "4px 9px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <div
              style={{ fontSize: 10, color: "var(--text3)", marginBottom: 8 }}
            >
              Snapshot from `/api/status`
            </div>
            <pre
              style={{
                margin: 0,
                border: "1px solid #1A2040",
                borderRadius: 8,
                background: "rgba(13,18,32,0.9)",
                color: "#c4d7f2",
                fontSize: 11,
                lineHeight: 1.45,
                padding: 10,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {statusLoading
                ? "Loading status…"
                : JSON.stringify(statusPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
