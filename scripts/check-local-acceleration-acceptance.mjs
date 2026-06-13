#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  assessLocalAccelerationCompletion,
  sanitizeLocalAccelerationAcceptance,
} from "../lib/localAccelerationAcceptance.ts";

const complete = assessLocalAccelerationCompletion({
  capabilities: [
    { id: "client", disposition: "implemented", owner: "nexus" },
    { id: "runtime-proof", disposition: "implemented", owner: "environment" },
    { id: "upstream-kernel", disposition: "excluded", owner: "upstream" },
  ],
  evidence: {
    staticChecksPassed: true,
    localFallbackLifecyclePassed: true,
    turboVecLifecyclePassed: true,
    turboQuantCheckoutPassed: true,
    turboQuantGpuPassed: true,
  },
});
assert.equal(complete.nexusOwnedPercent, 100);
assert.equal(complete.offlineOperationalPercent, 100);
assert.equal(complete.integrationAcceptancePercent, 100);
assert.equal(complete.optionalUpstreamRuntimePercent, 100);
assert.equal(complete.sourceParityPercent, 100);
assert.equal(complete.status, "complete");
assert.equal(complete.optionalUpstreamStatus, "ready");

const alignedComplete = assessLocalAccelerationCompletion({
  capabilities: [
    { id: "client", disposition: "implemented", owner: "nexus" },
    { id: "upstream-kernel", disposition: "excluded", owner: "upstream" },
  ],
  evidence: {
    staticChecksPassed: true,
    localFallbackLifecyclePassed: true,
    turboVecLifecyclePassed: false,
    turboQuantCheckoutPassed: false,
    turboQuantGpuPassed: false,
  },
});
assert.equal(alignedComplete.nexusOwnedPercent, 100);
assert.equal(alignedComplete.offlineOperationalPercent, 100);
assert.equal(alignedComplete.integrationAcceptancePercent, 100);
assert.equal(alignedComplete.optionalUpstreamRuntimePercent, 0);
assert.equal(alignedComplete.sourceParityPercent, 100);
assert.equal(alignedComplete.status, "complete");
assert.equal(alignedComplete.optionalUpstreamStatus, "unavailable");
assert.deepEqual(alignedComplete.blockers, []);
assert.deepEqual(
  alignedComplete.optionalUpstreamGaps,
  [
    { id: "turbovec:real-runtime-acceptance", owner: "environment" },
    { id: "turboquant:reviewed-checkout-acceptance", owner: "environment" },
    { id: "turboquant:real-gpu-runtime-acceptance", owner: "environment" },
  ],
);

const incomplete = assessLocalAccelerationCompletion({
  capabilities: [
    { id: "client", disposition: "pending", owner: "nexus" },
    { id: "upstream-kernel", disposition: "excluded", owner: "upstream" },
  ],
  evidence: {
    staticChecksPassed: true,
    localFallbackLifecyclePassed: true,
    turboVecLifecyclePassed: false,
    turboQuantCheckoutPassed: false,
    turboQuantGpuPassed: false,
  },
});
assert.equal(incomplete.status, "in_progress");
assert.equal(incomplete.integrationAcceptancePercent, 50);
assert.deepEqual(incomplete.blockers, [{ id: "client", owner: "nexus" }]);

const staticIncomplete = assessLocalAccelerationCompletion({
  capabilities: [
    { id: "client", disposition: "implemented", owner: "nexus" },
    { id: "upstream-kernel", disposition: "excluded", owner: "upstream" },
  ],
  evidence: {
    staticChecksPassed: false,
    localFallbackLifecyclePassed: true,
    turboVecLifecyclePassed: false,
    turboQuantCheckoutPassed: false,
    turboQuantGpuPassed: false,
  },
});
assert.equal(staticIncomplete.status, "in_progress");
assert.equal(staticIncomplete.integrationAcceptancePercent, 75);
assert.deepEqual(staticIncomplete.blockers, [
  { id: "nexus:static-checks", owner: "nexus" },
]);

const sanitized = sanitizeLocalAccelerationAcceptance({
  generatedAt: "2026-06-07T00:00:00.000Z",
  platform: "win32",
  machine: {
    gpuPresent: true,
    linuxRuntimeAvailable: false,
    pythonAvailable: false,
    turboVecPackageAvailable: false,
    turboQuantCheckoutAvailable: false,
    ollamaAvailable: true,
    embeddingAvailable: false,
    outboundPackageRegistryAvailable: false,
  },
  completion: alignedComplete,
  probes: {
    privatePath: "C:\\Users\\someone\\secret",
    rawOutput: "must not survive",
    safeStatus: "blocked",
  },
});
assert.equal(sanitized.probes.safeStatus, "blocked");
assert.equal("privatePath" in sanitized.probes, false);
assert.equal("rawOutput" in sanitized.probes, false);

console.log(
  "ok local-acceleration-acceptance (aligned completion, optional upstream readiness, sanitized artifact)",
);
