#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const lifecycleReviewPath = "docs/security/dependency-lifecycle-review.json";
const checkOnly = process.argv.includes("--check");

const consumerInstallScriptNames = new Set([
  "preinstall",
  "install",
  "postinstall",
]);
const publisherLifecycleScriptNames = new Set([
  "prepare",
  "prepublish",
  "prepublishOnly",
  "prepack",
  "postpack",
]);

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function objectKeys(value) {
  return value && typeof value === "object" ? Object.keys(value) : [];
}

function packagePathForName(name) {
  return `node_modules/${name}`;
}

function packageNameFromPath(packagePath) {
  return (
    packagePath.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/)?.[1] ??
    packagePath
  );
}

function sortedStrings(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").sort()
    : [];
}

function equalStringArrays(left, right) {
  return (
    JSON.stringify(sortedStrings(left)) === JSON.stringify(sortedStrings(right))
  );
}

function classifyLifecyclePackage({
  lockfileInstallScript = false,
  installedScriptNames = [],
}) {
  const installedConsumerScripts = installedScriptNames
    .filter((scriptName) => consumerInstallScriptNames.has(scriptName))
    .sort();
  const installedPublisherScripts = installedScriptNames
    .filter((scriptName) => publisherLifecycleScriptNames.has(scriptName))
    .sort();
  const exposesConsumerInstallHook =
    lockfileInstallScript || installedConsumerScripts.length > 0;

  return {
    exposesConsumerInstallHook,
    installedConsumerScripts,
    installedPublisherScripts,
    publisherMetadataOnly:
      !exposesConsumerInstallHook && installedPublisherScripts.length > 0,
  };
}

function verifyClassifierFixtures() {
  assert.deepEqual(
    classifyLifecyclePackage({ installedScriptNames: ["prepare"] }),
    {
      exposesConsumerInstallHook: false,
      installedConsumerScripts: [],
      installedPublisherScripts: ["prepare"],
      publisherMetadataOnly: true,
    },
    "prepare-only registry metadata must not be classified as a consumer hook",
  );
  assert.equal(
    classifyLifecyclePackage({ installedScriptNames: ["preinstall"] })
      .exposesConsumerInstallHook,
    true,
    "preinstall must be classified as a consumer hook",
  );
  assert.equal(
    classifyLifecyclePackage({ lockfileInstallScript: true })
      .exposesConsumerInstallHook,
    true,
    "package-lock hasInstallScript must classify a package as a consumer hook",
  );
  assert.equal(
    classifyLifecyclePackage({ installedScriptNames: ["prepublishOnly"] })
      .publisherMetadataOnly,
    true,
    "prepublishOnly must remain publisher-only metadata",
  );
}

function findDuplicateDirectDependencies(pkg) {
  const groups = [
    ["dependencies", pkg.dependencies ?? {}],
    ["devDependencies", pkg.devDependencies ?? {}],
    ["optionalDependencies", pkg.optionalDependencies ?? {}],
    ["peerDependencies", pkg.peerDependencies ?? {}],
  ];
  const seen = new Map();
  const duplicates = [];

  for (const [group, deps] of groups) {
    for (const [name, version] of Object.entries(deps)) {
      const prior = seen.get(name);
      if (prior) {
        duplicates.push({
          name,
          firstGroup: prior.group,
          secondGroup: group,
          firstVersion: prior.version,
          secondVersion: version,
        });
      } else {
        seen.set(name, { group, version });
      }
    }
  }

  return duplicates;
}

function findLockfileMismatches(pkg, lockPackages) {
  const rootLock = lockPackages[""] ?? {};
  const mismatches = [];
  const groups = ["dependencies", "devDependencies", "optionalDependencies"];

  for (const group of groups) {
    const pkgDeps = pkg[group] ?? {};
    const lockDeps = rootLock[group] ?? {};
    for (const [name, version] of Object.entries(pkgDeps)) {
      if (lockDeps[name] !== version) {
        mismatches.push({
          name,
          group,
          packageJson: version,
          packageLock: lockDeps[name] ?? null,
        });
      }
    }
  }

  return mismatches;
}

function readInstalledScriptNames(packagePath) {
  const packageJson = readJson(`${packagePath}/package.json`);
  if (!packageJson?.scripts || typeof packageJson.scripts !== "object") {
    return [];
  }

  return Object.keys(packageJson.scripts);
}

function findLifecyclePackages(lockPackages) {
  const consumerPackages = [];
  const publisherOnlyPackages = [];

  for (const [packagePath, meta] of Object.entries(lockPackages)) {
    if (!packagePath || !packagePath.startsWith("node_modules/")) continue;

    const installedScriptNames = existsSync(
      join(root, packagePath, "package.json"),
    )
      ? readInstalledScriptNames(packagePath)
      : [];
    const classification = classifyLifecyclePackage({
      lockfileInstallScript: meta?.hasInstallScript === true,
      installedScriptNames,
    });
    const common = {
      packagePath,
      name: packageNameFromPath(packagePath),
      version: meta?.version ?? null,
    };

    if (classification.exposesConsumerInstallHook) {
      consumerPackages.push({
        ...common,
        devOnly: meta?.dev === true,
        optional: meta?.optional === true,
        os: sortedStrings(meta?.os),
        integrity: meta?.integrity ?? null,
        integrityPresent:
          typeof meta?.integrity === "string" && meta.integrity.length > 0,
        lockfileInstallScript: meta?.hasInstallScript === true,
        installedLifecycleScripts: classification.installedConsumerScripts,
      });
    } else if (classification.publisherMetadataOnly) {
      publisherOnlyPackages.push({
        ...common,
        installedPublisherScripts: classification.installedPublisherScripts,
      });
    }
  }

  const byPackagePath = (left, right) =>
    left.packagePath.localeCompare(right.packagePath);
  return {
    consumerPackages: consumerPackages.sort(byPackagePath),
    publisherOnlyPackages: publisherOnlyPackages.sort(byPackagePath),
  };
}

function validateLifecycleReview(consumerPackages, review, blocked, warnings) {
  const reviewEntries = Array.isArray(review?.packages) ? review.packages : [];
  const reviewByPath = new Map();
  const duplicateReviewPaths = [];

  if (!review) {
    blocked.push(`${lifecycleReviewPath} is missing or unreadable.`);
  } else if (review.schemaVersion !== 1) {
    blocked.push(`${lifecycleReviewPath} must use schemaVersion 1.`);
  }
  if (review && Number.isNaN(Date.parse(review.reviewedAt))) {
    blocked.push(`${lifecycleReviewPath} must expose a valid reviewedAt date.`);
  }
  if (review && !Array.isArray(review.packages)) {
    blocked.push(`${lifecycleReviewPath} must expose a packages array.`);
  }

  for (const entry of reviewEntries) {
    if (typeof entry?.packagePath !== "string") {
      blocked.push(
        `${lifecycleReviewPath} contains a review without packagePath.`,
      );
      continue;
    }
    if (reviewByPath.has(entry.packagePath)) {
      duplicateReviewPaths.push(entry.packagePath);
      continue;
    }
    reviewByPath.set(entry.packagePath, entry);
  }

  const consumerByPath = new Map(
    consumerPackages.map((pkg) => [pkg.packagePath, pkg]),
  );
  const unreviewed = [];
  const mismatches = [];
  const integrityMissing = [];

  for (const pkg of consumerPackages) {
    if (!pkg.integrityPresent) {
      integrityMissing.push(pkg.packagePath);
    }

    const reviewEntry = reviewByPath.get(pkg.packagePath);
    if (!reviewEntry) {
      unreviewed.push(pkg.packagePath);
      continue;
    }

    const expected = reviewEntry.expected ?? {};
    const allowedInstalledScripts = sortedStrings(
      expected.allowedInstalledConsumerScripts,
    );
    const unexpectedInstalledScripts = pkg.installedLifecycleScripts.filter(
      (scriptName) => !allowedInstalledScripts.includes(scriptName),
    );
    const checks = [
      ["decision", reviewEntry.decision, "reviewed-expected"],
      ["version", reviewEntry.version, pkg.version],
      ["integrity", expected.integrity, pkg.integrity],
      ["devOnly", expected.devOnly, pkg.devOnly],
      ["optional", expected.optional, pkg.optional],
      [
        "lockfileInstallScript",
        expected.lockfileInstallScript,
        pkg.lockfileInstallScript,
      ],
    ];
    for (const [field, reviewed, observed] of checks) {
      if (reviewed !== observed) {
        mismatches.push({
          packagePath: pkg.packagePath,
          field,
          reviewed: reviewed ?? null,
          observed: observed ?? null,
        });
      }
    }
    if (!equalStringArrays(expected.os, pkg.os)) {
      mismatches.push({
        packagePath: pkg.packagePath,
        field: "os",
        reviewed: sortedStrings(expected.os),
        observed: pkg.os,
      });
    }
    if (unexpectedInstalledScripts.length > 0) {
      mismatches.push({
        packagePath: pkg.packagePath,
        field: "installedLifecycleScripts",
        reviewed: allowedInstalledScripts,
        observed: pkg.installedLifecycleScripts,
      });
    }
  }

  const staleReviewEntries = reviewEntries
    .map((entry) => entry?.packagePath)
    .filter(
      (packagePath) =>
        typeof packagePath === "string" && !consumerByPath.has(packagePath),
    )
    .sort();

  if (duplicateReviewPaths.length > 0) {
    blocked.push(
      `Duplicate lifecycle review paths: ${duplicateReviewPaths.sort().join(", ")}.`,
    );
  }
  if (integrityMissing.length > 0) {
    blocked.push(
      `Consumer install-hook packages missing registry integrity: ${integrityMissing.join(", ")}.`,
    );
  }
  if (unreviewed.length > 0) {
    warnings.push(
      `Unreviewed consumer install-hook packages: ${unreviewed.join(", ")}.`,
    );
  }
  if (mismatches.length > 0) {
    warnings.push(
      `Lifecycle review drift: ${mismatches
        .map((item) => `${item.packagePath}:${item.field}`)
        .join(", ")}.`,
    );
  }
  if (staleReviewEntries.length > 0) {
    warnings.push(
      `Stale lifecycle review entries: ${staleReviewEntries.join(", ")}.`,
    );
  }

  return {
    file: lifecycleReviewPath,
    reviewedAt: review?.reviewedAt ?? null,
    totalConsumerPackages: consumerPackages.length,
    matchedReviewCount:
      consumerPackages.length -
      unreviewed.length -
      new Set(mismatches.map((item) => item.packagePath)).size,
    unreviewed,
    mismatches,
    staleReviewEntries,
    integrityMissing,
  };
}

function verifyLifecycleReviewFixtures() {
  const basePackage = {
    packagePath: "node_modules/example-native",
    name: "example-native",
    version: "1.2.3",
    devOnly: true,
    optional: false,
    os: [],
    integrity: "sha512-fixture",
    integrityPresent: true,
    lockfileInstallScript: true,
    installedLifecycleScripts: ["postinstall"],
  };
  const baseReview = {
    schemaVersion: 1,
    reviewedAt: "2026-07-14",
    packages: [
      {
        packagePath: basePackage.packagePath,
        version: basePackage.version,
        decision: "reviewed-expected",
        expected: {
          integrity: basePackage.integrity,
          devOnly: basePackage.devOnly,
          optional: basePackage.optional,
          os: basePackage.os,
          lockfileInstallScript: basePackage.lockfileInstallScript,
          allowedInstalledConsumerScripts: ["postinstall"],
        },
      },
    ],
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const inspect = (packages, review) => {
    const blocked = [];
    const warnings = [];
    validateLifecycleReview(packages, review, blocked, warnings);
    return { blocked, warnings };
  };

  assert.deepEqual(inspect([basePackage], baseReview), {
    blocked: [],
    warnings: [],
  });
  assert.match(
    inspect([basePackage], { ...baseReview, packages: [] }).warnings.join(" "),
    /Unreviewed consumer install-hook packages/,
  );

  const versionDrift = clone(baseReview);
  versionDrift.packages[0].version = "9.9.9";
  assert.match(
    inspect([basePackage], versionDrift).warnings.join(" "),
    /example-native:version/,
  );

  const unexpectedHook = clone(basePackage);
  unexpectedHook.installedLifecycleScripts = ["install", "postinstall"];
  assert.match(
    inspect([unexpectedHook], baseReview).warnings.join(" "),
    /example-native:installedLifecycleScripts/,
  );

  const staleReview = clone(baseReview);
  staleReview.packages.push({
    ...staleReview.packages[0],
    packagePath: "node_modules/removed-native",
  });
  assert.match(
    inspect([basePackage], staleReview).warnings.join(" "),
    /Stale lifecycle review entries/,
  );

  const missingIntegrity = clone(basePackage);
  missingIntegrity.integrity = null;
  missingIntegrity.integrityPresent = false;
  assert.match(
    inspect([missingIntegrity], baseReview).blocked.join(" "),
    /missing registry integrity/,
  );
}

function summarizePackageGraph(pkg, lock) {
  const lockPackages =
    lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
  const directRuntime = objectKeys(pkg.dependencies);
  const directDev = objectKeys(pkg.devDependencies);
  const directOptional = objectKeys(pkg.optionalDependencies);
  const directPeer = objectKeys(pkg.peerDependencies);
  const directPackagePaths = new Set(
    [...directRuntime, ...directDev, ...directOptional, ...directPeer].map(
      packagePathForName,
    ),
  );
  const packageEntries = Object.entries(lockPackages).filter(([name]) =>
    Boolean(name),
  );
  const lockfileRuntimePackages = packageEntries.filter(
    ([, meta]) => meta?.dev !== true,
  );
  const lockfileDevPackages = packageEntries.filter(
    ([, meta]) => meta?.dev === true,
  );
  const transitivePackages = packageEntries.filter(
    ([packagePath]) => !directPackagePaths.has(packagePath),
  );

  return {
    directRuntime: directRuntime.length,
    directDev: directDev.length,
    directOptional: directOptional.length,
    directPeer: directPeer.length,
    lockfilePackages: packageEntries.length,
    lockfileRuntimePackages: lockfileRuntimePackages.length,
    lockfileDevPackages: lockfileDevPackages.length,
    transitivePackages: transitivePackages.length,
  };
}

function main() {
  verifyClassifierFixtures();
  verifyLifecycleReviewFixtures();

  if (!checkOnly) {
    mkdirSync(metricsDir, { recursive: true });
  }

  const pkg = readJson("package.json") ?? {};
  const lock = readJson("package-lock.json");
  const lifecycleReview = readJson(lifecycleReviewPath);
  const lockPackages =
    lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
  const blocked = [];
  const warnings = [];

  if (!lock) {
    blocked.push("package-lock.json is missing or unreadable.");
  }
  if (!lock?.lockfileVersion) {
    blocked.push("package-lock.json does not expose a lockfileVersion.");
  }

  const duplicates = findDuplicateDirectDependencies(pkg);
  if (duplicates.length > 0) {
    blocked.push("Duplicate direct dependency declarations need review.");
  }

  const lockfileMismatches = findLockfileMismatches(pkg, lockPackages);
  if (lockfileMismatches.length > 0) {
    blocked.push(
      "package.json and package-lock.json direct dependency ranges differ.",
    );
  }

  const { consumerPackages, publisherOnlyPackages } =
    findLifecyclePackages(lockPackages);
  const lifecycleReviewSummary = validateLifecycleReview(
    consumerPackages,
    lifecycleReview,
    blocked,
    warnings,
  );

  const capturedAt = new Date().toISOString();
  const artifact = {
    capturedAt,
    postureName: "DEPENDENCY-RISK-POSTURE",
    source: {
      githubRequired: false,
      packageJson: "package.json",
      packageLock: "package-lock.json",
      nodeModulesInspected: true,
      lifecycleReview: lifecycleReviewPath,
    },
    packageGraph: summarizePackageGraph(pkg, lock),
    duplicateDirectDependencies: duplicates,
    lockfileMismatches,
    lifecycleScriptPackages: consumerPackages,
    lifecycleScriptPackageCount: consumerPackages.length,
    publisherOnlyLifecycleMetadataPackages: publisherOnlyPackages.slice(0, 50),
    publisherOnlyLifecycleMetadataCount: publisherOnlyPackages.length,
    lifecycleReview: lifecycleReviewSummary,
    upgradeQueue: {
      runtimeCritical: [],
      devOnly: [],
      transitive: [],
      blockedDeferred: [
        "Dependabot package metadata is still required before selecting upgrade batches.",
      ],
    },
    warnings,
    blocked,
    riskReady: blocked.length === 0 && warnings.length === 0,
  };

  if (!checkOnly) {
    const fileName = "dependency-risk-posture-latest.json";
    const outPath = join(metricsDir, fileName);
    writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

    const displayPath = relative(root, outPath).replace(/\\/g, "/");
    console.log(`Dependency risk posture written: ${displayPath}`);
  } else {
    console.log(
      "Dependency risk posture check completed without writing an artifact.",
    );
  }
  console.log(
    `Package graph: ${artifact.packageGraph.directRuntime} runtime direct, ${artifact.packageGraph.directDev} dev direct, ${artifact.packageGraph.transitivePackages} transitive lockfile packages.`,
  );
  console.log(
    `Install-script review: ${consumerPackages.length} consumer package(s), ${lifecycleReviewSummary.matchedReviewCount} reviewed, ${lifecycleReviewSummary.unreviewed.length} unreviewed, ${publisherOnlyPackages.length} publisher-only metadata package(s).`,
  );
  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
  if (blocked.length > 0) {
    console.log(`Blocked: ${blocked.length}`);
    for (const blocker of blocked) {
      console.log(`- ${blocker}`);
    }
  }
  if (warnings.length > 0 || blocked.length > 0) {
    process.exit(1);
  }
}

main();
