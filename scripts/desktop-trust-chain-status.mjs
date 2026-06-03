#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const jsonOutput = args.includes("--json");
const noWrite = args.includes("--no-write") || checkOnly;
const metricsDir = join(root, "docs", "metrics");

function readArgValue(prefix) {
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function pathLabel(path) {
  return relative(root, path).replace(/\\/g, "/") || ".";
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .map((name) => join(directory, name))
    .filter((path) => statSync(path).isFile())
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

function isReleaseArtifact(path) {
  const name = basename(path).toLowerCase();
  if (name === "sha256sums.txt") return false;
  if (name.includes("sbom")) return false;
  if (name.endsWith(".json")) return false;
  return true;
}

function parseChecksumLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
      return match
        ? { hash: match[1].toLowerCase(), file: match[2].trim() }
        : { invalid: line };
    });
}

function checksumStatus(targetDir) {
  const files = listFiles(targetDir).filter(isReleaseArtifact);
  const checksumPath = join(targetDir, "SHA256SUMS.txt");

  if (!existsSync(targetDir)) {
    return {
      status: "missing_artifact_dir",
      targetDir: pathLabel(targetDir),
      artifactCount: 0,
      checksumFile: null,
      verifiedCount: 0,
      findings: ["Desktop artifact directory is missing."],
    };
  }

  if (files.length === 0) {
    return {
      status: "missing_artifacts",
      targetDir: pathLabel(targetDir),
      artifactCount: 0,
      checksumFile: existsSync(checksumPath) ? pathLabel(checksumPath) : null,
      verifiedCount: 0,
      findings: ["No desktop release artifacts were found."],
    };
  }

  if (!existsSync(checksumPath)) {
    return {
      status: "missing_checksums",
      targetDir: pathLabel(targetDir),
      artifactCount: files.length,
      checksumFile: null,
      verifiedCount: 0,
      artifacts: files.map(pathLabel),
      findings: ["SHA256SUMS.txt is missing for desktop artifacts."],
    };
  }

  const parsed = parseChecksumLines(readFileSync(checksumPath, "utf8"));
  const checksumByFile = new Map();
  const findings = [];

  for (const entry of parsed) {
    if (entry.invalid) {
      findings.push(`Invalid checksum line: ${entry.invalid}`);
      continue;
    }
    checksumByFile.set(entry.file, entry.hash);
  }

  let verifiedCount = 0;
  for (const file of files) {
    const name = basename(file);
    const expected = checksumByFile.get(name);
    if (!expected) {
      findings.push(`Missing checksum for ${name}.`);
      continue;
    }
    const actual = sha256File(file);
    if (actual !== expected) {
      findings.push(`Checksum mismatch for ${name}.`);
      continue;
    }
    verifiedCount++;
  }

  const fileNames = new Set(files.map((file) => basename(file)));
  for (const file of checksumByFile.keys()) {
    if (!fileNames.has(file)) findings.push(`Checksum references missing file ${file}.`);
  }

  return {
    status: findings.length === 0 ? "verified" : "mismatch",
    targetDir: pathLabel(targetDir),
    artifactCount: files.length,
    checksumFile: pathLabel(checksumPath),
    verifiedCount,
    artifacts: files.map(pathLabel),
    findings,
  };
}

function signingStatus() {
  const conf = readJson("desktop/src-tauri/tauri.conf.json") ?? {};
  const macIdentity = conf?.bundle?.macOS?.signingIdentity;
  const windows = conf?.bundle?.windows ?? {};
  const targets = Array.isArray(conf?.bundle?.targets) ? conf.bundle.targets : [];

  const platformRecords = [
    {
      platform: "macOS",
      status: typeof macIdentity === "string" && macIdentity.trim()
        ? "configured"
        : "not_configured",
      evidence: macIdentity ? "macOS signing identity is configured in Tauri config." : null,
      missing: macIdentity ? [] : ["macOS signing identity is not configured."],
    },
    {
      platform: "Windows",
      status: "not_configured",
      evidence: windows.digestAlgorithm
        ? `Windows digest algorithm recorded as ${windows.digestAlgorithm}.`
        : null,
      missing: ["Windows code-signing certificate status is not recorded in config."],
      timestampUrl: windows.timestampUrl ?? null,
    },
    {
      platform: "Linux",
      status: targets.includes("appimage") ? "strategy_pending" : "not_targeted",
      evidence: targets.includes("appimage") ? "AppImage target is enabled." : null,
      missing: targets.includes("appimage")
        ? ["Linux package signing strategy is not recorded."]
        : [],
    },
  ];

  return {
    status: platformRecords.every((record) => record.status === "configured")
      ? "configured"
      : "pending",
    readsSecrets: false,
    note:
      "Signing posture is derived only from committed Tauri config. Certificates, private keys, and env values are not read.",
    platforms: platformRecords,
  };
}

function findSbomFiles(targetDir) {
  const candidates = [];
  for (const file of listFiles(targetDir)) {
    if (basename(file).toLowerCase().includes("sbom")) candidates.push(file);
  }
  if (existsSync(metricsDir)) {
    for (const name of readdirSync(metricsDir)) {
      if (name.toLowerCase().includes("sbom")) {
        const fullPath = join(metricsDir, name);
        if (statSync(fullPath).isFile()) candidates.push(fullPath);
      }
    }
  }
  return candidates.sort((a, b) => pathLabel(a).localeCompare(pathLabel(b)));
}

function sbomStatus(targetDir) {
  const packageLock = readJson("package-lock.json");
  const cargoLockPath = join(root, "desktop", "src-tauri", "Cargo.lock");
  const sbomFiles = findSbomFiles(targetDir);
  const lockfilePackages =
    packageLock?.packages && typeof packageLock.packages === "object"
      ? Object.keys(packageLock.packages).filter(Boolean).length
      : 0;

  return {
    status: sbomFiles.length > 0 ? "recorded" : "inventory_available",
    sbomFiles: sbomFiles.map(pathLabel),
    packageLock: {
      present: Boolean(packageLock),
      packageCount: lockfilePackages,
    },
    cargoLock: {
      present: existsSync(cargoLockPath),
      path: existsSync(cargoLockPath) ? pathLabel(cargoLockPath) : null,
    },
    findings: sbomFiles.length > 0
      ? []
      : ["No desktop SBOM artifact was found; dependency inventory is available from lockfiles."],
  };
}

function buildRecord(targetDir) {
  const checksums = checksumStatus(targetDir);
  const signing = signingStatus();
  const sbom = sbomStatus(targetDir);
  const tauriSecurity = {
    command: "npm run security:tauri",
    status: existsSync(join(root, "desktop", "src-tauri", "tauri.conf.json")) &&
      existsSync(join(root, "desktop", "src-tauri", "capabilities", "default.json"))
      ? "check_available"
      : "missing_inputs",
  };
  const blockers = [
    ...(checksums.status === "verified" ? [] : checksums.findings),
    ...(signing.status === "configured"
      ? []
      : signing.platforms.flatMap((platform) => platform.missing)),
    ...(sbom.status === "recorded" ? [] : sbom.findings),
  ];

  return {
    generatedAt: new Date().toISOString(),
    releaseLane: "desktop",
    targetDir: pathLabel(targetDir),
    releaseReady:
      checksums.status === "verified" &&
      signing.status === "configured" &&
      sbom.status === "recorded",
    checksums,
    signing,
    sbom,
    tauriSecurity,
    blockers,
    nextActions: [
      "Build desktop artifacts with npm run desktop:tauri:build when release packaging is ready.",
      "Run npm run release:checksums -- <artifact-dir> after artifacts exist.",
      "Record signing identities/cert strategy before promoting artifacts.",
      "Attach or generate a desktop SBOM before release promotion.",
    ],
  };
}

function writeRecord(record) {
  mkdirSync(metricsDir, { recursive: true });
  const stamp = record.generatedAt.replace(/[:.]/g, "-");
  const outFile = join(metricsDir, `desktop-trust-chain-${stamp}.json`);
  writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return outFile;
}

function printRecord(record, outFile) {
  if (jsonOutput) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  console.log("Desktop trust chain status");
  console.log(`Target: ${record.targetDir}`);
  console.log(`Release ready: ${record.releaseReady ? "yes" : "no"}`);
  console.log(`Checksums: ${record.checksums.status}`);
  console.log(`Signing: ${record.signing.status}`);
  console.log(`SBOM: ${record.sbom.status}`);
  if (outFile) console.log(`Wrote: ${pathLabel(outFile)}`);
  if (record.blockers.length > 0) {
    console.log("Blockers:");
    for (const blocker of record.blockers) console.log(`- ${blocker}`);
  }
}

const targetDir = resolve(root, readArgValue("--dir=") ?? "desktop/dist");
const record = buildRecord(targetDir);
const outFile = noWrite ? null : writeRecord(record);

if (checkOnly) {
  if (!record.checksums || !record.signing || !record.sbom) {
    console.error("x desktop-trust-chain: status record is incomplete.");
    process.exit(1);
  }
  console.log(`ok desktop-trust-chain (${record.releaseReady ? "ready" : "not release ready"})`);
} else {
  printRecord(record, outFile);
}
