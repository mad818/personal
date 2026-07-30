#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ops-map-synchronized-view: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const relative = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${relative} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

const spec = readRequired(
  "specs",
  "features",
  "ops-map-synchronized-flight-view.md",
);
const viewport = readRequired("lib", "opsMapSynchronizedView.ts");
const opsMap = readRequired("components", "ops", "OpsMap.tsx");
const intelSegment = readRequired(
  "components",
  "intel",
  "IntelDeferredSegment.tsx",
);
const detachedReconciliation = readRequired(
  "scripts",
  "check-detached-component-reconciliation.mjs",
);
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "trafficlab-3d.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(spec, "feature spec", [
  "exact same fetched flight snapshot",
  "two-level tactical zoom offset",
  "synchronized 2D overview/tactical maps",
]);
requireAll(viewport, "viewport contract", [
  "normalizeOpsMapViewport",
  "resolveTacticalViewport",
  "resolveOverviewViewport",
  "OPS_TACTICAL_ZOOM_DELTA",
]);
requireAll(opsMap, "active Ops Map", [
  "flightSnapshotRef",
  "tacticalMapRef",
  "Dual flight view",
  "Synchronized 2D views share one OpenSky snapshot",
  "resolveTacticalViewport",
  "resolveOverviewViewport",
  'overviewMap.on("moveend", syncFromOverview)',
  'tacticalMap.on("moveend", syncFromTactical)',
  'overviewMap.off("moveend", syncFromOverview)',
  'tacticalMap.off("moveend", syncFromTactical)',
  "tacticalMapRef.current.remove()",
  "buildFlightLayer(L, currentFlights)",
  "animate: false",
]);
requireAll(intelSegment, "reachable INTEL host", [
  'import("@/components/ops/OpsMap")',
  "<LazyOpsMap />",
]);
requireAll(detachedReconciliation, "detached replacement proof", [
  "TrafficLab active replacement",
  "Dual flight view",
]);

const flightFetches = opsMap.match(/await fetchFlights\(\)/g) ?? [];
if (flightFetches.length !== 1) {
  fail(
    `active Ops Map must fetch one shared flight snapshot, found ${flightFetches.length}`,
  );
}
for (const forbidden of ["YOLO", "homography", "CCTV", "3D globe"]) {
  if (opsMap.includes(forbidden)) {
    fail(`active Ops Map must not claim ${forbidden}`);
  }
}

if (parity.status !== "complete") fail("TrafficLab parity must be complete");
if (
  parity.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("TrafficLab parity still has pending capabilities");
}
const dualView = parity.capabilities.find(
  (capability) => capability.id === "dual-view-movement-panel",
);
if (dualView?.disposition !== "adapted") {
  fail("dual-view-movement-panel must be adapted");
}

if (
  packageJson.scripts?.["trafficlab:dual-view:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-ops-map-synchronized-view-runtime.mjs"
) {
  fail("package.json is missing trafficlab:dual-view:runtime:check");
}
if (
  packageJson.scripts?.["trafficlab:dual-view:check"] !==
  "node scripts/validate-ops-map-synchronized-view.mjs && npm run trafficlab:dual-view:runtime:check"
) {
  fail("package.json is missing trafficlab:dual-view:check");
}
if (
  !(packageJson.scripts?.verify ?? "").includes(
    "npm run trafficlab:dual-view:check",
  )
) {
  fail("verify is missing trafficlab:dual-view:check");
}

console.log("ok ops-map-synchronized-view");
