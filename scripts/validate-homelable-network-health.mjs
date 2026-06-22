#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x homelable-network-health: ${message}`);
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

const panel = readRequired("components", "command", "NetworkHealth.tsx");
const topology = readRequired("components", "command", "NetworkTopologyPanel.tsx");
const topologyLib = readRequired("lib", "networkTopology.ts");
const commandPage = readRequired("app", "command", "page.tsx");
const homelableParity = JSON.parse(readRequired("docs", "ideas", "source-parity", "homelable.json"));

requireText(panel, "DEFAULT_NETWORK_HEALTH_TARGETS", "NetworkHealth.tsx");
requireText(panel, "NetworkTopologyPanel", "NetworkHealth.tsx");
requireText(panel, "checkAll", "NetworkHealth.tsx");
requireText(panel, "AbortSignal.timeout", "NetworkHealth.tsx");
requireText(panel, "homelable", "NetworkHealth.tsx");
requireText(topology, "buildNetworkTopologyLayout", "NetworkTopologyPanel.tsx");
requireText(topologyLib, "topologyStatusColor", "lib/networkTopology.ts");
requireText(commandPage, "LazyNetworkHealth", "app/command/page.tsx");

const healthRow = homelableParity.capabilities?.find((c) => c.id === "network-health-panel");
if (!healthRow || healthRow.disposition !== "adapted") {
  fail("homelable.json network-health-panel must be adapted");
}

const topologyRow = homelableParity.capabilities?.find((c) => c.id === "topology-visualization");
if (!topologyRow || topologyRow.disposition !== "adapted") {
  fail("homelable.json topology-visualization must be adapted");
}

if (homelableParity.status !== "complete") {
  fail("homelable.json status must be complete");
}

console.log("ok homelable-network-health (COMMAND route probes + topology canvas wired)");
