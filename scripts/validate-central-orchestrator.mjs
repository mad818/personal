#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) throw new Error(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(content, expected, label) {
  if (!content.includes(expected)) throw new Error(`${label}: missing ${expected}`);
}

const contract = read("lib/centralOrchestrator.ts");
const team = read("lib/teamOrchestration.ts");
const dispatch = read("lib/assistantDispatch.ts");
const agent = read("lib/agent.ts");
const toolsRoute = read("app/api/tools/route.ts");
const office = read("components/home/office/OfficeCommandCenter.tsx");
const policy = read("lib/security/toolCapabilityPolicy.ts");
const spec = read("specs/features/central-ai-orchestrator.md");
const parity = JSON.parse(read("docs/ideas/source-parity/mco-squad.json"));
const packageJson = JSON.parse(read("package.json"));

requireText(contract, "CENTRAL_ORCHESTRATOR_MAX_WORKERS = 3", "worker cap");
requireText(contract, "parseSpecialistHandoff", "handoff parser");
requireText(team, 'const lead: AgentId = "jansky"', "central lead");
requireText(dispatch, "orchestrationPlan", "dispatch integration");
requireText(agent, 'name: "delegate_specialist"', "agent tool");
requireText(agent, "use delegate_specialist for native Nexus worker delegation", "OpenClaw separation");
requireText(toolsRoute, "claimSpecialistDelegationSlot", "server cap");
requireText(toolsRoute, "callInternalAi", "provider boundary");
requireText(office, "<TeamOrchestrationStrip", "HQ plan mount");
requireText(policy, 'delegate_specialist: "analyze"', "tool policy");
requireText(spec, "Workers are advisory", "safety contract");

if (parity.id !== "mco-squad" || parity.status !== "in_progress") {
  throw new Error("mco-squad parity must remain in_progress while useful capabilities are pending");
}
if (!packageJson.scripts?.["orchestrator:runtime:check"]) {
  throw new Error("missing orchestrator runtime check script");
}
if (!String(packageJson.scripts.verify ?? "").includes("orchestrator:check")) {
  throw new Error("verify must include orchestrator:check");
}

console.log("ok central-orchestrator static contract");
