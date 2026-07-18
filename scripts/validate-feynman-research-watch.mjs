#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x feynman-research-watch: ${message}`);
  process.exit(1);
}

function readRequired(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

function rejectText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not contain ${needle}`);
}

const server = readRequired("lib/feynmanResearchWatch.ts");
const client = readRequired("lib/feynmanResearchWatchClient.ts");
const listRoute = readRequired("app/api/feynman/watch/route.ts");
const runRoute = readRequired("app/api/feynman/watch/run/route.ts");
const scheduler = readRequired("components/ui/CronSchedulerRunner.tsx");
const panel = readRequired("components/vault/FeynmanResearchWatchPanel.tsx");
const paperPanel = readRequired(
  "components/vault/FeynmanPaperLibraryPanel.tsx",
);
const routePolicy = readRequired("lib/security/routePolicy.ts");
const workflowCommands = readRequired(
  "components/home/office/workflowCommands.ts",
);
const spec = readRequired("specs/features/feynman-recurring-research-watch.md");
const runtime = readRequired(
  "scripts/check-feynman-research-watch-runtime.mjs",
);
const packageJson = JSON.parse(readRequired("package.json"));
const parity = JSON.parse(
  readRequired("docs/ideas/source-parity/feynman.json"),
);

for (const needle of [
  'path.join(process.cwd(), ".nexus", "feynman-research-watches.json")',
  'new URL("https://export.arxiv.org/api/query")',
  'url.searchParams.set("search_query"',
  '"max_results"',
  'url.searchParams.set("sortBy", "submittedDate")',
  'url.searchParams.set("sortOrder", "descending")',
  "maximumResults: 12",
  "maximumResponseBytes: 512 * 1024",
  "cacheMs: 24 * 60 * 60 * 1_000",
  "3_000 - (Date.now() - lastArxivRequestAt)",
  "arxivRequestQueue",
  "maximumWatches: 32",
  "maximumReceiptsPerWatch: 40",
  "/<!DOCTYPE|<!ENTITY/i",
  "compareFeynmanResearchWatchEntries",
  'kind: "new"',
  'kind: "updated"',
  'redirect: "error"',
  "AbortSignal.timeout",
  "recordFailure",
]) {
  requireText(server, needle, "bounded watch runtime");
}

for (const source of [server, client, listRoute, runRoute, panel]) {
  for (const forbidden of [
    "callAI(",
    "callNonInteractiveAI(",
    "streamAI",
    "generateWithFallback",
    "api.openai.com",
    "api.anthropic.com",
    "localhost:11434",
  ]) {
    rejectText(source, forbidden, "no-model watch path");
  }
}

for (const needle of [
  'export const dynamic = "force-dynamic"',
  '"Cache-Control": "private, no-store"',
]) {
  requireText(listRoute, needle, "local list route");
  requireText(runRoute, needle, "connector run route");
}
requireText(listRoute, "listFeynmanResearchWatches", "local list route");
requireText(runRoute, "runFeynmanResearchWatch", "connector run route");
requireText(
  routePolicy,
  'prefix: "/api/feynman/watch/run"',
  "connector route policy",
);
requireText(routePolicy, 'prefix: "/api/feynman/watch"', "local route policy");
const runPolicyIndex = routePolicy.indexOf('prefix: "/api/feynman/watch/run"');
const localPolicyIndex = routePolicy.indexOf('prefix: "/api/feynman/watch"');
if (
  runPolicyIndex < 0 ||
  localPolicyIndex < 0 ||
  runPolicyIndex > localPolicyIndex
) {
  fail("longest connector watch route must precede the local watch prefix");
}

for (const needle of [
  "FEYNMAN_RESEARCH_WATCH_CLIENT_TEMPLATE_ID",
  "runFeynmanResearchWatchClient",
  "extractFeynmanResearchWatchTopic(job.prompt)",
  "summarizeFeynmanResearchWatchRun",
]) {
  requireText(scheduler, needle, "scheduler no-model branch");
}
const watchBranch = scheduler.indexOf(
  "job.templateId === FEYNMAN_RESEARCH_WATCH_CLIENT_TEMPLATE_ID",
);
const genericAiAfterWatch = scheduler.indexOf(
  "callNonInteractiveAI({",
  watchBranch,
);
if (watchBranch < 0 || genericAiAfterWatch < watchBranch) {
  fail("watch scheduler branch must precede the generic AI fallback");
}

for (const needle of [
  "Material changes without a chat call",
  "They run only while Nexus is open",
  "No approved watch has run yet",
  'href="/hq?focus=hq-scheduler-composer"',
  "The prior baseline was preserved",
  'role="alert"',
]) {
  requireText(panel, needle, "VAULT watch review");
}
requireText(
  paperPanel,
  "<FeynmanResearchWatchPanel />",
  "VAULT Papers integration",
);
requireText(
  workflowCommands,
  "approved runs are daily-cached and make no model call",
  "scheduler catalog truth",
);

for (const needle of [
  "never calls ChatGPT",
  "three-second delay",
  "not fetched more than once in 24 hours",
  "checks run only while Nexus",
  "No RPG path",
]) {
  requireText(spec, needle, "feature contract");
}
requireText(runtime, "failed-fetch preservation", "runtime proof");

const capability = parity.capabilities?.find(
  (item) => item.id === "recurring-research-watch",
);
if (capability?.disposition !== "adapted") {
  fail("recurring research watch source parity must be adapted");
}
for (const proof of [
  "lib/feynmanResearchWatch.ts",
  "app/api/feynman/watch/run/route.ts",
  "components/ui/CronSchedulerRunner.tsx",
  "components/vault/FeynmanResearchWatchPanel.tsx",
  "scripts/check-feynman-research-watch-runtime.mjs",
]) {
  if (!capability.proof?.includes(proof)) {
    fail(`source parity proof is missing ${proof}`);
  }
}
if (parity.status !== "in_progress") {
  fail("broader Feynman source parity must remain in progress");
}

if (
  packageJson.scripts?.["feynman:watch:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-research-watch-runtime.mjs"
) {
  fail("package.json is missing feynman:watch:runtime:check");
}
if (
  packageJson.scripts?.["feynman:watch:check"] !==
  "node scripts/validate-feynman-research-watch.mjs && npm run feynman:watch:runtime:check"
) {
  fail("package.json is missing feynman:watch:check");
}
requireText(
  packageJson.scripts?.["feynman:check"] ?? "",
  "npm run feynman:watch:check",
  "Feynman chain",
);
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run feynman:check",
  "canonical verify",
);

console.log(
  "ok feynman-research-watch (human-gated no-model scheduler branch, fixed public arXiv query, daily cache, local material-change receipts, VAULT review)",
);
