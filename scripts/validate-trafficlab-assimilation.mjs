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

const map = readRequired("components", "ops", "OpsMap.tsx");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "trafficlab-3d.json"),
);

requireText(map, 'apiFetch("/api/flights"', "OpsMap.tsx");
requireText(map, "velocity_ms", "OpsMap.tsx");
requireText(map, "true_track", "OpsMap.tsx");
requireText(map, "Hdg ${Math.round(f.hdg)} deg", "OpsMap.tsx");

if (parity.status !== "in_progress") {
  fail("trafficlab-3d.json status must be in_progress");
}
if (
  parity.capabilities?.find((item) => item.id === "dual-view-movement-panel")
    ?.disposition !== "pending"
) {
  fail("trafficlab dual-view map must remain pending");
}

console.log(
  "ok trafficlab-assimilation (heading/speed map retained; dual view pending)",
);
