#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x financial-research-source: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireAll(source, label, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) fail(`${label} is missing ${fragment}`);
  }
}

for (const relativePath of [
  "docs/ideas/source-parity/tauricresearch-tradingagents.json",
  "docs/ideas/source-parity/virattt-dexter.json",
]) {
  const matrix = JSON.parse(read(relativePath));
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source?.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} must record the current source review`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrix.id} retains pending capabilities`);
  }
}

requireAll(read("lib/alphaTradeThesis.ts"), "research contract", [
  "analystHandoffs",
  "fundamentals",
  "technical",
  "sentiment",
  "risk",
  "bullCase",
  "bearCase",
  "valuationContext",
  "Conviction scores evidence completeness, not expected return.",
]);
requireAll(read("lib/secCompanyFacts.ts"), "SEC facts", [
  "findSecCompanyIdentity",
  "extractSecCompanyFacts",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "EarningsPerShareDiluted",
]);
requireAll(read("app/api/sec-filings/route.ts"), "SEC route", [
  "fetchCompanyFacts",
  "company_tickers.json",
  "api/xbrl/companyfacts",
  "Promise.allSettled",
]);
requireAll(read("components/alpha/TradeThesisPanel.tsx"), "research panel", [
  "Decision support only",
  "Evidence conviction",
  "Coverage, not return probability",
  "loadFilingEvidence",
  "EvidencePosturePanel",
]);
requireAll(read("components/alpha/PositionSizer.tsx"), "manual risk", [
  "Fixed risk",
  "Kelly",
  "Position value exceeds account size",
]);
requireAll(
  read("specs/features/financial-research-source-closure.md"),
  "spec",
  [
    "Conviction measures evidence completeness only.",
    "Nexus does not place orders",
  ],
);
requireAll(read("package.json"), "package wiring", [
  '"financial-research:source:check"',
  "npm run financial-research:source:check",
  "npm run source:parity:closure:check",
]);

console.log(
  "ok financial-research-source (sec=structured; lenses=4; debate=visible; execution=false; pending=0)",
);
