// ── app/api/agent-health/route.ts ──────────────────────────────────────────────
// GET /api/agent-health
// Returns per-agent pass rates from tasks/agent-metrics.tsv
// Rate-limited. No secrets exposed.

import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";

const RATE_LIMIT = {
  bucket: "api-agent-health",
  windowMs: 60_000,
  maxAttempts: 10,
  includeBearerToken: false,
} as const;

const METRICS_PATH = path.join(process.cwd(), "tasks/agent-metrics.tsv");

interface AgentHealth {
  agent: string;
  passRate: number; // 0–1
  passCount: number;
  failCount: number;
  avgDurationMs: number;
  lastRun: string | null;
  trend: "up" | "down" | "stable" | "unknown";
}

function parseMetrics(): AgentHealth[] {
  let raw = "";
  try {
    raw = fs.readFileSync(METRICS_PATH, "utf8");
  } catch {
    return [];
  }

  const rows = raw
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("\t"))
    .filter((cols) => cols.length >= 5);

  // Group by agent, take last 7 rows per agent
  const byAgent: Record<string, typeof rows> = {};
  for (const row of rows) {
    const agent = row[1] ?? "unknown";
    if (!byAgent[agent]) byAgent[agent] = [];
    byAgent[agent].push(row);
  }

  return Object.entries(byAgent).map(([agent, agentRows]) => {
    const last7 = agentRows.slice(-7);
    const lastRow = last7[last7.length - 1];
    const passCount = Number(lastRow[2] ?? 0);
    const failCount = Number(lastRow[3] ?? 0);
    const total = passCount + failCount;
    const avgDurationMs = Number(lastRow[4] ?? 0);
    const passRate = total > 0 ? passCount / total : 0;

    // Trend: compare last 2 rows
    let trend: AgentHealth["trend"] = "unknown";
    if (last7.length >= 2) {
      const prev = last7[last7.length - 2];
      const prevPass = Number(prev[2] ?? 0);
      const prevTotal = prevPass + Number(prev[3] ?? 0);
      const prevRate = prevTotal > 0 ? prevPass / prevTotal : 0;
      if (passRate > prevRate + 0.05) trend = "up";
      else if (passRate < prevRate - 0.05) trend = "down";
      else trend = "stable";
    }

    return {
      agent,
      passRate,
      passCount,
      failCount,
      avgDurationMs,
      lastRun: lastRow[0] ?? null,
      trend,
    };
  });
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, RATE_LIMIT);
  if (!rl.ok) {
    const r = protectedJson(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
    applyRateLimitHeaders(r, RATE_LIMIT, rl.retryAfterSec);
    return r;
  }

  const agents = parseMetrics();
  const res = protectedJson({ agents, timestamp: Date.now() });
  applyRateLimitHeaders(res, RATE_LIMIT);
  return res;
}
