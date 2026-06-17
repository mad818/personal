#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supportedNodeMajor = "20";
const supportedNodeRange = ">=20 <25";
const supportedNpmRange = ">=10";

function fail(message) {
  console.error(`x ci-node-runtime: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relativePath} is missing`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function listWorkflowFiles() {
  const workflowDir = path.join(root, ".github", "workflows");
  if (!fs.existsSync(workflowDir)) {
    fail(".github/workflows is missing");
  }
  return fs
    .readdirSync(workflowDir)
    .filter((file) => /\.ya?ml$/i.test(file))
    .map((file) => path.join(".github", "workflows", file))
    .sort();
}

function assertPackageMetadata() {
  const packageJson = readJson("package.json");
  if (packageJson.engines?.node !== supportedNodeRange) {
    fail(`package.json engines.node must be ${supportedNodeRange}`);
  }
  if (packageJson.engines?.npm !== supportedNpmRange) {
    fail(`package.json engines.npm must be ${supportedNpmRange}`);
  }
  if (packageJson.scripts?.["ci:node-runtime:check"] !== "node scripts/validate-ci-node-runtime.mjs") {
    fail("package.json must expose ci:node-runtime:check");
  }
  if (!(packageJson.scripts?.verify ?? "").includes("npm run ci:node-runtime:check")) {
    fail("npm run verify must include ci:node-runtime:check");
  }
}

function assertWorkflowNodeVersions() {
  const workflowFiles = listWorkflowFiles();
  let setupNodeReferences = 0;

  for (const relativePath of workflowFiles) {
    const source = read(relativePath);
    const usesNode =
      /actions\/setup-node@/i.test(source) || /\b(npm|node)\s+(ci|run|scripts\/)/i.test(source);
    if (!usesNode) continue;

    if (!/actions\/setup-node@v4/i.test(source)) {
      fail(`${relativePath} must use actions/setup-node@v4 for Node work`);
    }

    const nodeVersions = Array.from(
      source.matchAll(/node-version:\s*['"]?([^'"\r\n#]+)['"]?/gi),
      (match) => match[1].trim(),
    );
    if (!nodeVersions.length) {
      fail(`${relativePath} must declare node-version ${supportedNodeMajor}`);
    }
    for (const nodeVersion of nodeVersions) {
      setupNodeReferences += 1;
      if (nodeVersion !== supportedNodeMajor) {
        fail(`${relativePath} uses node-version ${nodeVersion}; expected ${supportedNodeMajor}`);
      }
    }
  }

  if (setupNodeReferences < 4) {
    fail("expected setup-node coverage for all CI Node workflows");
  }
}

function assertDockerNodeVersion() {
  const dockerfile = read("Dockerfile");
  const nodeImages = Array.from(
    dockerfile.matchAll(/FROM\s+node:(\d+)(?:[-:\w.]*)\s+AS\s+\w+/gi),
    (match) => match[1],
  );
  if (!nodeImages.length) {
    fail("Dockerfile must use explicit node:<major> images");
  }
  for (const imageMajor of nodeImages) {
    if (imageMajor !== supportedNodeMajor) {
      fail(`Dockerfile uses node:${imageMajor}; expected node:${supportedNodeMajor}`);
    }
  }
}

function assertSpec() {
  const spec = read("specs/features/ci-green-node-runtime.md");
  for (const needle of [
    "Node `20`",
    "node:20-alpine",
    "`>=20 <25`",
    "npm run ci:node-runtime:check",
    "No claim that GitHub PR checks are green",
  ]) {
    if (!spec.includes(needle)) {
      fail(`specs/features/ci-green-node-runtime.md must include ${needle}`);
    }
  }
}

assertPackageMetadata();
assertWorkflowNodeVersions();
assertDockerNodeVersion();
assertSpec();

console.log(
  `ok ci-node-runtime (Node ${supportedNodeMajor} in GitHub Actions and Docker; package supports ${supportedNodeRange})`,
);
