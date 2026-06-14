#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-progressive: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`x feynman-progressive: ${label} is missing ${needle}`);
      process.exit(1);
    }
  }
}

const progressive = readRequired("lib", "feynmanProgressiveResearch.ts");
const research = readRequired("lib", "feynmanResearch.ts");
const runtime = readRequired("scripts", "check-feynman-progressive-research-runtime.mjs");
const parity = readRequired("docs", "ideas", "source-parity", "feynman.json");
const spec = readRequired("specs", "features", "feynman-progressive-research.md");
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(progressive, "progressive collector", [
  "FeynmanProgressiveCoverage",
  "DEFAULT_FEYNMAN_COVERAGE_POLICY",
  "buildInitialFeynmanResearchQueries",
  "buildRefinementFeynmanResearchQueries",
  "renderFeynmanResearchQuery",
  "prioritizeFeynmanCandidateUrls",
  "assessFeynmanCoverage",
  "runFeynmanProgressiveResearch",
  "Promise.allSettled",
  "maximumQueryWaves",
  "maximumDirectReads",
]);
requireAll(research, "engine integration", [
  "runFeynmanProgressiveResearch",
  "coverage:",
  "Coverage sufficient:",
  "Query waves:",
  "coverage.sufficient",
]);
requireAll(runtime, "runtime proof", [
  "maxActiveSearches",
  "maxActiveReads",
  "refinementRequired",
  "hard caps",
]);
requireAll(parity, "source parity", [
  '"parallel-progressive-research"',
  '"scripts/check-feynman-progressive-research-runtime.mjs"',
]);
requireAll(spec, "feature guardrails", [
  "No third search wave",
  "A weak collection pass must degrade the Researcher stage honestly",
]);

if (
  packageJson.scripts?.["feynman:progressive:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-progressive-research-runtime.mjs"
) {
  console.error("x feynman-progressive: package.json is missing feynman:progressive:runtime:check");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:progressive:check"] !==
  "node scripts/validate-feynman-progressive-research.mjs && npm run feynman:progressive:runtime:check"
) {
  console.error("x feynman-progressive: package.json is missing feynman:progressive:check");
  process.exit(1);
}
requireAll(packageJson.scripts?.["feynman:check"] ?? "", "feynman check wiring", [
  "npm run feynman:progressive:check",
]);

console.log("ok feynman-progressive-research (bounded parallel collection, refinement, coverage, parity wiring)");
