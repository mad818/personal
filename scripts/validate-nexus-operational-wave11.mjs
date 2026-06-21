#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-operational-wave11: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} missing "${needle}"`);
}

const packageJson = readRequired("package.json");
if (!packageJson.includes('"js-yaml": "4.2.0"')) {
  fail("package.json override must pin js-yaml to 4.2.0");
}

const lock = readRequired("package-lock.json");
requireText(lock, '"version": "4.2.0"', "package-lock js-yaml version");
requireText(lock, "js-yaml-4.2.0.tgz", "package-lock js-yaml resolved");

requireText(readRequired("scripts", "dependabot-github-closure-apply.mjs"), "not_used", "dependabot apply");
requireText(readRequired("scripts", "cp2-operational-live-gate.mjs"), "initializeSecureToken", "cp2 live gate");
requireText(readRequired("lib", "desktopSigningPosture.ts"), "readDesktopSigningPosture", "desktopSigningPosture");
requireText(readRequired("app", "api", "status", "route.ts"), "readDesktopSigningPosture", "status route");

if (!fs.existsSync(path.join(root, "desktop", "dist", "SHA256SUMS.txt"))) {
  fail("desktop/dist/SHA256SUMS.txt missing — run desktop packaging lane");
}

console.log("ok nexus-operational-wave11 (dependabot floor, live gate, desktop trust, packaged artifacts)");
