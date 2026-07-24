import { existsSync, mkdirSync, readFileSync } from "fs";
import { appendFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";
import {
  runtimeExperimentDefinitionSchema,
  runtimeExperimentDecisionSchema,
  runtimeExperimentPayloadSchema,
  runtimeExperimentRunSchema,
  buildRuntimeExperimentDecision,
  evaluateRuntimeExperimentKeepGate,
  summarizeRuntimeExperiment,
  type RuntimeExperimentDecision,
  type RuntimeExperimentDecisionInput,
  type RuntimeExperimentDefinition,
  type RuntimeExperimentLatestSummary,
  type RuntimeExperimentPayload,
  type RuntimeExperimentRun,
} from "@/lib/runtimeExperimentContracts";

const PROJECT_ROOT = resolveRuntimeProjectRoot();
const METRICS_DIR = join(PROJECT_ROOT, "docs", "metrics");
const RUNTIME_EXPERIMENT_LATEST_FILE = join(
  METRICS_DIR,
  "runtime-experiment-latest.json",
);
const RUNTIME_EXPERIMENT_HISTORY_FILE = join(
  METRICS_DIR,
  "runtime-experiment-history.jsonl",
);
const RUNTIME_EXPERIMENT_DEFINITIONS_FILE = join(
  METRICS_DIR,
  "runtime-experiment-definitions.json",
);
const RUNTIME_EXPERIMENT_DECISIONS_FILE = join(
  METRICS_DIR,
  "runtime-experiment-decisions.jsonl",
);

function ensureMetricsDir() {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true });
  }
}

function readJsonFile<T>(
  filename: string,
  parser: (input: unknown) => T | null,
): T | null {
  if (!existsSync(filename)) return null;
  try {
    const raw = readFileSync(filename, "utf-8");
    return parser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseRun(input: unknown): RuntimeExperimentRun | null {
  const parsed = runtimeExperimentRunSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function parseDefinition(input: unknown): RuntimeExperimentDefinition | null {
  const parsed = runtimeExperimentDefinitionSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function parseDecision(input: unknown): RuntimeExperimentDecision | null {
  const parsed = runtimeExperimentDecisionSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function readLatestRuntimeExperiment(): RuntimeExperimentRun | null {
  return readJsonFile(RUNTIME_EXPERIMENT_LATEST_FILE, parseRun);
}

export function readRuntimeExperimentDefinitions(): RuntimeExperimentDefinition[] {
  if (!existsSync(RUNTIME_EXPERIMENT_DEFINITIONS_FILE)) return [];
  try {
    const raw = readFileSync(RUNTIME_EXPERIMENT_DEFINITIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => parseDefinition(entry))
      .filter((entry): entry is RuntimeExperimentDefinition => Boolean(entry));
  } catch {
    return [];
  }
}

export function readRuntimeExperimentHistory(
  limit = 20,
): RuntimeExperimentRun[] {
  if (!existsSync(RUNTIME_EXPERIMENT_HISTORY_FILE)) return [];
  try {
    return readFileSync(RUNTIME_EXPERIMENT_HISTORY_FILE, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(120, limit)))
      .map((line) => {
        try {
          return parseRun(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter((entry): entry is RuntimeExperimentRun => Boolean(entry))
      .reverse();
  } catch {
    return [];
  }
}

export function readRuntimeExperimentDecisions(
  limit = 60,
): RuntimeExperimentDecision[] {
  if (!existsSync(RUNTIME_EXPERIMENT_DECISIONS_FILE)) return [];
  try {
    return readFileSync(RUNTIME_EXPERIMENT_DECISIONS_FILE, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(240, limit)))
      .map((line) => {
        try {
          return parseDecision(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter((entry): entry is RuntimeExperimentDecision => Boolean(entry))
      .reverse();
  } catch {
    return [];
  }
}

export function findRuntimeExperimentRun(
  runId: string,
): RuntimeExperimentRun | null {
  const latest = readLatestRuntimeExperiment();
  if (latest?.id === runId) return latest;
  return (
    readRuntimeExperimentHistory(120).find((run) => run.id === runId) ?? null
  );
}

export type RecordRuntimeExperimentDecisionResult =
  | { ok: true; decision: RuntimeExperimentDecision }
  | {
      ok: false;
      status: 404 | 409;
      error: string;
      reasons?: string[];
    };

export async function recordRuntimeExperimentDecision(
  input: RuntimeExperimentDecisionInput,
): Promise<RecordRuntimeExperimentDecisionResult> {
  const run = findRuntimeExperimentRun(input.runId);
  if (!run) {
    return {
      ok: false,
      status: 404,
      error: "Runtime experiment run was not found.",
    };
  }

  const gate = evaluateRuntimeExperimentKeepGate(run);
  if (input.decision === "keep" && !gate.eligible) {
    return {
      ok: false,
      status: 409,
      error: "Benchmark gate blocked the keep decision.",
      reasons: gate.reasons,
    };
  }

  const decision = buildRuntimeExperimentDecision(run, input, {
    id: `rtx-decision-${randomUUID()}`,
    decidedAt: new Date().toISOString(),
  });
  ensureMetricsDir();
  await appendFile(
    RUNTIME_EXPERIMENT_DECISIONS_FILE,
    `${JSON.stringify(decision)}\n`,
    "utf-8",
  );
  return { ok: true, decision };
}

function upsertDefinition(
  current: RuntimeExperimentDefinition[],
  definition: RuntimeExperimentDefinition,
) {
  const index = current.findIndex((entry) => entry.id === definition.id);
  if (index === -1) return [definition, ...current];
  const next = [...current];
  next[index] = definition;
  return next;
}

export async function recordRuntimeExperimentRun(
  run: RuntimeExperimentRun,
): Promise<void> {
  ensureMetricsDir();
  await writeFile(
    RUNTIME_EXPERIMENT_LATEST_FILE,
    JSON.stringify(run, null, 2),
    "utf-8",
  );
  const existingHistory = existsSync(RUNTIME_EXPERIMENT_HISTORY_FILE)
    ? readFileSync(RUNTIME_EXPERIMENT_HISTORY_FILE, "utf-8")
    : "";
  await writeFile(
    RUNTIME_EXPERIMENT_HISTORY_FILE,
    `${existingHistory}${JSON.stringify(run)}\n`,
    "utf-8",
  );
  const nextDefinitions = upsertDefinition(
    readRuntimeExperimentDefinitions(),
    run.definition,
  );
  await writeFile(
    RUNTIME_EXPERIMENT_DEFINITIONS_FILE,
    JSON.stringify(nextDefinitions, null, 2),
    "utf-8",
  );
}

export function readRuntimeExperimentPayload(
  limit = 20,
): RuntimeExperimentPayload {
  const latest = readLatestRuntimeExperiment();
  const history = readRuntimeExperimentHistory(limit);
  const definitions = readRuntimeExperimentDefinitions();
  const decisions = readRuntimeExperimentDecisions(Math.max(20, limit * 3));
  const payload = {
    latest,
    history,
    definitions,
    decisions,
    latestDecision: latest
      ? (decisions.find((decision) => decision.runId === latest.id) ?? null)
      : null,
    points: history.length,
    summary: summarizeRuntimeExperiment(latest),
  };
  const parsed = runtimeExperimentPayloadSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return {
    latest: null,
    history: [],
    definitions: [],
    decisions: [],
    latestDecision: null,
    points: 0,
    summary: null,
  };
}

export function readLatestRuntimeExperimentSummary(): RuntimeExperimentLatestSummary | null {
  return summarizeRuntimeExperiment(readLatestRuntimeExperiment());
}

export function buildRuntimeExperimentWorkbenchMeta(): InternalWorkbenchMeta {
  return {
    support: "internal",
    surface: "runtime-experiments",
    storage: "local-file",
    validation: "zod",
    simulation: {
      mode: "derived",
      label: "Derived baseline-vs-variant scoring",
    },
    warnings: [
      "Variants never auto-promote into the live runtime.",
      "Keep records an operator-approved candidate for manual follow-up; it does not mutate or deploy runtime behavior.",
      "Comparison uses the existing runtime eval as baseline truth plus deterministic variant deltas.",
    ],
    timestamp: Date.now(),
  };
}
