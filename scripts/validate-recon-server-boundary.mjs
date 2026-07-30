#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  executeReconLookup,
  parseReconLookupRequest,
} from "../lib/reconLookupServer.ts";

const ROOT = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const providerHosts = [
  "dns.google",
  "rdap.org",
  "crt.sh",
  "ipapi.co",
  "api.hackertarget.com",
  "www.circl.lu",
  "emailrep.io",
  "api.github.com",
  "www.gravatar.com",
  "check.torproject.org",
  "haveibeenpwned.com",
  "www.virustotal.com",
  "api.shodan.io",
];

const reconLookup = read("components/recon/ReconLookup.tsx");
const passiveDns = read("components/recon/PassiveDnsPanel.tsx");
const clientStore = read("store/useStore.ts");
const server = read("lib/reconLookupServer.ts");
const route = read("app/api/recon/lookup/route.ts");
const routePolicy = read("lib/security/routePolicy.ts");
const csp = read("lib/security/contentSecurityPolicy.ts");
const cspRuntime = read("scripts/check-content-security-policy-runtime.mjs");
const packageJson = JSON.parse(read("package.json"));
const task = read("tasks/todo.md");
const spec = read("specs/features/recon-server-connector-boundary.md");
const reconSpec = read("specs/features/recon-tab.md");
const lessons = read("tasks/lessons.md");

for (const host of providerHosts) {
  assert.equal(
    csp.includes(host),
    false,
    `Browser CSP still includes ${host}.`,
  );
  assert.equal(
    cspRuntime.includes(host),
    false,
    `CSP runtime fixture still expects ${host}.`,
  );
}

assert.equal(reconLookup.includes("https://"), false);
assert.equal(passiveDns.includes("https://"), false);

for (const requiredHost of [
  "dns.google",
  "rdap.org",
  "api.hackertarget.com",
  "www.circl.lu",
  "haveibeenpwned.com",
  "www.virustotal.com",
  "api.shodan.io",
]) {
  assert.ok(
    server.includes(requiredHost),
    `Server allowlist lost ${requiredHost}.`,
  );
}

assert.ok(reconLookup.includes("requestReconLookup"));
assert.ok(passiveDns.includes("requestReconLookup"));
assert.equal(reconLookup.includes("useStore"), false);
assert.equal(reconLookup.includes("settings.hibpKey"), false);
assert.equal(reconLookup.includes("settings.vtKey"), false);
assert.equal(reconLookup.includes("settings.shodanKey"), false);
assert.match(
  reconLookup,
  /const virusTotalTarget = isEmail && domain \? domain : raw;/,
);
assert.equal(clientStore.includes("hibpKey:"), false);
assert.equal(clientStore.includes("vtKey:"), false);
assert.equal(clientStore.includes("shodanKey:"), false);
assert.match(route, /protectedJson/);
assert.match(route, /checkRateLimit/);
assert.match(route, /MAX_REQUEST_BYTES/);
assert.match(
  routePolicy,
  /prefix:\s*"\/api\/recon\/lookup"[\s\S]{0,100}routeClass:\s*"connector_opt_in"/,
);
assert.match(server, /env\.HIBP_API_KEY/);
assert.match(server, /env\.VT_API_KEY/);
assert.match(server, /env\.SHODAN_API_KEY/);
assert.match(server, /maxResponseBytes/);
assert.match(server, /AbortSignal\.timeout/);
assert.equal(
  packageJson.scripts["recon:server-boundary:check"],
  "node --no-warnings --experimental-strip-types scripts/validate-recon-server-boundary.mjs",
);
assert.ok(packageJson.scripts.verify.includes("recon:server-boundary:check"));
assert.match(task, /RECON-SERVER-CONNECTOR-BOUNDARY/);
assert.match(
  spec,
  /The client cannot supply a URL, headers, provider name, or credential/,
);
assert.match(reconSpec, /Browser code calls only `\/api\/recon\/lookup`/);
assert.equal(reconSpec.includes("All tools run from the browser"), false);
assert.match(lessons, /Browser RECON must never contact third-party providers/);

assert.deepEqual(
  parseReconLookupRequest({ operation: "rdap_domain", target: "Example.COM." }),
  {
    ok: true,
    request: { operation: "rdap_domain", target: "example.com" },
  },
);
assert.equal(
  parseReconLookupRequest({
    operation: "rdap_domain",
    target: "https://example.com",
  }).ok,
  false,
);
assert.equal(
  parseReconLookupRequest({ operation: "rdap_ip", target: "999.1.1.1" }).ok,
  false,
);
assert.equal(
  parseReconLookupRequest({ operation: "hibp", target: "not-an-email" }).ok,
  false,
);
assert.equal(
  parseReconLookupRequest({ operation: "virustotal", target: "example.com" })
    .ok,
  false,
);
assert.equal(
  parseReconLookupRequest({
    operation: "rdap_domain",
    target: "example.com",
    url: "http://127.0.0.1",
  }).ok,
  false,
);

let fetchCount = 0;
const mustNotFetch = async () => {
  fetchCount += 1;
  throw new Error("fetch should not run");
};

const invalid = await executeReconLookup(
  { operation: "rdap_domain", target: "https://example.com" },
  { fetchImpl: mustNotFetch, env: {} },
);
assert.equal(invalid.status, 400);
assert.deepEqual(invalid.body, {
  ok: false,
  code: "invalid_request",
  error: "Invalid RECON lookup request.",
});
assert.equal(fetchCount, 0);

const missingKey = await executeReconLookup(
  { operation: "hibp", target: "operator@example.com" },
  { fetchImpl: mustNotFetch, env: {} },
);
assert.equal(missingKey.status, 428);
assert.equal(missingKey.body.ok, false);
assert.equal(missingKey.body.code, "key_required");
assert.equal(fetchCount, 0);

const hibpKey = "fixture-hibp-auth-value";
let observedHibpHeader = "";
const hibpEmpty = await executeReconLookup(
  { operation: "hibp", target: "operator@example.com" },
  {
    env: { HIBP_API_KEY: hibpKey },
    fetchImpl: async (_url, init) => {
      observedHibpHeader = new Headers(init?.headers).get("hibp-api-key") ?? "";
      return new Response("", { status: 404 });
    },
  },
);
assert.equal(hibpEmpty.status, 200);
assert.deepEqual(hibpEmpty.body, { ok: true, data: [] });
assert.equal(observedHibpHeader, hibpKey);
assert.equal(JSON.stringify(hibpEmpty).includes(hibpKey), false);

const vtKey = "fixture-vt-auth-value";
let observedVtHeader = "";
const vt = await executeReconLookup(
  { operation: "virustotal", target: "example.com", targetType: "domain" },
  {
    env: { VT_API_KEY: vtKey },
    fetchImpl: async (_url, init) => {
      observedVtHeader = new Headers(init?.headers).get("x-apikey") ?? "";
      return jsonResponse({
        data: { attributes: { last_analysis_stats: {} } },
      });
    },
  },
);
assert.equal(vt.status, 200);
assert.equal(observedVtHeader, vtKey);
assert.equal(JSON.stringify(vt).includes(vtKey), false);

const rateLimited = await executeReconLookup(
  { operation: "rdap_domain", target: "example.com" },
  {
    fetchImpl: async () => new Response("slow down", { status: 429 }),
    env: {},
  },
);
assert.deepEqual(rateLimited, {
  status: 429,
  body: {
    ok: false,
    code: "rate_limited",
    error: "The lookup provider rate limit was reached.",
  },
});

const oversized = await executeReconLookup(
  { operation: "subdomains", target: "example.com" },
  {
    fetchImpl: async () => new Response("x".repeat(33)),
    maxResponseBytes: 32,
    env: {},
  },
);
assert.equal(oversized.status, 502);
assert.equal(oversized.body.ok, false);
assert.equal(oversized.body.code, "upstream_unavailable");

const networkFailure = await executeReconLookup(
  { operation: "rdap_domain", target: "example.com" },
  {
    fetchImpl: async () => {
      throw new Error("private upstream detail fixture");
    },
    env: {},
  },
);
assert.equal(networkFailure.status, 502);
assert.equal(
  JSON.stringify(networkFailure).includes("private upstream detail"),
  false,
);

const malformed = await executeReconLookup(
  { operation: "rdap_domain", target: "example.com" },
  { fetchImpl: async () => new Response("not-json"), env: {} },
);
assert.equal(malformed.status, 502);
assert.equal(malformed.body.ok, false);
assert.equal(malformed.body.code, "upstream_unavailable");

console.log(
  "ok recon-server-boundary (closed operation allowlist, validated targets, server-only keys, bounded upstreams, safe failures, same-origin clients, and tightened CSP)",
);
