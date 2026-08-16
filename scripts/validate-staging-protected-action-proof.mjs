#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(
  resolve(root, "scripts/staging-protected-action-proof.mjs"),
  "utf8",
);
const runtime = readFileSync(
  resolve(root, "scripts/check-staging-protected-action-proof-runtime.mjs"),
  "utf8",
);

for (const token of [
  "classifyReleaseTarget",
  "sanitizeDiagnosticValue",
  "nexus-protected-action-proof.v1",
  "protected-action-proof-latest.json",
  "NEXUS_TOKEN",
  "NEXUS_EVIDENCE_KEY",
  "x-nexus-internal-auth",
  "AbortSignal.timeout",
  "readBoundedJsonResponse",
  "/api/capability-assurance",
  "approvalRequired",
  "verificationPassed",
  "protectedActionReady",
  "signProtectedActionProofEnvelope",
  "verifyProtectedActionProofEnvelope",
  "envelopeSignature",
  "--run-id=",
]) {
  assert.match(
    source,
    new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

assert.match(source, /method:\s*"GET"/);
assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
assert.doesNotMatch(
  source,
  /fetch\([^)]*,\s*\{[^}]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/is,
);
assert.doesNotMatch(
  source,
  /console\.(?:log|error)\([^\n]*(?:origin|rawBaseUrl|token)\b/,
);
assert.match(runtime, /approvalRequired:\s*false/);
assert.match(runtime, /status:\s*"failed"/);
assert.match(runtime, /includeReceipt:\s*false/);
assert.match(runtime, /http:\/\/stage\.example\.test/);
assert.match(runtime, /readBoundedJsonResponse/);
assert.match(runtime, /not-json/);
assert.match(runtime, /replayedTarget/);
assert.match(runtime, /request\.responseBytes = 2_049/);

console.log(
  "ok protected-action proof static contract (GET-only, bounded, privacy-safe, exact receipt proof)",
);
