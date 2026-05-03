import { existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";
import {
  runtimeExperimentDefinitionSchema,
  runtimeExperimentPayloadSchema,
  runtimeExperimentRunSchema,
  summarizeRuntimeExperiment,
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

export function readRuntimeExperimentHistory(limit = 20): RuntimeExperimentRun[] {
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

export function readRuntimeExperimentPayload(limit = 20): RuntimeExperimentPayload {
  const latest = readLatestRuntimeExperiment();
  const history = readRuntimeExperimentHistory(limit);
  const definitions = readRuntimeExperimentDefinitions();
  const payload = {
    latest,
    history,
    definitions,
    points: history.length,
    summary: summarizeRuntimeExperiment(latest),
  };
  const parsed = runtimeExperimentPayloadSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return {
    latest: null,
    history: [],
    definitions: [],
    points: 0,
    summary: null,
  };
}

export function readLatestRuntimeExperimentSummary():
  | RuntimeExperimentLatestSummary
  | null {
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
      "Comparison uses the existing runtime eval as baseline truth plus deterministic variant deltas.",
    ],
    timestamp: Date.now(),
  };
}
