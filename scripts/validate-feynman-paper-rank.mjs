#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-paper-rank: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-paper-rank: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

const engine = readRequired("lib", "feynmanPaperRank.ts");
const route = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const commands = readRequired(
  "components",
  "home",
  "office",
  "workflowCommands.ts",
);
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const spec = readRequired("specs", "features", "feynman-paper-rank-triage.md");
const context = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "feynman",
  "REPO_CONTEXT.md",
);
readRequired("docs", "ideas", "repo-analysis", "feynman", "AGENTS.md");
readRequired("docs", "ideas", "repo-analysis", "feynman", ".cursorrules");
readRequired("docs", "ideas", "repo-analysis", "feynman", "response.md");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "feynman.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "topicalRelevance: 0.3",
  "citationImpact: 0.2",
  "graphPrestige: 0.2",
  "citationVelocity: 0.1",
  "methodologyEvidence: 0.1",
  "reproducibility: 0.1",
  "parseFeynmanPaperRankInput",
  "rankFeynmanPapers",
  "formatFeynmanPaperRank",
  "parsed.length < 2 || parsed.length > 25",
  "Missing components are excluded",
  "not peer review",
]) {
  requireText(engine, needle, "rank engine");
}

for (const forbidden of ["fetch(", "callAI", "node:fs", "writeFile"]) {
  if (engine.includes(forbidden)) {
    console.error(
      `x feynman-paper-rank: local engine contains forbidden ${forbidden}`,
    );
    process.exit(1);
  }
}

requireText(route, "parseFeynmanPaperRankInput", "protected tools route");
requireText(route, 'case "feynman_paper_rank"', "protected tools dispatch");
requireText(agent, 'feynman_paper_rank: "tier0"', "agent risk map");
requireText(agent, 'name: "feynman_paper_rank"', "agent tool catalog");
requireText(agent, "FEYNMAN_PAPER_RANK_INTENT_RE", "agent intent routing");
requireText(
  agent,
  'required: ["topic", "candidates_json"]',
  "agent input contract",
);
requireText(commands, 'id: "rank"', "HQ workflow");
requireText(commands, "Do not invent a paper's year", "HQ evidence guardrail");
requireText(policy, 'feynman_paper_rank: "analyze"', "tool capability policy");
requireText(spec, "The tool prioritizes reading", "feature limitations");
requireText(context, "v0.3.5", "current upstream context");

if (parity.source?.version !== "0.3.5") {
  console.error("x feynman-paper-rank: parity source version is not v0.3.5");
  process.exit(1);
}
const rankCapability = parity.capabilities?.find(
  (capability) => capability.id === "paper-read-order-ranking",
);
if (rankCapability?.disposition !== "adapted") {
  console.error("x feynman-paper-rank: PaperRank capability is not adapted");
  process.exit(1);
}
if (parity.status !== "complete") {
  console.error(
    "x feynman-paper-rank: Feynman source parity must be complete",
  );
  process.exit(1);
}

if (
  packageJson.scripts?.["feynman:rank:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-paper-rank-runtime.mjs"
) {
  console.error("x feynman-paper-rank: runtime script is not wired");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:rank:check"] !==
  "node scripts/validate-feynman-paper-rank.mjs && npm run feynman:rank:runtime:check"
) {
  console.error("x feynman-paper-rank: static and runtime proof are not wired");
  process.exit(1);
}
requireText(
  packageJson.scripts?.["feynman:check"] ?? "",
  "npm run feynman:rank:check",
  "canonical Feynman proof",
);

console.log(
  "ok feynman-paper-rank (local deterministic engine, protected tool, HQ workflow, current parity evidence)",
);
