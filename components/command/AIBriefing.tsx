// ── components/command/AIBriefing ──────────────────────────
// AI-generated market briefing and real-time intelligence synthesis.

"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { callAI } from "@/lib/ai";
import {
  buildStructuredEvidenceInstruction,
  parseStructuredEvidenceAnswer,
  type StructuredEvidenceAnswer,
} from "@/lib/aiStructuredEvidence";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useOfflineReadiness } from "@/hooks/useOfflineReadiness";
import FeedStatusPill from "@/components/ui/FeedStatusPill";
import EvidencePosturePanel from "@/components/ui/EvidencePosturePanel";

export default function AIBriefing() {
  const settings = useStore((s) => s.settings);
  const articles = useStore((s) => s.articles);
  const articlesLoaded = useStore((s) => s.articlesLoaded);
  const prices = useStore((s) => s.prices);
  const pricesLoaded = useStore((s) => s.pricesLoaded);
  const signals = useStore((s) => s.signals);
  const pricesStatus = useStore((s) => s.feedStatus.prices);
  const articlesStatus = useStore((s) => s.feedStatus.articles);
  const { status: offlineStatus, internetReachable, runtimeReachable } = useOfflineReadiness();

  const [output, setOutput] = useState("");
  const [structuredOutput, setStructuredOutput] = useState<StructuredEvidenceAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (runtimeReachable === false) return;
    setLoading(true);
    setOutput("");
    setStructuredOutput(null);
    const btc = prices["bitcoin"];
    const fg = signals?.fg;
    const tops = articles
      .slice(0, 8)
      .map((a, i) => `${i + 1}. ${a.title}`)
      .join("\n");
    const prompt = `You are Nexus AI — ${settings.userName || "Mario"}'s intelligence system.

LIVE DATA:
- BTC: ${btc ? `$${btc.price?.toLocaleString()} (${btc.chg >= 0 ? "+" : ""}${btc.chg?.toFixed(2)}%)` : "No data"}
- Fear & Greed: ${fg?.value ?? "—"} — ${fg?.label ?? "—"}

TOP HEADLINES:
${tops || "No articles loaded."}

Write a sharp intelligence briefing covering:
1. Market state & what it means
2. Key risk or opportunity in the news
3. One action to consider
4. One thing to watch

${buildStructuredEvidenceInstruction({
  summaryKey: "briefing",
  summaryLabel: "sharp operator briefing",
  summaryLimitHint: "under 170 words and direct",
})}`;

    try {
      const resp = await callAI(prompt, 500);
      const structured = parseStructuredEvidenceAnswer(resp, ["briefing"]);
      if (structured) {
        setStructuredOutput(structured);
        setOutput("");
      } else {
        setOutput(resp);
      }
    } catch {
      setOutput(
        "Could not generate briefing right now. Check your local model or optional cloud provider settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".4px",
            color: "var(--text3)",
          }}
        >
          🧠 AI Superset Briefing
        </span>
        <button
          onClick={generate}
          disabled={loading || runtimeReachable === false}
          style={{
            height: "28px",
            padding: "0 12px",
            background: loading || runtimeReachable === false ? "var(--border2)" : "var(--accent)",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 600,
            cursor: loading || runtimeReachable === false ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Generating…"
            : runtimeReachable === false
              ? "Runtime offline"
              : "✦ Full Intel Brief"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
        <FeedStatusPill
          label="Prices"
          status={pricesStatus}
          internetReachable={internetReachable}
        />
        <FeedStatusPill
          label="News"
          status={articlesStatus}
          internetReachable={internetReachable}
        />
      </div>
      {offlineStatus === "local_only" ? (
        <SurfaceCallout
          tone="info"
          compact
          icon="Offline"
          title="Internet offline · briefing can still run locally"
          description="This briefing can still use the local runtime plus last-known local feed context while remote refreshes are paused."
          style={{ marginBottom: "10px" }}
        />
      ) : null}
      {offlineStatus === "runtime_unavailable" ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="Alert"
          title="Local runtime unavailable"
          description="Brief generation is disabled until the local runtime comes back, even if older market/news context is still visible."
          style={{ marginBottom: "10px" }}
        />
      ) : null}
      {structuredOutput ? (
        <EvidencePosturePanel
          title="AI Superset Briefing"
          summary={structuredOutput.summary}
          observed={structuredOutput.observed}
          inferred={structuredOutput.inferred}
          verifyNext={structuredOutput.verifyNext}
        />
      ) : (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text2)",
            lineHeight: 1.7,
            minHeight: "40px",
            whiteSpace: "pre-wrap",
          }}
        >
          {output ||
            (articlesLoaded || pricesLoaded
              ? "Hit Generate Briefing to synthesize the current market signals, world risk, news, and alerts."
              : "Warming the free data feeds for briefing context…")}
        </div>
      )}
    </div>
  );
}
