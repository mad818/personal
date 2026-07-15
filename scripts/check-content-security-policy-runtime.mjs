#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  assertContentSecurityPolicyNonce,
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from "../lib/security/contentSecurityPolicy.ts";

function readDirective(policy, name) {
  const directive = policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value === name || value.startsWith(`${name} `));
  assert.ok(directive, `Missing ${name} directive.`);
  return directive.split(/\s+/);
}

const nonces = Array.from({ length: 64 }, () =>
  createContentSecurityPolicyNonce(),
);
assert.equal(new Set(nonces).size, nonces.length);
for (const nonce of nonces) {
  assert.match(nonce, /^[a-f0-9]{32}$/);
  assert.doesNotThrow(() => assertContentSecurityPolicyNonce(nonce));
}

const nonce = nonces[0];
const production = buildContentSecurityPolicy(nonce, { development: false });
assert.equal(production.includes("\r"), false);
assert.equal(production.includes("\n"), false);
assert.deepEqual(readDirective(production, "script-src"), [
  "script-src",
  "'self'",
  `'nonce-${nonce}'`,
  "'strict-dynamic'",
  "https://s3.tradingview.com",
]);
assert.equal(
  readDirective(production, "script-src").includes("'unsafe-inline'"),
  false,
);
assert.equal(
  readDirective(production, "script-src").includes("'unsafe-eval'"),
  false,
);
assert.deepEqual(readDirective(production, "style-src"), [
  "style-src",
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
]);
assert.deepEqual(readDirective(production, "img-src"), [
  "img-src",
  "'self'",
  "data:",
  "blob:",
  "https://*.basemaps.cartocdn.com",
  "https://www.tradingview.com",
  "https://s3.tradingview.com",
]);
assert.deepEqual(readDirective(production, "font-src"), [
  "font-src",
  "'self'",
  "data:",
  "https://fonts.gstatic.com",
]);
assert.deepEqual(readDirective(production, "media-src"), [
  "media-src",
  "'self'",
  "data:",
  "blob:",
  "https://d8j0ntlcm91z4.cloudfront.net",
  "https://stream.mux.com",
  "https://*.mux.com",
]);
assert.deepEqual(readDirective(production, "connect-src"), [
  "connect-src",
  "'self'",
  "https://api.coingecko.com",
  "https://services.nvd.nist.gov",
  "https://api.alternative.me",
  "https://mempool.space",
  "https://dns.google",
  "https://rdap.org",
  "https://crt.sh",
  "https://ipapi.co",
  "https://api.hackertarget.com",
  "https://www.circl.lu",
  "https://emailrep.io",
  "https://api.github.com",
  "https://www.gravatar.com",
  "https://check.torproject.org",
  "https://haveibeenpwned.com",
  "https://www.virustotal.com",
  "https://api.shodan.io",
  "https://api.stlouisfed.org",
  "https://stream.mux.com",
  "https://*.mux.com",
]);
assert.deepEqual(readDirective(production, "frame-src"), [
  "frame-src",
  "'self'",
  "https://www.tradingview.com",
  "https://s.tradingview.com",
]);
assert.deepEqual(readDirective(production, "object-src"), [
  "object-src",
  "'none'",
]);
assert.deepEqual(readDirective(production, "base-uri"), ["base-uri", "'self'"]);
assert.deepEqual(readDirective(production, "form-action"), [
  "form-action",
  "'self'",
]);

const development = buildContentSecurityPolicy(nonce, {
  development: true,
  devPort: "3100",
});
assert.ok(readDirective(development, "script-src").includes("'unsafe-eval'"));
assert.ok(
  readDirective(development, "connect-src").includes("ws://127.0.0.1:3100"),
);
assert.ok(
  readDirective(development, "connect-src").includes("ws://localhost:3100"),
);

const invalidPort = buildContentSecurityPolicy(nonce, {
  development: true,
  devPort: "3100; script-src *",
});
assert.ok(
  readDirective(invalidPort, "connect-src").includes("ws://localhost:3000"),
);
assert.equal(invalidPort.includes("script-src *"), false);

for (const invalidNonce of [
  "short",
  "a".repeat(21),
  "a".repeat(129),
  "a".repeat(22) + "; script-src *",
  "a".repeat(22) + "\r\nX-Test: injected",
]) {
  assert.throws(() => assertContentSecurityPolicyNonce(invalidNonce));
  assert.throws(() =>
    buildContentSecurityPolicy(invalidNonce, { development: false }),
  );
}

const secondPolicy = buildContentSecurityPolicy(nonces[1], {
  development: false,
});
assert.notEqual(secondPolicy, production);
assert.equal(secondPolicy.includes(`'nonce-${nonce}'`), false);

console.log(
  "ok content-security-policy-runtime (128-bit unique nonces, nonce-only production scripts, preserved directives, dev fallback, and injection rejection)",
);
