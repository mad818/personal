#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const EVIDENCE_ROOT = ".nexus/isolated-verification";
const WORKTREE_ROOT = ".worktrees";

export class IsolatedVerifyUsageError extends Error {}

export function parseIsolatedVerifyArgs(argv) {
  const options = { help: false, intent: null, json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      if (options.json) {
        throw new IsolatedVerifyUsageError("--json may be provided only once");
      }
      options.json = true;
      continue;
    }
    if (arg === "--intent") {
      if (options.intent !== null) {
        throw new IsolatedVerifyUsageError(
          "--intent may be provided only once",
        );
      }
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new IsolatedVerifyUsageError(
          "--intent requires a non-empty value",
        );
      }
      options.intent = value.trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--intent=")) {
      if (options.intent !== null) {
        throw new IsolatedVerifyUsageError(
          "--intent may be provided only once",
        );
      }
      options.intent = arg.slice("--intent=".length).trim();
      continue;
    }
    throw new IsolatedVerifyUsageError(`unknown option: ${arg}`);
  }

  if (!options.help) {
    if (!options.intent) {
      throw new IsolatedVerifyUsageError("--intent is required");
    }
    if (options.intent.length > 1000) {
      throw new IsolatedVerifyUsageError(
        "--intent must be 1000 characters or fewer",
      );
    }
    if (/[\r\n\0]/.test(options.intent)) {
      throw new IsolatedVerifyUsageError(
        "--intent must be one plain-text line",
      );
    }
  }

  return options;
}

export function buildIsolatedRunId(now, stagedDiff) {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(":", "-");
  const digest = createHash("sha256")
    .update(stagedDiff)
    .digest("hex")
    .slice(0, 10);
  return `${stamp}-${digest}`;
}

function buildContainedWorktreeRelative(runId) {
  if (!/^[0-9TZ-]+-[a-f0-9]{10}$/.test(runId)) {
    throw new Error("run ID is outside the contained worktree contract");
  }
  return `${WORKTREE_ROOT}/isolated-verify-${runId}`;
}

export function resolveContainedWorktree(repoRoot, runId) {
  const worktreeRelative = buildContainedWorktreeRelative(runId);
  const worktreeRoot = path.resolve(repoRoot, WORKTREE_ROOT);
  const candidate = path.resolve(repoRoot, ...worktreeRelative.split("/"));
  const relative = path.relative(worktreeRoot, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("worktree candidate escapes the contained worktree root");
  }
  return candidate;
}

export function findChangedPathOverlap(stagedPaths, unstagedPaths) {
  const unstaged = new Set(unstagedPaths);
  return [...new Set(stagedPaths.filter((file) => unstaged.has(file)))].sort();
}

export function classifyIsolatedOutcome({ verificationPassed, cleanupPassed }) {
  if (!cleanupPassed) {
    return {
      outcome: "failed_cleanup",
      exitCode: 1,
      nextAction:
        "Review the contained worktree path and remove it with the repository safe Git wrapper.",
    };
  }
  if (!verificationPassed) {
    return {
      outcome: "failed_verification",
      exitCode: 1,
      nextAction:
        "Open the local evidence logs, fix the staged scope, restage it, and rerun isolated verification.",
    };
  }
  return {
    outcome: "passed",
    exitCode: 0,
    nextAction:
      "Review the staged diff and commit it; remote push and CI confirmation remain explicit operator actions.",
  };
}

function runProcess(command, args, options = {}) {
  const startedAt = performance.now();
  const previousDirectory = process.cwd();
  let result;
  try {
    if (options.cwd) process.chdir(options.cwd);
    result = spawnSync(command, args, {
      encoding: options.encoding ?? "utf8",
      input: options.input,
      maxBuffer: MAX_BUFFER_BYTES,
      shell: false,
      stdio: "pipe",
      windowsHide: true,
    });
  } finally {
    if (process.cwd() !== previousDirectory) process.chdir(previousDirectory);
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message ?? result.error) : null,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function runGit(repoRoot, args, options = {}) {
  return runProcess("git", args, { cwd: repoRoot, ...options });
}

function runSafeGit(repoRoot, args, options = {}) {
  return runProcess(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/git-with-acl-repair.ps1",
      ...args,
    ],
    { cwd: repoRoot, ...options },
  );
}

function runCanonicalVerify(worktreePath) {
  if (process.platform === "win32") {
    return runProcess("cmd.exe", ["/d", "/s", "/c", "npm.cmd run verify"], {
      cwd: worktreePath,
    });
  }
  return runProcess("npm", ["run", "verify"], { cwd: worktreePath });
}

function readNulPaths(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${String(result.stderr).trim()}`);
  }
  return String(result.stdout)
    .split("\0")
    .map((value) => value.trim())
    .filter(Boolean);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printUsage() {
  console.log("Nexus isolated staged-scope verification");
  console.log("");
  console.log(
    'Usage: npm run verify:isolated -- --intent "operator objective" [--json]',
  );
  console.log("");
  console.log(
    "Runs canonical verification against exactly the staged diff in a disposable contained worktree.",
  );
}

function printHuman(receipt) {
  console.log("Nexus isolated staged-scope verification");
  console.log(`Run: ${receipt.runId}`);
  console.log(`Base: ${receipt.baseCommit}`);
  console.log(`Staged files: ${receipt.stagedFileCount}`);
  console.log(`Staged/unstaged overlaps: ${receipt.overlapCount}`);
  console.log(
    `Verification: ${receipt.verification.passed ? "passed" : "failed"}`,
  );
  console.log(`Cleanup: ${receipt.cleanup.passed ? "passed" : "failed"}`);
  console.log(`Outcome: ${receipt.result.outcome}`);
  console.log(`Evidence: ${receipt.evidenceDirectory}`);
  console.log(`Next action: ${receipt.result.nextAction}`);
}

async function main() {
  let options;
  try {
    options = parseIsolatedVerifyArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `isolated-verify: ${error instanceof Error ? error.message : String(error)}`,
    );
    printUsage();
    process.exit(2);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const stagedDiffResult = runGit(repoRoot, ["diff", "--cached", "--binary"], {
    encoding: null,
  });
  if (stagedDiffResult.status !== 0) {
    console.error("isolated-verify: unable to read the staged binary diff");
    process.exit(1);
  }
  const stagedDiff = Buffer.from(stagedDiffResult.stdout);
  if (stagedDiff.length === 0) {
    console.error("isolated-verify: at least one staged change is required");
    process.exit(2);
  }

  const stagedPaths = readNulPaths(
    runGit(repoRoot, ["diff", "--cached", "--name-only", "-z"]),
    "staged path inventory",
  );
  const unstagedPaths = readNulPaths(
    runGit(repoRoot, ["diff", "--name-only", "-z"]),
    "unstaged path inventory",
  );
  const overlaps = findChangedPathOverlap(stagedPaths, unstagedPaths);
  const baseResult = runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (baseResult.status !== 0) {
    console.error("isolated-verify: unable to resolve HEAD");
    process.exit(1);
  }
  const baseCommit = String(baseResult.stdout).trim();
  const runId = buildIsolatedRunId(new Date(), stagedDiff);
  const worktreeRelative = buildContainedWorktreeRelative(runId);
  const worktreePath = resolveContainedWorktree(repoRoot, runId);
  const nodeModulesLink = path.join(worktreePath, "node_modules");
  const evidenceDirectory = `${EVIDENCE_ROOT}/${runId}`;
  const evidencePath = path.join(repoRoot, ...evidenceDirectory.split("/"));
  fs.mkdirSync(evidencePath, { recursive: true });

  const receipt = {
    schemaVersion: 1,
    runId,
    baseCommit,
    stagedFileCount: stagedPaths.length,
    unstagedFileCount: unstagedPaths.length,
    overlapCount: overlaps.length,
    stagedDiffBytes: stagedDiff.length,
    intent: {
      characters: options.intent.length,
      sha256: createHash("sha256").update(options.intent).digest("hex"),
      storedVerbatim: false,
    },
    verification: {
      command: "npm run verify",
      passed: false,
      status: null,
      durationMs: 0,
    },
    cleanup: {
      attempted: false,
      passed: false,
      status: null,
      durationMs: 0,
    },
    result: {
      outcome: "running",
      exitCode: 1,
      nextAction: "Wait for isolated verification to finish.",
    },
    evidenceDirectory,
  };
  writeJson(path.join(evidencePath, "receipt.json"), receipt);

  let worktreeAdded = false;
  let runFailure = null;

  try {
    const addResult = runSafeGit(repoRoot, [
      "worktree",
      "add",
      "--detach",
      worktreeRelative,
      "HEAD",
    ]);
    if (addResult.status !== 0) {
      throw new Error(
        `worktree creation failed: ${String(addResult.stderr).trim()}`,
      );
    }
    worktreeAdded = true;

    const applyResult = runGit(
      repoRoot,
      ["-C", worktreeRelative, "apply", "--index", "-"],
      { input: stagedDiff, encoding: null },
    );
    if (applyResult.status !== 0) {
      throw new Error(
        `staged diff application failed: ${Buffer.from(applyResult.stderr).toString("utf8").trim()}`,
      );
    }

    const rootNodeModules = path.join(repoRoot, "node_modules");
    if (!fs.existsSync(rootNodeModules)) {
      throw new Error(
        "root node_modules is missing; install dependencies in the source checkout first",
      );
    }
    fs.symlinkSync(
      rootNodeModules,
      nodeModulesLink,
      process.platform === "win32" ? "junction" : "dir",
    );

    const verifyResult = runCanonicalVerify(worktreePath);
    fs.writeFileSync(
      path.join(evidencePath, "stdout.log"),
      String(verifyResult.stdout),
      "utf8",
    );
    fs.writeFileSync(
      path.join(evidencePath, "stderr.log"),
      [
        verifyResult.error ? `process-error: ${verifyResult.error}` : "",
        String(verifyResult.stderr),
      ]
        .filter(Boolean)
        .join("\n"),
      "utf8",
    );
    receipt.verification = {
      command: "npm run verify",
      passed: verifyResult.status === 0 && !verifyResult.error,
      status: verifyResult.status,
      durationMs: verifyResult.durationMs,
    };
  } catch (error) {
    runFailure = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(
      path.join(evidencePath, "stderr.log"),
      `${runFailure}\n`,
      "utf8",
    );
    if (!fs.existsSync(path.join(evidencePath, "stdout.log"))) {
      fs.writeFileSync(path.join(evidencePath, "stdout.log"), "", "utf8");
    }
  } finally {
    receipt.cleanup.attempted = worktreeAdded;
    if (worktreeAdded) {
      let dependencyLinkFailure = null;
      try {
        if (fs.existsSync(nodeModulesLink)) {
          if (!fs.lstatSync(nodeModulesLink).isSymbolicLink()) {
            throw new Error(
              "worktree node_modules is not the expected dependency link",
            );
          }
          fs.unlinkSync(nodeModulesLink);
        }
      } catch (error) {
        dependencyLinkFailure =
          error instanceof Error ? error.message : String(error);
      }
      const cleanupResult = runSafeGit(repoRoot, [
        "worktree",
        "remove",
        "--force",
        worktreeRelative,
      ]);
      const worktreeRemoved = !fs.existsSync(worktreePath);
      receipt.cleanup = {
        attempted: true,
        passed:
          !dependencyLinkFailure &&
          cleanupResult.status === 0 &&
          !cleanupResult.error &&
          worktreeRemoved,
        status: cleanupResult.status,
        durationMs: cleanupResult.durationMs,
        worktreeRemoved,
      };
      if (dependencyLinkFailure) {
        receipt.cleanup.failure = dependencyLinkFailure.slice(0, 500);
      } else if (!worktreeRemoved) {
        receipt.cleanup.failure =
          "contained worktree directory still exists after Git cleanup";
      }
    } else {
      receipt.cleanup = {
        attempted: false,
        passed: true,
        status: null,
        durationMs: 0,
      };
    }
  }

  receipt.result = classifyIsolatedOutcome({
    verificationPassed: receipt.verification.passed && !runFailure,
    cleanupPassed: receipt.cleanup.passed,
  });
  if (runFailure) receipt.failure = runFailure.slice(0, 500);
  writeJson(path.join(evidencePath, "receipt.json"), receipt);

  if (options.json) console.log(JSON.stringify(receipt, null, 2));
  else printHuman(receipt);
  process.exit(receipt.result.exitCode);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
