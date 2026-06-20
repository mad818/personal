#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x correction-memory: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

// lib/assistantSessionMemory.ts must define CorrectionMemory types
const sessionMemory = readRequired("lib", "assistantSessionMemory.ts");
assertIncludes(sessionMemory, "CorrectionMemoryStatus", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "CorrectionMemorySensitivity", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "CorrectionMemoryScope", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "CorrectionMemoryContent", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "CorrectionMemoryEntry", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "rememberCorrectionMemory", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "approveCorrectionMemory", "lib/assistantSessionMemory.ts");
assertIncludes(sessionMemory, "pruneCorrectionMemories", "lib/assistantSessionMemory.ts");

// lib/liveContext.ts must export buildCorrectionMemoryPromptBlock
const liveContext = readRequired("lib", "liveContext.ts");
assertIncludes(liveContext, "buildCorrectionMemoryPromptBlock", "lib/liveContext.ts");

// store/useStore.ts must expose propose and approve actions
const store = readRequired("store", "useStore.ts");
assertIncludes(store, "proposeCorrectionMemory", "store/useStore.ts");
assertIncludes(store, "approveCorrectionMemory", "store/useStore.ts");
assertIncludes(store, "correctionMemories", "store/useStore.ts");

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["memory:correction:check"]) {
  fail("package.json is missing memory:correction:check script");
}

console.log("ok correction-memory");
