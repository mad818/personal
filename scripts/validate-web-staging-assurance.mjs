#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(
  resolve(root, "scripts/web-staging-assurance.mjs"),
  "utf8",
);
const runtime = readFileSync(
  resolve(root, "scripts/check-web-staging-assurance-runtime.mjs"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);

for (const token of [
  "classifyReleaseTarget",
  "sanitizeDiagnosticValue",
  "nexus-web-staging-assurance.v1",
  "web-staging-assurance-latest.json",
  "nexus-protected-action-proof.v1",
  "protected-action-proof-latest.json",
  "evaluateProtectedActionProof",
  "protectedActionReady",
  "NEXUS_EVIDENCE_KEY",
  "HTTPS staged target",
  ".env.local",
  "AbortSignal.timeout",
  "readBoundedJsonResponse",
  "response_limit_exceeded",
  "/api/capability-assurance",
  "release:smoke",
  "runtime:consistency",
  "cp2:launch:gate --live",
  "release:diagnostics:capture --require-staged",
  "read-only-get-subset",
  "assuranceReady",
]) {
  assert.match(
    source,
    new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

for (const route of [
  "/api/cves",
  "/api/earthquakes",
  "/api/defi",
  "/api/hacker-news",
  "/api/threat-intel",
  "/api/news",
  "/api/sec-filings",
  "/api/conflict",
]) {
  assert.match(source, new RegExp(route.replace(/[/-]/g, "\\$&")));
}

for (const category of [
  "health",
  "auth",
  "routes",
  "smoke",
  "diagnostics",
  "feeds",
  "capabilityAssurance",
  "protectedActions",
]) {
  assert.match(source, new RegExp(`"${category}"`));
}

assert.match(source, /method:\s*"GET"/);
assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
assert.doesNotMatch(
  source,
  /fetch\([^)]*,\s*\{[^}]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/is,
);
assert.match(source, /stdio:\s*"pipe"/);
assert.doesNotMatch(
  source,
  /console\.(?:log|error)\([^\n]*(?:origin|rawBaseUrl|token)\b/,
);
assert.match(
  source,
  /fs\.rmSync\(temporaryDirectory,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/,
);
assert.match(
  runtime,
  /normalizeWebStagingTarget\("http:\/\/stage\.example\.test", evidenceKey\)/,
);
assert.match(runtime, /readBoundedJsonResponse/);
assert.match(runtime, /mutatingMethodsUsed:\s*\["POST"\]/);
assert.match(runtime, /stage\.example\.test/);
assert.match(runtime, /schemaVersion:\s*"wrong-schema"/);
assert.match(runtime, /protectedActionReady:\s*false/);
assert.match(runtime, /targetId:\s*"staging-ffffffffffffffff"/);
assert.match(runtime, /assuranceReady, false/);
assert.equal(
  packageJson.scripts?.["staging:protected-action:proof"],
  "node scripts/staging-protected-action-proof.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:protected-action:runtime:check"],
  "node scripts/check-staging-protected-action-proof-runtime.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:protected-action:check"],
  "node scripts/validate-staging-protected-action-proof.mjs && npm run staging:protected-action:runtime:check",
);
assert.match(
  packageJson.scripts?.["staging:evidence:check"] ?? "",
  /npm run staging:protected-action:check/,
);

console.log(
  "ok web-staging-assurance static contract (read-only composition, bounded GET probes, exact protected-action evidence, safe categories)",
);
