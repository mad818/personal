#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8")
}

function fail(message) {
  console.error(`❌ vehicle-readiness: ${message}`)
  process.exit(1)
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`)
  }
}

const typesSource = readProjectFile("lib", "vehicle", "types.ts")
const hardwareReadinessSource = readProjectFile("lib", "vehicle", "hardwareReadiness.ts")
const scenariosSource = readProjectFile("lib", "vehicle", "flightReplayScenarios.ts")
const benchChecklistSource = readProjectFile("components", "vehicle", "BenchBringUpChecklist.tsx")
const telemetryPanelSource = readProjectFile("components", "vehicle", "TelemetryPanel.tsx")
const artifactCardSource = readProjectFile(
  "components",
  "vehicle",
  "VehicleArtifactManifestCard.tsx",
)
const bridgeRouteSource = readProjectFile("app", "api", "vehicle", "telemetry", "route.ts")
const bridgeStubSource = readProjectFile("scripts", "vehicle-bridge-stub.mjs")
const bridgeDocSource = readProjectFile(
  "docs",
  "deployment",
  "vehicle-passive-bridge-stub.md",
)

assertIncludes(typesSource, "export interface VehicleReplayScenario", "vehicle types")
assertIncludes(
  hardwareReadinessSource,
  "export function buildVehicleBenchBridgeReadiness",
  "vehicle hardware readiness",
)
assertIncludes(scenariosSource, "simulation_only", "vehicle replay scenarios")
assertIncludes(scenariosSource, "vaultPackage", "vehicle replay scenarios")
assertIncludes(
  benchChecklistSource,
  'data-testid="vehicle-bench-bridge-readiness"',
  "bench checklist",
)
assertIncludes(telemetryPanelSource, 'data-testid="vehicle-replay-scenarios"', "telemetry panel")
assertIncludes(
  artifactCardSource,
  'data-testid="vehicle-replay-vault-package"',
  "artifact manifest card",
)
assertIncludes(bridgeRouteSource, "export async function GET", "vehicle telemetry route")
assertIncludes(bridgeRouteSource, "export async function POST", "vehicle telemetry route")
assertIncludes(bridgeRouteSource, "invalid_vehicle_telemetry", "vehicle telemetry route")
assertIncludes(bridgeStubSource, "dry_run_read_only", "vehicle bridge stub")
assertIncludes(bridgeStubSource, "Nexus does not arm, steer, or mode-switch", "vehicle bridge stub")
assertIncludes(bridgeDocSource, "Nexus does not arm, steer, or mode-switch", "vehicle bridge docs")
assertIncludes(bridgeDocSource, "Mission Planner or QGroundControl", "vehicle bridge docs")
assertIncludes(
  hardwareReadinessSource,
  "node scripts/vehicle-bridge-stub.mjs",
  "bridge stub command",
)

for (const forbiddenBridgeCommand of ["MAV_CMD_COMPONENT_ARM_DISARM", "COMMAND_LONG", "SET_MODE"]) {
  if (bridgeStubSource.includes(forbiddenBridgeCommand)) {
    fail(`vehicle bridge stub must not include ${forbiddenBridgeCommand}`)
  }
}

const scenarioIds = Array.from(scenariosSource.matchAll(/id:\s*"([^"]+)"/g)).map(
  (match) => match[1],
)
const uniqueScenarioIds = new Set(scenarioIds)
const requiredScenarioIds = [
  "perimeter-patrol-review",
  "link-degradation-review",
  "battery-return-review",
  "operator-incident-review",
]

for (const id of requiredScenarioIds) {
  if (!uniqueScenarioIds.has(id)) {
    fail(`missing replay scenario ${id}`)
  }
}

if (uniqueScenarioIds.size !== scenarioIds.length) {
  fail("replay scenario IDs must be unique")
}

for (const incidentType of [
  "routine_patrol",
  "link_degradation",
  "battery_return",
  "operator_review",
]) {
  assertIncludes(scenariosSource, incidentType, "vehicle replay incident types")
}

console.log(
  `Vehicle readiness OK (${uniqueScenarioIds.size} scenarios, passive bridge stub/docs/route wired).`,
)
