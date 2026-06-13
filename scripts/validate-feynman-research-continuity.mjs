#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-continuity: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`x feynman-continuity: ${label} is missing ${needle}`);
      process.exit(1);
    }
  }
}

const continuity = readRequired("lib", "feynmanContinuity.ts");
const store = readRequired("lib", "feynmanContinuityStore.ts");
const research = readRequired("lib", "feynmanResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const route = readRequired("app", "api", "feynman", "artifacts", "route.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const parity = readRequired("docs", "ideas", "source-parity", "feynman.json");
const spec = readRequired("specs", "features", "feynman-research-continuity.md");
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(continuity, "continuity contract", [
  "createFeynmanSessionId",
  "isSafeFeynmanSessionId",
  "rankFeynmanSessions",
  "buildFeynmanResumeContext",
  "buildFeynmanPreviewHtml",
  "buildFeynmanPdf",
]);
requireAll(store, "continuity store", [
  "agent-workspace",
  "startFeynmanContinuitySession",
  "appendFeynmanNotebookEntry",
  "completeFeynmanContinuitySession",
  "searchFeynmanContinuitySessions",
  "readFeynmanContinuityArtifact",
  "provenance.json",
  "report.pdf",
]);
requireAll(research, "research progress", [
  "FeynmanResearchProgressEvent",
  "progress?:",
  "emitProgress",
]);
requireAll(tools, "tools integration", [
  "startFeynmanContinuitySession",
  "completeFeynmanContinuitySession",
  "searchFeynmanContinuitySessions",
  'case "search"',
  'case "resume"',
  'case "export"',
]);
requireAll(agent, "agent contract", [
  "Search, resume, preview, or export real Feynman-native research sessions",
  "action:",
  "session_id:",
]);
requireAll(route, "artifact route", [
  "readFeynmanContinuityArtifact",
  "Content-Disposition",
  "X-Content-Type-Options",
]);
requireAll(routePolicy, "route policy", [
  'prefix: "/api/feynman/artifacts"',
  'routeClass: "local_only"',
  "public: false",
]);
requireAll(parity, "source parity", [
  '"session-search-resume"',
  '"session-log-lab-notebook"',
  '"externalized-plan-and-intermediate-artifacts"',
  '"provenance-sidecar"',
  '"preview-and-pdf-export"',
]);
requireAll(spec, "feature guardrails", [
  "No arbitrary output directory",
  "Continuity writes are best-effort",
]);

if (
  packageJson.scripts?.["feynman:continuity:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-continuity-runtime.mjs"
) {
  console.error("x feynman-continuity: package.json is missing feynman:continuity:runtime:check");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:continuity:check"] !==
  "node scripts/validate-feynman-research-continuity.mjs && npm run feynman:continuity:runtime:check"
) {
  console.error("x feynman-continuity: package.json is missing feynman:continuity:check");
  process.exit(1);
}
requireAll(packageJson.scripts?.["feynman:check"] ?? "", "feynman check wiring", [
  "npm run feynman:continuity:check",
]);

console.log("ok feynman-research-continuity (storage, tool, protected export, and parity wiring)");
