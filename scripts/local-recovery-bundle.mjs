#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const BUNDLE_SCHEMA = "nexus-local-recovery-bundle-v1";
const RESTORE_CONFIRMATION = "RESTORE_LOCAL_STATE";
const DEFAULT_BACKUP_SEGMENTS = [".nexus", "backups"];

function normalizeRelativePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "");
}

function isSafeRelativePath(value) {
  const normalized = normalizeRelativePath(value);
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !normalized.includes("\0") &&
    normalized.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

export function isAllowedLocalStatePath(value) {
  const normalized = normalizeRelativePath(value);
  return (
    /^data\/subscription-escape[^/]*\.(?:json|json\.enc)$/.test(normalized) ||
    /^data\/phone-acceptance-receipts[^/]*\.json$/.test(normalized) ||
    normalized.startsWith("data/subscription-escape-assets/")
  );
}

function ensureInside(rootPath, candidatePath, label) {
  const root = resolve(rootPath);
  const candidate = resolve(candidatePath);
  const rel = relative(root, candidate);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) {
    return candidate;
  }
  throw new Error(`${label} must remain inside its configured root.`);
}

function assertNoSymlinkSegments(rootPath, targetPath, label) {
  const root = resolve(rootPath);
  const target = ensureInside(root, targetPath, label);
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) {
    throw new Error(`${label} root must not be a symbolic link.`);
  }
  const parts = relative(root, target).split(sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`${label} path must not contain symbolic links.`);
    }
  }
  return target;
}

function assertSafeTargetPath(rootPath, targetPath, relativePath) {
  const root = resolve(rootPath);
  const target = assertNoSymlinkSegments(root, targetPath, "Restore target");
  const parts = relative(root, target).split(sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (!existsSync(current)) continue;
    const stat = lstatSync(current);
    if (current !== target && !stat.isDirectory()) {
      throw new Error(`Restore path has a non-directory parent: ${relativePath}`);
    }
  }
  return target;
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function walkFiles(rootPath, currentPath = rootPath) {
  if (!existsSync(currentPath)) return [];
  const root = resolve(rootPath);
  const files = [];
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = join(currentPath, entry.name);
    const relativePath = normalizeRelativePath(relative(root, entryPath));
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in recovery scope: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...walkFiles(root, entryPath));
    } else if (entry.isFile()) {
      files.push({ absolutePath: entryPath, relativePath });
    }
  }
  return files;
}

function discoverLocalStateFiles(sourceRoot) {
  const dataRoot = join(resolve(sourceRoot), "data");
  if (!existsSync(dataRoot)) return [];
  if (lstatSync(dataRoot).isSymbolicLink()) {
    throw new Error("The local data directory must not be a symbolic link.");
  }
  return walkFiles(sourceRoot, dataRoot)
    .filter((entry) => isAllowedLocalStatePath(entry.relativePath))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function formatBundleId(date = new Date()) {
  return `local-recovery-${date.toISOString().replaceAll(":", "-").replace(".", "-")}`;
}

function chooseBundleId(backupRoot, requestedId) {
  const baseId = String(requestedId || formatBundleId()).trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(baseId)) {
    throw new Error("Bundle ID contains unsupported characters.");
  }
  let bundleId = baseId;
  let suffix = 1;
  while (existsSync(join(backupRoot, bundleId))) {
    bundleId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return bundleId;
}

function resolveBackupRoot(sourceRoot, backupRoot) {
  return resolve(backupRoot || join(resolve(sourceRoot), ...DEFAULT_BACKUP_SEGMENTS));
}

export async function createRecoveryBundle(options = {}) {
  const sourceRoot = resolve(options.sourceRoot || process.cwd());
  const backupRoot = resolveBackupRoot(sourceRoot, options.backupRoot);
  const sourceFiles = discoverLocalStateFiles(sourceRoot);
  if (sourceFiles.length === 0) {
    throw new Error("No allowlisted Nexus local-state files were found.");
  }

  mkdirSync(backupRoot, { recursive: true });
  if (lstatSync(backupRoot).isSymbolicLink()) {
    throw new Error("Backup root must not be a symbolic link.");
  }
  const bundleId = chooseBundleId(backupRoot, options.bundleId);
  const bundlePath = ensureInside(backupRoot, join(backupRoot, bundleId), "Bundle");
  const stagingPath = ensureInside(
    backupRoot,
    join(backupRoot, `.staging-${bundleId}`),
    "Staging bundle",
  );
  const filesRoot = join(stagingPath, "files");
  rmSync(stagingPath, { recursive: true, force: true });
  mkdirSync(filesRoot, { recursive: true });

  try {
    const files = [];
    for (const entry of sourceFiles) {
      const buffer = readFileSync(entry.absolutePath);
      const destination = ensureInside(
        filesRoot,
        join(filesRoot, ...entry.relativePath.split("/")),
        "Bundle file",
      );
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, buffer);
      files.push({
        path: entry.relativePath,
        bytes: buffer.byteLength,
        sha256: hashBuffer(buffer),
      });
    }

    const totalBytes = files.reduce((sum, entry) => sum + entry.bytes, 0);
    const manifest = {
      schema: BUNDLE_SCHEMA,
      bundleId,
      createdAt: new Date().toISOString(),
      fileCount: files.length,
      totalBytes,
      files,
    };
    const manifestPath = join(stagingPath, "manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    renameSync(stagingPath, bundlePath);
    return {
      ...manifest,
      bundlePath,
      manifestPath: join(bundlePath, "manifest.json"),
    };
  } catch (error) {
    rmSync(stagingPath, { recursive: true, force: true });
    throw error;
  }
}

function resolveBundlePath(backupRoot, bundle) {
  const root = resolve(backupRoot);
  const requested = String(bundle || "").trim();
  if (!requested) throw new Error("A recovery bundle ID or path is required.");
  const candidate =
    isAbsolute(requested) || /[\\/]/.test(requested)
      ? resolve(requested)
      : join(root, requested);
  const bundlePath = assertNoSymlinkSegments(root, candidate, "Recovery bundle");
  if (!existsSync(bundlePath) || !lstatSync(bundlePath).isDirectory()) {
    throw new Error("Recovery bundle does not exist.");
  }
  if (lstatSync(bundlePath).isSymbolicLink()) {
    throw new Error("Recovery bundle must not be a symbolic link.");
  }
  return bundlePath;
}

function validateManifest(manifest, expectedBundleId) {
  if (!manifest || manifest.schema !== BUNDLE_SCHEMA) {
    throw new Error("Recovery bundle schema is unsupported.");
  }
  if (manifest.bundleId !== expectedBundleId) {
    throw new Error("Recovery bundle ID does not match its directory.");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Recovery bundle manifest has no files.");
  }

  const seen = new Set();
  let totalBytes = 0;
  for (const entry of manifest.files) {
    const filePath = normalizeRelativePath(entry?.path);
    if (!isSafeRelativePath(filePath) || !isAllowedLocalStatePath(filePath)) {
      throw new Error("Recovery bundle manifest contains an unsafe or disallowed path.");
    }
    if (seen.has(filePath)) throw new Error("Recovery bundle manifest has duplicate paths.");
    seen.add(filePath);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
      throw new Error("Recovery bundle manifest contains an invalid byte count.");
    }
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))) {
      throw new Error("Recovery bundle manifest contains an invalid SHA-256 hash.");
    }
    totalBytes += entry.bytes;
  }

  if (manifest.fileCount !== manifest.files.length || manifest.totalBytes !== totalBytes) {
    throw new Error("Recovery bundle manifest totals do not match its file records.");
  }
  return { seen, totalBytes };
}

export async function verifyRecoveryBundle(options = {}) {
  const sourceRoot = resolve(options.sourceRoot || process.cwd());
  const backupRoot = resolveBackupRoot(sourceRoot, options.backupRoot);
  const bundlePath = resolveBundlePath(backupRoot, options.bundle);
  const bundleId = basename(bundlePath);
  const manifestPath = join(bundlePath, "manifest.json");
  if (!existsSync(manifestPath) || lstatSync(manifestPath).isSymbolicLink()) {
    throw new Error("Recovery bundle manifest is missing or unsafe.");
  }
  const manifest = readJson(manifestPath, "Recovery bundle manifest");
  const { seen } = validateManifest(manifest, bundleId);
  const filesRoot = join(bundlePath, "files");
  if (!existsSync(filesRoot) || !lstatSync(filesRoot).isDirectory()) {
    throw new Error("Recovery bundle files directory is missing.");
  }

  const actualFiles = walkFiles(filesRoot).map((entry) => entry.relativePath).sort();
  const expectedFiles = Array.from(seen).sort();
  if (
    actualFiles.length !== expectedFiles.length ||
    actualFiles.some((entry, index) => entry !== expectedFiles[index])
  ) {
    throw new Error("Recovery bundle contains missing or extra files.");
  }

  for (const entry of manifest.files) {
    const filePath = ensureInside(
      filesRoot,
      join(filesRoot, ...normalizeRelativePath(entry.path).split("/")),
      "Recovery bundle file",
    );
    if (!existsSync(filePath) || lstatSync(filePath).isSymbolicLink()) {
      throw new Error("Recovery bundle contains a missing or unsafe file.");
    }
    const buffer = readFileSync(filePath);
    if (buffer.byteLength !== entry.bytes || hashBuffer(buffer) !== entry.sha256) {
      throw new Error(`Recovery bundle integrity check failed for ${entry.path}.`);
    }
  }

  return {
    valid: true,
    bundleId,
    bundlePath,
    createdAt: manifest.createdAt,
    fileCount: manifest.fileCount,
    totalBytes: manifest.totalBytes,
    files: manifest.files,
  };
}

export async function listRecoveryBundles(options = {}) {
  const sourceRoot = resolve(options.sourceRoot || process.cwd());
  const backupRoot = resolveBackupRoot(sourceRoot, options.backupRoot);
  if (!existsSync(backupRoot)) return [];
  if (lstatSync(backupRoot).isSymbolicLink()) {
    throw new Error("Backup root must not be a symbolic link.");
  }

  const summaries = [];
  for (const entry of readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".staging-")) continue;
    try {
      const verified = await verifyRecoveryBundle({
        sourceRoot,
        backupRoot,
        bundle: entry.name,
      });
      summaries.push({
        bundleId: verified.bundleId,
        createdAt: verified.createdAt,
        fileCount: verified.fileCount,
        totalBytes: verified.totalBytes,
        valid: true,
      });
    } catch (error) {
      summaries.push({
        bundleId: entry.name,
        createdAt: null,
        fileCount: 0,
        totalBytes: 0,
        valid: false,
        error: error instanceof Error ? error.message : "Bundle verification failed.",
      });
    }
  }
  return summaries.sort((a, b) => b.bundleId.localeCompare(a.bundleId));
}

export async function restoreRecoveryBundle(options = {}) {
  const targetRoot = resolve(options.targetRoot || process.cwd());
  const verified = await verifyRecoveryBundle(options);
  const filesRoot = join(verified.bundlePath, "files");
  const plan = verified.files.map((entry) => {
    const targetPath = assertSafeTargetPath(
      targetRoot,
      join(targetRoot, ...normalizeRelativePath(entry.path).split("/")),
      entry.path,
    );
    return {
      path: entry.path,
      targetPath,
      conflict: existsSync(targetPath),
    };
  });
  for (const entry of plan) {
    if (entry.conflict && !lstatSync(entry.targetPath).isFile()) {
      throw new Error(`Restore target conflict is not a regular file: ${entry.path}`);
    }
  }
  const conflicts = plan.filter((entry) => entry.conflict).map((entry) => entry.path);

  if (!options.apply) {
    return {
      applied: false,
      bundleId: verified.bundleId,
      wouldRestore: plan.length,
      conflicts,
    };
  }
  if (options.confirm !== RESTORE_CONFIRMATION) {
    throw new Error(`Restore apply requires --confirm=${RESTORE_CONFIRMATION}.`);
  }
  if (conflicts.length > 0 && !options.overwrite) {
    throw new Error("Restore would replace existing files; rerun with --overwrite after review.");
  }

  let restored = 0;
  for (const entry of plan) {
    const sourcePath = ensureInside(
      filesRoot,
      join(filesRoot, ...normalizeRelativePath(entry.path).split("/")),
      "Restore source",
    );
    mkdirSync(dirname(entry.targetPath), { recursive: true });
    const tempPath = join(
      dirname(entry.targetPath),
      `.${basename(entry.targetPath)}.${verified.bundleId}.nexus-restore-tmp`,
    );
    const previousPath = join(
      dirname(entry.targetPath),
      `.${basename(entry.targetPath)}.${verified.bundleId}.nexus-restore-previous`,
    );
    if (existsSync(tempPath) || existsSync(previousPath)) {
      throw new Error(`Restore staging path already exists: ${entry.path}`);
    }
    copyFileSync(sourcePath, tempPath);
    if (!entry.conflict) {
      renameSync(tempPath, entry.targetPath);
      restored += 1;
      continue;
    }
    renameSync(entry.targetPath, previousPath);
    try {
      renameSync(tempPath, entry.targetPath);
      rmSync(previousPath, { force: true });
    } catch (error) {
      rmSync(tempPath, { force: true });
      if (existsSync(previousPath) && !existsSync(entry.targetPath)) {
        renameSync(previousPath, entry.targetPath);
      }
      throw error;
    }
    restored += 1;
  }

  return {
    applied: true,
    bundleId: verified.bundleId,
    restored,
    conflicts,
    overwritten: conflicts.length,
  };
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.find((arg) => !arg.startsWith("-")) || "list";
  const readValue = (name) => {
    const direct = args.find((arg) => arg.startsWith(`${name}=`));
    if (direct) return direct.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    command,
    bundle: readValue("--bundle"),
    bundleId: readValue("--bundle-id"),
    confirm: readValue("--confirm"),
    apply: args.includes("--apply"),
    overwrite: args.includes("--overwrite"),
    json: args.includes("--json"),
  };
}

function printResult(command, result, json) {
  if (json) {
    const sanitize = (entry) => {
      const safeEntry = { ...entry };
      delete safeEntry.bundlePath;
      delete safeEntry.manifestPath;
      delete safeEntry.files;
      return safeEntry;
    };
    const safeResult = Array.isArray(result) ? result.map(sanitize) : sanitize(result);
    console.log(JSON.stringify(safeResult, null, 2));
    return;
  }

  if (command === "list") {
    if (result.length === 0) {
      console.log("No local recovery bundles found.");
      return;
    }
    for (const bundle of result) {
      console.log(
        `${bundle.valid ? "ok" : "x"} ${bundle.bundleId} (${bundle.fileCount} files, ${bundle.totalBytes} bytes)`,
      );
    }
    return;
  }
  if (command === "create") {
    console.log(`Created ${result.bundleId} (${result.fileCount} files, ${result.totalBytes} bytes).`);
    return;
  }
  if (command === "verify") {
    console.log(`Verified ${result.bundleId} (${result.fileCount} files, ${result.totalBytes} bytes).`);
    return;
  }
  if (result.applied) {
    console.log(`Restored ${result.restored} files from ${result.bundleId}.`);
  } else {
    console.log(
      `Restore dry-run for ${result.bundleId}: ${result.wouldRestore} files, ${result.conflicts.length} conflicts.`,
    );
    console.log(`Apply only after review with --apply --confirm=${RESTORE_CONFIRMATION}.`);
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  let result;
  if (parsed.command === "create") {
    result = await createRecoveryBundle({ bundleId: parsed.bundleId });
  } else if (parsed.command === "list") {
    result = await listRecoveryBundles();
  } else if (parsed.command === "verify") {
    result = await verifyRecoveryBundle({ bundle: parsed.bundle });
  } else if (parsed.command === "restore") {
    result = await restoreRecoveryBundle({
      bundle: parsed.bundle,
      apply: parsed.apply,
      confirm: parsed.confirm,
      overwrite: parsed.overwrite,
    });
  } else {
    throw new Error("Command must be create, list, verify, or restore.");
  }
  printResult(parsed.command, result, parsed.json);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(
      `x local-recovery-bundle: ${error instanceof Error ? error.message : "Unknown failure."}`,
    );
    process.exitCode = 1;
  });
}
