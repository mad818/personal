#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x analytics-memory: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x analytics-memory: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const ids = [
  "plausible-analytics",
  "umami-software-umami",
  "rohitg00-agentmemory",
  "tinyhumansai-openhuman",
];
const matrices = ids.map((id) =>
  JSON.parse(read("docs", "ideas", "source-parity", `${id}.json`)),
);
for (const matrix of matrices) {
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} source review is stale`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrix.id} still has pending capabilities`);
  }
}

const analytics = read("lib", "localUsageAnalytics.ts");
for (const needle of [
  'LOCAL_USAGE_STORAGE_KEY = "nexus.local-usage-analytics.v1"',
  "LOCAL_USAGE_RETENTION_DAYS = 30",
  "LOCAL_USAGE_MAX_ROUTES = 32",
  "recordLocalUsageEvent",
  "summarizeLocalUsage",
  "clearLocalUsage",
]) {
  requireText(analytics, needle, "local analytics");
}
for (const forbidden of ["fetch(", "apiFetch(", "callAI(", "document.cookie"]) {
  if (analytics.includes(forbidden)) {
    fail(`local analytics must not contain ${forbidden}`);
  }
}

const tracker = read("components", "ui", "LocalUsageTracker.tsx");
const rootChrome = read("components", "ui", "RootLayoutChrome.tsx");
const panel = read("components", "command", "LocalUsageMetricsPanel.tsx");
const command = read("app", "command", "page.tsx");
requireText(tracker, '"route_view"', "route tracker");
requireText(rootChrome, "<LocalUsageTracker />", "authenticated shell wiring");
requireText(panel, 'data-testid="local-usage-metrics"', "COMMAND metrics panel");
requireText(command, "<LazyLocalUsageMetricsPanel />", "COMMAND reachability");

const benchmark = read("lib", "episodicMemoryBenchmark.ts");
const benchmarkRuntime = read(
  "scripts",
  "check-episodic-memory-benchmark.mjs",
);
for (const needle of ['"recency"', '"keyword"', '"hybrid"']) {
  requireText(benchmark, needle, "memory benchmark");
}
for (const agent of ["ORBIT", "FLUX", "CIPHER", "NOVA", "JANSKY"]) {
  requireText(benchmarkRuntime, agent, "benchmark workload set");
}

const decision = (matrixId, capabilityId) =>
  matrices
    .find((matrix) => matrix.id === matrixId)
    ?.capabilities.find((capability) => capability.id === capabilityId)
    ?.disposition;
if (decision("plausible-analytics", "event-tracking-api") !== "adapted") {
  fail("Plausible event API pattern must be adapted");
}
if (
  decision("plausible-analytics", "aggregated-metrics-dashboard") !==
  "implemented"
) {
  fail("aggregate dashboard must be implemented");
}
if (
  decision("rohitg00-agentmemory", "memory-benchmark-harness") !==
  "implemented"
) {
  fail("memory benchmark must be implemented");
}
if (
  decision("rohitg00-agentmemory", "semantic-memory-retrieval") !== "excluded"
) {
  fail("semantic vectors must remain explicitly excluded");
}

const packageJson = JSON.parse(read("package.json"));
const expected = {
  "analytics:local:runtime:check":
    "node --no-warnings --experimental-strip-types scripts/check-local-usage-analytics-runtime.mjs",
  "memory:benchmark:check":
    "node --no-warnings --experimental-strip-types scripts/check-episodic-memory-benchmark.mjs",
  "analytics-memory:check":
    "node scripts/validate-local-analytics-memory-source-closure.mjs && npm run analytics:local:runtime:check && npm run memory:benchmark:check",
};
for (const [name, commandValue] of Object.entries(expected)) {
  if (packageJson.scripts?.[name] !== commandValue) {
    fail(`${name} command is missing`);
  }
}
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run analytics-memory:check",
  "canonical verify wiring",
);

console.log(
  `ok analytics-memory (matrices=${matrices.length}; retentionDays=30; routeCap=32; benchmarkStrategies=3)`,
);
