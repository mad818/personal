#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-final-closure-wave13: ${message}`);
  process.exit(1);
}

function requireFile(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

requireFile("lib", "desktopSigningProbe.ts");
requireFile("scripts", "desktop-signing-preflight.mjs");
requireFile("scripts", "cp2-staged-release-rehearsal.mjs");

const statusRoute = requireFile("app", "api", "status", "route.ts");
if (!statusRoute.includes("readDesktopSigningPreflightSummary")) {
  fail("status route must expose signing preflight summary");
}

const signingPreflight = path.join(
  root,
  "docs",
  "metrics",
  "desktop-signing-preflight-latest.json",
);
if (!fs.existsSync(signingPreflight)) {
  fail("run npm run desktop:signing:preflight first");
}

const stagedRehearsal = path.join(
  root,
  "docs",
  "metrics",
  "cp2-staged-release-rehearsal-latest.json",
);
if (!fs.existsSync(stagedRehearsal)) {
  fail("run npm run cp2:staged:release:rehearsal first");
}

const staged = JSON.parse(fs.readFileSync(stagedRehearsal, "utf8"));
if (!Array.isArray(staged.rollbackProof?.checklist)) {
  fail("staged rehearsal artifact must include rollback proof checklist");
}

console.log(
  "ok nexus-final-closure-wave13 (signing preflight, staged rehearsal lane, status wiring)",
);
