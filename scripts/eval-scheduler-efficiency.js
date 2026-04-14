#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DOCS_METRICS_DIR = path.join(ROOT, "docs", "metrics");
const LOCAL_METRICS_DIR = path.join(ROOT, ".nexus", "metrics");
const SOURCE_FILE = path.join(
  LOCAL_METRICS_DIR,
  "scheduler-efficiency-source.json",
);
const LATEST_FILE = path.join(
  DOCS_METRICS_DIR,
  "scheduler-efficiency-latest.json",
);
const HISTORY_FILE = path.join(
  DOCS_METRICS_DIR,
  "scheduler-efficiency-history.jsonl",
);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const readFlag = (flag, fallback) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return fallback;
    const value = Number(args[idx + 1]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    record: has("--record"),
    minScore: readFlag("--min-score", 0),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildProvider(source, reasons) {
  return {
    id: "native_scheduler",
    label: "Native scheduler spine",
    ready: true,
    supportsSingleRun: true,
    supportsInternalBatch: true,
    supportsProviderNativeBatch: true,
    degradedReason:
      reasons[0] ||
      (!source
        ? "Efficiency bench standing by until the scheduler syncs local posture."
        : null),
  };
}

function buildStandingByRun(source) {
  const reasons = source
    ? [source.strongestRecommendation || "Efficiency bench standing by."]
    : ["Efficiency bench standing by until the scheduler syncs local posture."];
  return {
    ts: new Date().toISOString(),
    sourceSyncedAt: source?.syncedAt ?? null,
    provider: buildProvider(source, reasons),
    summary: {
      score: 68,
      quality: "guarded",
      label: "Bench standing by",
      activeJobs: source?.snapshot?.activeJobs || 0,
      measuredRuns: source?.snapshot?.completedEfficiencySnapshots || 0,
      cacheObservableRuns: source?.snapshot?.cacheObservableRuns || 0,
      observedCacheRuns: source?.snapshot?.observedCacheRuns || 0,
      cacheHitRuns: source?.snapshot?.cacheHitRuns || 0,
      cacheObservedCoverage: source?.snapshot?.cacheObservedCoverage || 0,
      cacheHitCoverage: source?.snapshot?.cacheHitCoverage || 0,
      batchedRuns: source?.snapshot?.batchedRuns || 0,
      internalBatchRuns: source?.snapshot?.internalBatchRuns || 0,
      providerNativeBatchRuns: source?.snapshot?.providerNativeBatchRuns || 0,
      queuedJobs: source?.snapshot?.queuedJobs || 0,
      queuedFailureJobs: source?.snapshot?.queuedFailureJobs || 0,
      lowCacheabilityRuns: source?.snapshot?.lowCacheabilityRuns || 0,
      templateGapJobs: source?.snapshot?.templateGapJobs || 0,
      reasons,
      strongestTakeaway: reasons[0],
      strongestOptimization:
        "Let one governed recurring mission record fresh cache and batch evidence before widening cadence.",
    },
    lanes: {
      single: { count: 0, label: "No measured single-run evidence yet." },
      internalBatch: { count: 0, label: "No internal batch evidence yet." },
      providerNativeBatch: {
        count: 0,
        label: "No provider-native batch evidence yet.",
      },
    },
    queue: {
      pendingNativeBatchCount: source?.snapshot?.queuedJobs || 0,
      pendingNativeBatchFailures: source?.snapshot?.queuedFailureJobs || 0,
      boundedRetryHealthy: (source?.snapshot?.queuedFailureJobs || 0) === 0,
      label:
        source?.snapshot?.queuedJobs > 0
          ? `${source.snapshot.queuedJobs} native batch lane${
              source.snapshot.queuedJobs === 1 ? "" : "s"
            } pending`
          : "No native batch queue is pending.",
    },
    ledger: source?.ledger || [],
    repairCandidates: source?.repairCandidates || [],
  };
}

function buildRepairCandidates(source) {
  return Array.isArray(source?.repairCandidates)
    ? source.repairCandidates.slice(0, 4)
    : [];
}

function strongestTakeaway(snapshot) {
  if (snapshot.queuedFailureJobs > 0) {
    return `${snapshot.queuedFailureJobs} queued native batch lane${
      snapshot.queuedFailureJobs === 1 ? "" : "s"
    } already show poll-failure pressure.`;
  }
  if (snapshot.cacheHitRuns > 0) {
    return `${snapshot.cacheHitRuns}/${Math.max(
      1,
      snapshot.observedCacheRuns,
    )} observed recurring runs already hit cache.`;
  }
  if (snapshot.providerNativeBatchRuns > 0) {
    return `${snapshot.providerNativeBatchRuns} recurring run${
      snapshot.providerNativeBatchRuns === 1 ? "" : "s"
    } already proved the provider-native batch lane.`;
  }
  if (snapshot.internalBatchRuns > 0) {
    return `${snapshot.internalBatchRuns} recurring run${
      snapshot.internalBatchRuns === 1 ? "" : "s"
    } already share the internal batch lane.`;
  }
  if (snapshot.completedEfficiencySnapshots > 0) {
    return `${snapshot.completedEfficiencySnapshots} recurring run${
      snapshot.completedEfficiencySnapshots === 1 ? "" : "s"
    } are measured, but the strongest optimization proof is still thin.`;
  }
  return "Scheduler efficiency is standing by for its first measured recurring mission.";
}

function strongestOptimization(snapshot, repairCandidates) {
  if (snapshot.templateGapJobs > 0) {
    return "Promote the strongest scheduler-friendly mission into a linked template before adding more cadence.";
  }
  if (
    snapshot.lowCacheabilityRuns > 0 ||
    repairCandidates.some((item) =>
      item.reason.toLowerCase().includes("cacheability"),
    )
  ) {
    return "Repair prompt shape on low-cacheability recurring jobs so the stable prefix does more of the work.";
  }
  if (snapshot.cacheObservableRuns > 0 && snapshot.observedCacheRuns === 0) {
    return "Capture cache telemetry on non-native lanes before drawing stronger efficiency conclusions.";
  }
  if (snapshot.activeJobs >= 2 && snapshot.batchedRuns === 0) {
    return "Group review-gated recurring jobs into shared batch windows so the queue proves its batch lane.";
  }
  if (snapshot.queuedJobs > 0) {
    return "Let the queued native batch settle before widening cadence or cloning that mission shape.";
  }
  return "Keep current cadence stable and continue measuring cache and batch behavior rather than adding new missions.";
}

function queueLabel(snapshot) {
  if (snapshot.queuedFailureJobs > 0) {
    return `${snapshot.queuedFailureJobs} queued lane${
      snapshot.queuedFailureJobs === 1 ? "" : "s"
    } are degraded by poll failures.`;
  }
  if (snapshot.queuedJobs > 0) {
    return `${snapshot.queuedJobs} provider-native batch lane${
      snapshot.queuedJobs === 1 ? "" : "s"
    } are pending without resubmission.`;
  }
  if (snapshot.providerNativeBatchRuns > 0) {
    return "Provider-native batch lane has recent proof and no queued trouble.";
  }
  return "No native batch queue is pending.";
}

function laneLabel(count, noun) {
  return count > 0 ? `${count} ${noun}` : `No ${noun} yet.`;
}

function buildRun(source) {
  if (!source || !source.snapshot) {
    return buildStandingByRun(source);
  }

  const snapshot = source.snapshot;
  const repairCandidates = buildRepairCandidates(source);
  const reasons = [];
  let penalty = 0;

  if (snapshot.activeJobs === 0) {
    reasons.push("No governed recurring missions are active yet.");
    penalty += 12;
  }
  if (snapshot.activeJobs > 0 && snapshot.completedEfficiencySnapshots === 0) {
    reasons.push("No cache signal yet.");
    penalty += 24;
  }
  if (snapshot.cacheObservableRuns > 0 && snapshot.observedCacheRuns === 0) {
    reasons.push("No cache observability yet.");
    penalty += 16;
  }
  if (snapshot.activeJobs >= 2 && snapshot.batchedRuns === 0) {
    reasons.push("No batched runs yet.");
    penalty += 10;
  }
  if (snapshot.queuedJobs > 0) {
    reasons.push("Queued native batch pending.");
    penalty += Math.min(10, snapshot.queuedJobs * 3);
  }
  if (snapshot.queuedFailureJobs > 0) {
    reasons.push("Poll failures observed on the native batch lane.");
    penalty += Math.min(24, snapshot.queuedFailureJobs * 10);
  }
  if (snapshot.lowCacheabilityRuns > 0) {
    reasons.push("Low-cacheability recurring runs need prompt-shape repair.");
    penalty += Math.min(20, snapshot.lowCacheabilityRuns * 6);
  }
  if (snapshot.templateGapJobs > 0) {
    reasons.push(
      "Mission-template coverage is incomplete on scheduler-friendly jobs.",
    );
    penalty += Math.min(12, snapshot.templateGapJobs * 4);
  }
  if (snapshot.unmeasuredActiveJobs > 0) {
    reasons.push("Some active jobs are still unmeasured.");
    penalty += Math.min(12, snapshot.unmeasuredActiveJobs * 4);
  }

  const score = clamp(100 - penalty, 0, 100);
  const quality =
    snapshot.activeJobs === 0
      ? "guarded"
      : score >= 80
        ? "ready"
        : score >= 55
          ? "guarded"
          : "degraded";
  const label =
    quality === "ready"
      ? "Efficiency ready"
      : quality === "guarded"
        ? "Efficiency guarded"
        : "Efficiency degraded";

  return {
    ts: new Date().toISOString(),
    sourceSyncedAt: source.syncedAt || null,
    provider: buildProvider(source, reasons),
    summary: {
      score,
      quality,
      label,
      activeJobs: snapshot.activeJobs,
      measuredRuns: snapshot.completedEfficiencySnapshots,
      cacheObservableRuns: snapshot.cacheObservableRuns,
      observedCacheRuns: snapshot.observedCacheRuns,
      cacheHitRuns: snapshot.cacheHitRuns,
      cacheObservedCoverage: snapshot.cacheObservedCoverage,
      cacheHitCoverage: snapshot.cacheHitCoverage,
      batchedRuns: snapshot.batchedRuns,
      internalBatchRuns: snapshot.internalBatchRuns,
      providerNativeBatchRuns: snapshot.providerNativeBatchRuns,
      queuedJobs: snapshot.queuedJobs,
      queuedFailureJobs: snapshot.queuedFailureJobs,
      lowCacheabilityRuns: snapshot.lowCacheabilityRuns,
      templateGapJobs: snapshot.templateGapJobs,
      reasons,
      strongestTakeaway: strongestTakeaway(snapshot),
      strongestOptimization: strongestOptimization(
        snapshot,
        repairCandidates,
      ),
    },
    lanes: {
      single: {
        count: snapshot.singleRunMeasuredRuns,
        label: laneLabel(
          snapshot.singleRunMeasuredRuns,
          `measured single-run lane${
            snapshot.singleRunMeasuredRuns === 1 ? "" : "s"
          }`,
        ),
      },
      internalBatch: {
        count: snapshot.internalBatchRuns,
        label: laneLabel(
          snapshot.internalBatchRuns,
          `internal batch lane${
            snapshot.internalBatchRuns === 1 ? "" : "s"
          }`,
        ),
      },
      providerNativeBatch: {
        count: snapshot.providerNativeBatchRuns,
        label: laneLabel(
          snapshot.providerNativeBatchRuns,
          `provider-native batch lane${
            snapshot.providerNativeBatchRuns === 1 ? "" : "s"
          }`,
        ),
      },
    },
    queue: {
      pendingNativeBatchCount: snapshot.queuedJobs,
      pendingNativeBatchFailures: snapshot.queuedFailureJobs,
      boundedRetryHealthy: snapshot.queuedFailureJobs === 0,
      label: queueLabel(snapshot),
    },
    ledger: Array.isArray(source.ledger) ? source.ledger.slice(0, 6) : [],
    repairCandidates,
  };
}

function main() {
  const opts = parseArgs();
  const source = readJson(SOURCE_FILE);
  const report = buildRun(source);

  console.log(
    `Scheduler efficiency: ${report.summary.label} ${report.summary.score}/100 · ${report.summary.measuredRuns} measured · ${report.summary.activeJobs} active`,
  );
  console.log(`- ${report.summary.strongestTakeaway}`);
  console.log(`- ${report.summary.strongestOptimization}`);
  if (report.summary.reasons.length > 0) {
    console.log("Reasons:");
    for (const reason of report.summary.reasons) {
      console.log(`  - ${reason}`);
    }
  }

  if (opts.record) {
    ensureDir(DOCS_METRICS_DIR);
    try {
      fs.writeFileSync(LATEST_FILE, JSON.stringify(report, null, 2));
      fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(report)}\n`);
      console.log(
        `Wrote scheduler efficiency report: ${path.relative(ROOT, LATEST_FILE)}`,
      );
      console.log(
        `Appended scheduler efficiency history: ${path.relative(
          ROOT,
          HISTORY_FILE,
        )}`,
      );
    } catch (error) {
      console.log(
        `Could not persist scheduler efficiency report: ${String(
          error && error.message ? error.message : error,
        )}`,
      );
    }
  }

  if (report.summary.score < opts.minScore) {
    process.exit(1);
  }
}

main();
