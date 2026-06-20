#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ga-surface-hardening: ${message}`);
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
    fail(`${label} is missing "${needle}"`);
  }
}

const SURFACES = [
  {
    spec: path.join("specs", "features", "home-hardening.md"),
    routes: ["/home", "/hq"],
    label: "home-hardening",
  },
  {
    spec: path.join("specs", "features", "command-hardening.md"),
    routes: ["/command"],
    label: "command-hardening",
  },
  {
    spec: path.join("specs", "features", "intel-hardening.md"),
    routes: ["/intel"],
    label: "intel-hardening",
  },
  {
    spec: path.join("specs", "features", "alpha-hardening.md"),
    routes: ["/alpha"],
    label: "alpha-hardening",
  },
  {
    spec: path.join("specs", "features", "cyber-hardening.md"),
    routes: ["/cyber"],
    label: "cyber-hardening",
  },
  {
    spec: path.join("specs", "features", "recon-hardening.md"),
    routes: ["/recon"],
    label: "recon-hardening",
  },
  {
    spec: path.join("specs", "features", "vault-hardening.md"),
    routes: ["/vault"],
    label: "vault-hardening",
  },
  {
    spec: path.join("specs", "features", "resources-hardening.md"),
    routes: ["/resources"],
    label: "resources-hardening",
  },
];

for (const surface of SURFACES) {
  const specText = readRequired(surface.spec);

  for (const route of surface.routes) {
    assertIncludes(specText, route, surface.spec);
  }

  // Each spec must document smoke and degraded-state contracts
  assertIncludes(specText, "Smoke contract", surface.spec);
  assertIncludes(specText, "Degraded-state contract", surface.spec);

  // Each spec must reference the validator proof
  assertIncludes(specText, "npm run ga:surfaces:check", surface.spec);
}

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["ga:surfaces:check"]) {
  fail("package.json is missing ga:surfaces:check script");
}

console.log(`ok ga-surface-hardening (${SURFACES.length} surfaces verified)`);
