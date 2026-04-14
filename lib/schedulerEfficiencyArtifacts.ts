import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  SchedulerEfficiencyEvalPayload,
  SchedulerEfficiencyEvalRunnerState,
  SchedulerEfficiencyRun,
  SchedulerEfficiencySourcePayload,
  SchedulerEfficiencySourceSnapshot,
} from "@/lib/schedulerEfficiency";
import { buildDefaultSchedulerEfficiencyProviderStatus } from "@/lib/schedulerEfficiency";

const ROOT = process.cwd();
const METRICS_DIR = join(ROOT, "docs", "metrics");
const LOCAL_METRICS_DIR = join(ROOT, ".nexus", "metrics");

export const SCHEDULER_EFFICIENCY_SOURCE_FILE = join(
  LOCAL_METRICS_DIR,
  "scheduler-efficiency-source.json",
);
export const SCHEDULER_EFFICIENCY_LATEST_FILE = join(
  METRICS_DIR,
  "scheduler-efficiency-latest.json",
);
export const SCHEDULER_EFFICIENCY_HISTORY_FILE = join(
  METRICS_DIR,
  "scheduler-efficiency-history.jsonl",
);
export const SCHEDULER_EFFICIENCY_RUNNER_STATE_FILE = join(
  METRICS_DIR,
  "scheduler-efficiency-runner.json",
);

export function ensureSchedulerEfficiencyMetricsDirs() {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true });
  if (!existsSync(LOCAL_METRICS_DIR)) mkdirSync(LOCAL_METRICS_DIR, { recursive: true });
}

export function readSchedulerEfficiencySource():
  | SchedulerEfficiencySourceSnapshot
  | null {
  if (!existsSync(SCHEDULER_EFFICIENCY_SOURCE_FILE)) return null;
  try {
    return JSON.parse(
      readFileSync(SCHEDULER_EFFICIENCY_SOURCE_FILE, "utf-8"),
    ) as SchedulerEfficiencySourceSnapshot;
  } catch {
    return null;
  }
}

export function writeSchedulerEfficiencySource(
  payload: SchedulerEfficiencySourcePayload,
) {
  ensureSchedulerEfficiencyMetricsDirs();
  const snapshot: SchedulerEfficiencySourceSnapshot = {
    ...payload,
    syncedAt: new Date().toISOString(),
  };
  writeFileSync(
    SCHEDULER_EFFICIENCY_SOURCE_FILE,
    JSON.stringify(snapshot, null, 2),
  );
  return snapshot;
}

export function readLatestSchedulerEfficiencyEval(): SchedulerEfficiencyRun | null {
  if (!existsSync(SCHEDULER_EFFICIENCY_LATEST_FILE)) return null;
  try {
    return JSON.parse(
      readFileSync(SCHEDULER_EFFICIENCY_LATEST_FILE, "utf-8"),
    ) as SchedulerEfficiencyRun;
  } catch {
    return null;
  }
}

export function readSchedulerEfficiencyEvalHistory(limit: number) {
  if (!existsSync(SCHEDULER_EFFICIENCY_HISTORY_FILE)) return [];
  try {
    return readFileSync(SCHEDULER_EFFICIENCY_HISTORY_FILE, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(200, limit)))
      .map((line) => {
        try {
          return JSON.parse(line) as SchedulerEfficiencyRun;
        } catch {
          return null;
        }
      })
      .filter((value): value is SchedulerEfficiencyRun => Boolean(value));
  } catch {
    return [];
  }
}

export function readSchedulerEfficiencyRunnerState(): SchedulerEfficiencyEvalRunnerState {
  if (!existsSync(SCHEDULER_EFFICIENCY_RUNNER_STATE_FILE)) return {};
  try {
    return JSON.parse(
      readFileSync(SCHEDULER_EFFICIENCY_RUNNER_STATE_FILE, "utf-8"),
    ) as SchedulerEfficiencyEvalRunnerState;
  } catch {
    return {};
  }
}

export function buildSchedulerEfficiencyEvalPayload(
  limit = 24,
  freshnessWindowMin = 240,
): SchedulerEfficiencyEvalPayload {
  ensureSchedulerEfficiencyMetricsDirs();
  const latest = readLatestSchedulerEfficiencyEval();
  const history = readSchedulerEfficiencyEvalHistory(limit);
  const runner = readSchedulerEfficiencyRunnerState();
  const source = readSchedulerEfficiencySource();
  const ageMinutes = latest?.ts
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(latest.ts).getTime()) / 60000),
      )
    : null;
  const sourceAgeMinutes = source?.syncedAt
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(source.syncedAt).getTime()) / 60000),
      )
    : null;

  return {
    status: "ok",
    provider:
      latest?.provider ??
      buildDefaultSchedulerEfficiencyProviderStatus(
        source
          ? source.strongestRecommendation
          : "Efficiency bench standing by until the scheduler syncs a local posture snapshot.",
      ),
    latest,
    history,
    points: history.length,
    freshness: {
      freshnessWindowMin,
      ageMinutes,
      stale: ageMinutes === null ? true : ageMinutes > freshnessWindowMin,
    },
    source: {
      syncedAt: source?.syncedAt ?? null,
      activeJobs: source?.snapshot.activeJobs ?? 0,
      totalJobs: source?.snapshot.totalJobs ?? 0,
      ageMinutes: sourceAgeMinutes,
      stale: sourceAgeMinutes === null ? true : sourceAgeMinutes > 90,
    },
    runner,
  };
}
