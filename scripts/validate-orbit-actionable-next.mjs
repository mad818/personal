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
const spec = readRequired("specs", "features", "orbit-actionable-next.md");
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
  'classification: "excluded_rpg"',
  'reason: "physical_or_manual_proof"',
  'reason: "remote_state_required"',
  'reason: "external_prerequisite"',
  'reason: "rpg_scope"',
  'reason: "local_ready"',
  "MAX_CLASSIFIED_TASKS = 200",
  "MAX_RECEIPT_TASK_CHARS = 500",
  'IN_PROGRESS_HEADING = "## In Progress"',
  "ORBIT NEXT ACTIONABLE TASK",
  "No locally actionable non-RPG task is currently proven.",
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

for (const guardrail of [
  "locally actionable, non-RPG top-level task",
  "fall through to `## In Progress`",
  "do not promote nested checklist steps",
  "blocked_or_manual",
  "excluded_rpg",
  "--json",
  "--all",
  "General words such as `external`, `approval`, `review`, or `local` do not block a task",
  "Do not mutate `tasks/todo.md`",
]) {
  requireText(spec, guardrail, "feature contract");
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
  "ok orbit-actionable-next (top-level queue, blocked/manual receipts, RPG exclusion, read-only CLI)",
);
