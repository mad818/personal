#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave22: ${message}`);
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

const ragRouter = readRequired("lib", "ragRouter.ts");
const store = readRequired("store", "useStore.ts");
const office = readRequired("components", "home", "office", "OfficeCommandCenter.tsx");
const postRun = readRequired("components", "home", "office", "officeCommandCenterPostRun.ts");
const plan = readRequired("docs", "plans", "overall-quality-wave22.md");
const pkg = readRequired("package.json");

requireText(ragRouter, "boostRagConfidenceWithEntities", "ragRouter.ts");
requireText(store, "passiveMemoryTrail", "useStore.ts");
requireText(office, "buildPassiveMemoryTrailBlock", "OfficeCommandCenter.tsx");
requireText(office, "buildOfficeRunMemorySettingsPatch", "OfficeCommandCenter.tsx");
requireText(postRun, "appendPassiveMemoryTrail", "officeCommandCenterPostRun.ts");
requireText(plan, "Idea link intake", "overall-quality-wave22.md");
requireText(pkg, "ideas:link-intake:check", "package.json");
requireText(pkg, "passive-session-memory:check", "package.json");
requireText(pkg, "overall-quality:wave22:check", "package.json");

console.log(
  "ok overall-quality-wave22 (passive memory wired + link intake lane + RAG entity boost)",
);
