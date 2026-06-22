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

const lib = readRequired("lib", "overnightMissionHandoff.ts");
const card = readRequired("components", "command", "OvernightMissionCard.tsx");
const command = readRequired("app", "command", "page.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "gnhf.json"));

requireText(lib, "buildOvernightMissionBrief", "overnightMissionHandoff.ts");
requireText(lib, "morningReentry", "overnightMissionHandoff.ts");
requireText(card, "Overnight mission handoff", "OvernightMissionCard.tsx");
requireText(command, "OvernightMissionCard", "command page");

if (parity.status !== "complete") {
  fail("gnhf.json status must be complete");
}

console.log("ok gnhf-assimilation (overnight mission handoff wired)");
