#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x desktop-sbom-generator: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = join(root, ...parts);
  if (!existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

function assertExcludes(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const spec = readRequired("specs", "features", "desktop-sbom-generator.md");
const plan = readRequired(
  "docs",
  "superpowers",
  "plans",
  "2026-06-06-desktop-sbom-generator.md",
);
const generator = readRequired("scripts", "generate-desktop-sbom.mjs");
const trustChain = readRequired("scripts", "desktop-trust-chain-status.mjs");
const trustValidator = readRequired(
  "scripts",
  "validate-desktop-trust-chain-status.mjs",
);
const artifactText = readRequired("docs", "metrics", "desktop-sbom.cdx.json");
const packageJson = JSON.parse(readRequired("package.json"));

assertIncludes(spec, "DESKTOP-SBOM-GENERATOR", "feature spec");
assertIncludes(spec, "CycloneDX", "feature spec");
assertIncludes(spec, "No network calls", "feature spec");
assertIncludes(plan, "Desktop SBOM Generator Implementation Plan", "implementation plan");

for (const required of [
  "package-lock.json",
  "desktop/src-tauri/Cargo.lock",
  "CycloneDX",
  "specVersion: \"1.5\"",
  "nexus:lock-digest-sha256",
  "npm",
  "cargo",
  "--check",
  "desktop-sbom.cdx.json",
]) {
  assertIncludes(generator, required, "SBOM generator");
}

for (const unsafe of [
  "fetch(",
  "node:http",
  "node:https",
  "XMLHttpRequest",
  "process.env",
  "npm install",
  "cargo metadata",
  "cargo fetch",
  "spawn(",
  "exec(",
]) {
  assertExcludes(generator, unsafe, "SBOM generator");
}

assertIncludes(trustChain, "desktop-sbom.cdx.json", "desktop trust-chain status");
assertIncludes(trustChain, "componentCount", "desktop trust-chain status");
assertIncludes(trustChain, "lockDigest", "desktop trust-chain status");
assertIncludes(trustValidator, "desktop-sbom.cdx.json", "desktop trust-chain validator");

if (
  packageJson.scripts?.["desktop:sbom"] !==
  "node scripts/generate-desktop-sbom.mjs"
) {
  fail("package.json is missing desktop:sbom");
}

if (
  packageJson.scripts?.["desktop:sbom:check"] !==
  "node scripts/validate-desktop-sbom.mjs"
) {
  fail("package.json is missing desktop:sbom:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run desktop:sbom:check",
  "verify script",
);

let artifact;
try {
  artifact = JSON.parse(artifactText);
} catch {
  fail("desktop SBOM artifact is not valid JSON");
}

if (artifact.bomFormat !== "CycloneDX" || artifact.specVersion !== "1.5") {
  fail("desktop SBOM artifact must be CycloneDX 1.5");
}

const components = Array.isArray(artifact.components) ? artifact.components : [];
const ecosystems = new Set(
  components.flatMap((component) =>
    Array.isArray(component.properties)
      ? component.properties
          .filter((property) => property?.name === "nexus:ecosystem")
          .map((property) => property.value)
      : [],
  ),
);

if (components.length < 100) fail("desktop SBOM component inventory is too small");
if (!ecosystems.has("npm") || !ecosystems.has("cargo")) {
  fail("desktop SBOM must include npm and cargo ecosystems");
}

const check = spawnSync(
  process.execPath,
  ["scripts/generate-desktop-sbom.mjs", "--check"],
  { cwd: root, encoding: "utf8" },
);

if (check.status !== 0) {
  process.stdout.write(check.stdout ?? "");
  process.stderr.write(check.stderr ?? "");
  fail("desktop SBOM freshness check failed");
}

console.log(`ok desktop-sbom-generator (${components.length} components)`);
