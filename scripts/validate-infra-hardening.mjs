#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function fail(findings, message) {
  findings.push(message);
}

function checkPackageScript(pkg, scriptName, expectedCommand, findings) {
  const actual = pkg.scripts?.[scriptName];
  if (!actual) {
    fail(findings, `Missing package script: ${scriptName}`);
    return;
  }
  if (expectedCommand && actual !== expectedCommand) {
    fail(
      findings,
      `Package script ${scriptName} should be "${expectedCommand}" but is "${actual}"`,
    );
  }
}

function checkFile(relativePath, findings) {
  if (!existsSync(join(root, relativePath))) {
    fail(findings, `Missing hardening file: ${relativePath}`);
  }
}

function checkScriptContains(pkg, scriptName, requiredFragment, findings) {
  const script = pkg.scripts?.[scriptName] ?? "";
  if (!script.includes(requiredFragment)) {
    fail(
      findings,
      `Package script ${scriptName} must include "${requiredFragment}"`,
    );
  }
}

function checkTextContains(relativePath, requiredFragment, findings) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(findings, `Missing file for text check: ${relativePath}`);
    return;
  }
  const text = readFileSync(fullPath, "utf8");
  if (!text.includes(requiredFragment)) {
    fail(findings, `${relativePath} must include "${requiredFragment}"`);
  }
}

function latestMetric(prefix) {
  const metricsDir = join(root, "docs", "metrics");
  if (!existsSync(metricsDir)) return null;
  const file = readdirSync(metricsDir)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".json"))
    .sort()
    .at(-1);
  if (!file) return null;
  return readJson(join("docs", "metrics", file));
}

function checkDependabotArtifact(findings) {
  const artifact = latestMetric("dependabot-security-audit-");
  if (!artifact) {
    fail(findings, "Missing Dependabot security audit artifact.");
    return;
  }
  const classification = artifact.classification ?? {};
  for (const key of ["runtimeCritical", "devOnly", "transitive", "blockedDeferred"]) {
    if (!classification[key]) {
      fail(findings, `Dependabot artifact missing classification.${key}`);
    }
  }
  if (!artifact.upgradePolicy) {
    fail(findings, "Dependabot artifact missing upgradePolicy.");
  }
  if (!artifact.metadataSource) {
    fail(findings, "Dependabot artifact missing metadataSource.");
  }
}

function checkInfraHardeningArtifact(findings) {
  const artifact = latestMetric("infra-hardening-");
  if (!artifact) {
    fail(findings, "Missing infra hardening artifact.");
    return;
  }
  if (!Array.isArray(artifact.checks)) {
    fail(findings, "Infra hardening artifact missing checks array.");
  }
  if (!Array.isArray(artifact.criticalFailures)) {
    fail(findings, "Infra hardening artifact missing criticalFailures array.");
  }
  if (typeof artifact.hardeningReady !== "boolean") {
    fail(findings, "Infra hardening artifact missing hardeningReady boolean.");
  }
  if (!artifact.releasePrerequisites) {
    fail(findings, "Infra hardening artifact missing releasePrerequisites.");
  }
}

function main() {
  const findings = [];
  const pkg = readJson("package.json");

  checkPackageScript(
    pkg,
    "dependency:risk:posture",
    "node scripts/dependency-risk-posture.mjs",
    findings,
  );
  checkPackageScript(
    pkg,
    "dependency:risk:check",
    "node scripts/dependency-risk-posture.mjs --check",
    findings,
  );
  checkPackageScript(
    pkg,
    "archive:manifest:check",
    "node scripts/validate-archive-manifest-quarantine.mjs",
    findings,
  );
  checkPackageScript(
    pkg,
    "validate:infra-hardening",
    "npm run archive:manifest:check && npm run dependabot:audit:check && npm run dependency:security:check && npm run dependabot:open:closure:check && node scripts/validate-infra-hardening.mjs",
    findings,
  );
  checkFile("scripts/validate-archive-manifest-quarantine.mjs", findings);
  checkPackageScript(
    pkg,
    "dependabot:audit:check",
    "node scripts/validate-dependabot-security-audit.mjs",
    findings,
  );
  checkPackageScript(
    pkg,
    "dependabot:open:closure:check",
    "node scripts/validate-dependabot-open-alert-closure.mjs && node scripts/dependabot-open-alert-closure.mjs --check",
    findings,
  );
  checkFile("scripts/dependabot-open-alert-closure.mjs", findings);
  checkFile("scripts/validate-dependabot-open-alert-closure.mjs", findings);
  checkFile("scripts/dependency-risk-posture.mjs", findings);
  checkPackageScript(
    pkg,
    "dependency:security:check",
    "node scripts/validate-active-dependency-security-patches.mjs",
    findings,
  );
  checkFile("scripts/validate-active-dependency-security-patches.mjs", findings);
  checkPackageScript(
    pkg,
    "security:boundaries",
    "node scripts/validate-security-boundaries.mjs",
    findings,
  );
  checkFile("scripts/validate-security-boundaries.mjs", findings);
  checkPackageScript(
    pkg,
    "infra:hardening:audit",
    "node scripts/infra-hardening-audit.mjs",
    findings,
  );
  checkFile("scripts/infra-hardening-audit.mjs", findings);
  checkScriptContains(pkg, "verify", "npm run security:boundaries", findings);
  checkScriptContains(pkg, "verify", "npm run dependency:risk:check", findings);
  checkScriptContains(pkg, "verify", "npm run validate:infra-hardening", findings);
  checkTextContains(".husky/pre-push", "npm run validate:infra-hardening", findings);
  checkTextContains("scripts/readiness-rollup.mjs", "infra-hardening-", findings);
  checkDependabotArtifact(findings);
  checkInfraHardeningArtifact(findings);

  if (findings.length > 0) {
    console.log(`Infra hardening validation found ${findings.length} issue(s):`);
    for (const finding of findings) {
      console.log(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log("Infra hardening validation OK.");
}

main();
