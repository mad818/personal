#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x orbit-actionable-next: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

const orbit = readRequired("scripts", "orbit.js");
const handoffGenerator = readRequired("scripts", "generate-handoff.js");
const spec = readRequired("specs", "features", "orbit-actionable-next.md");
const handoffSpec = readRequired(
  "specs",
  "features",
  "handoff-actionable-queue-truth.md",
);
const todo = readRequired("tasks", "todo.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "parseTopLevelPendingTaskBlocks",
  "classifyPendingTask",
  "buildOrbitQueue",
  "buildOrbitReceipt",
  "formatOrbitQueue",
  'classification: "actionable"',
  'classification: "blocked_or_manual"',
  'reason: "physical_or_manual_proof"',
  'reason: "remote_state_required"',
  'reason: "external_prerequisite"',
  '"declared_external_prerequisite"',
  '"declared_manual_prerequisite"',
  'reason: "local_ready"',
  "MAX_CLASSIFIED_TASKS = 200",
  "MAX_RECEIPT_TASK_CHARS = 500",
  'IN_PROGRESS_HEADING = "## In Progress"',
  "ORBIT NEXT ACTIONABLE TASK",
  "No locally actionable task is currently proven.",
  'new Set(["--all", "--json"])',
  "if (require.main === module) main();",
  "module.exports",
]) {
  requireText(orbit, needle, "ORBIT runtime");
}
for (const forbidden of [
  "writeFile",
  "appendFile",
  "fetch(",
  "https://",
  "http://",
  "child_process",
  "spawn(",
  "exec(",
]) {
  if (orbit.includes(forbidden)) {
    fail(`read-only ORBIT runtime contains forbidden ${forbidden}`);
  }
}

for (const needle of [
  'require("./orbit.js")',
  "buildOrbitQueue(raw)",
  "getHandoffQueueLines",
  "No locally actionable task is currently proven.",
  "blocked/manual tasks remain context-only",
  "npm run orbit:next -- --all",
  "if (require.main === module) main();",
]) {
  requireText(handoffGenerator, needle, "handoff queue consumer");
}
for (const forbidden of ["getTodoRoot", '.startsWith("- [ ] ")']) {
  if (handoffGenerator.includes(forbidden)) {
    fail(`handoff generator retains independent queue selector ${forbidden}`);
  }
}

for (const guardrail of [
  "locally actionable top-level task",
  "fall through to `## In Progress`",
  "do not promote nested checklist steps",
  "blocked_or_manual",
  "--json",
  "--all",
  "General words such as `external`, `approval`, `review`, or `local` do not block a task",
  "Queue posture: blocked_external",
  "Queue posture: blocked_manual",
  "Do not mutate `tasks/todo.md`",
]) {
  requireText(spec, guardrail, "feature contract");
}
for (const guardrail of [
  "must reuse `buildOrbitQueue()`",
  "at most the first three locally actionable top-level tasks",
  "blocked/manual work may appear only as bounded counts",
  "No task is completed, reprioritized, or made actionable",
]) {
  requireText(handoffSpec, guardrail, "handoff feature contract");
}

if (
  !todo.includes("- [ ] ORBIT-ACTIONABLE-NEXT") &&
  !todo.includes("- [x] ORBIT-ACTIONABLE-NEXT")
) {
  fail("ORBIT task plan is missing");
}
requireText(todo, "- [x] CI-GREEN-NODE-RUNTIME", "closed CI task");
requireText(todo, "f2bbe74", "runtime-alignment commit proof");
requireText(todo, "e44c0ae", "published remote-head proof");
requireText(
  todo,
  "Queue posture: `blocked_external`",
  "current explicit blocked posture",
);

if (packageJson.scripts?.["orbit:next"] !== "node scripts/orbit.js") {
  fail("orbit:next package command changed unexpectedly");
}
if (
  packageJson.scripts?.["orbit:next:runtime:check"] !==
  "node scripts/check-orbit-actionable-next-runtime.mjs"
) {
  fail("ORBIT runtime check command is missing");
}
if (
  packageJson.scripts?.["orbit:next:check"] !==
  "node scripts/validate-orbit-actionable-next.mjs && npm run orbit:next:runtime:check"
) {
  fail("ORBIT static/runtime check command is missing");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run orbit:next:check",
  "canonical verification",
);

console.log(
  "ok orbit-actionable-next (top-level queue, blocked/manual receipts, read-only CLI)",
);
