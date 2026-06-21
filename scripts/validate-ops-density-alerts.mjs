#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ops-density-alerts: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const lib = readRequired("lib", "opsDensityAlerts.ts");
const strip = readRequired("components", "ops", "OpsDensityAlertStrip.tsx");
const intel = readRequired("components", "intel", "IntelDeferredSegment.tsx");

requireText(lib, "buildOpsDensityAlerts", "opsDensityAlerts.ts");
requireText(strip, "buildOpsDensityAlerts", "OpsDensityAlertStrip.tsx");
requireText(intel, "OpsDensityAlertStrip", "IntelDeferredSegment.tsx");

console.log("ok ops-density-alerts (INTEL density alert strip wired)");
