#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const require = createRequire(import.meta.url);

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
const nextConfig = require(join(root, "next.config.js"));
const packages =
  lock?.packages && typeof lock.packages === "object" ? lock.packages : {};

if (nextConfig?.images?.unoptimized !== true) {
  fail(
    "next.config.js must keep the built-in image optimizer disabled as defense in depth",
  );
}
if (nextConfig?.images?.dangerouslyAllowSVG !== false) {
  fail(
    "next.config.js must explicitly deny SVG optimization as defense in depth",
  );
}

if (packageJson?.overrides?.postcss !== "$postcss") {
  fail("package.json must override transitive postcss through the direct postcss floor");
}
if (packageJson?.overrides?.prismjs !== "1.30.0") {
  fail("package.json must override transitive prismjs to 1.30.0");
}
if (packageJson?.overrides?.ws !== "8.21.0") {
  fail("package.json must override transitive ws to 8.21.0");
}
if (packageJson?.overrides?.["js-yaml"] !== "4.3.0") {
  fail("package.json must override transitive js-yaml to 4.3.0");
}
if (packageJson?.overrides?.sharp !== "0.35.0") {
  fail("package.json must override transitive sharp to 0.35.0");
}
if (packageJson?.overrides?.["brace-expansion"] !== "5.0.9") {
  fail("package.json must override brace-expansion globally to 5.0.9");
}

const npmFloors = new Map([
  ["postcss", "8.5.25"],
  ["prismjs", "1.30.0"],
  ["ws", "8.21.0"],
  ["js-yaml", "4.3.0"],
  ["next", "15.5.21"],
  ["sharp", "0.35.0"],
  ["brace-expansion", "5.0.9"],
]);

for (const [path, metadata] of Object.entries(packages)) {
  const name = path.split("node_modules/").at(-1);
  const version = metadata?.version;
  if (!name || !version) continue;

  const floor = npmFloors.get(name);
  if (floor && compareVersions(version, floor) < 0) {
    fail(`${path || "<root>"} uses ${name}@${version}; required floor is ${floor}`);
  }

}

const cargoLock = readFileSync(
  join(root, "desktop", "src-tauri", "Cargo.lock"),
  "utf8",
);
const tauriConf = readJson("desktop/src-tauri/tauri.conf.json");
const bundleTargets = Array.isArray(tauriConf?.bundle?.targets)
  ? tauriConf.bundle.targets
  : [];
const linuxBundleTargets = ["appimage", "deb", "rpm"];
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

  if (pkg.name === "serde_with" && compareVersions(pkg.version, "3.21.0") < 0) {
    fail(`Cargo.lock uses serde_with@${pkg.version}; required floor is 3.21.0`);
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
if (
  glib &&
  compareVersions(glib.version, "0.20.0") < 0 &&
  bundleTargets.some((target) => linuxBundleTargets.includes(target))
) {
  fail(
    `Cargo.lock contains vulnerable Linux-only glib@${glib.version} while a Linux bundle remains a release target`,
  );
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  `ok active-dependency-security (Next image optimizer disabled and SVG optimization denied; next>=15.5.21, sharp>=0.35.0, postcss>=8.5.25, prismjs>=1.30.0, ws>=8.21.0, js-yaml>=4.3.0, brace-expansion>=5.0.9 globally, tauri>=2.11.1, serde_with>=3.21.0${
    glib ? `; Linux-only non-release glib=${glib.version}` : ""
  })`,
);
