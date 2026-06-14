#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const TURBOQUANT_REVIEWED_COMMIT =
  "7ac9b8d165a3f7d5e6df33b0450bc1f88ec0d4d5";
const EXECUTABLE_SCRIPTS = ["proof.py", "benchmark.py"];
const README_ONLY_SCRIPTS = [
  "validate_paper.py",
  "audit_claims.py",
  "test_modular.py",
  "test_turboquant.py",
];
const REQUIRED_FILES = [
  "README.md",
  "LICENSE",
  "setup.py",
  "proof.py",
  "benchmark.py",
  "turboquant/__init__.py",
  "turboquant/score.py",
  "turboquant/store.py",
  "turboquant/quantizer.py",
  "turboquant/rotation.py",
  "turboquant/capture.py",
  "turboquant/codebook.py",
  "turboquant/triton_kernels.py",
  "turboquant/kv_cache.py",
  "turboquant/vllm_attn_backend.py",
  "turboquant/integration/vllm.py",
];

function requiredPath(root, relativePath, kind) {
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("TurboQuant checkout path escaped its reviewed root.");
  }
  if (!fs.existsSync(candidate)) {
    throw new Error(`TurboQuant checkout is missing required ${kind}.`);
  }
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink()) {
    throw new Error(`TurboQuant required ${kind} cannot be a symlink.`);
  }
  if (kind === "file" && !stat.isFile()) {
    throw new Error("TurboQuant required file is invalid.");
  }
  if (kind === "directory" && !stat.isDirectory()) {
    throw new Error("TurboQuant required directory is invalid.");
  }
  return candidate;
}

function runGit(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    shell: false,
    timeout: 15_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error("TurboQuant checkout Git verification failed.");
  }
  return result.stdout.trim();
}

function normalizedPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function auditLocalTurboQuantCheckout(rootPath, options = {}) {
  const root = path.resolve(rootPath?.trim() ?? "");
  if (!rootPath?.trim() || !fs.existsSync(root)) {
    throw new Error("TurboQuant checkout root is missing.");
  }
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("TurboQuant checkout root must be a regular directory.");
  }
  const files = REQUIRED_FILES.map((file) => requiredPath(root, file, "file"));
  const license = fs.readFileSync(files[1], "utf8").slice(0, 64_000);
  const gpl3License =
    /GNU GENERAL PUBLIC LICENSE/i.test(license) && /Version 3/i.test(license);
  if (!gpl3License) {
    throw new Error("TurboQuant checkout does not expose the expected GPL-3 license.");
  }
  const topLevel = runGit(root, ["rev-parse", "--show-toplevel"]);
  if (normalizedPath(topLevel) !== normalizedPath(root)) {
    throw new Error("TurboQuant checkout root is not its Git repository root.");
  }
  const reviewedCommit = runGit(root, ["rev-parse", "--verify", "HEAD"]).toLowerCase();
  const expectedCommit = (
    options.expectedCommit ?? TURBOQUANT_REVIEWED_COMMIT
  ).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(expectedCommit) || reviewedCommit !== expectedCommit) {
    throw new Error("TurboQuant checkout is not at the reviewed source commit.");
  }
  const worktreeStatus = runGit(root, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--ignored=matching",
  ]);
  if (worktreeStatus) {
    throw new Error("TurboQuant checkout must be clean before it can be reviewed.");
  }
  return {
    valid: true,
    gpl3License,
    reviewedCommit,
    requiredFiles: REQUIRED_FILES.length,
    executableScripts: [...EXECUTABLE_SCRIPTS],
    readmeOnlyScripts: [...README_ONLY_SCRIPTS],
    separateRuntimeRequired: true,
  };
}

function readRoot() {
  const inline = process.argv.find((value) => value.startsWith("--root="));
  if (inline) return inline.slice("--root=".length);
  const index = process.argv.indexOf("--root");
  return (
    (index >= 0 ? process.argv[index + 1] : undefined) ??
    process.env.NEXUS_TURBOQUANT_ROOT
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try {
    console.log(JSON.stringify(auditLocalTurboQuantCheckout(readRoot()), null, 2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "TurboQuant checkout audit failed.",
    );
    process.exit(1);
  }
}
