#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x active-dependency-security: ${message}`);
  process.exitCode = 1;
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

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

const lock = readJson("package-lock.json");
const packageJson = readJson("package.json");
const packages =
  lock?.packages && typeof lock.packages === "object" ? lock.packages : {};

if (packageJson?.overrides?.postcss !== "$postcss") {
  fail("package.json must override transitive postcss through the direct postcss floor");
}
if (packageJson?.overrides?.prismjs !== "1.30.0") {
  fail("package.json must override transitive prismjs to 1.30.0");
}
if (
  packageJson?.overrides?.["minimatch@10.2.5"]?.["brace-expansion"] !== "5.0.6"
) {
  fail("package.json must override minimatch@10.2.5 brace-expansion to 5.0.6");
}

const npmFloors = new Map([
  ["postcss", "8.5.10"],
  ["prismjs", "1.30.0"],
]);

for (const [path, metadata] of Object.entries(packages)) {
  const name = path.split("node_modules/").at(-1);
  const version = metadata?.version;
  if (!name || !version) continue;

  const floor = npmFloors.get(name);
  if (floor && compareVersions(version, floor) < 0) {
    fail(`${path || "<root>"} uses ${name}@${version}; required floor is ${floor}`);
  }

  if (
    name === "brace-expansion" &&
    version.startsWith("5.") &&
    compareVersions(version, "5.0.6") < 0
  ) {
    fail(`${path} uses brace-expansion@${version}; required 5.x floor is 5.0.6`);
  }
}

const cargoLock = readFileSync(
  join(root, "desktop", "src-tauri", "Cargo.lock"),
  "utf8",
);
const cargoPackages = Array.from(
  cargoLock.matchAll(
    /\[\[package\]\]\r?\nname = "([^"]+)"\r?\nversion = "([^"]+)"/g,
  ),
  (match) => ({ name: match[1], version: match[2] }),
);

for (const pkg of cargoPackages) {
  if (pkg.name === "tauri" && compareVersions(pkg.version, "2.11.1") < 0) {
    fail(`Cargo.lock uses tauri@${pkg.version}; required floor is 2.11.1`);
  }

  if (
    pkg.name === "rand" &&
    (pkg.version.startsWith("0.7.") ||
      (pkg.version.startsWith("0.8.") &&
        compareVersions(pkg.version, "0.8.6") < 0))
  ) {
    fail(`Cargo.lock contains vulnerable rand@${pkg.version}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const glib = cargoPackages.find((pkg) => pkg.name === "glib");
console.log(
  `ok active-dependency-security (postcss>=8.5.10, prismjs>=1.30.0, brace-expansion 5.x>=5.0.6, tauri>=2.11.1${
    glib ? `; deferred glib=${glib.version}` : ""
  })`,
);
