#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x davidondrej-skill-closure: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireAll(source, label, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      fail(`${label} is missing ${fragment}`);
    }
  }
}

const matrix = JSON.parse(
  read("docs/ideas/source-parity/davidondrej-skills.json"),
);
if (matrix.status !== "complete") fail("source matrix must be complete");
if (matrix.source?.license !== "MIT") fail("source license must remain MIT");
if (matrix.source?.reviewedAt !== "2026-07-27") {
  fail("source review date must match the connected re-review");
}
if (!Array.isArray(matrix.capabilities) || matrix.capabilities.length !== 30) {
  fail("source matrix must retain all 30 reviewed capability rows");
}

const ids = matrix.capabilities.map((capability) => capability.id);
if (new Set(ids).size !== ids.length) fail("capability IDs must be unique");
const pending = matrix.capabilities.filter(
  (capability) => capability.disposition === "pending",
);
if (pending.length > 0) fail(`matrix retains ${pending.length} pending rows`);

const excludedIds = new Set(
  matrix.capabilities
    .filter((capability) => capability.disposition === "excluded")
    .map((capability) => capability.id),
);
const expectedExcluded = [
  "agent-self-scheduling",
  "anti-sleep",
  "cmux-agent-control",
  "online-shopping",
  "readonly-database-role",
  "skill-distribution",
  "vps-server-management",
  "youtube-transcript",
];
if (
  excludedIds.size !== expectedExcluded.length ||
  expectedExcluded.some((id) => !excludedIds.has(id))
) {
  fail("exact security, free/local, and product-purpose exclusions drifted");
}

for (const capability of matrix.capabilities) {
  if (
    capability.disposition === "implemented" ||
    capability.disposition === "adapted"
  ) {
    if (!Array.isArray(capability.proof) || capability.proof.length === 0) {
      fail(`${capability.id} is missing reachable proof`);
    }
  } else if (
    typeof capability.reason !== "string" ||
    !capability.reason.trim()
  ) {
    fail(`${capability.id} is missing an exclusion reason`);
  }
}

requireAll(read("lib/centralOrchestrator.ts"), "typed delegation", [
  "CENTRAL_ORCHESTRATOR_MAX_WORKERS = 3",
  "SpecialistHandoff",
  "normalizeSpecialistMission",
  "parseSpecialistHandoff",
  "MAX should",
]);
requireAll(read("lib/agentExecutionContract.ts"), "goal lifecycle", [
  '"waiting_for_human"',
  '"iteration"',
  '"human_wait"',
  '"resume"',
  "summarizeAgentExecutionState",
]);
requireAll(read("app/api/tools/route.ts"), "reachable protected tools", [
  'case "delegate_specialist":',
  'case "web_search":',
  'case "fetch_url":',
  'case "deep_research":',
]);
requireAll(read("lib/learningMissions.ts"), "learning workflows", [
  '"teach"',
  '"quiz"',
  '"practice"',
  '"study-plan"',
  "preparedWorkspaceHref",
]);
requireAll(read("lib/schedulerGovernance.ts"), "reviewable reminders", [
  "ScheduledMissionReviewComputedStatus",
  '"pending_review"',
  "DEFAULT_SCHEDULED_MISSION_REVIEW_EXPIRY_HOURS",
]);
requireAll(read("lib/secureLink.ts"), "safe browsing boundary", [
  "Links with embedded usernames or passwords are blocked.",
  "Public plain-HTTP links are blocked.",
  "requiresIpPrivacy",
]);
requireAll(read("components/settings/SettingsDrawer.tsx"), "provider setup", [
  "Provider",
  "Ollama",
  "Azure OpenAI",
]);
requireAll(
  read("docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md"),
  "project skill lifecycle",
  ["description:", "## Authority boundaries", "## Routing workflow", "## Verification"],
);
requireAll(read("package.json"), "package wiring", [
  '"davidondrej:skills:check"',
  "npm run davidondrej:skills:check",
]);

console.log(
  `ok davidondrej-skill-closure (source=${matrix.capabilities.length}; active=${matrix.capabilities.length - excludedIds.size}; excluded=${excludedIds.size}; pending=0)`,
);
