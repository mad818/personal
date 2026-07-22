#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x gnhf-assimilation: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const governance = readRequired("lib", "schedulerGovernance.ts");
const composer = readRequired(
  "components",
  "ui",
  "CronSchedulerComposerSection.tsx",
);
const readiness = readRequired("components", "ui", "OperatorReadinessLane.tsx");
const command = readRequired("app", "command", "page.tsx");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "gnhf.json"),
);

requireText(
  governance,
  "buildScheduledMissionReviewState",
  "schedulerGovernance.ts",
);
requireText(governance, 'status: "pending_review"', "schedulerGovernance.ts");
requireText(governance, "expiredMissionReviews", "schedulerGovernance.ts");
requireText(
  composer,
  'aria-label="Mission review expiry"',
  "CronSchedulerComposerSection.tsx",
);
requireText(
  composer,
  'aria-label="Mission re-entry summary"',
  "CronSchedulerComposerSection.tsx",
);
requireText(readiness, "scheduledJobs", "OperatorReadinessLane.tsx");
requireText(command, "LazyOperatorReadinessLane", "command page");

if (parity.status !== "complete") {
  fail("gnhf.json status must be complete");
}

console.log(
  "ok gnhf-assimilation (review-gated scheduled mission handoff wired)",
);
