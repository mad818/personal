import { NextResponse } from "next/server";
import { DEFAULT_LOCAL_MODEL, TASK_MODELS } from "@/lib/aiModelRouting";
import { readTimesfmSpikeStatus } from "@/lib/experiments";
import { gradeFromEvalScore } from "@/lib/helpers";
import { summarizeSkillGovernance } from "@/lib/skillMetadata";
import { readNetworkMode } from "@/lib/security/routePolicy";
import { readConnectorPolicy } from "@/lib/security/connectorPolicy";
import {
  PRODUCT_SURFACES,
  readBuildChannel,
  readBuildVersion,
  readDeploymentProfile,
  RELEASE_DEFAULTS,
  summarizeConnectorReadiness,
  summarizeSurfaceTiers,
} from "@/lib/releaseMatrix";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function present(v: string | undefined) {
  return Boolean(v && v.trim().length > 0);
}

function readLatestEval() {
  const latestPath = join(
    process.cwd(),
    "docs",
    "metrics",
    "agent-runtime-latest.json",
  );
  if (!existsSync(latestPath)) return null;
  try {
    const raw = readFileSync(latestPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      ts?: string;
      score?: number;
      minScore?: number;
      ok?: boolean;
      categories?: Record<string, { score?: number }>;
      categoryThresholds?: Record<string, number>;
      checks?: { name?: string; pass?: boolean; category?: string }[];
    };
    return {
      ts: parsed.ts ?? null,
      score: typeof parsed.score === "number" ? parsed.score : null,
      minScore: typeof parsed.minScore === "number" ? parsed.minScore : null,
      ok: typeof parsed.ok === "boolean" ? parsed.ok : null,
      categories: parsed.categories ?? {},
      categoryThresholds: parsed.categoryThresholds ?? {},
      checks: parsed.checks ?? [],
    };
  } catch {
    return null;
  }
}

function readRunnerState() {
  const runnerPath = join(
    process.cwd(),
    "docs",
    "metrics",
    "agent-runtime-runner.json",
  );
  if (!existsSync(runnerPath)) return null;
  try {
    const raw = readFileSync(runnerPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      lastRunAt?: string;
      lastOk?: boolean;
      lastSummary?: string;
      cooldownMin?: number;
      effectiveCooldownMin?: number;
      failureStreak?: number;
      nextEligibleAt?: string;
    };
    return {
      lastRunAt: parsed.lastRunAt ?? null,
      lastOk: typeof parsed.lastOk === "boolean" ? parsed.lastOk : null,
      lastSummary: parsed.lastSummary ?? null,
      cooldownMin:
        typeof parsed.cooldownMin === "number" ? parsed.cooldownMin : null,
      effectiveCooldownMin:
        typeof parsed.effectiveCooldownMin === "number"
          ? parsed.effectiveCooldownMin
          : null,
      failureStreak:
        typeof parsed.failureStreak === "number" ? parsed.failureStreak : 0,
      nextEligibleAt: parsed.nextEligibleAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const latestEval = readLatestEval();
  const runner = readRunnerState();
  const runnerNormalized = runner ?? {
    lastRunAt: null,
    lastOk: null,
    lastSummary: null,
    cooldownMin: null,
    effectiveCooldownMin: null,
    failureStreak: 0,
    nextEligibleAt: null,
  };
  const evalFreshnessWindowMin = Math.max(
    5,
    Math.min(
      24 * 60,
      parseInt(process.env.NEXUS_RUNTIME_EVAL_FRESHNESS_MIN ?? "240", 10),
    ),
  );
  const evalAgeMin = latestEval?.ts
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(latestEval.ts).getTime()) / 60000),
      )
    : null;
  const evalStale =
    evalAgeMin === null ? true : evalAgeMin > evalFreshnessWindowMin;
  const failedChecks = (latestEval?.checks ?? [])
    .filter((c) => c?.pass === false)
    .map((c) => c.name ?? "unknown-check");
  const failedCategories = Object.entries(latestEval?.categories ?? {})
    .filter(([name, v]) => {
      const threshold = latestEval?.categoryThresholds?.[name];
      return typeof threshold === "number" && Number(v?.score ?? 0) < threshold;
    })
    .map(([name]) => name);
  const evalGrade = gradeFromEvalScore(latestEval?.score, { stale: evalStale });

  const startedAtIso = process.env.NEXUS_STARTED_AT ?? new Date().toISOString();

  const providers = {
    anthropic: present(process.env.ANTHROPIC_API_KEY),
    openai: present(process.env.OPENAI_API_KEY),
    minimax: present(process.env.MINIMAX_API_KEY),
    groq: present(process.env.GROQ_API_KEY),
    openrouter: present(process.env.OPENROUTER_API_KEY),
    google: present(process.env.GOOGLE_AI_KEY),
    ollamaEndpoint:
      process.env.OLLAMA_ENDPOINT ??
      "http://localhost:11434/v1/chat/completions",
  };

  const dataSources = {
    coingecko: present(process.env.COINGECKO_KEY),
    finnhub: present(process.env.FINNHUB_KEY),
    nvd: present(process.env.NVD_KEY),
    guardian: present(process.env.GUARDIAN_KEY),
    fred: present(process.env.FRED_KEY),
    otx: present(process.env.OTX_KEY),
    aisstream: present(process.env.AISSTREAM_KEY),
    firms: present(process.env.FIRMS_MAP_KEY),
    firecrawl: present(process.env.FIRECRAWL_KEY),
    brave: present(process.env.BRAVE_SEARCH_KEY),
  };

  const auth = {
    nexusTokenConfigured: present(process.env.NEXUS_TOKEN),
    maxTokens: Math.min(
      parseInt(process.env.NEXUS_MAX_TOKENS ?? "2048", 10),
      8192,
    ),
  };

  const policies = {
    toolPolicyMode: process.env.NEXUS_TOOL_POLICY_MODE ?? "strict",
    highRiskWritesRequireApproval:
      (process.env.NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL ?? "true") !==
      "false",
    networkMode: readNetworkMode(),
    highRiskRoutesEnabled: process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true",
    allowPaidApis: process.env.NEXUS_ALLOW_PAID_APIS === "true",
    connectorPolicy: readConnectorPolicy(),
  };
  const connectorReadiness = summarizeConnectorReadiness(
    policies.networkMode,
    policies.connectorPolicy,
  );
  const surfaceSummary = summarizeSurfaceTiers();
  const release = {
    service: "nexus-prime",
    channel: readBuildChannel(),
    version: readBuildVersion(),
    deploymentProfile: readDeploymentProfile(),
    canonicalDeploymentLane: RELEASE_DEFAULTS.canonicalDeploymentLane,
    supportedSurfacePolicy: RELEASE_DEFAULTS.supportedSurfacePolicy,
    surfaces: {
      counts: surfaceSummary.counts,
      ga: surfaceSummary.tiers.ga.map((surface) => surface.href),
      beta: surfaceSummary.tiers.beta.map((surface) => surface.href),
      internal: surfaceSummary.tiers.internal.map((surface) => surface.href),
      nav: PRODUCT_SURFACES.filter((surface) => surface.inNav).map((surface) => surface.href),
    },
    connectorReadiness,
  };

  const aiRouting = {
    defaultLocalModel: DEFAULT_LOCAL_MODEL,
    taskModels: TASK_MODELS,
  };

  const queue = {
    runQueueMode: "single-flight",
    verifyEndpoint: "/api/verify",
    adapters: ["typecheck", "lint", "route_smoke", "release_smoke"],
  };

  const evalPolicy = {
    runtimeEvalMinScore: Math.max(
      0,
      Math.min(
        100,
        parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_SCORE ?? "85", 10),
      ),
    ),
    runtimeEvalCommand: "npm run eval:agent-runtime -- --min-score <score>",
    categoryThresholds: {
      safety: Math.max(
        0,
        Math.min(
          100,
          parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_SAFETY ?? "80", 10),
        ),
      ),
      reliability: Math.max(
        0,
        Math.min(
          100,
          parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_RELIABILITY ?? "80", 10),
        ),
      ),
      ux: Math.max(
        0,
        Math.min(
          100,
          parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_UX ?? "70", 10),
        ),
      ),
      observability: Math.max(
        0,
        Math.min(
          100,
          parseInt(
            process.env.NEXUS_RUNTIME_EVAL_MIN_OBSERVABILITY ?? "70",
            10,
          ),
        ),
      ),
    },
    freshnessWindowMin: evalFreshnessWindowMin,
    runner: runnerNormalized,
    latest: latestEval,
    rollup: {
      grade: evalGrade,
      stale: evalStale,
      ageMinutes: evalAgeMin,
      degradedReasons: [
        ...(evalStale ? ["stale-eval"] : []),
        ...failedChecks.map((n) => `check:${n}`),
        ...failedCategories.map((c) => `category:${c}`),
        ...(Number(runnerNormalized?.failureStreak ?? 0) > 0
          ? [
              `runner:backoff-x${2 ** Number(runnerNormalized?.failureStreak ?? 0)}`,
            ]
          : []),
      ],
    },
  };
  const skillGovernance = summarizeSkillGovernance();
  const experiments = {
    timesfmSpike: readTimesfmSpikeStatus(),
  };

  return NextResponse.json({
    status: "ok",
    service: "nexus-prime",
    generatedAt: new Date().toISOString(),
    startedAt: startedAtIso,
    readiness: {
      aiProviders: providers,
      dataSources,
      auth,
      policies,
      release,
      aiRouting,
      queue,
      evalPolicy,
      skillGovernance,
      experiments,
    },
  });
}
