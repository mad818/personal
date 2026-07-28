#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x workflow-pattern-family: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireAll(source, label, fragments) {
  const normalizedSource = source.replace(/\s+/g, " ");
  for (const fragment of fragments) {
    const normalizedFragment = fragment.replace(/\s+/g, " ");
    if (
      !source.includes(fragment) &&
      !normalizedSource.includes(normalizedFragment)
    ) {
      fail(`${label} is missing ${fragment}`);
    }
  }
}

const matrixIds = [
  "calcom-cal-com",
  "chatwoot-chatwoot",
  "dietrichgebert-ponytail",
  "dmore-agency-ai-agents-crafted-personali-danger-hidden-content-via-css",
  "fainir-most-capable-agent-system-prompt",
  "formbricks-formbricks",
  "frappe-erpnext",
  "knadh-listmonk",
];

let capabilityCount = 0;
for (const matrixId of matrixIds) {
  const matrix = JSON.parse(
    read(`docs/ideas/source-parity/${matrixId}.json`),
  );
  if (matrix.status !== "complete") fail(`${matrixId} must be complete`);
  if (matrix.source?.reviewedAt !== "2026-07-27") {
    fail(`${matrixId} must record the connected source re-review`);
  }
  const capabilities = Array.isArray(matrix.capabilities)
    ? matrix.capabilities
    : [];
  if (capabilities.length === 0) fail(`${matrixId} has no capabilities`);
  if (
    capabilities.some((capability) => capability.disposition === "pending")
  ) {
    fail(`${matrixId} retains pending work`);
  }
  capabilityCount += capabilities.length;
}

requireAll(read("lib/agentExecutionContract.ts"), "iteration budget", [
  "AGENT_MAX_ITERATIONS = 12",
  "normalizeAgentIterationBudget",
]);
requireAll(read("lib/agent.ts"), "bounded agent runtimes", [
  "normalizeAgentIterationBudget",
  "requestedMaxIterations",
  "getAgentToolCatalog",
]);
requireAll(read("lib/security/toolCapabilityPolicy.ts"), "tool policy", [
  "TOOL_CAPABILITY_REGISTRY",
  "resolveProtectedActionStatus",
  '"network_locked"',
  '"high_risk_blocked"',
]);
requireAll(read("lib/centralOrchestrator.ts"), "role handoffs", [
  "CENTRAL_ORCHESTRATOR_WORKERS",
  "SpecialistHandoff",
  "parseSpecialistHandoff",
]);
requireAll(
  read("components/ui/CronSchedulerComposerSection.tsx"),
  "conditional scheduler composer",
  ['jobType === "mission"', "SchedulerAvailabilityPlanner"],
);
requireAll(
  read("components/ui/SchedulerAvailabilityPlanner.tsx"),
  "availability UI",
  [
    'aria-label="Local availability planner"',
    "calendar account is read or synchronized.",
    "recurringDailyCronForSlot",
  ],
);
requireAll(read("components/ui/CommandBar.tsx"), "conversation UI", [
  "quickActions",
  "Typing indicator with live step status",
  "lastSessionSummary",
]);
requireAll(read("lib/workflowDefinition.ts"), "schema-driven workflows", [
  "parseWorkflowDefinition",
  "WORKFLOW_NODE_TYPES",
  "approvalMode",
]);
requireAll(read("components/resources/RegistryConsole.tsx"), "filtered reports", [
  "costFilter",
  "deferredSearch",
  "visibleItems",
]);
requireAll(
  read("components/home/office/workflowCommands.ts"),
  "dynamic templates",
  ["buildHQWorkflowScheduledDraft", "resolvedTopic", "buildUserPrompt"],
);
requireAll(read("package.json"), "package wiring", [
  '"workflow-patterns:check"',
  '"scheduler:availability:check"',
  "npm run workflow-patterns:check",
]);

console.log(
  `ok workflow-pattern-family (matrices=${matrixIds.length}; capabilities=${capabilityCount}; local-availability=true; iteration-cap=12)`,
);
