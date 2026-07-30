#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x operational-read-state-truth: ${message}`);
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

function requireNormalizedText(source, needle, label) {
  requireText(source.replace(/\s+/g, " "), needle.replace(/\s+/g, " "), label);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const spec = readRequired(
  "specs",
  "features",
  "operational-read-state-truth.md",
);
const route = readRequired("app", "api", "cisa-kev", "route.ts");
const clientBoundary = readRequired("lib", "clientJsonResource.ts");
const cisaContract = readRequired("lib", "cisaKev.ts");
const cisaFeed = readRequired("components", "cyber", "CISAFeed.tsx");
const triage = readRequired("components", "cyber", "TriageView.tsx");
const agentHealth = readRequired(
  "components",
  "command",
  "AgentHealthCard.tsx",
);
const runtime = readRequired(
  "scripts",
  "check-operational-read-state-runtime.mjs",
);
const todo = readRequired("tasks", "todo.md");
const lessons = readRequired("tasks", "lessons.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "upstream HTTP and network failures into HTTP 200",
  "retained data with refresh failure",
  'role="alert"',
  "Do not touch phone/PWA acceptance or RPG paths",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  'const CISA_UNAVAILABLE = "CISA KEV feed is temporarily unavailable."',
  "function unavailableResponse()",
  "{ status: 502 }",
  "if (!r.ok) return unavailableResponse()",
  "isCisaKevEntry",
  "catch {",
  "return unavailableResponse()",
]) {
  requireText(route, needle, "CISA route");
}
for (const forbidden of ["e.message", "error: msg", "{ status: 200 }"]) {
  forbidText(route, forbidden, "CISA route");
}

for (const needle of [
  "response.ok",
  "const payload: unknown = await response.json()",
  "isPayload(payload)",
  "catch {",
  "return { ok: false }",
]) {
  requireText(clientBoundary, needle, "client JSON boundary");
}
for (const needle of [
  "isCisaKevEntry",
  "isCisaKevPayload",
  "value.vulnerabilities.every(isCisaKevEntry)",
  "Number.isFinite(value.total)",
]) {
  requireText(cisaContract, needle, "CISA client contract");
}

for (const [source, label, needles] of [
  [
    cisaFeed,
    "CISA feed",
    [
      "loadClientJsonResource<CisaKevPayload>",
      'setLoadState("error")',
      'loadState === "ready" && entries.length === 0',
      "last verified catalog remains visible",
      'role="alert"',
      'role="status"',
      "Retry CISA KEV",
      "active = false",
    ],
  ],
  [
    triage,
    "CYBER triage",
    [
      "loadClientJsonResource<CisaKevPayload>",
      'setKevLoadState("error")',
      'kevLoadState === "error"',
      "Retained KEV evidence remains",
      'role="alert"',
      "Retry CISA triage",
      "active = false",
    ],
  ],
  [
    agentHealth,
    "Agent Health",
    [
      "loadClientJsonResource<AgentHealthPayload>",
      'setLoadState("error")',
      'agents.length === 0 && loadState === "ready"',
      "Last verified metrics remain visible",
      'role="alert"',
      'role="status"',
      "Retry agent health",
      "active = false",
    ],
  ],
]) {
  for (const needle of needles) requireText(source, needle, label);
}

forbidText(cisaFeed, "silent fail", "CISA feed");
forbidText(triage, "silent fail", "CYBER triage");
forbidText(agentHealth, "/* silent */", "Agent Health");
requireNormalizedText(
  agentHealth,
  'agents.length === 0 && loadState === "ready"',
  "Agent Health",
);

for (const needle of [
  "Response.json(validPayload)",
  "{ status: 502 }",
  'new Response("not-json"',
  'total: "1"',
  "network unavailable",
]) {
  requireText(runtime, needle, "runtime fixtures");
}

requireText(todo, "OPERATIONAL-READ-STATE-TRUTH", "task queue");
requireText(
  lessons,
  "A connector outage must not become an empty verified catalog",
  "correction lesson",
);

const expected = {
  "operational:read-state:runtime:check":
    "node --no-warnings --experimental-strip-types scripts/check-operational-read-state-runtime.mjs",
  "operational:read-state:check":
    "node scripts/validate-operational-read-state-truth.mjs && npm run operational:read-state:runtime:check",
};
for (const [name, command] of Object.entries(expected)) {
  if (packageJson.scripts?.[name] !== command) {
    fail(`package.json ${name} must equal ${command}`);
  }
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run operational:read-state:check",
  "canonical verify command",
);

console.log(
  "ok operational-read-state-truth (CISA route, three truthful consumers, retry, accessibility)",
);
