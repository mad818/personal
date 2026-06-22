#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function requireFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`missing ${relativePath}`);
    return null;
  }
  return filePath;
}

const packagePath = requireFile("package.json");
const packageJson = packagePath ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : { scripts: {} };

for (const script of ["arpg:prologue-hifi:promote", "arpg:prologue-hifi:promote:check"]) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json is missing ${script}`);
  }
}

requireFile("scripts/promote-arpg-prologue-hifi.mjs");
requireFile(
  "docs/game/aether-reliquary/promotion-templates/prologue-hifi-story-pack.json",
);

const template = JSON.parse(
  fs.readFileSync(
    path.join(
      repoRoot,
      "docs",
      "game",
      "aether-reliquary",
      "promotion-templates",
      "prologue-hifi-story-pack.json",
    ),
    "utf8",
  ),
);

if (template.batchId !== "prologue-hifi-story-pack") {
  fail("promotion template batchId must be prologue-hifi-story-pack");
}
if (template.manifestEntry?.generation?.operatorApproved !== true) {
  fail("promotion template manifestEntry must set generation.operatorApproved true");
}
if (template.benchBatch?.frameCount !== 10) {
  fail("promotion template benchBatch must define 10 frames");
}

const promoteScript = fs.readFileSync(
  path.join(repoRoot, "scripts", "promote-arpg-prologue-hifi.mjs"),
  "utf8",
);
if (!promoteScript.includes("prologue-hifi-story-pack.json")) {
  fail("promote-arpg-prologue-hifi.mjs must load the promotion template");
}

if (errors.length) {
  console.error("x arpg-prologue-hifi-promote:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ok arpg-prologue-hifi-promote (operator promotion template + runner wired)");
