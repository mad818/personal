#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x trafficlab-assimilation: ${message}`);
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

const lib = readRequired("lib", "trafficlabTrajectory.ts");
const panel = readRequired("components", "ops", "OpsDualViewPanel.tsx");
const intel = readRequired("components", "intel", "IntelDeferredSegment.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "trafficlab-3d.json"));

requireText(lib, "buildTrajectoryTracksFromFlights", "trafficlabTrajectory.ts");
requireText(lib, "buildDualViewSyncState", "trafficlabTrajectory.ts");
requireText(panel, "Tactical trajectories", "OpsDualViewPanel.tsx");
requireText(intel, "OpsDualViewPanel", "IntelDeferredSegment.tsx");

if (parity.status !== "complete") {
  fail("trafficlab-3d.json status must be complete");
}

console.log("ok trafficlab-assimilation (dual-view trajectory panel wired)");
