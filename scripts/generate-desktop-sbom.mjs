#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const jsonOutput = args.includes("--json");
const PACKAGE_LOCK_LABEL = "package-lock.json";
const CARGO_LOCK_LABEL = "desktop/src-tauri/Cargo.lock";
const DEFAULT_OUTPUT_LABEL = "docs/metrics/desktop-sbom.cdx.json";

function fail(message) {
  console.error(`x desktop-sbom: ${message}`);
  process.exit(1);
}

function readArgValue(prefix) {
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function readRequired(label) {
  const filePath = join(root, ...label.split("/"));
  if (!existsSync(filePath)) fail(`${label} is missing`);
  return readFileSync(filePath, "utf8");
}

function pathLabel(filePath) {
  return relative(root, filePath).replace(/\\/g, "/") || ".";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function formatUuid(digest) {
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    digest.slice(12, 16),
    digest.slice(16, 20),
    digest.slice(20, 32),
  ].join("-");
}

function encodePurlName(name) {
  return name
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function packageNameFromLockPath(lockPath, entry) {
  if (typeof entry?.name === "string" && entry.name.trim()) {
    return entry.name.trim();
  }
  const normalized = lockPath.replace(/\\/g, "/");
  const marker = "node_modules/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const remainder = normalized.slice(markerIndex + marker.length);
  const parts = remainder.split("/").filter(Boolean);
  if (parts[0]?.startsWith("@") && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? null;
}

function integrityHash(integrity) {
  if (typeof integrity !== "string") return null;
  const match = integrity.match(/^(sha256|sha384|sha512)-(.+)$/i);
  if (!match) return null;
  try {
    return {
      alg: match[1].toUpperCase().replace("SHA", "SHA-"),
      content: Buffer.from(match[2], "base64").toString("hex"),
    };
  } catch {
    return null;
  }
}

function parseCargoPackages(cargoLockText) {
  return cargoLockText
    .split(/\r?\n\[\[package\]\]\r?\n/)
    .slice(1)
    .map((block) => {
      const field = (name) =>
        block.match(new RegExp(`^${name}\\s*=\\s*"([^"]*)"`, "m"))?.[1] ??
        null;
      return {
        name: field("name"),
        version: field("version"),
        source: field("source"),
        checksum: field("checksum"),
      };
    })
    .filter((entry) => entry.name && entry.version);
}

function componentProperties(ecosystem, extra = []) {
  return [
    { name: "nexus:ecosystem", value: ecosystem },
    ...extra,
  ].sort((a, b) => a.name.localeCompare(b.name));
}

function buildNpmComponents(packageLock) {
  const byPurl = new Map();
  const packages =
    packageLock?.packages && typeof packageLock.packages === "object"
      ? packageLock.packages
      : {};

  for (const [lockPath, entry] of Object.entries(packages)) {
    if (!lockPath || !entry || typeof entry !== "object") continue;
    const name = packageNameFromLockPath(lockPath, entry);
    const version =
      typeof entry.version === "string" ? entry.version.trim() : "";
    if (!name || !version) continue;

    const purl = `pkg:npm/${encodePurlName(name)}@${encodeURIComponent(version)}`;
    const existing = byPurl.get(purl);
    const scope = entry.dev === true ? "development" : "runtime";
    if (existing) {
      if (scope === "runtime") {
        existing.properties = componentProperties("npm", [
          { name: "nexus:npm-scope", value: "runtime" },
        ]);
      }
      continue;
    }

    const hash = integrityHash(entry.integrity);
    const component = {
      type: "library",
      "bom-ref": purl,
      name,
      version,
      purl,
      properties: componentProperties("npm", [
        { name: "nexus:npm-scope", value: scope },
      ]),
    };
    if (hash) component.hashes = [hash];
    if (typeof entry.license === "string" && entry.license.trim()) {
      component.licenses = [{ expression: entry.license.trim() }];
    }
    byPurl.set(purl, component);
  }

  return Array.from(byPurl.values());
}

function buildCargoComponents(cargoPackages) {
  const byPurl = new Map();
  for (const entry of cargoPackages) {
    const purl = `pkg:cargo/${encodePurlName(entry.name)}@${encodeURIComponent(entry.version)}`;
    if (byPurl.has(purl)) continue;
    const component = {
      type: "library",
      "bom-ref": purl,
      name: entry.name,
      version: entry.version,
      purl,
      properties: componentProperties("cargo", [
        {
          name: "nexus:cargo-source",
          value: entry.source ?? "local",
        },
      ]),
    };
    if (entry.checksum) {
      component.hashes = [{ alg: "SHA-256", content: entry.checksum }];
    }
    byPurl.set(purl, component);
  }
  return Array.from(byPurl.values());
}

function buildSbom(packageLockText, cargoLockText) {
  let packageLock;
  try {
    packageLock = JSON.parse(packageLockText);
  } catch {
    fail(`${PACKAGE_LOCK_LABEL} is not valid JSON`);
  }

  const cargoPackages = parseCargoPackages(cargoLockText);
  const npmComponents = buildNpmComponents(packageLock);
  const cargoComponents = buildCargoComponents(cargoPackages);
  const components = [...npmComponents, ...cargoComponents].sort((a, b) =>
    a["bom-ref"].localeCompare(b["bom-ref"]),
  );
  const lockDigest = sha256(
    `${PACKAGE_LOCK_LABEL}\0${packageLockText}\0${CARGO_LOCK_LABEL}\0${cargoLockText}`,
  );
  const desktopPackage =
    cargoPackages.find((entry) => entry.name === "nexus_desktop") ?? null;
  const desktopVersion = desktopPackage?.version ?? "0.0.0-local";

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${formatUuid(lockDigest)}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        "bom-ref": `pkg:generic/nexus-desktop@${encodeURIComponent(desktopVersion)}`,
        name: "nexus-desktop",
        version: desktopVersion,
      },
      properties: [
        {
          name: "nexus:component-count",
          value: String(components.length),
        },
        {
          name: "nexus:generator",
          value: "scripts/generate-desktop-sbom.mjs",
        },
        {
          name: "nexus:lock-digest-sha256",
          value: lockDigest,
        },
        {
          name: "nexus:network-required",
          value: "false",
        },
        {
          name: "nexus:source-lockfiles",
          value: `${PACKAGE_LOCK_LABEL},${CARGO_LOCK_LABEL}`,
        },
      ],
    },
    components,
  };
}

const packageLockText = readRequired(PACKAGE_LOCK_LABEL);
const cargoLockText = readRequired(CARGO_LOCK_LABEL);
const sbom = buildSbom(packageLockText, cargoLockText);
const output = `${JSON.stringify(sbom, null, 2)}\n`;
const outputPath = resolve(
  root,
  readArgValue("--out=") ?? DEFAULT_OUTPUT_LABEL,
);

if (jsonOutput) {
  process.stdout.write(output);
  process.exit(0);
}

if (checkOnly) {
  if (!existsSync(outputPath)) fail(`${pathLabel(outputPath)} is missing`);
  const existing = readFileSync(outputPath, "utf8");
  if (existing !== output) {
    fail(
      `${pathLabel(outputPath)} is stale; run npm run desktop:sbom to refresh it`,
    );
  }
  console.log(
    `ok desktop-sbom-current (${sbom.components.length} components, ${sbom.metadata.properties.find((property) => property.name === "nexus:lock-digest-sha256")?.value.slice(0, 12)})`,
  );
  process.exit(0);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output, "utf8");
console.log(
  `Desktop SBOM written: ${pathLabel(outputPath)} (${sbom.components.length} components)`,
);
