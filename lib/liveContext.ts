// ── lib/liveContext.ts ─────────────────────────────────────────────────────────
// Builds a real-time intelligence briefing from the dashboard's live store
// state. Injected into every agent system prompt so agents reason from current
// data — not stale training knowledge.
//
// The result looks like this inside the system prompt:
//
//   [NEXUS LIVE INTEL — 2026-03-22T14:30:00Z]
//   MARKET: BTC $84,200 (+1.4%) · ETH $3,100 (-0.2%) · Fear & Greed: 62 GREED
//   WORLD RISK: 34/100 (LOW)
//   CVEs TODAY: 14 (3 CRITICAL: CVE-2026-1234 …)
//   NEWS (47 signals): Fed holds rates · BTC ETF inflows hit record · …
//   [END LIVE INTEL]
//
// Usage:
//   import { buildLiveContext } from '@/lib/liveContext'
//   const liveBlock = buildLiveContext(useStore.getState())
//   const enrichedPrompt = systemPrompt + liveBlock

import type { AgentStats } from "@/store/useStore";
import { buildStackContextBlock } from "@/lib/projectContext";
import { buildLearningsBlock } from "@/lib/agentLearnings";
import type { LearningEntry } from "@/lib/agentLearnings";
import type { VaultSynthesis } from "@/components/home/office/types";

// Minimal shape of the store state that buildLiveContext needs.
// Avoids depending on a non-exported AppState type alias.
interface LiveState {
  prices?: Record<string, unknown>;
  signals?: { fg?: unknown };
  worldRisk?: number;
  cves?: unknown[];
  articles?: unknown[];
  agentStats?: Record<string, AgentStats>;
  agentLearnings?: Record<string, LearningEntry[]>;
  vaultSynthesis?: VaultSynthesis | null;
}

// Shape of a price entry from S.prices
interface PriceEntry {
  price: number;
  chg: number;
  sym?: string;
  mcap?: number;
  vol?: number;
}

// Shape of a CVE entry from S.cves
interface CveEntry {
  id: string;
  description?: string;
  summary?: string;
  severity?: string;
  cvssScore?: number;
  score?: number;
}

// Shape of an article from S.articles
interface ArticleEntry {
  title: string;
  source?: string;
  bias?: string;
}

interface LiveContextBuildOptions {
  maxChars?: number;
  includeStackContext?: boolean;
  includeLearnings?: boolean;
}

export interface LiveContextReport {
  chars: number;
  compacted: boolean;
  maxChars: number;
  lineCount: number;
}

export interface LiveContextBundle {
  context: string;
  report: LiveContextReport;
}

function compactToBudget(text: string, maxChars: number): LiveContextBundle {
  if (!text) {
    return {
      context: "",
      report: { chars: 0, compacted: false, maxChars, lineCount: 0 },
    };
  }
  if (text.length <= maxChars) {
    return {
      context: text,
      report: {
        chars: text.length,
        compacted: false,
        maxChars,
        lineCount: text.split("\n").length,
      },
    };
  }
  const clipped = `${text.slice(0, Math.max(0, maxChars - 64)).trimEnd()}\n[CONTEXT COMPACTED TO FIT TOKEN BUDGET]\n`;
  return {
    context: clipped,
    report: {
      chars: clipped.length,
      compacted: true,
      maxChars,
      lineCount: clipped.split("\n").length,
    },
  };
}

// ── Agent relevance map — which sections each agent cares about ────────────────
// Prunes live context to signal-relevant sections per specialist.
// JANSKY/ORBIT always receive the full context (orchestrators need everything).
const AGENT_SECTIONS: Record<string, Set<string>> = {
  flux: new Set(["market", "sentiment", "news"]),
  cipher: new Set(["cves", "news", "vault"]),
  nova: new Set(["news", "worldRisk"]),
  orbit: new Set([
    "market",
    "sentiment",
    "worldRisk",
    "cves",
    "news",
    "session",
  ]),
  jansky: new Set([
    "market",
    "sentiment",
    "worldRisk",
    "cves",
    "news",
    "session",
    "vault",
  ]),
};

// Builds a context block filtered to what the given agent actually needs.
// Falls back to the full context for unknown agent IDs.
export function buildFilteredLiveContext(
  state: LiveState,
  agentId: string,
  opts: LiveContextBuildOptions = {},
): string {
  const allowed = AGENT_SECTIONS[agentId.toLowerCase()] ?? null;
  // If no filter defined, return full context
  if (!allowed) {
    return buildLiveContext(state, {
      includeStackContext: opts.includeStackContext,
    });
  }

  const prices = state.prices as Record<string, PriceEntry>;
  const fg = state.signals?.fg as
    | { value: number | string; label: string }
    | undefined;
  const ts = new Date().toISOString();
  const lines: string[] = [];

  if (allowed.has("market")) {
    const watchCoins = ["bitcoin", "ethereum", "solana", "binancecoin"];
    const parts: string[] = [];
    for (const id of watchCoins) {
      const p = prices[id];
      if (!p) continue;
      const sym = p.sym ?? id.slice(0, 3).toUpperCase();
      const dir = p.chg >= 0 ? "+" : "";
      parts.push(
        `${sym} $${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${dir}${p.chg.toFixed(2)}%)`,
      );
    }
    if (parts.length) lines.push(`MARKET: ${parts.join(" · ")}`);
  }

  if (allowed.has("sentiment") && fg) {
    const fgVal = Number(fg.value);
    lines.push(
      `SENTIMENT: Fear & Greed ${fgVal} — ${fg.label?.toUpperCase() ?? ""}`,
    );
  }

  if (allowed.has("worldRisk")) {
    const wr = state.worldRisk ?? 0;
    if (wr > 0) {
      const label = wr > 70 ? "HIGH" : wr > 40 ? "MEDIUM" : "LOW";
      lines.push(`WORLD RISK: ${wr}/100 (${label})`);
    }
  }

  if (allowed.has("cves")) {
    const cves = (state.cves ?? []) as CveEntry[];
    if (cves.length > 0) {
      const critical = cves.filter((c) => {
        const sev = (c.severity ?? "").toUpperCase();
        const score = c.cvssScore ?? c.score ?? 0;
        return sev === "CRITICAL" || score >= 9.0;
      });
      let line = `CVEs TODAY: ${cves.length} total`;
      if (critical.length) {
        line += ` · ${critical.length} CRITICAL (${critical
          .slice(0, 2)
          .map((c) => c.id)
          .join(", ")}${critical.length > 2 ? " …" : ""})`;
      }
      lines.push(line);
    }
  }

  if (allowed.has("news")) {
    const articles = (state.articles ?? []) as ArticleEntry[];
    if (articles.length > 0) {
      const headlines = articles
        .slice(0, 6)
        .map((a) => a.title)
        .join(" · ");
      lines.push(`NEWS (${articles.length} signals): ${headlines}`);
    }
  }

  if (allowed.has("session")) {
    const agentStats = state.agentStats ?? {};
    const total = Object.values(agentStats).reduce<number>(
      (s, a) => s + (a.totalTasks ?? 0),
      0,
    );
    if (total > 0)
      lines.push(
        `SESSION: ${total} tasks across ${Object.keys(agentStats).length} agents`,
      );
  }

  if (allowed.has("vault") && state.vaultSynthesis) {
    const vs = state.vaultSynthesis;
    const gapSnippet = vs.gaps.length > 0 ? ` | Gaps: ${vs.gaps.slice(0, 2).join(", ")}` : "";
    lines.push(`VAULT: ${vs.summary.slice(0, 160)}${gapSnippet}`);
  }

  lines.push(`DATA FRESHNESS: ${ts.slice(11, 19)} UTC`);

  // Inject learnings block if available for this agent
  const learnings = state.agentLearnings?.[agentId.toLowerCase()] ?? [];
  const learningsBlock = learnings.length > 0
    && opts.includeLearnings !== false
    ? buildLearningsBlock(agentId.toLowerCase() as import("@/components/home/office/types").AgentId, learnings.slice(0, 5))
    : "";

  if (!lines.length) return "";
  const stackBlock = opts.includeStackContext === false
    ? ""
    : buildStackContextBlock();
  return `\n\n[NEXUS LIVE INTEL — ${ts}]\n${lines.join("\n")}\n[END LIVE INTEL]\n${stackBlock ? "\n" + stackBlock + "\n" : ""}${learningsBlock ? "\n" + learningsBlock + "\n" : ""}`;
}

export function buildLiveContext(
  state: LiveState,
  opts: Pick<LiveContextBuildOptions, "includeStackContext"> = {},
): string {
  const lines: string[] = [];
  const ts = new Date().toISOString();

  // ── MARKET DATA ────────────────────────────────────────────────────────────
  const prices = state.prices as Record<string, PriceEntry>;
  const fg = state.signals?.fg as
    | { value: number | string; label: string }
    | undefined;

  const marketParts: string[] = [];

  // Top coins — BTC, ETH, SOL, BNB if available
  const watchCoins = ["bitcoin", "ethereum", "solana", "binancecoin"];
  for (const id of watchCoins) {
    const p = prices[id];
    if (!p) continue;
    const sym = p.sym ?? id.slice(0, 3).toUpperCase();
    const dir = p.chg >= 0 ? "+" : "";
    marketParts.push(
      `${sym} $${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${dir}${p.chg.toFixed(2)}%)`,
    );
  }

  if (marketParts.length > 0) {
    lines.push(`MARKET: ${marketParts.join(" · ")}`);
  }

  // Fear & Greed
  if (fg) {
    const fgVal = Number(fg.value);
    const fgLabel = fg.label?.toUpperCase() ?? "";
    const fgColor =
      fgVal >= 75
        ? "EXTREME GREED"
        : fgVal >= 55
          ? "GREED"
          : fgVal >= 45
            ? "NEUTRAL"
            : fgVal >= 25
              ? "FEAR"
              : "EXTREME FEAR";
    lines.push(`SENTIMENT: Fear & Greed ${fgVal} — ${fgLabel || fgColor}`);
  }

  // ── WORLD RISK ─────────────────────────────────────────────────────────────
  const worldRisk = state.worldRisk ?? 0;
  if (worldRisk > 0) {
    const riskLabel =
      worldRisk > 70 ? "HIGH" : worldRisk > 40 ? "MEDIUM" : "LOW";
    lines.push(`WORLD RISK: ${worldRisk}/100 (${riskLabel})`);
  }

  // ── CVEs ───────────────────────────────────────────────────────────────────
  const cves = (state.cves ?? []) as CveEntry[];
  if (cves.length > 0) {
    // Identify high-severity CVEs
    const critical = cves.filter((c) => {
      const sev = (c.severity ?? "").toUpperCase();
      const score = c.cvssScore ?? c.score ?? 0;
      return sev === "CRITICAL" || score >= 9.0;
    });
    const high = cves.filter((c) => {
      const sev = (c.severity ?? "").toUpperCase();
      const score = c.cvssScore ?? c.score ?? 0;
      return sev === "HIGH" || (score >= 7.0 && score < 9.0);
    });

    // IDs only — no description text (saves ~40 tokens per critical CVE)
    let cveLine = `CVEs TODAY: ${cves.length} total`;
    if (critical.length > 0) {
      const ids = critical
        .slice(0, 2)
        .map((c) => c.id)
        .join(", ");
      cveLine += ` · ${critical.length} CRITICAL (${ids}${critical.length > 2 ? " +more" : ""})`;
    }
    if (high.length > 0) cveLine += ` · ${high.length} HIGH`;
    lines.push(cveLine);
  }

  // ── NEWS SIGNALS ───────────────────────────────────────────────────────────
  const articles = (state.articles ?? []) as ArticleEntry[];
  if (articles.length > 0) {
    // Cap each headline at 80 chars to stay within token budget
    const headlines = articles
      .slice(0, 6)
      .map((a) => (a.title.length > 80 ? a.title.slice(0, 77) + "…" : a.title))
      .join(" · ");
    lines.push(`NEWS (${articles.length} signals): ${headlines}`);
  }

  // ── ACTIVE AGENT STATS ─────────────────────────────────────────────────────
  const agentStats = state.agentStats ?? {};
  const totalTasks = Object.values(agentStats).reduce<number>(
    (s, a) => s + (a.totalTasks ?? 0),
    0,
  );
  if (totalTasks > 0) {
    lines.push(
      `SESSION: ${totalTasks} tasks completed across ${Object.keys(agentStats).length} agents`,
    );
  }

  // VAULT SYNTHESIS
  if (state.vaultSynthesis) {
    const vs = state.vaultSynthesis;
    const gapSnippet = vs.gaps.length > 0 ? ` | Gaps: ${vs.gaps.slice(0, 2).join(", ")}` : "";
    lines.push(`VAULT: ${vs.summary.slice(0, 160)}${gapSnippet}`);
  }

  // ── CAPABILITIES REMINDER ──────────────────────────────────────────────────
  // Tells the agent what live data it has access to, encouraging grounded answers
  lines.push(
    `DATA FRESHNESS: Prices/signals pulled ${ts.slice(11, 19)} UTC — treat as current market state`,
  );

  if (lines.length === 0) return "";
  const stackBlock = opts.includeStackContext === false
    ? ""
    : buildStackContextBlock();
  return `\n\n[NEXUS LIVE INTEL — ${ts}]\n${lines.join("\n")}\n[END LIVE INTEL]\n${stackBlock ? "\n" + stackBlock + "\n" : ""}`;
}

// Overload buildLiveContext for use with agentId to inject learnings
export function buildLiveContextWithAgentId(
  state: LiveState,
  agentId: string,
): string {
  const baseContext = buildLiveContext(state);
  const learnings = state.agentLearnings?.[agentId.toLowerCase()] ?? [];
  if (learnings.length === 0) return baseContext;
  const learningsBlock = buildLearningsBlock(
    agentId.toLowerCase() as import("@/components/home/office/types").AgentId,
    learnings.slice(0, 5)
  );
  return baseContext + learningsBlock + "\n";
}

export function buildLiveContextBundle(
  state: LiveState,
  opts: LiveContextBuildOptions = {},
): LiveContextBundle {
  const maxChars = Math.max(500, Math.min(12_000, opts.maxChars ?? 3_200));
  const raw = buildLiveContext(state, {
    includeStackContext: opts.includeStackContext,
  });
  return compactToBudget(raw, maxChars);
}

export function buildFilteredLiveContextBundle(
  state: LiveState,
  agentId: string,
  opts: LiveContextBuildOptions = {},
): LiveContextBundle {
  const maxChars = Math.max(500, Math.min(12_000, opts.maxChars ?? 3_200));
  const raw = buildFilteredLiveContext(state, agentId, opts);
  return compactToBudget(raw, maxChars);
}

// ── buildMemoryDiffBlock ──────────────────────────────────────────────────────
// Injects a lightweight "what changed since last session" block.
// Based on charliejhills claude-subconscious pattern — no background daemon,
// just a single persisted summary string updated at session end.
export function buildMemoryDiffBlock(lastSessionSummary: string): string {
  if (!lastSessionSummary?.trim()) return "";
  return `\n\n[MEMORY DIFF — since last session]\n${lastSessionSummary.trim()}\n[END MEMORY DIFF]\n`;
}

// ── buildDeltaSweep ───────────────────────────────────────────────────────────
// Compares two store snapshots and returns delta alerts for significant changes.
// Call on every data refresh interval. Returns an empty array if nothing crossed
// a threshold — so the caller can skip notification writes.
//
// Thresholds:
//   Price change  ≥ 3% (absolute move between prev and curr snapshot price)
//   CVE count     increases by ≥ 3 between refreshes
//   World risk    jumps or drops by ≥ 10 points

export interface DeltaAlert {
  type: "market" | "threat" | "risk";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  source: string;
}

export function buildDeltaSweep(
  prev: LiveState,
  curr: LiveState,
): DeltaAlert[] {
  const alerts: DeltaAlert[] = [];

  // ── Price delta check ─────────────────────────────────────────────────────
  const prevPrices = (prev.prices ?? {}) as Record<string, PriceEntry>;
  const currPrices = (curr.prices ?? {}) as Record<string, PriceEntry>;

  const watchCoins: Record<string, string> = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    binancecoin: "BNB",
  };

  for (const [coinId, sym] of Object.entries(watchCoins)) {
    const prev_p = prevPrices[coinId];
    const curr_p = currPrices[coinId];
    if (!prev_p || !curr_p || prev_p.price <= 0) continue;

    const pctMove = ((curr_p.price - prev_p.price) / prev_p.price) * 100;
    if (Math.abs(pctMove) >= 3) {
      const dir = pctMove > 0 ? "▲" : "▼";
      const sev =
        Math.abs(pctMove) >= 8
          ? "critical"
          : Math.abs(pctMove) >= 5
            ? "high"
            : "medium";
      alerts.push({
        type: "market",
        severity: sev,
        title: `${sym} ${dir} ${Math.abs(pctMove).toFixed(1)}%`,
        message: `${sym} moved from $${prev_p.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} to $${curr_p.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${pctMove > 0 ? "+" : ""}${pctMove.toFixed(2)}%)`,
        source: "Price Delta Sweep",
      });
    }
  }

  // ── CVE spike check ───────────────────────────────────────────────────────
  const prevCveCount = (prev.cves ?? []).length;
  const currCveCount = (curr.cves ?? []).length;
  if (currCveCount - prevCveCount >= 3) {
    const added = currCveCount - prevCveCount;
    const currCves = (curr.cves ?? []) as CveEntry[];
    const newCritical = currCves
      .slice(0, added)
      .filter(
        (c) =>
          (c.severity ?? "").toUpperCase() === "CRITICAL" ||
          (c.cvssScore ?? c.score ?? 0) >= 9,
      )
      .slice(0, 2)
      .map((c) => c.id)
      .join(", ");
    alerts.push({
      type: "threat",
      severity: newCritical ? "high" : "medium",
      title: `CVE Spike: +${added} new vulnerabilities`,
      message: newCritical
        ? `${added} new CVEs loaded, including critical: ${newCritical}`
        : `${added} new CVEs added to the feed — review CYBER tab`,
      source: "CVE Delta Sweep",
    });
  }

  // ── World risk jump check ─────────────────────────────────────────────────
  const prevRisk = prev.worldRisk ?? 0;
  const currRisk = curr.worldRisk ?? 0;
  const riskDelta = currRisk - prevRisk;
  if (Math.abs(riskDelta) >= 10) {
    const dir = riskDelta > 0 ? "▲" : "▼";
    const sev = Math.abs(riskDelta) >= 20 ? "high" : "medium";
    const label = currRisk > 70 ? "HIGH" : currRisk > 40 ? "MEDIUM" : "LOW";
    alerts.push({
      type: "risk",
      severity: sev,
      title: `World Risk ${dir} ${Math.abs(riskDelta)} pts → ${currRisk}/100`,
      message: `World risk moved from ${prevRisk} to ${currRisk}/100 (${label}). Check OPS tab for geopolitical context.`,
      source: "World Risk Delta Sweep",
    });
  }

  return alerts;
}

// ── buildCapabilitiesBlock ─────────────────────────────────────────────────────
// Returns a short block describing what tools, data, and skills this agent has.
// Injected once per session to help the agent self-organise before answering.
export function buildCapabilitiesBlock(agentId: string): string {
  const cap: Record<string, string> = {
    jansky: `You have live access to: market prices, Fear & Greed index, world risk score, CVE feed, and news signals. Use this data to give grounded, current answers — not generalizations. When you answer about markets, cite the live numbers. When you answer about threats, cite the CVE count.`,

    orbit: `You have direct read/write access to the Nexus Prime codebase via file tools. Always read before editing. You also have the live dashboard data — use it to understand what features are active and what data is flowing.`,

    nova: `You are a research engine with web_search, fetch_url, and a bounded deep_research tool for explicit deep dives. Operate like Perplexity for normal research: (1) search for the core question, (2) open the 2-3 most relevant sources, (3) synthesize into a grounded answer with citations. Use deep_research only when the operator clearly asks for a deep report or research brief. Never answer from memory alone when current data is available. You also see the dashboard's live news feed — cross-reference it.`,

    cipher: `You are a security analyst with CVE data loaded live. Start threat analysis from the current CVE feed — what's critical today, what's trending. Then expand with web_search for exploit details. Ground every recommendation in current exposure, not theoretical risk. You also have access to POST /api/legal-compliance/drone — use it when the user asks about drone operation legality, FAA compliance, airspace authorization, or state/local drone laws. Pass location (city, state), operationType, droneWeight (lbs), altitude (ft AGL), nightOps, and nearAirport. The route runs 5 parallel compliance agents (FAA, state, local, airspace, operational) and returns a weighted compliance score with citations.`,

    flux: `You are a market analyst with live prices, Fear & Greed, and news signals available right now. Lead every market answer with the actual current numbers. Then layer in macro context via web_search. Never give generic market commentary — you have real data, use it.`,
  };
  const block = cap[agentId] ?? cap.jansky;
  return `\n\n[AGENT CAPABILITIES & REASONING STYLE]\n${block}\n[END CAPABILITIES]\n`;
}
