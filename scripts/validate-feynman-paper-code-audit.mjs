#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-paper-code-audit: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-paper-code-audit: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

const auditLib = readRequired("lib", "feynmanPaperCodeAudit.ts");
const progressiveResearch = readRequired("lib", "feynmanProgressiveResearch.ts");
const feynmanResearch = readRequired("lib", "feynmanResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-paper-code-audit.md");

for (const needle of [
  "normalizeGitHubRepo",
  "resolveRepoFromPaperMetadata",
  "fetchRepoReadme",
  "fetchRepoFileTree",
  "extractClaimTerms",
  "selectClaimAlignedFiles",
  "fetchFileSnippet",
  "auditClaimsAgainstCode",
  "formatPaperCodeAuditReport",
  "runPaperCodeAudit",
  "inspectPaperCodeAuditTopic",
  "FEYNMAN_PAPER_CODE_AUDIT_LIMITS",
  "maximumFormattedChars",
  "maximumSnippetFiles",
  "maximumClaimTerms",
]) {
  requireText(auditLib, needle, "audit lib");
}

requireText(progressiveResearch, "inspectPaperCodeAudit", "progressive research integration");
requireText(feynmanResearch, "inspectPaperCodeAudit", "feynman research deps");
requireText(tools, 'case "paper_code_audit"', "tools route");
requireText(tools, "inspectPaperCodeAuditTopic", "tools route feynman integration");
requireText(agent, 'name: "paper_code_audit"', "agent tool catalog");
requireText(agent, 'paper_code_audit: "tier0"', "agent risk map");
requireText(policy, 'paper_code_audit: "networked"', "network policy");
requireText(spec, "Public repos only", "feature guardrail");
requireText(spec, "No AI in lib", "no-AI guardrail");

const capability = parity.capabilities?.find(
  (entry) => entry.id === "paper-code-audit",
);
if (capability?.disposition !== "adapted") {
  console.error("x feynman-paper-code-audit: parity row must be adapted");
  process.exit(1);
}
if (capability?.proof?.length < 1) {
  console.error("x feynman-paper-code-audit: parity row must have proof entries");
  process.exit(1);
}

if (
  packageJson.scripts?.["feynman:paper-code-audit:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-paper-code-audit-runtime.mjs"
) {
  console.error("x feynman-paper-code-audit: runtime package script is missing");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper-code-audit:check"] !==
  "node scripts/validate-feynman-paper-code-audit.mjs && npm run feynman:paper-code-audit:runtime:check"
) {
  console.error("x feynman-paper-code-audit: package check script is missing");
  process.exit(1);
}
if (!packageJson.scripts?.["feynman:check"]?.includes("feynman:paper-code-audit:check")) {
  console.error("x feynman-paper-code-audit: feynman:check must include feynman:paper-code-audit:check");
  process.exit(1);
}

console.log("ok feynman-paper-code-audit (bounded public github audit, no AI, protected tool, Feynman integration, parity)");
