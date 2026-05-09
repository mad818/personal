import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

export const dynamic = "force-dynamic";

interface EvalCheck {
  pass?: boolean;
}

interface EvalReport {
  ts?: string;
  score?: number;
  checks?: EvalCheck[];
}

function readLatestEval(): EvalReport | null {
  const latestPath = join(
    resolveRuntimeProjectRoot(),
    "docs",
    "metrics",
    "agent-runtime-latest.json",
  );
  if (!existsSync(latestPath)) return null;
  try {
    return JSON.parse(readFileSync(latestPath, "utf-8")) as EvalReport;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-agent-health",
    windowMs: 10_000,
    maxAttempts: 20,
    includeBearerToken: false,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { agents: [], error: "Agent health endpoint rate limit exceeded." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  const latest = readLatestEval();
  const checks = latest?.checks ?? [];
  const passCount = checks.filter((check) => check.pass).length;
  const failCount = Math.max(0, checks.length - passCount);
  const score =
    typeof latest?.score === "number"
      ? Math.max(0, Math.min(1, latest.score / 100))
      : checks.length
        ? passCount / checks.length
        : 0;

  const response = protectedJson({
    agents: latest
      ? [
          {
            agent: "all",
            passRate: score,
            passCount,
            failCount,
            avgDurationMs: 0,
            lastRun: latest.ts ?? null,
            trend: "stable",
          },
        ]
      : [],
  });
  applyRateLimitHeaders(response, rateLimitConfig);
  return response;
}
