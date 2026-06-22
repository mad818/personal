#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x passive-session-memory: ${message}`);
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

const lib = readRequired("lib", "passiveSessionMemory.ts");
const office = readRequired("components", "home", "office", "OfficeCommandCenter.tsx");
const store = readRequired("store", "useStore.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "claude-mem.json"));

requireText(lib, "buildPassiveSessionMemoryNote", "lib/passiveSessionMemory.ts");
requireText(lib, "appendPassiveMemoryTrail", "lib/passiveSessionMemory.ts");
requireText(lib, "buildPassiveMemoryTrailBlock", "lib/passiveSessionMemory.ts");
requireText(office, "passiveMemoryTrail", "OfficeCommandCenter.tsx");
requireText(office, "buildPassiveMemoryTrailBlock", "OfficeCommandCenter.tsx");
requireText(store, "passiveMemoryTrail", "store/useStore.ts");

if (parity.status !== "complete") {
  fail("claude-mem.json status must be complete");
}

console.log("ok passive-session-memory (claude-mem passive capture wired)");
