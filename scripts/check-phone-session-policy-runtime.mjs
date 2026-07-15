#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  PHONE_SESSION_MUTATION_EXCEPTIONS,
  resolvePhoneSessionAiPolicy,
  resolvePhoneSessionRequestPolicy,
} from "../lib/security/phoneSessionPolicy.ts";

assert.deepEqual(PHONE_SESSION_MUTATION_EXCEPTIONS, [
  { pathname: "/api/ai", method: "POST", purpose: "local_ai" },
  { pathname: "/api/tools", method: "POST", purpose: "governed_tools" },
  {
    pathname: "/api/phone-acceptance/receipt",
    method: "POST",
    purpose: "acceptance_receipt",
  },
]);

for (const method of ["GET", "HEAD", "OPTIONS", " get "]) {
  const decision = resolvePhoneSessionRequestPolicy("/api/settings", method);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "read_only");
}

for (const [pathname, purpose] of [
  ["/api/ai", "local_ai"],
  ["/api/tools", "governed_tools"],
  ["/api/phone-acceptance/receipt", "acceptance_receipt"],
]) {
  const decision = resolvePhoneSessionRequestPolicy(pathname, "post");
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "explicit_exception");
  assert.equal(decision.purpose, purpose);
}

for (const [pathname, method] of [
  ["/api/settings", "POST"],
  ["/api/workflows", "POST"],
  ["/api/memory/pages", "POST"],
  ["/api/vehicle/telemetry", "POST"],
  ["/api/ai/batches", "POST"],
  ["/api/ai/", "POST"],
  ["/api/tools", "DELETE"],
  ["/api/phone-acceptance/receipt/archive", "POST"],
  ["/api/unknown", "TRACE"],
]) {
  const decision = resolvePhoneSessionRequestPolicy(pathname, method);
  assert.equal(decision.allowed, false, `${method} ${pathname}`);
  assert.equal(decision.reason, "mutation_blocked");
}

assert.deepEqual(resolvePhoneSessionAiPolicy("phone", null), {
  phoneSession: true,
  localOnly: true,
  provider: null,
  explicitProviderAllowed: true,
});
for (const provider of ["ollama", "turboquant", " OLLAMA "]) {
  const policy = resolvePhoneSessionAiPolicy("phone", provider);
  assert.equal(policy.localOnly, true);
  assert.equal(policy.explicitProviderAllowed, true);
}
for (const provider of ["openai", "anthropic", "groq", "openrouter"]) {
  const policy = resolvePhoneSessionAiPolicy("phone", provider);
  assert.equal(policy.localOnly, true);
  assert.equal(policy.explicitProviderAllowed, false);
}
assert.deepEqual(resolvePhoneSessionAiPolicy("master", "openai"), {
  phoneSession: false,
  localOnly: false,
  provider: "openai",
  explicitProviderAllowed: true,
});

console.log(
  "ok phone-session-policy-runtime (read access, exact exceptions, mutation default-deny, child paths, and local-only AI)",
);
