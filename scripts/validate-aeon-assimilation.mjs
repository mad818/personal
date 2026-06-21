#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x aeon-assimilation: ${message}`);
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
const store = readRequired("store", "useStore.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "aeon.json"));

requireText(governance, "buildScheduledMissionReviewState", "lib/schedulerGovernance.ts");
requireText(governance, "missionReview", "lib/schedulerGovernance.ts");
requireText(store, "scheduledJobs", "store/useStore.ts");

if (parity.status !== "complete") {
  fail("aeon.json status must be complete");
}

const missionRow = parity.capabilities?.find((c) => c.id === "bounded-background-missions");
if (!missionRow || missionRow.disposition !== "adapted") {
  fail("aeon.json bounded-background-missions must be adapted");
}

console.log("ok aeon-assimilation (bounded scheduled mission governance wired)");
