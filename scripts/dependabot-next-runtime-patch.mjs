#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const checkOnly = args.includes("--check");

function readArgValue(prefix) {
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function fail(message) {
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(`x dependabot-next-runtime-patch: ${message}`);
  }
  process.exit(1);
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function latestMetric(prefix) {
  if (!existsSync(metricsDir)) return null;
  const file = readdirSync(metricsDir)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".json"))
    .sort()
    .at(-1);
  return file ? `docs/metrics/${file}` : null;
}

function packagePathForName(name) {
  return `node_modules/${name}`;
}

function normalizeVersion(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?/);
  return match?.[0] ?? null;
}

function versionParts(version) {
  return normalizeVersion(version)
    ?.split(/[.+-]/)
    .slice(0, 4)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0)) ?? [];
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index++) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function currentLockVersion(packageName, pkg, lock) {
  const packages =
    lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
  const directLock = packages[packagePathForName(packageName)]?.version;
  if (directLock) return directLock;

  for (const group of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const version = pkg?.[group]?.[packageName];
    if (version) return normalizeVersion(version);
  }

  return null;
}

function runtimeAlerts(audit) {
  const queue = audit?.upgradeQueue?.runtimeCritical;
  if (Array.isArray(queue)) return queue;

  const classified = audit?.classification?.runtimeCritical?.alerts;
  return Array.isArray(classified) ? classified : [];
}

function isDirectNpmPatch(alert) {
  return (
    alert?.ecosystem === "npm" &&
    alert?.retiredManifest !== true &&
    alert?.packageName &&
    alert?.firstPatchedVersion &&
    ["dependencies", "devDependencies", "optionalDependencies"].includes(
      alert?.directDependencyGroup,
    )
  );
}

function installFlag(group) {
  if (group === "dependencies") return "--save";
  if (group === "optionalDependencies") return "--save-optional";
  return "--save-dev";
}

function buildPlan() {
  const auditPath = readArgValue("--audit=") ?? latestMetric("dependabot-security-audit-");
  if (!auditPath) fail("No dependabot-security-audit artifact found.");

  const audit = readJson(auditPath);
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  if (!audit) fail(`${auditPath} is missing or unreadable.`);
  if (!pkg) fail("package.json is missing or unreadable.");
  if (!lock) fail("package-lock.json is missing or unreadable.");

  const skipped = [];
  const candidates = runtimeAlerts(audit).filter(isDirectNpmPatch);
  const target = candidates.find((alert) => {
    const current = currentLockVersion(alert.packageName, pkg, lock);
    const alreadyPatched =
      current && compareVersions(current, alert.firstPatchedVersion) >= 0;
    if (alreadyPatched) {
      skipped.push({
        packageName: alert.packageName,
        alertNumber: alert.alertNumber ?? null,
        current,
        firstPatchedVersion: alert.firstPatchedVersion,
      });
      return false;
    }
    return true;
  });

  const command = target
    ? `npm install ${target.packageName}@${target.firstPatchedVersion} ${installFlag(
        target.directDependencyGroup,
      )} --no-audit --no-fund --legacy-peer-deps --cache .npm-cache`
    : null;

  return {
    ok: true,
    artifact: relative(root, join(root, auditPath)).replace(/\\/g, "/"),
    target: target
      ? {
          alertNumber: target.alertNumber ?? null,
          packageName: target.packageName,
          severity: target.severity ?? "unknown",
          scope: target.scope ?? "unknown",
          dependencyGroup: target.directDependencyGroup,
          currentVersion: currentLockVersion(target.packageName, pkg, lock),
          firstPatchedVersion: target.firstPatchedVersion,
          installCommand: command,
        }
      : null,
    skippedAlreadyPatched: skipped,
    proofCommands: [
      "npm run dependabot:audit:classify -- --alerts=docs\\metrics\\dependabot-alerts-source.json",
      "npm run dependency:risk:check",
      "npm run dependabot:audit:check",
      "npm run validate:infra-hardening",
      "npx tsc --noEmit",
      "npm run verify",
      "npm run build",
    ],
    guardrails: [
      "No npm audit fix --force.",
      "No archive package updates.",
      "No Cargo updates.",
      "No package sweep beyond the selected direct npm runtime alert.",
    ],
  };
}

function printPlan(plan) {
  if (jsonOutput) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  console.log("Dependabot next runtime patch");
  console.log(`Artifact: ${plan.artifact}`);

  if (!plan.target) {
    console.log("No direct npm runtime patch target is currently actionable.");
    console.log("Remaining runtime alerts may be already patched, transitive, non-npm, or blocked.");
    return;
  }

  console.log(
    `Target: ${plan.target.packageName} alert ${plan.target.alertNumber} (${plan.target.severity}, ${plan.target.scope})`,
  );
  console.log(`Current: ${plan.target.currentVersion ?? "unknown"}`);
  console.log(`Patched floor: ${plan.target.firstPatchedVersion}`);
  console.log("");
  console.log("Run from normal PowerShell if this sandbox cannot reach npm:");
  console.log(`  ${plan.target.installCommand}`);
  console.log("");
  console.log("Then prove it:");
  for (const command of plan.proofCommands) {
    console.log(`  ${command}`);
  }
}

const plan = buildPlan();

if (checkOnly) {
  const targetText = plan.target
    ? `${plan.target.packageName}@${plan.target.firstPatchedVersion}`
    : "no direct target";
  console.log(`ok dependabot-next-runtime-patch (${targetText})`);
} else {
  printPlan(plan);
}
