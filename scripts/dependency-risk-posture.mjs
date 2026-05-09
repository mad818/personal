#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const checkOnly = process.argv.includes("--check");

const lifecycleScriptNames = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepublish",
  "prepublishOnly",
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
  return `node_modules/${name.replace("/", "/")}`;
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

function readInstalledLifecycleScripts(packagePath) {
  const packageJson = readJson(`${packagePath}/package.json`);
  if (!packageJson?.scripts || typeof packageJson.scripts !== "object") {
    return [];
  }

  return Object.keys(packageJson.scripts)
    .filter((scriptName) => lifecycleScriptNames.has(scriptName))
    .sort();
}

function findLifecycleScriptPackages(lockPackages) {
  const lifecyclePackages = [];

  for (const [packagePath, meta] of Object.entries(lockPackages)) {
    if (!packagePath || !packagePath.startsWith("node_modules/")) continue;
    const lockfileFlag = meta?.hasInstallScript === true;
    const installedScripts = existsSync(join(root, packagePath, "package.json"))
      ? readInstalledLifecycleScripts(packagePath)
      : [];
    if (!lockfileFlag && installedScripts.length === 0) continue;

    lifecyclePackages.push({
      packagePath,
      name: packagePath.replace(/^node_modules\//, ""),
      version: meta?.version ?? null,
      devOnly: meta?.dev === true,
      lockfileInstallScript: lockfileFlag,
      installedLifecycleScripts: installedScripts,
    });
  }

  return lifecyclePackages.sort((a, b) => a.name.localeCompare(b.name));
}

function summarizePackageGraph(pkg, lock) {
  const lockPackages = lock?.packages && typeof lock.packages === "object"
    ? lock.packages
    : {};
  const directRuntime = objectKeys(pkg.dependencies);
  const directDev = objectKeys(pkg.devDependencies);
  const directOptional = objectKeys(pkg.optionalDependencies);
  const directPeer = objectKeys(pkg.peerDependencies);
  const directPackagePaths = new Set(
    [...directRuntime, ...directDev, ...directOptional, ...directPeer].map(
      packagePathForName,
    ),
  );
  const packageEntries = Object.entries(lockPackages).filter(([name]) => Boolean(name));
  const lockfileRuntimePackages = packageEntries.filter(([, meta]) => meta?.dev !== true);
  const lockfileDevPackages = packageEntries.filter(([, meta]) => meta?.dev === true);
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
  if (!checkOnly) {
    mkdirSync(metricsDir, { recursive: true });
  }

  const pkg = readJson("package.json") ?? {};
  const lock = readJson("package-lock.json");
  const lockPackages = lock?.packages && typeof lock.packages === "object"
    ? lock.packages
    : {};
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
    blocked.push("package.json and package-lock.json direct dependency ranges differ.");
  }

  const lifecyclePackages = findLifecycleScriptPackages(lockPackages);
  if (lifecyclePackages.length > 0) {
    warnings.push(
      `${lifecyclePackages.length} installed package(s) expose lifecycle install scripts and should be reviewed before upgrades.`,
    );
  }

  const capturedAt = new Date().toISOString();
  const artifact = {
    capturedAt,
    postureName: "DEPENDENCY-RISK-POSTURE",
    source: {
      githubRequired: false,
      packageJson: "package.json",
      packageLock: "package-lock.json",
      nodeModulesInspected: true,
    },
    packageGraph: summarizePackageGraph(pkg, lock),
    duplicateDirectDependencies: duplicates,
    lockfileMismatches,
    lifecycleScriptPackages: lifecyclePackages.slice(0, 50),
    lifecycleScriptPackageCount: lifecyclePackages.length,
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
    riskReady: blocked.length === 0,
  };

  if (!checkOnly) {
    const fileName = `dependency-risk-posture-${capturedAt.replace(/[:.]/g, "-")}.json`;
    const outPath = join(metricsDir, fileName);
    writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

    const displayPath = relative(root, outPath).replace(/\\/g, "/");
    console.log(`Dependency risk posture written: ${displayPath}`);
  } else {
    console.log("Dependency risk posture check completed without writing an artifact.");
  }
  console.log(
    `Package graph: ${artifact.packageGraph.directRuntime} runtime direct, ${artifact.packageGraph.directDev} dev direct, ${artifact.packageGraph.transitivePackages} transitive lockfile packages.`,
  );
  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
  }
  if (blocked.length > 0) {
    console.log(`Blocked: ${blocked.length}`);
    for (const blocker of blocked) {
      console.log(`- ${blocker}`);
    }
    process.exit(1);
  }
}

main();
