#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

function fail(message) {
  console.error(`x design-taste-contract: ${message}`);
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

function forbidHexDrift(source, label) {
  const drift = ["#10b981", "#ef4444", "#f59e0b", "#60a5fa", "#818cf8"];
  for (const hex of drift) {
    if (source.toLowerCase().includes(hex)) {
      fail(`${label} still uses drift hex ${hex} — use lib/designTokens.ts`);
    }
  }
  if (source.includes('color: "#fff"') || source.includes("color: '#fff'")) {
    fail(`${label} still uses #fff on accent buttons — use designTokens.textOnAccent`);
  }
}

const tokens = readRequired("lib", "designTokens.ts");
requireText(tokens, "export const designTokens", "designTokens.ts");
requireText(tokens, "nexus-ux7-good", "designTokens.ts");
requireText(tokens, "assimilationDecisionColor", "designTokens.ts");
requireText(tokens, "networkHealthStatusColor", "designTokens.ts");

const watchedFiles = [
  "components/ops/OpsDensityAlertStrip.tsx",
  "components/ops/OpsDualViewPanel.tsx",
  "components/home/office/MementoCycleStrip.tsx",
  "components/recon/RepoAssimilationQueueCard.tsx",
  "components/command/PrivacyShieldReceiptCard.tsx",
  "components/command/OvernightMissionCard.tsx",
  "components/command/NetworkTopologyPanel.tsx",
  "components/intel/PapersResearchPanel.tsx",
  "components/recon/GeocodingPlaygroundCard.tsx",
  "lib/networkTopology.ts",
];

for (const relativePath of watchedFiles) {
  const source = readRequired(...relativePath.split("/"));
  requireText(source, "designTokens", relativePath);
  forbidHexDrift(source, relativePath);
}

let lintOutput = "";
try {
  lintOutput = execSync("npm run design:lint", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  const stdout = error?.stdout?.toString?.() ?? "";
  const stderr = error?.stderr?.toString?.() ?? "";
  fail(`design:lint failed:\n${stdout}\n${stderr}`);
}

if (lintOutput.includes('"severity": "warning"')) {
  const colorWarnings = (lintOutput.match(/colors\.[^"]+/g) ?? []).length;
  if (colorWarnings > 0) {
    fail(`design:lint still reports unused color token warnings (${colorWarnings})`);
  }
}

console.log("ok design-taste-contract (semantic tokens + assimilation slice audit)");
