// ── lib/agentLearnings.ts ─────────────────────────────────────────────────────
// Agent Quality Gates + Learnings Loop (Block M) — CLIENT-SAFE module.
//
// This file contains ONLY pure functions and types — zero Node.js imports.
// All file I/O (appendLearning, readLearnings, rotateIfNeeded) lives exclusively
// in app/api/agent-learnings/route.ts (server-only).
//
// This split is required because lib/liveContext.ts is imported by
// OfficeCommandCenter.tsx (client component), so anything imported here
// must be webpack-safe (no fs, no path, no node: protocol).

import type { AgentId } from "@/components/home/office/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LearningEntry {
  id: string;
  ts: number;
  agent: AgentId;
  category: "failure" | "success" | "pattern" | "correction";
  queryType:
    | "code"
    | "research"
    | "market"
    | "security"
    | "planning"
    | "general";
  summary: string; // ≤200 chars
  proposedFix?: string;
  applied: boolean;
  status?: "proposed" | "approved" | "rejected";
  evidenceReceiptIds?: string[];
  reinforcementCount?: number;
  lastVerifiedAt?: number;
}

// ── Heuristic failure classifier ──────────────────────────────────────────────
// No AI calls — keyword scoring only.

const CODE_KEYWORDS = [
  "function",
  "const",
  "export",
  "import",
  "tsx",
  "ts",
  "type",
  "interface",
  "component",
  "hook",
  "store",
  "zustand",
  "tailwind",
  "next",
  "react",
  "tsc",
];
const RESEARCH_KEYWORDS = [
  "search",
  "research",
  "find",
  "article",
  "news",
  "source",
  "report",
  "study",
  "analysis",
  "compare",
];
const MARKET_KEYWORDS = [
  "price",
  "btc",
  "eth",
  "bitcoin",
  "market",
  "bull",
  "bear",
  "crypto",
  "fear",
  "greed",
  "trade",
  "position",
  "signal",
];
const SECURITY_KEYWORDS = [
  "cve",
  "vulnerability",
  "exploit",
  "patch",
  "cvss",
  "security",
  "threat",
  "attack",
  "critical",
  "malware",
];
const PLANNING_KEYWORDS = [
  "plan",
  "step",
  "task",
  "roadmap",
  "architecture",
  "design",
  "spec",
  "breakdown",
  "phase",
  "milestone",
];

export function classifyFailure(
  agent: AgentId,
  query: string,
  answer: string,
): Pick<LearningEntry, "category" | "queryType" | "summary"> {
  const combined = (query + " " + answer).toLowerCase();

  const score = (keywords: string[]) =>
    keywords.filter((k) => combined.includes(k)).length;

  const scores: [LearningEntry["queryType"], number][] = [
    ["code", score(CODE_KEYWORDS)],
    ["research", score(RESEARCH_KEYWORDS)],
    ["market", score(MARKET_KEYWORDS)],
    ["security", score(SECURITY_KEYWORDS)],
    ["planning", score(PLANNING_KEYWORDS)],
  ];

  const top = scores.sort((a, b) => b[1] - a[1])[0];
  const queryType: LearningEntry["queryType"] = top[1] > 0 ? top[0] : "general";

  const truncQ = query.length > 120 ? query.slice(0, 117) + "…" : query;
  const summary =
    `[${agent.toUpperCase()}] ${queryType} query failed: "${truncQ}"`.slice(
      0,
      200,
    );

  return { category: "failure", queryType, summary };
}

// ── buildLearningsBlock ───────────────────────────────────────────────────────
// Builds a compact system prompt injection from the top N entries.
// ~100 tokens for 5 entries. Pure — no I/O.
export function buildLearningsBlock(
  agent: AgentId,
  entries: LearningEntry[],
): string {
  const approved = entries.filter(
    (entry) => entry.applied && (!entry.status || entry.status === "approved"),
  );
  if (!approved.length) return "";
  const lines = approved.slice(0, 5).map((e) => {
    const prefix =
      e.category === "failure"
        ? "• avoid:"
        : e.category === "correction"
          ? "• corrected:"
          : e.category === "success"
            ? "• works:"
            : "• pattern:";
    return `${prefix} ${e.summary}${e.proposedFix ? ` → ${e.proposedFix}` : ""}`;
  });
  return [
    `\n[AGENT LEARNINGS — ${agent.toUpperCase()} — ${approved.length} approved]`,
    ...lines,
    "[END LEARNINGS]",
  ].join("\n");
}
