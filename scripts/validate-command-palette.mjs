#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x command-palette: ${message}`);
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

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const registry = readRequired("lib", "commandPalette.ts");
const palette = readRequired("components", "ui", "CommandPalette.tsx");
const commandBar = readRequired("components", "ui", "CommandBar.tsx");
const rootChrome = readRequired("components", "ui", "RootLayoutChrome.tsx");
const runtime = readRequired("scripts", "check-command-palette-runtime.mjs");
const spec = readRequired("specs", "features", "warp-command-palette.md");
const todo = readRequired("tasks", "todo.md");
const repoContext = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "warpdotdev-warp",
  "REPO_CONTEXT.md",
);
const repoAgents = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "warpdotdev-warp",
  "AGENTS.md",
);
const repoResponse = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "warpdotdev-warp",
  "response.md",
);
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "warpdotdev-warp.json"),
);

for (const needle of [
  "NEXUS_COMMANDS",
  "MAX_COMMAND_RESULTS = 9",
  "SAFE_LOCAL_HREF",
  "scoreSubsequence",
  "scoreToken",
  "validateNexusCommandRegistry",
  "searchNexusCommands",
  "duplicate id:",
  "unsafe href:",
  "left.command.priority - right.command.priority",
]) {
  requireText(registry, needle, "command registry");
}

for (const needle of [
  'data-nexus-command-palette="true"',
  'role="dialog"',
  'role="combobox"',
  'role="listbox"',
  'role="option"',
  'aria-live="polite"',
  'aria-label="Selected command preview"',
  'event.key === "ArrowDown"',
  'event.key === "ArrowUp"',
  'event.key === "Home"',
  'event.key === "End"',
  'event.key === "Enter"',
  'event.key === "Escape"',
  "returnFocusRef.current?.focus()",
  "No matching Nexus command.",
  "onActivate(result.command)",
]) {
  requireText(palette, needle, "command palette");
}

for (const needle of [
  'import CommandPalette from "@/components/ui/CommandPalette"',
  "const [paletteOpen, setPaletteOpen]",
  'event.metaKey && !event.ctrlKey && key === "p"',
  'event.ctrlKey && event.shiftKey && !event.metaKey && key === "p"',
  "setExpanded(true)",
  "setPaletteOpen(true)",
  "<CommandPalette",
  "getTabFromHref(command.href)",
  "router.push(command.href)",
  'aria-haspopup="dialog"',
]) {
  requireText(commandBar, needle, "CommandBar integration");
}
requireText(
  rootChrome,
  'dynamic(() => import("@/components/ui/CommandBar")',
  "reachable root chrome",
);

for (const source of [registry, palette]) {
  for (const forbidden of [
    "fetch(",
    "callAI(",
    "runAgent(",
    "localStorage",
    "sessionStorage",
    "window.open(",
    "eval(",
    "Function(",
  ]) {
    forbidText(source, forbidden, "local command-palette surface");
  }
}
forbidText(registry, "callback:", "command registry");
forbidText(registry, "https://", "command registry");
forbidText(registry, "http://", "command registry");

for (const needle of [
  "Warp-Inspired Command Palette",
  "current public repository uses `master`",
  "rest of the repository is AGPL-3.0",
  "copies no Warp code",
  "fixed local Nexus route",
  "palette cannot accept a command",
]) {
  requireText(spec, needle, "feature spec");
}
requireText(todo, "WARP-COMMAND-PALETTE", "task queue");
requireText(repoContext, "Current source posture", "repo context");
requireText(repoContext, "315,044 KB", "repo context");
requireText(repoAgents, "mixed license", "repo analysis handoff");
requireText(repoResponse, "clean-room palette", "repo analysis response");

if (matrix.status !== "complete") fail("source parity must be complete");
if (matrix.source?.version !== "master-2026-07-26") {
  fail("source parity must use the current master review");
}
if (matrix.source?.license !== "AGPL-3.0 AND MIT") {
  fail("source parity must record the mixed license");
}
for (const evidence of [
  "https://github.com/warpdotdev/warp/blob/master/README.md",
  "https://github.com/warpdotdev/warp/blob/master/LICENSE-AGPL",
  "https://github.com/warpdotdev/warp/blob/master/LICENSE-MIT",
  "https://docs.warp.dev/terminal/command-palette",
  "https://docs.warp.dev/terminal/entry/command-search",
]) {
  if (!matrix.source?.primaryEvidence?.includes(evidence)) {
    fail(`source parity must cite ${evidence}`);
  }
}
const paletteCapability = matrix.capabilities?.find(
  (item) => item.id === "command-palette-ux",
);
if (paletteCapability?.disposition !== "adapted") {
  fail("command-palette-ux must be adapted");
}
for (const proof of [
  "lib/commandPalette.ts",
  "components/ui/CommandPalette.tsx",
  "components/ui/CommandBar.tsx",
  "scripts/check-command-palette-runtime.mjs",
  "specs/features/warp-command-palette.md",
]) {
  if (!paletteCapability.proof?.includes(proof)) {
    fail(`command-palette-ux must cite ${proof}`);
  }
}
if (
  matrix.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("Warp source parity must have no pending capability");
}

if (
  packageJson.scripts?.["command:palette:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-command-palette-runtime.mjs"
) {
  fail("package.json is missing command:palette:runtime:check");
}
if (
  packageJson.scripts?.["command:palette:check"] !==
  "node scripts/validate-command-palette.mjs && npm run command:palette:runtime:check"
) {
  fail("package.json is missing command:palette:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run command:palette:check",
  "canonical verify",
);
requireText(runtime, "deterministic fuzzy ranking", "runtime validator");

console.log(
  "ok command-palette (fixed local routes, fuzzy ranking, preview, keyboard and focus accessibility, corrected Warp evidence)",
);
