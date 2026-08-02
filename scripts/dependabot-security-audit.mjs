#!/usr/bin/env node
/* eslint-disable no-console */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const args = process.argv.slice(2);
const alertImportArg = readArgValue("--alerts=");
const dryRun = args.includes("--dry-run");
const dependabotAlertExportCommand =
  'gh api --paginate --slurp -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2026-03-10" "/repos/mad818/personal/dependabot/alerts?state=open&per_page=100" > docs\\metrics\\dependabot-alerts-source.json';

const knownWarning = {
  source: "github-push-warning",
  repository: "mad818/personal",
  historical: true,
  observedBefore: "2026-05-25T05:52:26.760Z",
  totalAlerts: 75,
  severityCounts: {
    critical: 3,
    high: 23,
    moderate: 39,
    low: 10,
  },
  note:
    "Historical push output reported this Dependabot warning. These counts are preserved for audit history and must not be treated as the current open-alert state.",
};

const severityOrder = {
  critical: 4,
  high: 3,
  moderate: 2,
  medium: 2,
  low: 1,
  unknown: 0,
};

function readArgValue(prefix) {
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(join(root, file), "utf8"));
  } catch {
    return null;
  }
}

function readJsonPath(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function countKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function projectPath(input) {
  if (!input) return null;
  return isAbsolute(input) ? input : join(root, input);
}

function packagePathForName(name) {
  return `node_modules/${name}`;
}

function normalizeManifestPath(manifestPath) {
  return typeof manifestPath === "string" ? manifestPath.replace(/\\/g, "/") : null;
}

function isRetiredManifest(manifestPath) {
  const normalized = normalizeManifestPath(manifestPath);
  return Boolean(normalized?.startsWith("archive/"));
}

function archiveManifestQuarantineStatus() {
  const liveManifests = [
    "archive/package.json",
    "archive/pnpm-lock.yaml",
    "archive/package-lock.json",
    "archive/yarn.lock",
  ];
  const archivedFiles = [
    "archive/package.archived.json",
    "archive/pnpm-lock.archived.yaml",
  ];
  const liveManifestsPresent = liveManifests.filter((file) => existsSync(join(root, file)));
  const archivedFilesPresent = archivedFiles.filter((file) => existsSync(join(root, file)));

  return {
    quarantined: liveManifestsPresent.length === 0 && archivedFilesPresent.length === archivedFiles.length,
    liveManifestsPresent,
    archivedFilesPresent,
    note:
      "Retired archive dependency files are preserved under non-manifest names so GitHub does not treat them as active package manifests after rescan.",
  };
}

function directDependencyGroups(pkg) {
  const groups = new Map();
  for (const group of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const name of Object.keys(pkg[group] ?? {})) {
      groups.set(name, group);
    }
  }
  return groups;
}

function packageLockPackages(lock) {
  return lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
}

function lockEntriesForPackage(lockPackages, packageName) {
  if (!packageName) return [];
  const directPath = packagePathForName(packageName);
  return Object.entries(lockPackages)
    .filter(([packagePath]) => {
      return (
        packagePath === directPath ||
        packagePath.endsWith(`/node_modules/${packageName}`)
      );
    })
    .map(([packagePath, meta]) => ({ packagePath, meta: meta ?? {} }));
}

function buildPackageGraphSummary() {
  const pkg = readJson("package.json") ?? {};
  const lock = readJson("package-lock.json") ?? {};
  const packages = Object.keys(packageLockPackages(lock)).filter(Boolean);

  return {
    directDependencies: countKeys(pkg.dependencies),
    directDevDependencies: countKeys(pkg.devDependencies),
    lockfilePackages: packages.length,
    lockfilePresent: Boolean(lock.lockfileVersion),
  };
}

function findLatestAlertImport() {
  if (!existsSync(metricsDir)) return null;
  const file = readdirSync(metricsDir)
    .filter((entry) => entry.startsWith("dependabot-alerts-source") && entry.endsWith(".json"))
    .sort()
    .at(-1);
  return file ? join(metricsDir, file) : null;
}

function parseAlertImport(raw) {
  if (Array.isArray(raw)) {
    return raw.flat().filter((entry) => entry && typeof entry === "object");
  }
  if (raw?.alerts && Array.isArray(raw.alerts)) {
    return raw.alerts.filter((entry) => entry && typeof entry === "object");
  }
  if (raw?.data && Array.isArray(raw.data)) {
    return raw.data.filter((entry) => entry && typeof entry === "object");
  }
  return [];
}

function loadAlertImport() {
  const requestedPath = projectPath(alertImportArg);
  const fallbackPath = requestedPath ?? findLatestAlertImport();
  if (!fallbackPath || !existsSync(fallbackPath)) {
    return null;
  }

  const parsed = readJsonPath(fallbackPath);
  if (!parsed) {
    return {
      file: relative(root, fallbackPath).replace(/\\/g, "/"),
      alerts: [],
      blocked: ["Dependabot alert import JSON could not be parsed."],
    };
  }

  return {
    file: relative(root, fallbackPath).replace(/\\/g, "/"),
    alerts: parseAlertImport(parsed),
    blocked: [],
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

function buildMetadataSource(dependencyPosture, alertImport) {
  return {
    githubReachable: false,
    importedAlertMetadata: Boolean(alertImport?.alerts?.length),
    alertImportArtifact: alertImport?.file ?? null,
    localGraphAvailable: Boolean(dependencyPosture?.data?.packageGraph),
    manualMetadataRequired: !alertImport?.alerts?.length,
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

function buildKnownWarning(importedMode) {
  if (!importedMode) return knownWarning;
  return {
    ...knownWarning,
    supersededByImportedMetadata: true,
    note:
      "Historical push-warning counts are preserved for audit history. Imported Dependabot metadata is the current source of truth for this artifact.",
  };
}

function normalizeSeverity(value) {
  if (!value) return "unknown";
  return value === "medium" ? "moderate" : value;
}

function firstPatchedVersion(alert) {
  return (
    alert?.security_vulnerability?.first_patched_version?.identifier ??
    alert?.security_advisory?.vulnerabilities?.[0]?.first_patched_version?.identifier ??
    null
  );
}

function alertIdentifier(alert, type) {
  const identifiers = alert?.security_advisory?.identifiers;
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .filter((identifier) => identifier?.type === type && identifier?.value)
    .map((identifier) => identifier.value)
    .sort();
}

function recommendationFor(record) {
  if (record.retiredManifest) {
    return "Treat as archived-manifest review; do not patch active runtime from this alert.";
  }
  if (record.blockedReasons.length > 0) {
    return "Defer until missing Dependabot metadata or lockfile ownership is resolved.";
  }
  if (record.runtimeImpact) {
    return "Review first; patch in the smallest runtime-safe batch and run full verification.";
  }
  if (record.devOnlyImpact) {
    return "Patch after runtime-impact alerts unless this blocks verification or release tooling.";
  }
  if (record.transitiveOwnership) {
    return "Patch through the smallest parent-package update that resolves this transitive alert.";
  }
  return "Review with the dependency hardening runbook before selecting an upgrade batch.";
}

function classifyImportedAlerts(alerts, packageGraph) {
  const pkg = packageGraph.pkg;
  const lockPackages = packageGraph.lockPackages;
  const directGroups = directDependencyGroups(pkg);

  return alerts.map((alert) => {
    const packageName = alert?.dependency?.package?.name ?? null;
    const ecosystem = alert?.dependency?.package?.ecosystem ?? null;
    const manifestPath = normalizeManifestPath(alert?.dependency?.manifest_path ?? null);
    const retiredManifest = isRetiredManifest(manifestPath);
    const scope = alert?.dependency?.scope ?? null;
    const severity = normalizeSeverity(
      alert?.security_vulnerability?.severity ??
        alert?.security_advisory?.severity ??
        null,
    );
    const vulnerableRange =
      alert?.security_vulnerability?.vulnerable_version_range ??
      alert?.security_advisory?.vulnerabilities?.[0]?.vulnerable_version_range ??
      null;
    const patchedVersion = firstPatchedVersion(alert);
    const directDependencyGroup = packageName ? directGroups.get(packageName) ?? null : null;
    const lockEntries = lockEntriesForPackage(lockPackages, packageName);
    const hasRuntimeLockEntry = lockEntries.some(({ meta }) => meta.dev !== true);
    const hasDevLockEntry = lockEntries.some(({ meta }) => meta.dev === true);
    const directRuntime =
      directDependencyGroup === "dependencies" ||
      directDependencyGroup === "optionalDependencies" ||
      directDependencyGroup === "peerDependencies";
    const directDev = directDependencyGroup === "devDependencies";
    const rawRuntimeImpact =
      scope === "runtime" || directRuntime || (hasRuntimeLockEntry && !directDev);
    const runtimeImpact = !retiredManifest && rawRuntimeImpact;
    const devOnlyImpact =
      !retiredManifest &&
      !runtimeImpact &&
      (scope === "development" || directDev || (hasDevLockEntry && !hasRuntimeLockEntry));
    const transitiveOwnership = !directDependencyGroup;
    const blockedReasons = [];

    if (retiredManifest) {
      blockedReasons.push("Archived manifest is not part of the active React/Next runtime.");
    }
    if (!packageName) blockedReasons.push("Missing package name.");
    if (ecosystem !== "npm") blockedReasons.push("Non-npm alert needs separate ecosystem handling.");
    if (!severity || severity === "unknown") blockedReasons.push("Missing severity.");
    if (!vulnerableRange) blockedReasons.push("Missing vulnerable range.");
    if (!patchedVersion) blockedReasons.push("No first patched version is published.");
    if (packageName && lockEntries.length === 0) {
      blockedReasons.push("Package is absent from the local package-lock graph.");
    }

    const record = {
      alertNumber: alert?.number ?? null,
      state: alert?.state ?? null,
      packageName,
      ecosystem,
      manifestPath,
      scope,
      severity,
      advisoryId: alert?.security_advisory?.ghsa_id ?? alertIdentifier(alert, "GHSA")[0] ?? null,
      cveIds: alertIdentifier(alert, "CVE"),
      vulnerableRange,
      firstPatchedVersion: patchedVersion,
      directDependencyGroup,
      lockfileOwnership:
        lockEntries.length === 0
          ? "absent"
          : hasRuntimeLockEntry && hasDevLockEntry
            ? "mixed"
            : hasRuntimeLockEntry
              ? "runtime"
              : "dev-only",
      lockfileEntryCount: lockEntries.length,
      runtimeImpact,
      devOnlyImpact,
      retiredManifest,
      transitiveOwnership,
      blockedReasons,
    };

    return {
      ...record,
      recommendation: recommendationFor(record),
    };
  });
}

function sortAlerts(a, b) {
  const severityDelta =
    (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
  if (severityDelta !== 0) return severityDelta;
  if (a.runtimeImpact !== b.runtimeImpact) return a.runtimeImpact ? -1 : 1;
  if (a.transitiveOwnership !== b.transitiveOwnership) {
    return a.transitiveOwnership ? 1 : -1;
  }
  return String(a.packageName ?? "").localeCompare(String(b.packageName ?? ""));
}

function queueEntry(record) {
  return {
    alertNumber: record.alertNumber,
    packageName: record.packageName,
    severity: record.severity,
    manifestPath: record.manifestPath,
    scope: record.scope,
    ecosystem: record.ecosystem,
    directDependencyGroup: record.directDependencyGroup,
    lockfileOwnership: record.lockfileOwnership,
    transitiveOwnership: record.transitiveOwnership,
    retiredManifest: record.retiredManifest,
    firstPatchedVersion: record.firstPatchedVersion,
    blockedReasons: record.blockedReasons,
    recommendation: record.recommendation,
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

function buildPendingClassification() {
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
      count: null,
      description:
        "The current open-alert count is unknown until current Dependabot metadata is imported; the historical push-warning count is not reused.",
      blockers: [unavailableReason],
    },
    retiredManifest: {
      status: "pending_metadata",
      count: null,
      description:
        "Alerts from archived manifests are unknown until Dependabot metadata is imported.",
      blockers: [unavailableReason],
    },
  };
}

function buildImportedClassification(records) {
  const sorted = [...records].sort(sortAlerts);
  const active = sorted.filter((record) => !record.retiredManifest);
  const actionable = active.filter((record) => record.blockedReasons.length === 0);
  const runtimeCritical = actionable.filter((record) => record.runtimeImpact);
  const devOnly = actionable.filter((record) => record.devOnlyImpact);
  const transitive = active.filter(
    (record) => record.transitiveOwnership && record.blockedReasons.length === 0,
  );
  const blockedDeferred = active.filter((record) => record.blockedReasons.length > 0);
  const retiredManifest = sorted.filter((record) => record.retiredManifest);

  return {
    runtimeCritical: {
      status: runtimeCritical.length > 0 ? "ready" : "none",
      count: runtimeCritical.length,
      description:
        "Alerts with production/runtime impact by Dependabot scope, direct dependency group, or lockfile ownership.",
      alerts: runtimeCritical.map(queueEntry),
    },
    devOnly: {
      status: devOnly.length > 0 ? "ready" : "none",
      count: devOnly.length,
      description:
        "Alerts isolated to development, test, lint, build, or local tooling ownership.",
      alerts: devOnly.map(queueEntry),
    },
    transitive: {
      status: transitive.length > 0 ? "ready" : "none",
      count: transitive.length,
      description:
        "Alerts for packages that are not directly declared in package.json. This can overlap with runtime/dev impact.",
      alerts: transitive.map(queueEntry),
    },
    blockedDeferred: {
      status: blockedDeferred.length > 0 ? "needs_review" : "none",
      count: blockedDeferred.length,
      description:
        "Alerts missing enough local or Dependabot metadata to select a safe package update.",
      alerts: blockedDeferred.map(queueEntry),
    },
    retiredManifest: {
      status: retiredManifest.length > 0 ? "needs_dependabot_scope_review" : "none",
      count: retiredManifest.length,
      description:
        "Alerts raised from archive/ manifests. These are not active runtime fixes unless the archived app is intentionally restored.",
      alerts: retiredManifest.map(queueEntry),
    },
  };
}

function severityCounts(records) {
  return records.reduce(
    (counts, record) => {
      const severity = normalizeSeverity(record.severity);
      counts[severity] = (counts[severity] ?? 0) + 1;
      return counts;
    },
    { critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 },
  );
}

function manifestCounts(records) {
  return records.reduce((counts, record) => {
    const manifestPath = normalizeManifestPath(record.manifestPath) ?? "unknown";
    counts[manifestPath] = (counts[manifestPath] ?? 0) + 1;
    return counts;
  }, {});
}

function paginationWarning(records) {
  if (records.length > 0 && records.length % 100 === 0) {
    return "Imported alert count is a multiple of 100; rerun the paginated --slurp export command before treating this as the full open-alert set.";
  }
  return null;
}

function buildPackageGraphContext() {
  const pkg = readJson("package.json") ?? {};
  const lock = readJson("package-lock.json") ?? {};
  return {
    pkg,
    lock,
    lockPackages: packageLockPackages(lock),
  };
}

function main() {
  mkdirSync(metricsDir, { recursive: true });

  const capturedAt = new Date().toISOString();
  const dependencyPosture = latestMetric("dependency-risk-posture-");
  const alertImport = loadAlertImport();
  const packageGraphContext = buildPackageGraphContext();
  const importedRecords = alertImport?.alerts?.length
    ? classifyImportedAlerts(alertImport.alerts, packageGraphContext)
    : [];
  const importedMode = importedRecords.length > 0;
  const importBlocked = alertImport?.blocked ?? [];
  const classification = importedMode
    ? buildImportedClassification(importedRecords)
    : buildPendingClassification();
  const importPaginationWarning = importedMode ? paginationWarning(importedRecords) : null;
  const artifact = {
    capturedAt,
    auditName: "DEPENDABOT-SECURITY-AUDIT",
    source: {
      mode: importedMode ? "imported-alert-metadata" : "metadata-starter",
      githubReachableFromCodex: false,
      upgradesPerformed: false,
      alertImportArtifact: alertImport?.file ?? null,
      currentAlertCountAvailable: importedMode,
    },
    knownWarning: buildKnownWarning(importedMode),
    importSummary: importedMode
      ? {
          alertCount: importedRecords.length,
          severityCounts: severityCounts(importedRecords),
          manifestCounts: manifestCounts(importedRecords),
          sourceFile: alertImport.file,
          sanitizedOnly: true,
          paginationWarning: importPaginationWarning,
        }
      : null,
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
    metadataSource: buildMetadataSource(dependencyPosture, alertImport),
    retiredManifestQuarantine: archiveManifestQuarantineStatus(),
    classification,
    upgradeQueue: importedMode
      ? {
          runtimeCritical: classification.runtimeCritical.alerts,
          devOnly: classification.devOnly.alerts,
          transitive: classification.transitive.alerts,
          blockedDeferred: classification.blockedDeferred.alerts,
          retiredManifest: classification.retiredManifest.alerts,
        }
      : {
          runtimeCritical: [],
          devOnly: [],
          transitive: [],
          blockedDeferred: [
            "Dependabot package metadata is still required before selecting upgrade batches.",
          ],
          retiredManifest: [],
        },
    upgradePolicy: buildUpgradePolicy(),
    blocked: importedMode
      ? [
          ...importBlocked,
          importPaginationWarning,
          classification.retiredManifest.count > 0
            ? `${classification.retiredManifest.count} imported alert(s) target archive/ manifests and need Dependabot scope review before active runtime patching.`
            : null,
          "No dependency upgrades were performed in this audit tranche.",
          "Review the runtimeCritical queue first, then patch one minimal package batch at a time.",
        ].filter(Boolean)
      : [
          ...importBlocked,
          "GitHub Dependabot alert details are not reachable from this Codex shell.",
          "No dependency upgrades were performed in this acceptance tranche.",
          "Run the GitHub Dependabot UI or API from a network-enabled session to fill package names, vulnerable ranges, patched ranges, and direct/transitive ownership.",
        ],
    importInstructions: {
      normalPowerShell: dependabotAlertExportCommand,
      classify:
        "npm run dependabot:audit:classify -- --alerts=docs\\metrics\\dependabot-alerts-source.json",
    },
    auditReady: importedMode,
    nextCommand: importedMode
      ? "Review classification.runtimeCritical, patch the smallest runtime-safe batch, then run npm run dependency:risk:posture and npm run verify."
      : "Export GitHub Dependabot metadata from normal PowerShell, then run npm run dependabot:audit:classify -- --alerts=docs\\metrics\\dependabot-alerts-source.json.",
  };

  const fileName = "dependabot-security-audit-latest.json";
  const outPath = join(metricsDir, fileName);
  const displayPath = relative(root, outPath).replace(/\\/g, "/");

  if (dryRun) {
    console.log(`Dependabot security audit dry run: ${displayPath}`);
  } else {
    writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(
      `Dependabot security audit ${importedMode ? "artifact" : "starter"} written: ${displayPath}`,
    );
  }
  console.log(
    importedMode
      ? `Imported alerts classified: ${importedRecords.length} (${artifact.importSummary.severityCounts.critical} critical, ${artifact.importSummary.severityCounts.high} high, ${artifact.importSummary.severityCounts.moderate} moderate, ${artifact.importSummary.severityCounts.low} low).`
      : `Historical warning retained: ${knownWarning.totalAlerts} alerts (${knownWarning.severityCounts.critical} critical, ${knownWarning.severityCounts.high} high, ${knownWarning.severityCounts.moderate} moderate, ${knownWarning.severityCounts.low} low); current open-alert count remains unknown without an import.`,
  );
  if (importedMode) {
    console.log(
      `Queues: ${classification.runtimeCritical.count} active runtime, ${classification.devOnly.count} dev-only, ${classification.transitive.count} transitive, ${classification.retiredManifest.count} retired-manifest, ${classification.blockedDeferred.count} blocked/deferred.`,
    );
    if (importPaginationWarning) {
      console.log(`Pagination: ${importPaginationWarning}`);
    }
  }
  if (!existsSync(join(root, "package-lock.json"))) {
    console.log("Warning: package-lock.json was not found for package graph summary.");
  }
}

main();
