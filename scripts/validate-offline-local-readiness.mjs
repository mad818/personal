#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fail(message) {
  console.error(`❌ offline-local: ${message}`);
  process.exit(1);
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const envExample = readProjectFile(".env.example");
const routePolicy = readProjectFile("lib", "security", "routePolicy.ts");
const productGuarantees = readProjectFile("lib", "productGuarantees.ts");
const readinessTypes = readProjectFile("lib", "freeLocalReadiness.ts");
const operationsTypes = readProjectFile("lib", "freeLocalOperations.ts");
const repoSyncRecovery = readProjectFile("lib", "repoSyncRecovery.ts");
const repoSyncHealthScript = readProjectFile(
  "scripts",
  "repo-sync-health-check.ps1",
);
const gitPermissionRecoveryDoc = readProjectFile(
  "docs",
  "repo-hygiene",
  "git-permission-recovery.md",
);
const readinessRoute = readProjectFile(
  "app",
  "api",
  "free-local-readiness",
  "route.ts",
);
const readinessPanel = readProjectFile(
  "components",
  "ui",
  "FreeLocalReadinessPanel.tsx",
);
const commandPage = readProjectFile("app", "command", "page.tsx");
const hqTerminal = readProjectFile(
  "components",
  "home",
  "office",
  "HQTerminalSection.tsx",
);
const assistantChatActions = readProjectFile("lib", "assistantChatActions.ts");
const assistantRuntimeReceipt = readProjectFile(
  "lib",
  "assistantRuntimeReceipt.ts",
);
const assistantTurnReceipt = readProjectFile(
  "components",
  "assistant",
  "AssistantTurnReceipt.tsx",
);
const globalsCss = readProjectFile("app", "globals.css");
const aiRoute = readProjectFile("app", "api", "ai", "route.ts");

assertIncludes(productGuarantees, "NEXUS_APP_CHARGES_END_USERS = false", "product guarantee");
assertIncludes(routePolicy, 'raw === "isolated"', "route policy network mode parser");
assertIncludes(routePolicy, '"/api/free-local-readiness"', "route policy");
assertIncludes(readinessTypes, "FreeLocalReadinessSnapshot", "readiness types");
assertIncludes(readinessTypes, "PhoneLanReadinessSnapshot", "readiness types");
assertIncludes(operationsTypes, "PhoneAcceptanceChecklist", "free local operations");
assertIncludes(operationsTypes, "buildPhoneAcceptanceBrief", "free local operations");
assertIncludes(operationsTypes, "LocalAiProofSnapshot", "free local operations");
assertIncludes(operationsTypes, "AssistantTurnProof", "free local operations");
assertIncludes(operationsTypes, "RepoSyncHealthReport", "free local operations");
assertIncludes(operationsTypes, "FREE_LOCAL_MAJOR_UPDATES", "free local operations");
assertIncludes(repoSyncRecovery, "RepoSyncRecoveryStep", "repo sync recovery");
assertIncludes(repoSyncRecovery, "REPO_SYNC_HEALTH_COMMAND", "repo sync recovery");
assertIncludes(repoSyncRecovery, "buildRepoSyncHealthReport", "repo sync recovery");
assertIncludes(repoSyncHealthScript, "DENY ACL entries", "repo sync health script");
assertIncludes(repoSyncHealthScript, "Get-Process git", "repo sync health script");
assertIncludes(gitPermissionRecoveryDoc, "Git Permission Recovery", "repo sync recovery doc");
assertIncludes(gitPermissionRecoveryDoc, "icacls .git /remove:d", "repo sync recovery doc");
assertIncludes(readinessRoute, "readProtectedActionContext", "readiness route");
assertIncludes(readinessRoute, "listReachableOllamaModels", "readiness route");
assertIncludes(readinessRoute, "NEXUS_ALLOW_PAID_APIS", "readiness route");
assertIncludes(readinessPanel, 'data-testid="free-local-readiness-panel"', "readiness panel");
assertIncludes(readinessPanel, 'data-testid="free-local-phone-lan-card"', "readiness panel");
assertIncludes(readinessPanel, 'data-testid="free-local-phone-acceptance-checklist"', "readiness panel");
assertIncludes(readinessPanel, 'data-testid="free-local-ai-proof-summary"', "readiness panel");
assertIncludes(readinessPanel, 'data-testid="free-local-major-updates"', "readiness panel");
assertIncludes(readinessPanel, 'data-testid="free-local-repo-sync-report"', "readiness panel");
assertIncludes(readinessPanel, "repoSync.recoverySteps", "readiness panel");
assertIncludes(readinessPanel, "Copy HQ URL", "readiness panel");
assertIncludes(readinessPanel, "Copy acceptance steps", "readiness panel");
assertIncludes(commandPage, "LazyFreeLocalReadinessPanel", "COMMAND route");
assertIncludes(hqTerminal, "FreeLocalReadinessPanel", "HQ chronicle");
assertIncludes(hqTerminal, 'data-testid="hq-check-local-ai"', "HQ local AI chip");
assertIncludes(assistantChatActions, "AssistantRuntimeReceipt", "assistant runtime receipt");
assertIncludes(assistantChatActions, "paidApisAllowed", "assistant runtime receipt");
assertIncludes(assistantRuntimeReceipt, "/api/free-local-readiness", "assistant runtime receipt loader");
assertIncludes(assistantTurnReceipt, "nexus-assistant-turn-receipt", "assistant turn receipt UI");
assertIncludes(globalsCss, ".nexus-assistant-turn-receipt", "assistant turn receipt CSS");
assertIncludes(globalsCss, ".nexus-free-local-readiness__details", "mobile readiness details CSS");
assertIncludes(aiRoute, "ollama_unavailable", "structured AI failures");
assertIncludes(aiRoute, "paid_provider_blocked", "structured AI failures");
assertIncludes(envExample, "NEXUS_NETWORK_MODE=isolated", "env example");
assertIncludes(envExample, "NEXUS_ALLOW_PAID_APIS=false", "env example");

if (!packageJson.scripts?.["offline:local:check"]) {
  fail("package.json is missing offline:local:check");
}

if (!packageJson.scripts?.["repo:sync:health"]) {
  fail("package.json is missing repo:sync:health");
}

console.log(
  "Offline local readiness OK (free invariant, isolated policy, Ollama readiness API, UI panel, structured AI failures, and repo-sync recovery wired).",
);
