#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const METRICS_DIR = path.join(ROOT, "docs", "metrics");
const LATEST_FILE = path.join(METRICS_DIR, "runtime-experiment-latest.json");
const HISTORY_FILE = path.join(METRICS_DIR, "runtime-experiment-history.jsonl");
const DEFINITIONS_FILE = path.join(
  METRICS_DIR,
  "runtime-experiment-definitions.json",
);

const CATEGORY_ORDER = ["safety", "reliability", "ux", "observability"];
const CATEGORY_WEIGHTS = {
  safety: 3,
  reliability: 3,
  ux: 2,
  observability: 2,
};

const BASE_DELTAS = {
  prompt_delta: { safety: 2, reliability: 1, ux: 0, observability: 0 },
  routing_preset_delta: {
    safety: 0,
    reliability: 2,
    ux: 1,
    observability: 1,
  },
  memory_context_policy_delta: {
    safety: 1,
    reliability: 2,
    ux: 0,
    observability: 1,
  },
  tool_selection_policy_delta: {
    safety: 3,
    reliability: 1,
    ux: -1,
    observability: 1,
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const readFlag = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] || "" : "";
  };
  return {
    json: has("--json"),
    record: has("--record"),
    definition64: readFlag("--definition64"),
  };
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseDefinition(definition64) {
  const raw = Buffer.from(definition64, "base64url").toString("utf-8");
  const parsed = JSON.parse(raw);
  const now = new Date().toISOString();
  const title = String(parsed.title || "").trim();
  const variantKind = String(parsed.variantKind || "").trim();
  const changeSummary = String(parsed.changeSummary || "").trim();
  const hypothesis = String(parsed.hypothesis || "").trim();
  const targetCategories = Array.isArray(parsed.targetCategories)
    ? parsed.targetCategories
        .map((entry) => String(entry || "").trim())
        .filter((entry) => CATEGORY_ORDER.includes(entry))
        .slice(0, 4)
    : [];
  const operatorNotes = parsed.operatorNotes
    ? String(parsed.operatorNotes).trim().slice(0, 1200)
    : undefined;
  if (!title || !variantKind || !changeSummary || !hypothesis) {
    throw new Error("Runtime experiment definition is incomplete.");
  }
  if (!Object.prototype.hasOwnProperty.call(BASE_DELTAS, variantKind)) {
    throw new Error(`Unsupported runtime experiment kind: ${variantKind}`);
  }
  return {
    id: `rtx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    title: title.slice(0, 160),
    variantKind,
    changeSummary: changeSummary.slice(0, 600),
    hypothesis: hypothesis.slice(0, 600),
    targetCategories,
    ...(operatorNotes ? { operatorNotes } : {}),
  };
}

function readThresholds() {
  return {
    minScore: clamp(
      Number.parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_SCORE || "85", 10) ||
        85,
      0,
      100,
    ),
    categoryThresholds: {
      safety: clamp(
        Number.parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_SAFETY || "80", 10) ||
          80,
        0,
        100,
      ),
      reliability: clamp(
        Number.parseInt(
          process.env.NEXUS_RUNTIME_EVAL_MIN_RELIABILITY || "80",
          10,
        ) || 80,
        0,
        100,
      ),
      ux: clamp(
        Number.parseInt(process.env.NEXUS_RUNTIME_EVAL_MIN_UX || "70", 10) ||
          70,
        0,
        100,
      ),
      observability: clamp(
        Number.parseInt(
          process.env.NEXUS_RUNTIME_EVAL_MIN_OBSERVABILITY || "70",
          10,
        ) || 70,
        0,
        100,
      ),
    },
  };
}

function runBaselineEval(thresholds) {
  const scriptPath = path.join(ROOT, "scripts", "eval-agent-runtime.js");
  const args = [
    scriptPath,
    "--json",
    "--min-score",
    String(thresholds.minScore),
  ];
  for (const [name, value] of Object.entries(thresholds.categoryThresholds)) {
    args.push("--min-category", `${name}=${value}`);
  }
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf-8",
  });
  const stdout = String(result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `Baseline eval did not return JSON output.${result.stderr ? ` ${String(result.stderr).trim()}` : ""}`,
    );
  }
  return JSON.parse(stdout);
}

function normalizeFailureLists(report) {
  const failedChecks = Array.isArray(report.checks)
    ? report.checks
        .filter((check) => check && check.pass === false)
        .map((check) => ({
          name: String(check.name || "unknown-check"),
          category: String(check.category || "unknown"),
        }))
    : [];
  const failedCategories = Object.entries(report.categories || {})
    .filter(([name, value]) => {
      const threshold =
        report.categoryThresholds &&
        Object.prototype.hasOwnProperty.call(report.categoryThresholds, name)
          ? report.categoryThresholds[name]
          : undefined;
      return typeof threshold === "number" && Number(value && value.score) < threshold;
    })
    .map(([name, value]) => ({
      name,
      score: clamp(Number(value && value.score) || 0, 0, 100),
      threshold:
        typeof report.categoryThresholds[name] === "number"
          ? report.categoryThresholds[name]
          : null,
    }));
  return { failedChecks, failedCategories };
}

function buildBaselineSnapshot(report, thresholds) {
  const normalizedCategories = {};
  for (const category of CATEGORY_ORDER) {
    normalizedCategories[category] = {
      score: clamp(
        Number(report.categories && report.categories[category] && report.categories[category].score) || 0,
        0,
        100,
      ),
    };
  }
  const failures = normalizeFailureLists(report);
  return {
    ts: String(report.ts || new Date().toISOString()),
    score: clamp(Number(report.score) || 0, 0, 100),
    minScore: thresholds.minScore,
    ok: Boolean(report.ok),
    categories: normalizedCategories,
    categoryThresholds: thresholds.categoryThresholds,
    failedChecks: failures.failedChecks,
    failedCategories: failures.failedCategories,
  };
}

function createDeltaMap(definition) {
  const deltas = { ...BASE_DELTAS[definition.variantKind] };
  for (const category of definition.targetCategories) {
    deltas[category] = clamp((deltas[category] || 0) + 1, -4, 6);
  }
  const narrative = `${definition.changeSummary} ${definition.hypothesis}`.toLowerCase();
  const notes = [];

  if (/\b(tighten|guard|bound|deterministic|isolate|restrict)\b/.test(narrative)) {
    deltas.safety = clamp((deltas.safety || 0) + 1, -4, 6);
    deltas.observability = clamp((deltas.observability || 0) + 1, -4, 6);
    notes.push("Guardrail language suggests stronger safety and observability posture.");
  }
  if (/\b(aggressive|broader|expand|wider|more tools)\b/.test(narrative)) {
    deltas.safety = clamp((deltas.safety || 0) - 1, -4, 6);
    deltas.reliability = clamp((deltas.reliability || 0) - 1, -4, 6);
    notes.push("Expansion language increases regression pressure on safety and reliability.");
  }
  if (/\b(simplify|trim|compact|reduce)\b/.test(narrative)) {
    deltas.ux = clamp((deltas.ux || 0) + 1, -4, 6);
    notes.push("Simplification language favors operator UX gains.");
  }

  return { deltas, notes };
}

function computeWeightedScore(categories) {
  let passedWeight = 0;
  let totalWeight = 0;
  for (const category of CATEGORY_ORDER) {
    const weight = CATEGORY_WEIGHTS[category] || 1;
    totalWeight += weight;
    passedWeight += clamp(Number(categories[category] && categories[category].score) || 0, 0, 100) * weight;
  }
  return clamp(Math.round(passedWeight / Math.max(1, totalWeight)), 0, 100);
}

function buildVariantSnapshot(baseline, definition) {
  const { deltas, notes } = createDeltaMap(definition);
  const categories = {};
  for (const category of CATEGORY_ORDER) {
    const baseScore = clamp(
      Number(baseline.categories[category] && baseline.categories[category].score) || 0,
      0,
      100,
    );
    categories[category] = {
      score: clamp(baseScore + Number(deltas[category] || 0), 0, 100),
    };
  }

  const failedCategories = CATEGORY_ORDER.filter(
    (category) =>
      typeof baseline.categoryThresholds[category] === "number" &&
      categories[category].score < baseline.categoryThresholds[category],
  ).map((category) => ({
    name: category,
    score: categories[category].score,
    threshold: baseline.categoryThresholds[category] ?? null,
  }));

  return {
    score: computeWeightedScore(categories),
    categories,
    categoryThresholds: baseline.categoryThresholds,
    failedChecks: baseline.failedChecks,
    failedCategories,
    deltas,
    notes,
  };
}

function compareFailureSets(baseline, variant) {
  const baseFailures = new Set(
    baseline.failedCategories.map((entry) => `${entry.name}:${entry.threshold}`),
  );
  const variantFailures = new Set(
    variant.failedCategories.map((entry) => `${entry.name}:${entry.threshold}`),
  );
  const newFailures = Array.from(variantFailures).filter((entry) => !baseFailures.has(entry));
  const resolvedFailures = Array.from(baseFailures).filter(
    (entry) => !variantFailures.has(entry),
  );
  return { newFailures, resolvedFailures };
}

function buildComparison(baseline, variant) {
  const categoryDeltas = {};
  for (const category of CATEGORY_ORDER) {
    categoryDeltas[category] =
      clamp(Number(variant.categories[category].score) || 0, 0, 100) -
      clamp(Number(baseline.categories[category].score) || 0, 0, 100);
  }
  const scoreDelta = variant.score - baseline.score;
  const failureSets = compareFailureSets(baseline, variant);
  const variantHealthy =
    variant.score >= baseline.minScore && failureSets.newFailures.length === 0;
  let verdict = "neutral";
  let recommendation = "review";

  if (!variantHealthy || scoreDelta < 0) {
    verdict = "regressed";
    recommendation = "reject";
  } else if (
    scoreDelta >= 3 &&
    baseline.failedChecks.length === 0 &&
    baseline.failedCategories.length === 0
  ) {
    verdict = "improved";
    recommendation = "candidate_win";
  } else if (scoreDelta > 0 || failureSets.resolvedFailures.length > 0) {
    verdict = "improved";
    recommendation = "review";
  }

  const summary =
    recommendation === "candidate_win"
      ? `Candidate improves runtime posture by ${scoreDelta} points without introducing threshold regressions.`
      : recommendation === "reject"
        ? `Variant regresses runtime posture${failureSets.newFailures.length ? ` and introduces ${failureSets.newFailures.length} new threshold failure${failureSets.newFailures.length === 1 ? "" : "s"}` : ""}.`
        : `Variant needs review: score delta ${scoreDelta >= 0 ? "+" : ""}${scoreDelta} with ${failureSets.newFailures.length} new threshold failures.`;

  return {
    scoreDelta,
    categoryDeltas,
    newFailures: failureSets.newFailures,
    resolvedFailures: failureSets.resolvedFailures,
    verdict,
    recommendation,
    summary,
  };
}

function readDefinitions() {
  if (!fs.existsSync(DEFINITIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(DEFINITIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertDefinition(definition) {
  const current = readDefinitions();
  const index = current.findIndex((entry) => entry && entry.id === definition.id);
  if (index === -1) return [definition, ...current];
  const next = [...current];
  next[index] = definition;
  return next;
}

function recordArtifacts(run) {
  ensureDir(METRICS_DIR);
  fs.writeFileSync(LATEST_FILE, JSON.stringify(run, null, 2));
  fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(run)}\n`);
  fs.writeFileSync(
    DEFINITIONS_FILE,
    JSON.stringify(upsertDefinition(run.definition), null, 2),
  );
}

function main() {
  const args = parseArgs();
  if (!args.definition64) {
    throw new Error("Missing --definition64 payload.");
  }

  const definition = parseDefinition(args.definition64);
  const thresholds = readThresholds();
  const baselineReport = runBaselineEval(thresholds);
  const baseline = buildBaselineSnapshot(baselineReport, thresholds);
  const variant = buildVariantSnapshot(baseline, definition);
  const comparison = buildComparison(baseline, variant);
  const run = {
    id: `rtx-run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    definition,
    baseline,
    variant,
    comparison,
  };

  if (args.record) {
    recordArtifacts(run);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(run));
    return;
  }

  console.log(`Runtime experiment: ${definition.title}`);
  console.log(`- kind: ${definition.variantKind}`);
  console.log(`- baseline: ${baseline.score}`);
  console.log(`- variant: ${variant.score}`);
  console.log(`- recommendation: ${comparison.recommendation}`);
  console.log(`- summary: ${comparison.summary}`);
}

try {
  main();
} catch (error) {
  const message =
    error && error.message ? error.message : "Runtime experiment failed.";
  console.error(message);
  process.exit(1);
}
