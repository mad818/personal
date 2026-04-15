"use client";

import { useState, useMemo, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { callAI } from "@/lib/ai";
import { fmtPrice, fmtPct, timeAgo } from "@/lib/helpers";
import {
  buildStructuredEvidenceInstruction,
  parseStructuredEvidenceAnswer,
  type StructuredEvidenceAnswer,
} from "@/lib/aiStructuredEvidence";
import EvidencePosturePanel from "@/components/ui/EvidencePosturePanel";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BotSignal {
  id: string;
  sym: string;
  price: number;
  chg24h: number;
  score: number;
  action: "STRONG BUY" | "BUY" | "SELL" | "STRONG SELL";
  timestamp: string; // ISO
  aiNote?: string;
  aiEvidence?: StructuredEvidenceAnswer;
}

// ── Score → action ─────────────────────────────────────────────────────────
function toAction(score: number): BotSignal["action"] | null {
  if (score >= 80) return "STRONG BUY";
  if (score >= 65) return "BUY";
  if (score <= 20) return "STRONG SELL";
  if (score <= 35) return "SELL";
  return null; // neutral — skip
}

const ACTION_COLOR: Record<BotSignal["action"], string> = {
  "STRONG BUY": "#10b981",
  BUY: "#34d399",
  SELL: "#f59e0b",
  "STRONG SELL": "#ef4444",
};

// Simple score computation (duplicate logic from MomentumScanner)
function computeScore(
  spark: number[],
  chg24h: number,
  vol: number,
  mcap: number,
): number {
  if (!spark || spark.length < 2) return 50;
  const n = spark.length;
  const mean_x = (n - 1) / 2;
  const mean_y = spark.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mean_x) * (spark[i] - mean_y);
    den += (i - mean_x) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const priceRange = Math.max(...spark) - Math.min(...spark) || 1;
  const normSlope = slope / (priceRange / n);
  const trendScore = Math.min(35, Math.max(0, (normSlope + 1) * 17.5));
  const pctMove = ((spark[n - 1] - spark[0]) / spark[0]) * 100;
  const velScore = ((Math.max(-40, Math.min(40, pctMove)) + 40) / 80) * 25;
  const chgScore = ((Math.max(-10, Math.min(10, chg24h)) + 10) / 20) * 25;
  const volNorm = mcap > 0 ? Math.min(15, (vol / mcap / 0.08) * 15) : 0;
  return Math.round(trendScore + velScore + chgScore + volNorm);
}

// ── Alert threshold bar ────────────────────────────────────────────────────
function SignalPill({ action }: { action: BotSignal["action"] }) {
  const col = ACTION_COLOR[action];
  const icon = action.includes("BUY") ? "▲" : "▼";
  return (
    <span
      style={{
        fontSize: "9.5px",
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: "6px",
        background: `${col}22`,
        color: col,
        letterSpacing: "0.4px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span style={{ fontSize: "8px" }}>{icon}</span>
      {action}
    </span>
  );
}

// ── History entry ──────────────────────────────────────────────────────────
function HistoryRow({
  sig,
  onAnalyse,
  loading,
}: {
  sig: BotSignal;
  onAnalyse: (s: BotSignal) => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surf2)",
        border: `1px solid ${ACTION_COLOR[sig.action]}33`,
        borderRadius: "9px",
        padding: "10px 13px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            fontFamily: "monospace",
            color: "var(--text)",
          }}
        >
          {sig.sym}
        </span>
        <SignalPill action={sig.action} />
        <span
          style={{
            fontSize: "12px",
            fontFamily: "monospace",
            color: "var(--text)",
          }}
        >
          {fmtPrice(sig.price)}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 700,
            color: sig.chg24h >= 0 ? "var(--fhi)" : "var(--flo)",
          }}
        >
          {fmtPct(sig.chg24h)}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            marginLeft: "auto",
          }}
        >
          Score {sig.score} · {timeAgo(sig.timestamp)}
        </span>
        <button
          onClick={() => onAnalyse(sig)}
          disabled={loading}
          style={{
            height: "22px",
            padding: "0 10px",
            borderRadius: "5px",
            background: "var(--accent)",
            border: "none",
            color: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          AI
        </button>
      </div>
      {sig.aiNote && (
        <div
          style={{
            marginTop: "8px",
            borderTop: "1px solid var(--border)",
            paddingTop: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {sig.aiEvidence ? (
            <>
              <EvidencePosturePanel
                title="Trade rationale posture"
                summary={sig.aiEvidence.summary}
                observed={sig.aiEvidence.observed}
                inferred={sig.aiEvidence.inferred}
                verifyNext={sig.aiEvidence.verifyNext}
              />
              {sig.aiEvidence.actions.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    padding: "10px 12px",
                    background: "var(--surf3)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "var(--text3)",
                      textTransform: "uppercase",
                    }}
                  >
                    Trade actions
                  </div>
                  {sig.aiEvidence.actions.map((action, index) => (
                    <div
                      key={`${sig.id}-action-${index}`}
                      style={{
                        fontSize: "11.5px",
                        color: "var(--text2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {index + 1}. {action}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--text2)",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {sig.aiNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BuyBot() {
  const prices = useStore((s) => s.prices);
  const sparklines = useStore((s) => s.sparklines);
  const settings = useStore((s) => s.settings);
  const botHistory = useStore((s) => s.settings.botHistory) as BotSignal[];
  const updateSettings = useStore((s) => s.updateSettings);

  const [aiLoading, setAiLoading] = useState<string | null>(null); // id of signal being analysed
  const [analysed, setAnalysed] = useState<
    Record<string, { note: string; evidence?: StructuredEvidenceAnswer }>
  >({});

  const rankedAssets: BotSignal[] = useMemo(() => {
    return Object.entries(prices)
      .map(([id, p]) => {
        const spark = sparklines[id] ?? [];
        const score = computeScore(spark, p.chg ?? 0, p.vol ?? 0, p.mcap ?? 1);
        return {
          id,
          sym: p.sym || id.slice(0, 6).toUpperCase(),
          price: p.price,
          chg24h: p.chg,
          score,
          action: toAction(score) ?? (score >= 50 ? "BUY" : "SELL"),
          timestamp: new Date().toISOString(),
        } satisfies BotSignal;
      })
      .sort((a, b) => b.score - a.score);
  }, [prices, sparklines]);

  // Derive live signals from current price data
  const liveSignals: BotSignal[] = useMemo(() => {
    return rankedAssets.filter((signal) => toAction(signal.score));
  }, [rankedAssets]);

  // Save a signal to botHistory
  const saveSignal = useCallback(
    (sig: BotSignal) => {
      const existing = (settings.botHistory as BotSignal[]) ?? [];
      // Deduplicate by id+date (keep latest)
      const updated = [
        sig,
        ...existing.filter((s: BotSignal) => s.id !== sig.id),
      ].slice(0, 50);
      updateSettings({ botHistory: updated as unknown[] });
    },
    [settings.botHistory, updateSettings],
  );

  // AI analysis for a signal
  const analyseSignal = useCallback(
    async (sig: BotSignal) => {
      setAiLoading(sig.id);
      const prompt = `Crypto signal: ${sig.sym} — ${sig.action}. Price: ${fmtPrice(sig.price)}, 24h: ${fmtPct(sig.chg24h)}, momentum score: ${sig.score}/100. Give a direct trade rationale and one key risk.

${buildStructuredEvidenceInstruction({
  summaryKey: "rationale",
  summaryLabel: "direct trade rationale",
  summaryLimitHint: "under 90 words and risk-aware",
  extraFields: [
    {
      key: "actions",
      example: '["specific trade action or risk-control step"]',
      rule: '"actions" should contain 1-3 concise trade or risk-control steps tailored to the signal.',
    },
  ],
})}`;
      try {
        const note = await callAI(prompt, 200);
        const evidence = parseStructuredEvidenceAnswer(note, ["rationale"]);
        setAnalysed((p) => ({
          ...p,
          [sig.id]: {
            note: evidence?.summary ?? note,
            evidence: evidence ?? undefined,
          },
        }));
        // Persist AI note to history
        const saved = {
          ...sig,
          aiNote: evidence?.summary ?? note,
          aiEvidence: evidence ?? undefined,
        };
        saveSignal(saved);
      } catch {
        setAnalysed((p) => ({
          ...p,
          [sig.id]: {
            note: "AI analysis is unavailable right now. Check your local model or optional cloud provider settings.",
          },
        }));
      } finally {
        setAiLoading(null);
      }
    },
    [saveSignal],
  );

  const clearHistory = () => updateSettings({ botHistory: [] as unknown[] });

  const displaySignals = liveSignals.map((s) => ({
    ...s,
    aiNote: analysed[s.id]?.note,
    aiEvidence: analysed[s.id]?.evidence,
  }));
  const watchCandidates = rankedAssets.slice(0, 5).map((s) => ({
    ...s,
    aiNote: analysed[s.id]?.note,
    aiEvidence: analysed[s.id]?.evidence,
  }));

  const histSignals = (botHistory ?? []) as BotSignal[];

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span
          style={{ fontSize: "13px", fontWeight: 900, color: "var(--text)" }}
        >
          🤖 Buy Bot
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "10px",
            background: "rgba(16,185,129,.15)",
            color: "#10b981",
            letterSpacing: ".4px",
          }}
        >
          LIVE
        </span>
        <span
          style={{ fontSize: "11px", color: "var(--text3)", marginLeft: "4px" }}
        >
          Signals scoring ≥65 or ≤35
        </span>
      </div>

      {/* Live signals */}
      {displaySignals.length === 0 ? (
        <div
          style={{
            background: "var(--surf2)",
            borderRadius: "9px",
            border: "1px solid var(--border)",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: "10px",
            }}
          >
            No hard triggers right now
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text2)",
              lineHeight: 1.5,
              marginBottom: "12px",
            }}
          >
            The market is neutral, so the bot is showing the strongest watchlist
            candidates instead of an empty board.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {watchCandidates.map((sig) => (
              <HistoryRow
                key={sig.id}
                sig={sig}
                onAnalyse={analyseSignal}
                loading={aiLoading === sig.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {displaySignals.map((sig) => (
            <HistoryRow
              key={sig.id}
              sig={sig}
              onAnalyse={analyseSignal}
              loading={aiLoading === sig.id}
            />
          ))}
        </div>
      )}

      {/* Save all live signals button */}
      {displaySignals.length > 0 && (
        <button
          onClick={() => displaySignals.forEach(saveSignal)}
          style={{
            marginTop: "10px",
            height: "28px",
            padding: "0 14px",
            borderRadius: "7px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)",
            fontSize: "10.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ↓ Save signals to history
        </button>
      )}

      {/* Signal history */}
      {histSignals.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: ".6px",
              }}
            >
              Signal History
            </span>
            <span style={{ fontSize: "10px", color: "var(--text3)" }}>
              {histSignals.length} saved
            </span>
            <button
              onClick={clearHistory}
              style={{
                marginLeft: "auto",
                height: "22px",
                padding: "0 10px",
                borderRadius: "5px",
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--text3)",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {histSignals.slice(0, 20).map((sig, i) => (
              <HistoryRow
                key={`${sig.id}-${i}`}
                sig={sig}
                onAnalyse={analyseSignal}
                loading={aiLoading === sig.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
