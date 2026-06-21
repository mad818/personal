#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-holistic-wave9: ${message}`);
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

const apiCache = readRequired("lib", "apiCache.ts");
const statusRoute = readRequired("app", "api", "status", "route.ts");
const flightsRoute = readRequired("app", "api", "flights", "route.ts");
const firesRoute = readRequired("app", "api", "fires", "route.ts");
const bridge = readRequired("lib", "repoAssimilationBridge.ts");
const ranking = readRequired("lib", "vaultRetrievalRanking.ts");
const posture = readRequired("lib", "securityPostureRollup.ts");
const assimilationCard = readRequired(
  "components",
  "recon",
  "RepoAssimilationQueueCard.tsx",
);
const postureStrip = readRequired(
  "components",
  "command",
  "SecurityPostureStrip.tsx",
);
const memoryAsk = readRequired("components", "vault", "MemoryAskPanel.tsx");
const commandPage = readRequired("app", "command", "page.tsx");

requireText(apiCache, "listApiRouteCacheStats", "apiCache.ts");
requireText(apiCache, "registryId", "apiCache.ts");
requireText(statusRoute, "listApiRouteCacheStats", "status route");
requireText(statusRoute, "apiRouteCaches", "status route");
requireText(flightsRoute, 'registryId: "flights"', "flights route");
requireText(firesRoute, 'registryId: "fires"', "fires route");
requireText(bridge, "buildRepoCompareHandoffHref", "repoAssimilationBridge.ts");
requireText(bridge, "extractRepoIdsFromBrief", "repoAssimilationBridge.ts");
requireText(ranking, "rankVaultRetrievalCandidates", "vaultRetrievalRanking.ts");
requireText(posture, "buildSecurityPostureRollup", "securityPostureRollup.ts");
requireText(assimilationCard, "repoAssimilationBridge", "RepoAssimilationQueueCard.tsx");
requireText(assimilationCard, "Open repo compare handoff", "RepoAssimilationQueueCard.tsx");
requireText(postureStrip, "buildSecurityPostureRollup", "SecurityPostureStrip.tsx");
requireText(postureStrip, "/api/status", "SecurityPostureStrip.tsx");
requireText(memoryAsk, "rankVaultRetrievalCandidates", "MemoryAskPanel.tsx");
requireText(commandPage, "SecurityPostureStrip", "command page");

console.log(
  "ok nexus-holistic-wave9 (speed caches, security posture, repo bridge, vault ranking)",
);
