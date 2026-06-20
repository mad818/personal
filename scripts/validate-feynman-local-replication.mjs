#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-replication: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-replication: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

const replicator = readRequired("lib", "feynmanLocalReplication.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const isolation = readRequired("lib", "security", "toolIsolationPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-local-replication.md");

// lib exports
for (const needle of [
  "validateReplicationScriptPath",
  "runReplicationScript",
  "formatReplicationResult",
  "FEYNMAN_REPLICATION_LIMITS",
  "REPLICATION_SCRIPT_ALLOWLIST",
  "ReplicationResult",
  "FeynmanLocalReplicationDeps",
]) {
  requireText(replicator, needle, "feynmanLocalReplication.ts");
}

// Security model present in lib
requireText(replicator, "approve", "approve gate");
requireText(replicator, "NEXUS_REPLICATION_APPROVED", "env injection");
requireText(replicator, "shell: false", "no-shell flag");
requireText(replicator, "maximumOutputBytes", "output limit");
requireText(replicator, "maximumTimeoutMs", "timeout cap");

// Route case
requireText(tools, 'case "feynman_replicate_run"', "tools route case");
requireText(tools, "runReplicationScript", "route import");
requireText(tools, "formatReplicationResult", "route import");

// Policy registration
requireText(policy, 'feynman_replicate_run: "exec"', "capability policy exec class");
requireText(isolation, '"feynman_replicate_run"', "isolation allowlist");

// Spec guardrail
requireText(spec, "fail closed", "spec security model");
requireText(spec, "approve", "spec approve gate");

// Parity disposition
const capability = parity.capabilities?.find(
  (entry) => entry.id === "local-replication-execution",
);
if (capability?.disposition !== "adapted") {
  console.error(
    `x feynman-replication: parity row disposition must be "adapted", got "${capability?.disposition}"`,
  );
  process.exit(1);
}

// Package scripts
if (
  packageJson.scripts?.["feynman:replication:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-local-replication-runtime.mjs"
) {
  console.error("x feynman-replication: runtime package script is missing or incorrect");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:replication:check"] !==
  "node scripts/validate-feynman-local-replication.mjs && npm run feynman:replication:runtime:check"
) {
  console.error("x feynman-replication: package check script is missing or incorrect");
  process.exit(1);
}
if (!packageJson.scripts?.["feynman:check"]?.includes("feynman:replication:check")) {
  console.error("x feynman-replication: feynman:check must include feynman:replication:check");
  process.exit(1);
}

console.log("ok feynman-local-replication (allowlist, approve gate, exec policy, isolation, parity, scripts)");
