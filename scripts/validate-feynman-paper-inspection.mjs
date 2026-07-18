#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-paper-inspection: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(
      `x feynman-paper-inspection: ${label} is missing ${needle}`,
    );
    process.exit(1);
  }
}

const inspector = readRequired("lib", "feynmanPaperInspection.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "feynman.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired(
  "specs",
  "features",
  "feynman-public-paper-inspection.md",
);

for (const needle of [
  "normalizeFeynmanPaperReference",
  "parseFeynmanPaperSections",
  "extractFeynmanPaperMetadata",
  "extractFeynmanPaperSections",
  "extractFeynmanPaperRepositoryLinks",
  "inspectFeynmanPaper",
  "formatFeynmanPaperInspection",
  "maximumMetadataBytes",
  "maximumFullTextBytes",
  "maximumSectionChars",
  "maximumFormattedChars",
  'redirect: "error"',
]) {
  requireText(inspector, needle, "inspection engine");
}
requireText(tools, 'case "feynman_paper_inspect"', "tools route");
requireText(agent, 'name: "feynman_paper_inspect"', "agent tool catalog");
requireText(agent, 'feynman_paper_inspect: "tier0"', "agent risk map");
requireText(
  agent,
  "FEYNMAN_PAPER_INSPECTION_INTENT_RE",
  "NOVA/JANSKY intent routing",
);
requireText(
  policy,
  'feynman_paper_inspect: "networked"',
  "network policy",
);
for (const guardrail of [
  "no API key",
  "paper annotation",
  "repository read",
  "code execution",
]) {
  requireText(spec, guardrail, "feature guardrail");
}

const capability = parity.capabilities?.find(
  (entry) => entry.id === "public-paper-metadata-and-section-inspection",
);
if (capability?.disposition !== "adapted") {
  console.error(
    "x feynman-paper-inspection: public paper inspection parity row must be adapted",
  );
  process.exit(1);
}
const pendingPaperTools = parity.capabilities?.find(
  (entry) => entry.id === "semantic-paper-search-and-annotations",
);
if (pendingPaperTools?.disposition !== "pending") {
  console.error(
    "x feynman-paper-inspection: semantic search and annotations must remain pending",
  );
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper-inspection:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-paper-inspection-runtime.mjs"
) {
  console.error(
    "x feynman-paper-inspection: runtime package script is missing",
  );
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper-inspection:check"] !==
  "node scripts/validate-feynman-paper-inspection.mjs && npm run feynman:paper-inspection:runtime:check"
) {
  console.error(
    "x feynman-paper-inspection: package check script is missing",
  );
  process.exit(1);
}

console.log(
  "ok feynman-paper-inspection (bounded public arXiv metadata/sections, protected tool, honest parity split)",
);
