#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  getLocalAccelerationStatus,
  readLocalAccelerationConfig,
  TURBOQUANT_EXEC_CONFIRMATION,
  turboQuantControl,
  turboVecControl,
  turboVecRemove,
  turboVecSearch,
  turboVecUpsert,
  validateLocalAccelerationEndpoint,
} from "../lib/localAcceleration.ts";

assert.equal(
  validateLocalAccelerationEndpoint("http://127.0.0.1:5052", false).hostname,
  "127.0.0.1",
);
assert.throws(
  () => validateLocalAccelerationEndpoint("https://example.com", false),
  /loopback/i,
);
assert.equal(
  validateLocalAccelerationEndpoint("https://workstation.example.ts.net", true).hostname,
  "workstation.example.ts.net",
);

const config = readLocalAccelerationConfig({
  NEXUS_TURBOVEC_ENABLED: "true",
  NEXUS_TURBOVEC_ENDPOINT: "http://127.0.0.1:5052",
  NEXUS_TURBOQUANT_ENABLED: "true",
  NEXUS_TURBOQUANT_ENDPOINT: "http://127.0.0.1:8000",
  NEXUS_TURBOQUANT_MODE: "hybrid",
  NEXUS_TURBOQUANT_KEY_BITS: "3",
  NEXUS_TURBOQUANT_VALUE_BITS: "4",
});
assert.equal(config.turboVec.enabled, true);
assert.equal(config.turboQuant.mode, "hybrid");
assert.equal(config.turboQuant.keyBits, 3);
assert.equal(config.turboQuant.valueBits, 4);

const calls = [];
const fixtureFetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  const pathname = new URL(String(url)).pathname;
  if (pathname.endsWith("/health")) {
    return Response.json({ status: "ok", engine: pathname.includes("turbovec") ? "turbovec" : "turboquant" });
  }
  if (pathname.endsWith("/stats")) {
    return Response.json({ vectorCount: 2, compressionRatio: 8, mode: "hybrid" });
  }
  if (pathname.endsWith("/search")) {
    return Response.json({ matches: [{ id: "page-1", score: 0.91 }] });
  }
  return Response.json({ ok: true });
};

const deps = { fetch: fixtureFetch, env: config };
const status = await getLocalAccelerationStatus(deps);
assert.equal(status.turboVec.available, true);
assert.equal(status.turboQuant.available, true);

await turboVecUpsert(
  [{ id: "page-1", text: "bounded page", metadata: { route: "/vault" } }],
  deps,
);
const matches = await turboVecSearch(
  { query: "bounded", limit: 4, allowlist: ["page-1"] },
  deps,
);
assert.equal(matches[0]?.id, "page-1");
await turboVecRemove(["page-1"], deps);
await turboVecControl("prepare", deps);
await turboQuantControl(
  "validate",
  { confirmation: TURBOQUANT_EXEC_CONFIRMATION },
  deps,
);
assert.ok(calls.some((call) => call.url.endsWith("/turbovec/upsert")));
assert.ok(calls.some((call) => call.url.endsWith("/turboquant/validate")));
const turboQuantCall = calls.find((call) => call.url.endsWith("/turboquant/validate"));
assert.equal(
  JSON.parse(turboQuantCall.init.body).confirmation,
  TURBOQUANT_EXEC_CONFIRMATION,
);

const degraded = await getLocalAccelerationStatus({
  fetch: async () => {
    throw new Error("offline");
  },
  env: config,
});
assert.equal(degraded.turboVec.available, false);
assert.equal(degraded.turboQuant.available, false);

console.log("ok local-acceleration-runtime (endpoint policy, controls, status, degraded fallback)");
