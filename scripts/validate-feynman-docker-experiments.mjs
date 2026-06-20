#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-docker: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-docker: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

function requireAbsent(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`x feynman-docker: ${label} must NOT contain "${needle}"`);
    process.exit(1);
  }
}

const dockerLib = readRequired("lib", "feynmanDockerExperiments.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const isolation = readRequired("lib", "security", "toolIsolationPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-docker-experiments.md");

// lib exports
for (const needle of [
  "validateDockerImage",
  "buildDockerFlags",
  "runDockerExperiment",
  "formatDockerManifest",
  "FEYNMAN_DOCKER_LIMITS",
  "DOCKER_IMAGE_ALLOWLIST",
  "DockerRunManifest",
  "FeynmanDockerExperimentsDeps",
]) {
  requireText(dockerLib, needle, "feynmanDockerExperiments.ts");
}

// Security model
requireText(dockerLib, "approve", "approve gate");
requireText(dockerLib, "NEXUS_FEYNMAN_DOCKER_APPROVED", "env var gate");
requireText(dockerLib, "--read-only", "read-only flag");
requireText(dockerLib, "--network=none", "network isolation");
requireText(dockerLib, "--cap-drop=ALL", "cap-drop flag");
requireText(dockerLib, "--security-opt=no-new-privileges", "no-new-privileges flag");
requireText(dockerLib, "maximumOutputBytes", "output limit");
requireText(dockerLib, "maximumTimeoutMs", "timeout cap");
requireText(dockerLib, "dryRun", "dry-run field");

// "--privileged" must NEVER appear as a flag pushed into the flags array
requireAbsent(dockerLib, 'push("--privileged")', "no-privileged push guard");
requireAbsent(dockerLib, '"--privileged"', "no-privileged string literal guard");

// Route case
requireText(tools, 'case "feynman_docker_experiment"', "tools route case");
requireText(tools, "runDockerExperiment", "route import");
requireText(tools, "formatDockerManifest", "route import");

// Policy registration
requireText(policy, 'feynman_docker_experiment: "exec"', "capability policy exec class");
requireText(isolation, '"feynman_docker_experiment"', "isolation allowlist");

// Spec guardrails
requireText(spec, "fail closed", "spec security model");
requireText(spec, "approve", "spec approve gate");
requireText(spec, "NEXUS_FEYNMAN_DOCKER_APPROVED", "spec env gate");
requireText(spec, "--privileged", "spec no-privileged requirement");
requireText(spec, "--read-only", "spec read-only requirement");

// Parity disposition
const capability = parity.capabilities?.find(
  (entry) => entry.id === "docker-isolated-experiments",
);
if (capability?.disposition !== "adapted") {
  console.error(
    `x feynman-docker: parity row disposition must be "adapted", got "${capability?.disposition}"`,
  );
  process.exit(1);
}

// Package scripts
if (
  packageJson.scripts?.["feynman:docker:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-docker-experiments-runtime.mjs"
) {
  console.error("x feynman-docker: runtime package script is missing or incorrect");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:docker:check"] !==
  "node scripts/validate-feynman-docker-experiments.mjs && npm run feynman:docker:runtime:check"
) {
  console.error("x feynman-docker: package check script is missing or incorrect");
  process.exit(1);
}
if (!packageJson.scripts?.["feynman:check"]?.includes("feynman:docker:check")) {
  console.error("x feynman-docker: feynman:check must include feynman:docker:check");
  process.exit(1);
}

console.log("ok feynman-docker-experiments (image allowlist, approve gate, env gate, safety flags, no-privileged, exec policy, isolation, parity, scripts)");
