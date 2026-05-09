#!/usr/bin/env node
/* eslint-disable no-console */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");

const knownWarning = {
  source: "github-push-warning",
  repository: "mad818/personal",
  totalAlerts: 75,
  severityCounts: {
    critical: 3,
    high: 23,
    moderate: 39,
    low: 10,
  },
  note:
    "Push output reported a Dependabot warning on the default branch. Detailed alert metadata was not reachable from this Codex shell.",
};

function readJson(file) {
  try {
    return JSON.parse(readFileSync(join(root, file), "utf8"));
  } catch {
    return null;
  }
}

function countKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function buildPackageGraphSummary() {
  const pkg = readJson("package.json") ?? {};
  const lock = readJson("package-lock.json") ?? {};
  const packages = lock.packages && typeof lock.packages === "object"
    ? Object.keys(lock.packages).filter(Boolean)
    : [];

  return {
    directDependencies: countKeys(pkg.dependencies),
    directDevDependencies: countKeys(pkg.devDependencies),
    lockfilePackages: packages.length,
    lockfilePresent: Boolean(lock.lockfileVersion),
  };
}

function latestMetric(prefix) {
  if (!existsSync(metricsDir)) return null;
  const file = readdirSync(metricsDir)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".json"))
    .sort()
    .at(-1);
  if (!file) return null;
  return {
    file: `docs/metrics/${file}`,
    data: readJson(`docs/metrics/${file}`),
  };
}

function buildMetadataSource(dependencyPosture) {
  return {
    githubReachable: false,
    localGraphAvailable: Boolean(dependencyPosture?.data?.packageGraph),
    manualMetadataRequired: true,
    dependencyPostureArtifact: dependencyPosture?.file ?? null,
    requiredFields: [
      "package name",
      "manifest path",
      "ecosystem",
      "severity",
      "vulnerable range",
      "patched range",
      "direct or transitive ownership",
      "runtime or dev-only impact",
    ],
  };
}

function buildUpgradePolicy() {
  return {
    order: [
      "Classify runtime-critical alerts first.",
      "Patch one minimal dependency batch at a time.",
      "Prefer patched minor/patch ranges before major-version sweeps.",
      "Run npm run dependency:risk:posture and npm run verify after each batch.",
      "Regenerate sanitized audit artifacts before committing.",
    ],
    blockedUntil: [
      "GitHub Dependabot metadata identifies package names and patched ranges.",
      "A rollback point is visible in git status/log.",
      "Publication safety and security scan pass on the staged state.",
    ],
    forbiddenInAuditOnlyPass: [
      "Package upgrades",
      "Auth loosening",
      "Provider bypass",
      "Public route widening",
      "Committing private proof values",
    ],
  };
}

function buildClassification() {
  const unavailableReason =
    "Dependabot alert package metadata is unavailable from this shell because GitHub access is blocked; category counts stay pending until the GitHub UI or API can be queried.";

  return {
    runtimeCritical: {
      status: "pending_metadata",
      count: null,
      description:
        "Alerts affecting production runtime packages or build output. Must be identified from Dependabot package metadata before upgrades begin.",
      blockers: [unavailableReason],
    },
    devOnly: {
      status: "pending_metadata",
      count: null,
      description:
        "Alerts isolated to test, lint, build, or local tooling packages. Keep separate from acceptance proof unless they block verification.",
      blockers: [unavailableReason],
    },
    transitive: {
      status: "pending_metadata",
      count: null,
      description:
        "Alerts brought in through nested dependencies. Prefer minimal parent-package updates after runtime-critical scope is known.",
      blockers: [unavailableReason],
    },
    blockedDeferred: {
      status: "blocked",
      count: knownWarning.totalAlerts,
      description:
        "All known alerts remain deferred as a metadata-only audit lane until GitHub Dependabot details are reachable.",
      blockers: [unavailableReason],
    },
  };
}

function main() {
  mkdirSync(metricsDir, { recursive: true });

  const capturedAt = new Date().toISOString();
  const dependencyPosture = latestMetric("dependency-risk-posture-");
  const artifact = {
    capturedAt,
    auditName: "DEPENDABOT-SECURITY-AUDIT",
    source: {
      mode: "metadata-starter",
      githubReachableFromCodex: false,
      upgradesPerformed: false,
    },
    knownWarning,
    packageGraph: buildPackageGraphSummary(),
    dependencyPosture: dependencyPosture?.data
      ? {
          artifact: dependencyPosture.file,
          riskReady: dependencyPosture.data.riskReady === true,
          blocked: dependencyPosture.data.blocked ?? [],
          warnings: dependencyPosture.data.warnings ?? [],
          packageGraph: dependencyPosture.data.packageGraph ?? null,
        }
      : null,
    metadataSource: buildMetadataSource(dependencyPosture),
    classification: buildClassification(),
    upgradePolicy: buildUpgradePolicy(),
    blocked: [
      "GitHub Dependabot alert details are not reachable from this Codex shell.",
      "No dependency upgrades were performed in this acceptance tranche.",
      "Run the GitHub Dependabot UI or API from a network-enabled session to fill package names, vulnerable ranges, patched ranges, and direct/transitive ownership.",
    ],
    auditReady: false,
    nextCommand:
      "Review GitHub Dependabot metadata, classify alerts into runtime-critical, dev-only, transitive, and blocked/deferred, then run npm run verify after any minimal package update.",
  };

  const fileName = `dependabot-security-audit-${capturedAt.replace(/[:.]/g, "-")}.json`;
  const outPath = join(metricsDir, fileName);
  writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

  const displayPath = relative(root, outPath).replace(/\\/g, "/");
  console.log(`Dependabot security audit starter written: ${displayPath}`);
  console.log(
    `Known warning captured: ${knownWarning.totalAlerts} alerts (${knownWarning.severityCounts.critical} critical, ${knownWarning.severityCounts.high} high, ${knownWarning.severityCounts.moderate} moderate, ${knownWarning.severityCounts.low} low).`,
  );
  if (!existsSync(join(root, "package-lock.json"))) {
    console.log("Warning: package-lock.json was not found for package graph summary.");
  }
}

main();
