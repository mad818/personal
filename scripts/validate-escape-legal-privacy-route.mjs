#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x escape-legal-privacy-route: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function assertExcludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired("specs", "features", "escape-legal-privacy-route.md");
const plan = readRequired(
  "docs",
  "superpowers",
  "plans",
  "2026-06-05-escape-legal-privacy-route.md",
);
const helper = readRequired("lib", "legalPrivacyRoute.ts");
const panel = readRequired("components", "resources", "SecureLinkOpenPanel.tsx");
const packageJson = JSON.parse(readRequired("package.json"));

assertIncludes(spec, "ESCAPE-LEGAL-PRIVACY-ROUTE", "feature spec");
assertIncludes(spec, "VPN", "feature spec");
assertIncludes(spec, "Tailscale exit node", "feature spec");
assertIncludes(spec, "legal proxy", "feature spec");
assertIncludes(spec, "Do not build a VPN", "feature spec");
assertIncludes(plan, "Escape Legal Privacy Route Implementation Plan", "implementation plan");

for (const required of [
  "LegalPrivacyRouteKind",
  "LEGAL_PRIVACY_ROUTE_OPTIONS",
  "buildLegalPrivacyRoutePosture",
  "vpn",
  "tailscale-exit-node",
  "legal-proxy",
  "none",
  "Nexus does not hide your IP by itself",
]) {
  assertIncludes(helper, required, "legal privacy route helper");
}

for (const required of [
  "buildLegalPrivacyRoutePosture",
  "LEGAL_PRIVACY_ROUTE_OPTIONS",
  "legalPrivacyRouteKind",
  "privacyRoutePosture",
  "data-testid=\"escape-privacy-route-panel\"",
  "data-testid=\"escape-privacy-route-selector\"",
  "data-testid=\"escape-privacy-route-confirmation\"",
  "data-testid=\"escape-privacy-route-status\"",
  "VPN",
  "Tailscale exit node",
  "Legal proxy",
  "Nexus does not hide your IP by itself",
  "lockedPublicLinkCount",
  "privacyRoutePosture.canOpenPublicLinks",
]) {
  assertIncludes(panel, required, "secure link panel");
}

for (const unsafe of [
  "fetch(",
  "XMLHttpRequest",
  "checkip",
  "api.ipify",
  "icanhazip",
  "ifconfig.me",
  "open proxy",
  "guaranteed anonymity",
  "automatically hides your IP",
]) {
  assertExcludes(helper, unsafe, "legal privacy route helper");
}

if (
  packageJson.scripts?.["escape:privacy-route:check"] !==
  "node scripts/validate-escape-legal-privacy-route.mjs"
) {
  fail("package.json is missing escape:privacy-route:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run escape:privacy-route:check",
  "verify script",
);

console.log("ok escape-legal-privacy-route");
