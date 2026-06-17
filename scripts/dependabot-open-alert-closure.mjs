#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const jsYamlFloor = "4.1.1";
const glibFloor = "0.20.0";
const linuxBundleTargets = ["appimage", "deb", "rpm"];

export const DEPENDABOT_OPEN_ALERT_CLOSURE_FIELDS = [
  "jsYaml",
  "glib",
  "localStatus",
  "externalAction",
  "proofCommands",
];

function parseArgs(argv) {
  return {
    check: argv.includes("--check"),
    json: argv.includes("--json"),
  };
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function versionParts(version) {
  return String(version)
    .split(/[.+-]/)
    .slice(0, 4)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
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

function cargoPackageVersion(cargoLock, packageName) {
  const pattern = new RegExp(
    String.raw`\[\[package\]\]\r?\nname = "${packageName}"\r?\nversion = "([^"]+)"`,
  );
  return cargoLock.match(pattern)?.[1] ?? null;
}

function bundleTargets(config) {
  return Array.isArray(config?.bundle?.targets)
    ? config.bundle.targets.map((target) => String(target))
    : [];
}

function formatBool(value) {
  return value ? "yes" : "no";
}

function buildReport() {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const cargoLock = readText("desktop/src-tauri/Cargo.lock");
  const tauriConfig = readJson("desktop/src-tauri/tauri.conf.json");
  const secureTemplate = readJson("desktop/tauri-template/tauri.conf.secure.example.json");

  const jsYamlVersion = packageLock?.packages?.["node_modules/js-yaml"]?.version ?? null;
  const jsYamlOverride = packageJson?.overrides?.["js-yaml"] ?? null;
  const jsYamlReady =
    Boolean(jsYamlVersion) &&
    compareVersions(jsYamlVersion, jsYamlFloor) >= 0 &&
    jsYamlOverride === jsYamlFloor;

  const glibVersion = cargoPackageVersion(cargoLock, "glib");
  const releaseTargets = bundleTargets(tauriConfig);
  const secureTemplateTargets = bundleTargets(secureTemplate);
  const activeLinuxTargets = releaseTargets.filter((target) =>
    linuxBundleTargets.includes(target),
  );
  const templateLinuxTargets = secureTemplateTargets.filter((target) =>
    linuxBundleTargets.includes(target),
  );
  const vulnerableGlib =
    Boolean(glibVersion) && compareVersions(glibVersion, glibFloor) < 0;
  const glibReleaseScopeSafe =
    Boolean(glibVersion) &&
    (!vulnerableGlib ||
      (activeLinuxTargets.length === 0 && templateLinuxTargets.length === 0));

  const blocked = [];
  if (!jsYamlReady) {
    blocked.push(
      `js-yaml must be package-lock >= ${jsYamlFloor} and package.json override ${jsYamlFloor}`,
    );
  }
  if (!glibReleaseScopeSafe) {
    blocked.push(
      `glib ${glibVersion ?? "missing"} is below ${glibFloor} while Linux bundle targets are enabled`,
    );
  }

  return {
    status: blocked.length ? "blocked_local_fix_required" : "ready_for_github_rescan_or_dismissal",
    jsYaml: {
      alertNumber: 124,
      packageName: "js-yaml",
      manifestPath: "package-lock.json",
      lockVersion: jsYamlVersion,
      requiredFloor: jsYamlFloor,
      packageOverride: jsYamlOverride,
      localStatus: jsYamlReady ? "patched_locally" : "needs_local_patch",
      externalAction: jsYamlReady
        ? "Push the package.json override/floor, then wait for GitHub Dependabot to rescan this development alert."
        : `Restore js-yaml >= ${jsYamlFloor} in package-lock.json and package.json overrides before pushing.`,
    },
    glib: {
      alertNumber: 77,
      packageName: "glib",
      manifestPath: "desktop/src-tauri/Cargo.lock",
      lockVersion: glibVersion,
      requiredFloor: glibFloor,
      releaseTargets,
      secureTemplateTargets,
      linuxBundleTargetsPresent: [...activeLinuxTargets, ...templateLinuxTargets],
      localStatus: glibReleaseScopeSafe
        ? "release_scope_safe_not_used"
        : "needs_local_release_scope_or_dependency_patch",
      externalAction: glibReleaseScopeSafe
        ? "Dismiss the GitHub Dependabot alert as not_used only while Linux desktop bundles remain out of scope; do not add Linux targets until glib is patched."
        : `Remove Linux bundle targets or update glib to >= ${glibFloor} before release.`,
    },
    proofCommands: [
      "npm run dependency:security:check",
      "npm run security:tauri",
      "npm run dependabot:open:closure:check",
      "npm run validate:infra-hardening",
      "npm run verify",
    ],
    blocked,
  };
}

function printReport(report) {
  console.log("Nexus Dependabot open-alert closure");
  console.log("No network calls are made. This command reads local manifests only.");
  console.log("");
  console.log(`Overall: ${report.status}`);
  console.log("");
  console.log("[js-yaml #124]");
  console.log(`  Lock version: ${report.jsYaml.lockVersion ?? "missing"}`);
  console.log(`  Required floor: ${report.jsYaml.requiredFloor}`);
  console.log(`  Override present: ${formatBool(report.jsYaml.packageOverride === jsYamlFloor)}`);
  console.log(`  Local status: ${report.jsYaml.localStatus}`);
  console.log(`  External action: ${report.jsYaml.externalAction}`);
  console.log("");
  console.log("[glib #77]");
  console.log(`  Lock version: ${report.glib.lockVersion ?? "missing"}`);
  console.log(`  Required floor for Linux release: ${report.glib.requiredFloor}`);
  console.log(`  Release targets: ${report.glib.releaseTargets.join(", ") || "none"}`);
  console.log(
    `  Linux targets present: ${
      report.glib.linuxBundleTargetsPresent.join(", ") || "none"
    }`,
  );
  console.log(`  Local status: ${report.glib.localStatus}`);
  console.log(`  External action: ${report.glib.externalAction}`);
  console.log("");
  console.log("Proof commands:");
  for (const command of report.proofCommands) {
    console.log(`  ${command}`);
  }

  if (report.blocked.length) {
    console.log("");
    console.log("Blocked local items:");
    for (const item of report.blocked) {
      console.log(`  - ${item}`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const report = buildReport();

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (args.check && report.blocked.length) {
  process.exit(1);
}
