#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x codewhale-obliteratus: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const relative = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${relative} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

function excludeAll(source, label, needles) {
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired(
  "specs",
  "features",
  "codewhale-obliteratus-native-assimilation.md",
);
const runtimeAuthority = readRequired("lib", "runtimeAuthority.ts");
const agent = readRequired("lib", "agent.ts");
const store = readRequired("store", "useStore.ts");
const safetyEvaluation = readRequired("lib", "modelSafetyEvaluation.ts");
const modelLabRoute = readRequired("app", "api", "model-lab", "route.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const codeWhaleParity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "codewhale.json"),
);
const obliteratusParity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "obliteratus.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(spec, "feature spec", [
  "machine-checkable authority order",
  "passive safety evaluation",
  "no weight modification",
  "no remote telemetry",
]);
requireAll(runtimeAuthority, "runtime authority", [
  "NEXUS_RUNTIME_AUTHORITY",
  "NEXUS_PROTECTED_INVARIANTS",
  "buildRuntimeAuthorityPromptBlock",
  "buildRuntimeContinuityReceipt",
  "reconcileRuntimeLifecycle",
  "resolveRuntimeHarnessProfile",
  "interrupted",
  "EVIDENCE",
  "RISKS",
  "BLOCKERS",
]);
requireAll(agent, "agent runtime", [
  "buildRuntimeAuthorityPromptBlock",
  "buildRuntimeContinuityReceipt",
  "continuity,",
]);
requireAll(store, "agent run artifact", [
  "RuntimeContinuityReceipt",
  "continuity: RuntimeContinuityReceipt",
]);
requireAll(safetyEvaluation, "passive safety evaluation", [
  "MODEL_SAFETY_PROHIBITED_CAPABILITIES",
  "buildPassiveModelSafetyRun",
  '"passive-safety"',
  '"disabled"',
  "policyRobustness",
  "harmlessHelpfulness",
]);
requireAll(modelLabRoute, "model lab route", [
  "modelLabCreateRequestSchema.safeParse",
  "buildPassiveModelSafetyRun",
  "flattenZodIssues",
]);
requireAll(routePolicy, "route policy", ["/api/model-lab"]);
excludeAll(modelLabRoute, "model lab route", [
  "child_process",
  "spawn(",
  "exec(",
  "fetch(",
  "trust_remote_code",
]);

for (const matrix of [codeWhaleParity, obliteratusParity]) {
  if (matrix.status !== "complete") fail(`${matrix.id} parity must be complete`);
  if (matrix.capabilities.some((capability) => capability.disposition === "pending")) {
    fail(`${matrix.id} parity still has pending capabilities`);
  }
}

if (
  packageJson.scripts?.["source:codewhale-obliteratus:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-codewhale-obliteratus-runtime.mjs"
) {
  fail("package.json is missing source:codewhale-obliteratus:runtime:check");
}
if (
  packageJson.scripts?.["source:codewhale-obliteratus:check"] !==
  "node scripts/validate-codewhale-obliteratus-native-assimilation.mjs && npm run source:codewhale-obliteratus:runtime:check"
) {
  fail("package.json is missing source:codewhale-obliteratus:check");
}
if (
  !(packageJson.scripts?.verify ?? "").includes(
    "npm run source:codewhale-obliteratus:check",
  )
) {
  fail("verify is missing source:codewhale-obliteratus:check");
}

console.log("ok codewhale-obliteratus");
