#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-paper-library: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-paper-library: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

function rejectText(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`x feynman-paper-library: ${label} must not contain ${needle}`);
    process.exit(1);
  }
}

const library = readRequired("lib/feynmanPaperLibrary.ts");
const route = readRequired("app/api/feynman/papers/route.ts");
const importRoute = readRequired("app/api/feynman/papers/import/route.ts");
const panel = readRequired("components/vault/FeynmanPaperLibraryPanel.tsx");
const vault = readRequired("app/vault/page.tsx");
const routePolicy = readRequired("lib/security/routePolicy.ts");
const spec = readRequired("specs/features/feynman-semantic-paper-library.md");
const runtime = readRequired("scripts/check-feynman-paper-library-runtime.mjs");
const packageJson = JSON.parse(readRequired("package.json"));
const parity = JSON.parse(
  readRequired("docs/ideas/source-parity/feynman.json"),
);

for (const needle of [
  'path.join(process.cwd(), ".nexus", "feynman-paper-library.json")',
  "maximumPapers: 160",
  "maximumAnnotationChars: 4_000",
  "normalizeFeynmanPaperReference",
  "inspectFeynmanPaper",
  "turboVecUpsert",
  "turboVecSearch",
  'retrieval: "local_vector"',
  'retrieval: "keyword_fallback"',
  "annotation.includes(token) ? 2 : 0",
]) {
  requireText(library, needle, "library");
}

for (const forbidden of [
  "callAI(",
  "callInternalAi(",
  "streamAI",
  "generateWithFallback",
  "api.anthropic.com",
  "api.openai.com",
]) {
  rejectText(library, forbidden, "library");
  rejectText(route, forbidden, "route");
  rejectText(importRoute, forbidden, "import route");
  rejectText(panel, forbidden, "panel");
}

for (const needle of [
  'export const dynamic = "force-dynamic"',
  '"Cache-Control": "private, no-store"',
  "searchFeynmanPaperLibrary",
  "updateFeynmanPaperAnnotation",
]) {
  requireText(route, needle, "protected local API route");
}
requireText(importRoute, "addFeynmanPaperToLibrary", "connector import route");
requireText(
  panel,
  'fetch("/api/feynman/papers/import"',
  "connector import request",
);
requireText(
  routePolicy,
  'prefix: "/api/feynman/papers/import"',
  "connector route policy",
);
requireText(
  routePolicy,
  'prefix: "/api/feynman/papers"',
  "local route policy",
);
requireText(routePolicy, 'routeClass: "connector_opt_in"', "connector class");

for (const needle of [
  "Paper search without a chat call",
  "annotations on this device",
  "Local keyword fallback",
  "Save locally",
  "try {",
  "role=\"alert\"",
]) {
  requireText(panel, needle, "VAULT workbench");
}

requireText(vault, 'id: "papers", label: "Papers"', "VAULT lane");
requireText(vault, "LazyFeynmanPaperLibraryPanel", "VAULT component wiring");
requireText(spec, "No `callAI()`", "no-chat contract");
requireText(runtime, "corrupt-store rejection", "runtime coverage");

const capability = parity.capabilities?.find(
  (item) => item.id === "semantic-paper-search-and-annotations",
);
if (capability?.disposition !== "adapted") {
  console.error(
    "x feynman-paper-library: semantic paper search parity must be adapted",
  );
  process.exit(1);
}
for (const proof of [
  "lib/feynmanPaperLibrary.ts",
  "app/api/feynman/papers/route.ts",
  "app/api/feynman/papers/import/route.ts",
  "components/vault/FeynmanPaperLibraryPanel.tsx",
  "scripts/check-feynman-paper-library-runtime.mjs",
]) {
  if (!capability.proof?.includes(proof)) {
    console.error(`x feynman-paper-library: parity proof is missing ${proof}`);
    process.exit(1);
  }
}

if (
  packageJson.scripts?.["feynman:paper-library:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-paper-library-runtime.mjs"
) {
  console.error("x feynman-paper-library: runtime script is not canonical");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper-library:check"] !==
  "node scripts/validate-feynman-paper-library.mjs && npm run feynman:paper-library:runtime:check"
) {
  console.error("x feynman-paper-library: focused check is not canonical");
  process.exit(1);
}
requireText(
  packageJson.scripts?.["feynman:check"] ?? "",
  "npm run feynman:paper-library:check",
  "Feynman chain",
);
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run feynman:check",
  "canonical verify",
);

console.log(
  "ok feynman-paper-library (protected local storage, bounded arXiv intake, local vector retrieval, private annotations, honest keyword fallback, no chat call)",
);
