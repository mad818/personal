#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const restoredComponents = [
  "components/alpha/TradeThesisPanel.tsx",
  "components/command/NetworkTopologyPanel.tsx",
  "components/intel/ForecastLabReadinessPanel.tsx",
  "components/intel/PapersResearchPanel.tsx",
  "components/ui/AgentPlatformReadinessBadges.tsx",
  "components/recon/GeocodingPlaygroundCard.tsx",
];

const retiredComponents = [
  "components/command/McpBridgeStatusCard.tsx",
  "components/command/OvernightMissionCard.tsx",
  "components/command/PrivacyShieldReceiptCard.tsx",
  "components/command/SecurityPostureStrip.tsx",
  "components/cyber/CyberGovernanceCards.tsx",
  "components/home/HomeAmbient.tsx",
  "components/home/HomeChat.tsx",
  "components/home/office/AgentPlatformStrip.tsx",
  "components/home/office/CorrectionMemoryProvenanceStrip.tsx",
  "components/home/office/MementoCycleStrip.tsx",
  "components/home/office/animations.css",
  "components/ops/OpsDensityAlertStrip.tsx",
  "components/ops/OpsDualViewPanel.tsx",
  "components/recon/RepoAssimilationQueueCard.tsx",
  "components/system/HealthMonitor.tsx",
  "components/ui/AgentStatusBar.tsx",
  "components/ui/EvolutionImproverActions.tsx",
  "components/ui/SystemStatusFooter.tsx",
  "components/ui/TelemetryHUD.tsx",
  "components/vault/VaultSearch.tsx",
];

const retiredSupport = [
  "lib/overnightMissionHandoff.ts",
  "lib/privacyShieldReceipt.ts",
  "lib/securityPostureRollup.ts",
  "lib/correctionMemoryProvenance.ts",
  "lib/mementoCycle.ts",
  "lib/opsDensityAlerts.ts",
  "lib/trafficlabTrajectory.ts",
  "lib/repoAssimilationQueue.ts",
  "lib/evolutionImprover.ts",
  "lib/opsH3Density.ts",
  "scripts/validate-privacy-shield-receipts.mjs",
  "scripts/validate-nexus-holistic-wave9.mjs",
  "scripts/validate-overall-quality-wave20.mjs",
  "scripts/validate-overall-quality-wave21.mjs",
  "scripts/validate-correction-memory-provenance.mjs",
  "scripts/validate-memento-cycle.mjs",
  "scripts/validate-ops-density-alerts.mjs",
  "scripts/validate-papers-research.mjs",
  "scripts/validate-repo-assimilation-depth.mjs",
  "scripts/validate-external-ideas-wave15.mjs",
];

const failures = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: expected current proof file is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: missing "${needle}"`);
}

for (const relativePath of restoredComponents) {
  if (!exists(relativePath))
    failures.push(`${relativePath}: restored component is missing`);
}

for (const relativePath of [...retiredComponents, ...retiredSupport]) {
  if (exists(relativePath))
    failures.push(`${relativePath}: retired source still exists`);
}

const momentum = read("components/alpha/MomentumScanner.tsx");
requireText(momentum, "LazyTradeThesisPanel", "MomentumScanner restore");
requireText(momentum, "setSelectedSignal", "MomentumScanner restore");
requireText(momentum, "fearGreedValue", "MomentumScanner restore");

const networkHealth = read("components/command/NetworkHealth.tsx");
requireText(networkHealth, "NetworkTopologyPanel", "Network topology restore");
requireText(
  networkHealth,
  "DEFAULT_NETWORK_HEALTH_TARGETS",
  "Network topology restore",
);

const intelPage = read("app/intel/page.tsx");
requireText(intelPage, "LazyPapersResearchPanel", "INTEL research restore");
requireText(
  intelPage,
  "LazyForecastLabReadinessPanel",
  "INTEL research restore",
);
requireText(intelPage, "Open research sources", "INTEL research restore");

const reconPage = read("app/recon/page.tsx");
requireText(
  reconPage,
  "LazyGeocodingPlaygroundCard",
  "RECON geocoding restore",
);
requireText(reconPage, "Open geocoding tools", "RECON geocoding restore");

const papers = read("components/intel/PapersResearchPanel.tsx");
for (const needle of [
  "response.ok",
  "payload.status",
  "previous verified results are retained",
]) {
  requireText(papers, needle, "Papers truth contract");
}

const forecast = read("components/intel/ForecastLabReadinessPanel.tsx");
for (const needle of ["response.ok", "last verified posture", "Retry"]) {
  requireText(forecast, needle, "Forecast readiness truth contract");
}

const readinessBadges = read("components/ui/AgentPlatformReadinessBadges.tsx");
requireText(
  readinessBadges,
  "Platform readiness unknown",
  "Platform readiness unknown posture",
);

const geocoding = read("components/recon/GeocodingPlaygroundCard.tsx");
for (const needle of [
  "response.ok",
  "payload.status",
  "previous verified results are retained",
  'aria-label="Latitude"',
  'aria-label="Longitude"',
]) {
  requireText(geocoding, needle, "Geocoding truth contract");
}

const replacementProofs = [
  ["components/ui/TrustOperationsRail.tsx", "External tools"],
  ["components/ui/OperatorReadinessLane.tsx", "scheduledJobs"],
  [
    "components/command/MemorySpineStatusCard.tsx",
    "Approved correction memory",
  ],
  ["components/vault/SavedArticles.tsx", "Search saved articles"],
  [
    "components/ui/OperationalLightGrid.tsx",
    'data-testid="operational-light-grid"',
  ],
  ["components/ops/OpsMap.tsx", "true_track"],
  ["components/recon/RepoIntelPanel.tsx", "Repo intel"],
];

for (const [relativePath, needle] of replacementProofs) {
  requireText(read(relativePath), needle, `${relativePath} replacement proof`);
}

const reachability = read("scripts/check-active-component-reachability.mjs");
const reviewedSet = reachability.match(
  /const reviewedDetachedComponents = new Set\(\[([\s\S]*?)\]\);/,
);
if (!reviewedSet) {
  failures.push(
    "active reachability: reviewed-detached set is not recognizable",
  );
} else {
  const entries = reviewedSet[1].replace(/\/\/.*$/gm, "").replace(/\s/g, "");
  if (entries)
    failures.push("active reachability: reviewed-detached set must stay empty");
}

const openEvolveMatrix = JSON.parse(
  read("docs/ideas/source-parity/openevolve.json"),
);
if (openEvolveMatrix.status !== "complete") {
  failures.push(
    "docs/ideas/source-parity/openevolve.json: reachable replacement capability must complete the matrix",
  );
}
if (
  openEvolveMatrix.capabilities?.some(
    (capability) => capability.disposition === "pending",
  )
) {
  failures.push(
    "docs/ideas/source-parity/openevolve.json: reachable replacement capability must clear pending debt",
  );
}
const blacksiteLab = read("components/skills/BlacksiteLab.tsx");
for (const needle of [
  "Operator disposition",
  "Keep candidate",
  "recordRuntimeExperimentDecision",
]) {
  requireText(blacksiteLab, needle, "OpenEvolve active replacement");
}

const trafficLabMatrix = JSON.parse(
  read("docs/ideas/source-parity/trafficlab-3d.json"),
);
if (trafficLabMatrix.status !== "complete") {
  failures.push(
    "docs/ideas/source-parity/trafficlab-3d.json: reachable replacement capability must complete the matrix",
  );
}
if (
  trafficLabMatrix.capabilities?.some(
    (capability) => capability.disposition === "pending",
  )
) {
  failures.push(
    "docs/ideas/source-parity/trafficlab-3d.json: reachable replacement capability must clear pending debt",
  );
}
const opsMap = read("components/ops/OpsMap.tsx");
for (const needle of [
  "Dual flight view",
  "Synchronized 2D views share one OpenSky snapshot",
  "flightSnapshotRef",
]) {
  requireText(opsMap, needle, "TrafficLab active replacement");
}

if (failures.length > 0) {
  console.error("Detached component reconciliation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `ok detached-component-reconciliation (restored=${restoredComponents.length}; retired=${retiredComponents.length}; retired-support=${retiredSupport.length}; reviewed-detached=0)`,
);
