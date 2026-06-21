#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`x hq-game-focus-layout: ${message}`);
  process.exit(1);
}

function readRequired(...segments) {
  const filePath = path.join(repoRoot, ...segments);
  if (!fs.existsSync(filePath)) {
    fail(`${segments.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

const shell = readRequired("components", "home", "office", "HQConsoleShellSection.tsx");
const hqSpec = readRequired("tests", "e2e", "hq-shell.spec.ts");
const packageJson = JSON.parse(readRequired("package.json"));

const shellSignals = [
  "hq-focus-switch",
  "hq-focus-${mode.id}",
  "hq-game-layout-tools",
  "hq-game-size-slider",
  "hq-reset-layout",
  "hq-lock-split",
  "hq-game-resize-readout",
  "hq-chat-focus-panel",
  "arpg-playfield-frame",
];

const specSignals = [
  "hq-focus-game",
  "hq-focus-chat",
  "hq-game-size-slider",
  "hq-reset-layout",
  "hq-lock-split",
];

for (const signal of shellSignals) {
  const needle =
    signal === "hq-focus-${mode.id}"
      ? "data-testid={`hq-focus-${mode.id}`}"
      : `data-testid="${signal}"`;
  assertIncludes(shell, needle, "HQConsoleShellSection");
}

for (const signal of specSignals) {
  assertIncludes(hqSpec, signal, "tests/e2e/hq-shell.spec.ts");
}

assertIncludes(shell, "consoleFocusMode", "HQConsoleShellSection");
assertIncludes(shell, "isGameFocus", "HQConsoleShellSection");

if (!packageJson.scripts?.["hq:game-focus:check"]) {
  fail("package.json is missing hq:game-focus:check");
}

console.log("ok hq-game-focus-layout");
