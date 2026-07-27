#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x project-file-context: ${message}`);
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

const helper = readRequired("lib", "projectFileContext.ts");
const route = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const panel = readRequired("components", "ui", "ProposedEditPanel.tsx");
const chrome = readRequired("components", "ui", "RootLayoutChrome.tsx");
const runtime = readRequired(
  "scripts",
  "check-project-file-context-runtime.mjs",
);
const spec = readRequired(
  "specs",
  "features",
  "jcode-context-aware-project-reads.md",
);
const todo = readRequired("tasks", "todo.md");
const ecosystem = readRequired("docs", "ideas", "assimilated-ecosystem.md");
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "1jehuang-jcode.json"),
);

for (const needle of [
  "PROJECT_FILE_CONTEXT_LIMITS",
  "chunkProjectFileContent",
  "buildProjectFileContext",
  "minimumSemanticChunkChars",
  "maximumResponseChars: 60_000",
  "maximumChunkChars: 10_000",
  "read_project_file focus must be one plain-text line",
  "read_project_file chunk must be a 1-based integer",
  "focus-ranked locally",
  "CHUNK MANIFEST",
]) {
  requireText(helper, needle, "project-file context helper");
}

for (const needle of [
  'import { buildProjectFileContext } from "@/lib/projectFileContext"',
  'createHash("sha256")',
  "const selectorKey =",
  "`read_project_file:${normalizedPath}:${selectorKey}`",
  "focus: rawFocus",
  "chunk: rawChunk",
  "input.focus ??",
  "input.chunk ??",
  'cacheEvict(\n          `read_project_file:${normalizeProjectPathKey(input.path ?? "")}`',
]) {
  requireText(route, needle, "tools route");
}

for (const needle of [
  "Large files return bounded semantic chunks",
  "Optional plain-text hint (max 200 characters)",
  "Optional exact 1-based chunk number",
]) {
  requireText(agent, needle, "agent tool schema");
}

for (const needle of [
  "function DiffView",
  "BEFORE",
  "AFTER",
  "onApprove",
  "onReject",
]) {
  requireText(panel, needle, "proposed edit panel");
}
requireText(
  chrome,
  'import("@/components/ui/ProposedEditPanel")',
  "root layout chrome",
);
requireText(chrome, "<ProposedEditPanel />", "root layout chrome");

for (const needle of [
  "exact reconstruction",
  "semantic focus",
  "selector bounds",
  "CRLF",
]) {
  requireText(runtime, needle, "runtime validator");
}
for (const needle of [
  "jcode Context-Aware Project Reads",
  "full-content response",
  "files within the",
  "focus",
  "1-based",
  "ProposedEditPanel",
]) {
  requireText(spec, needle, "feature spec");
}
requireText(todo, "JCODE-CONTEXT-AWARE-PROJECT-READS", "task queue");
requireText(ecosystem, "1jehuang/jcode", "ecosystem map");

const contextCapability = matrix.capabilities?.find(
  (item) => item.id === "context-window-code-chunking",
);
const diffCapability = matrix.capabilities?.find(
  (item) => item.id === "inline-diff-presentation",
);
if (contextCapability?.disposition !== "adapted") {
  fail("context-window-code-chunking must be adapted");
}
if (diffCapability?.disposition !== "implemented") {
  fail("inline-diff-presentation must be implemented");
}
for (const proof of [
  "lib/projectFileContext.ts",
  "app/api/tools/route.ts",
  "scripts/check-project-file-context-runtime.mjs",
]) {
  if (!contextCapability.proof?.includes(proof)) {
    fail(`context-window-code-chunking must cite ${proof}`);
  }
}
for (const proof of [
  "components/ui/ProposedEditPanel.tsx",
  "components/ui/RootLayoutChrome.tsx",
]) {
  if (!diffCapability.proof?.includes(proof)) {
    fail(`inline-diff-presentation must cite ${proof}`);
  }
}

if (
  packageJson.scripts?.["project:file-context:runtime:check"] !==
  "node scripts/check-project-file-context-runtime.mjs"
) {
  fail("package.json is missing project:file-context:runtime:check");
}
if (
  packageJson.scripts?.["project:file-context:check"] !==
  "node scripts/validate-project-file-context.mjs && npm run project:file-context:runtime:check"
) {
  fail("package.json is missing project:file-context:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run project:file-context:check",
  "canonical verify",
);

console.log(
  "ok project-file-context (semantic chunks, bounded selectors, cache eviction, reachable inline diff)",
);
