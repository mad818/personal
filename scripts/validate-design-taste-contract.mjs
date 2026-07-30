#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
    fail(
      `${label} still uses #fff on accent buttons — use designTokens.textOnAccent`,
    );
  }
}

const tokens = readRequired("lib", "designTokens.ts");
requireText(tokens, "export const designTokens", "designTokens.ts");
requireText(tokens, "nexus-ux7-good", "designTokens.ts");
requireText(tokens, "assimilationDecisionColor", "designTokens.ts");
requireText(tokens, "networkHealthStatusColor", "designTokens.ts");

const watchedFiles = [
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

let lintReport;
try {
  const lintOutput = execFileSync(
    process.execPath,
    [
      path.join(
        root,
        "node_modules",
        "@google",
        "design.md",
        "dist",
        "index.js",
      ),
      "lint",
      "DESIGN.md",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  lintReport = JSON.parse(lintOutput);
} catch (error) {
  const stdout = error?.stdout?.toString?.() ?? "";
  const stderr = error?.stderr?.toString?.() ?? "";
  const detail =
    error instanceof SyntaxError ? error.message : `${stdout}\n${stderr}`;
  fail(`design:lint failed:\n${detail}`);
}

const errorCount = Number(lintReport?.summary?.errors ?? 0);
const warningCount = Number(lintReport?.summary?.warnings ?? 0);
if (errorCount > 0 || warningCount > 0) {
  const findings = (lintReport?.findings ?? [])
    .filter(
      (finding) =>
        finding.severity === "error" || finding.severity === "warning",
    )
    .map((finding) => `${finding.path ?? "DESIGN.md"}: ${finding.message}`)
    .join(" | ");
  fail(
    `design:lint reports ${errorCount} error(s) and ${warningCount} warning(s): ${findings}`,
  );
}

console.log(
  "ok design-taste-contract (semantic tokens + assimilation slice audit)",
);
