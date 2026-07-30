#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const MAX_LOG_SUMMARY_BYTES = 8 * 1024;
const EVIDENCE_ROOT = ".nexus/isolated-fixes";
const WORKTREE_ROOT = ".worktrees";
const ELIGIBLE_ROOTS = ["app/", "components/", "lib/"];
const ELIGIBLE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mdx"]);

export class IsolatedSafeFixUsageError extends Error {}

export function parseIsolatedSafeFixArgs(argv) {
  const options = {
    help: false,
    intent: null,
    apply: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      if (options.json) {
        throw new IsolatedSafeFixUsageError("--json may be provided only once");
      }
      options.json = true;
      continue;
    }
    if (arg === "--apply") {
      if (options.apply) {
        throw new IsolatedSafeFixUsageError(
          "--apply may be provided only once",
        );
      }
      options.apply = true;
      continue;
    }
    if (arg === "--intent") {
      if (options.intent !== null) {
        throw new IsolatedSafeFixUsageError(
          "--intent may be provided only once",
        );
      }
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new IsolatedSafeFixUsageError(
          "--intent requires a non-empty value",
        );
      }
      options.intent = value.trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--intent=")) {
      if (options.intent !== null) {
        throw new IsolatedSafeFixUsageError(
          "--intent may be provided only once",
        );
      }
      options.intent = arg.slice("--intent=".length).trim();
      continue;
    }
    throw new IsolatedSafeFixUsageError(`unknown option: ${arg}`);
  }

  if (!options.help) {
    if (!options.intent) {
      throw new IsolatedSafeFixUsageError("--intent is required");
    }
    if (options.intent.length > 1000) {
      throw new IsolatedSafeFixUsageError(
        "--intent must be 1000 characters or fewer",
      );
    }
    if (/[\r\n\0]/.test(options.intent)) {
      throw new IsolatedSafeFixUsageError(
        "--intent must be one plain-text line",
      );
    }
    if (!options.apply) {
      throw new IsolatedSafeFixUsageError(
        "--apply is required to acknowledge the staged-only formatter write",
      );
    }
  }

  return options;
}

export function buildSafeFixRunId(now, stagedDiff) {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(":", "-");
  const digest = hashBuffer(stagedDiff).slice(0, 10);
  return `${stamp}-${digest}`;
}

export function resolveContainedFixWorktree(repoRoot, runId) {
  if (!/^[0-9TZ-]+-[a-f0-9]{10}$/.test(runId)) {
    throw new Error("run ID is outside the contained safe-fix contract");
  }
  const worktreeRoot = path.resolve(repoRoot, WORKTREE_ROOT);
  const candidate = path.resolve(worktreeRoot, `isolated-fix-${runId}`);
  const relative = path.relative(worktreeRoot, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("safe-fix worktree escapes the contained worktree root");
  }
  return candidate;
}

export function classifyEligibleSafeFixPath(filePath) {
  if (
    typeof filePath !== "string" ||
    filePath.length === 0 ||
    filePath.includes("\0")
  ) {
    return { eligible: false, reason: "invalid_path" };
  }
  const normalized = filePath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    return { eligible: false, reason: "outside_repository" };
  }
  if (!ELIGIBLE_ROOTS.some((root) => normalized.startsWith(root))) {
    return { eligible: false, reason: "unsupported_root" };
  }
  if (normalized.startsWith("app/hq/")) {
    return { eligible: false, reason: "canonical_format_exclusion" };
  }
  if (!ELIGIBLE_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) {
    return { eligible: false, reason: "unsupported_extension" };
  }
  return { eligible: true, reason: null, normalized };
}

export function findUnexpectedFixPaths(eligiblePaths, changedPaths) {
  const eligible = new Set(eligiblePaths);
  return [
    ...new Set(changedPaths.filter((file) => !eligible.has(file))),
  ].sort();
}

export function findChangedPathOverlap(stagedPaths, unstagedPaths) {
  const unstaged = new Set(unstagedPaths);
  return [...new Set(stagedPaths.filter((file) => unstaged.has(file)))].sort();
}

export function classifySafeFixOutcome({
  phaseFailure,
  rollbackAttempted,
  rollbackPassed,
  cleanupPassed,
  fixedPathCount,
  applied,
}) {
  if (!cleanupPassed) {
    return {
      outcome: "failed_cleanup",
      exitCode: 1,
      nextAction:
        "Remove the contained safe-fix worktree with the repository safe Git wrapper before retrying.",
    };
  }
  if (rollbackAttempted && !rollbackPassed) {
    return {
      outcome: "failed_rollback",
      exitCode: 1,
      nextAction:
        "Stop and inspect the staged diff; automatic rollback could not prove restoration of the original snapshot.",
    };
  }
  if (phaseFailure) {
    return {
      outcome: `failed_${phaseFailure}`,
      exitCode: 1,
      nextAction:
        phaseFailure === "source_drift"
          ? "Review and restage the intended files, then rerun; the source index changed after isolated proof."
          : "Review the content-free local gate summaries, correct the staged scope, and rerun.",
    };
  }
  if (fixedPathCount === 0) {
    return {
      outcome: "no_changes",
      exitCode: 0,
      nextAction:
        "The staged scope already matches the canonical formatter; review it and run isolated verification.",
    };
  }
  if (applied) {
    return {
      outcome: "applied",
      exitCode: 0,
      nextAction:
        "Review the formatter-only staged diff, then run isolated verification before committing.",
    };
  }
  return {
    outcome: "failed_source_apply",
    exitCode: 1,
    nextAction:
      "The proven formatter patch was not applied; inspect the staged scope and rerun.",
  };
}

export function applyProvenFixPatch({
  repoRoot,
  stagedPaths,
  fixPatch,
  originalStagedSha256,
  provenFinalStagedSha256,
  runGitCommand = runGit,
}) {
  const sourceApplication = {
    attempted: false,
    snapshotUnchanged: false,
    applied: false,
    postconditionPassed: false,
  };
  const rollback = {
    attempted: false,
    passed: false,
  };

  const currentStagedResult = runGitCommand(
    repoRoot,
    ["diff", "--cached", "--binary"],
    { encoding: null },
  );
  let currentUnstagedPaths;
  try {
    currentUnstagedPaths = readNulPaths(
      runGitCommand(repoRoot, ["diff", "--name-only", "-z"]),
      "current unstaged path inventory",
    );
  } catch {
    return {
      sourceApplication,
      rollback,
      phaseFailure: "source_drift",
    };
  }
  const currentOverlap = findChangedPathOverlap(
    stagedPaths,
    currentUnstagedPaths,
  );
  sourceApplication.snapshotUnchanged =
    currentStagedResult.status === 0 &&
    !currentStagedResult.error &&
    hashBuffer(currentStagedResult.stdout) === originalStagedSha256 &&
    currentOverlap.length === 0;
  if (!sourceApplication.snapshotUnchanged) {
    return {
      sourceApplication,
      rollback,
      phaseFailure: "source_drift",
    };
  }

  sourceApplication.attempted = true;
  const sourceApplyResult = runGitCommand(
    repoRoot,
    ["apply", "--index", "--whitespace=nowarn", "-"],
    { input: fixPatch, encoding: null },
  );
  if (sourceApplyResult.status !== 0 || sourceApplyResult.error) {
    return {
      sourceApplication,
      rollback,
      phaseFailure: "source_apply",
    };
  }
  sourceApplication.applied = true;

  const appliedDiffResult = runGitCommand(
    repoRoot,
    ["diff", "--cached", "--binary"],
    { encoding: null },
  );
  sourceApplication.postconditionPassed =
    appliedDiffResult.status === 0 &&
    !appliedDiffResult.error &&
    hashBuffer(appliedDiffResult.stdout) === provenFinalStagedSha256;
  if (sourceApplication.postconditionPassed) {
    return {
      sourceApplication,
      rollback,
      phaseFailure: null,
    };
  }

  rollback.attempted = true;
  const rollbackResult = runGitCommand(
    repoRoot,
    ["apply", "-R", "--index", "--whitespace=nowarn", "-"],
    { input: fixPatch, encoding: null },
  );
  const rollbackDiffResult = runGitCommand(
    repoRoot,
    ["diff", "--cached", "--binary"],
    { encoding: null },
  );
  rollback.passed =
    rollbackResult.status === 0 &&
    !rollbackResult.error &&
    rollbackDiffResult.status === 0 &&
    !rollbackDiffResult.error &&
    hashBuffer(rollbackDiffResult.stdout) === originalStagedSha256;
  if (rollback.passed) {
    sourceApplication.applied = false;
  }
  return {
    sourceApplication,
    rollback,
    phaseFailure: "postcondition",
  };
}

function hashBuffer(value) {
  return createHash("sha256").update(Buffer.from(value)).digest("hex");
}

function runProcess(command, args, options = {}) {
  const startedAt = performance.now();
  const encoding = Object.prototype.hasOwnProperty.call(options, "encoding")
    ? options.encoding
    : "utf8";
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding,
    input: options.input,
    maxBuffer: MAX_BUFFER_BYTES,
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });
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
  const wrapper = path.join(repoRoot, "scripts", "git-with-acl-repair.ps1");
  return runProcess(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapper, ...args],
    { cwd: repoRoot, ...options },
  );
}

function runNpmScript(repoRoot, scriptName) {
  if (process.platform === "win32") {
    return runProcess(
      "cmd.exe",
      ["/d", "/s", "/c", `npm.cmd run ${scriptName}`],
      { cwd: repoRoot },
    );
  }
  return runProcess("npm", ["run", scriptName], { cwd: repoRoot });
}

function readNulPaths(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
  return String(result.stdout)
    .split("\0")
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

function samePathSet(left, right) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

function summarizeProcess(result) {
  const stdout = Buffer.from(result.stdout);
  const stderr = Buffer.from(result.stderr);
  return {
    passed: result.status === 0 && !result.error,
    status: result.status,
    durationMs: result.durationMs,
    processError: Boolean(result.error),
    stdoutBytes: stdout.length,
    stderrBytes: stderr.length,
    stdoutSha256: hashBuffer(stdout),
    stderrSha256: hashBuffer(stderr),
  };
}

function writeBoundedJson(filePath, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > MAX_LOG_SUMMARY_BYTES) {
    throw new Error("safe-fix evidence summary exceeded its size limit");
  }
  fs.writeFileSync(filePath, serialized, "utf8");
}

function writeGateSummary(evidencePath, name, result = null) {
  writeBoundedJson(path.join(evidencePath, `${name}.log`), {
    gate: name,
    state: result
      ? summarizeProcess(result).passed
        ? "passed"
        : "failed"
      : "not_run",
    ...(result ? summarizeProcess(result) : {}),
    contentStored: false,
  });
}

function printUsage() {
  console.log("Nexus isolated staged-scope safe formatter");
  console.log("");
  console.log(
    'Usage: npm run verify:isolated:fix -- --intent "operator objective" --apply [--json]',
  );
  console.log("");
  console.log(
    "Formats only eligible staged source files after disposable-worktree proof and applies the exact proven patch.",
  );
}

function printHuman(receipt) {
  console.log("Nexus isolated staged-scope safe formatter");
  console.log(`Run: ${receipt.runId}`);
  console.log(`Eligible staged files: ${receipt.eligiblePathCount}`);
  console.log(`Formatter-changed files: ${receipt.fixedPathCount}`);
  console.log(`Gates: ${receipt.gates.passed ? "passed" : "failed"}`);
  console.log(`Applied: ${receipt.sourceApplication.applied ? "yes" : "no"}`);
  console.log(`Cleanup: ${receipt.cleanup.passed ? "passed" : "failed"}`);
  console.log(`Outcome: ${receipt.result.outcome}`);
  console.log(`Evidence: ${receipt.evidenceDirectory}`);
  console.log(`Next action: ${receipt.result.nextAction}`);
}

function exitWithUsage(message) {
  console.error(`isolated-safe-fix: ${message}`);
  printUsage();
  process.exit(2);
}

async function main() {
  let options;
  try {
    options = parseIsolatedSafeFixArgs(process.argv.slice(2));
  } catch (error) {
    exitWithUsage(error instanceof Error ? error.message : String(error));
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
    exitWithUsage("unable to read the staged binary diff");
  }
  const stagedDiff = Buffer.from(stagedDiffResult.stdout);
  if (stagedDiff.length === 0) {
    exitWithUsage("at least one staged change is required");
  }

  let stagedPaths;
  let modifiedPaths;
  let unstagedPaths;
  try {
    stagedPaths = readNulPaths(
      runGit(repoRoot, ["diff", "--cached", "--name-only", "-z"]),
      "staged path inventory",
    );
    modifiedPaths = readNulPaths(
      runGit(repoRoot, [
        "diff",
        "--cached",
        "--diff-filter=M",
        "--name-only",
        "-z",
      ]),
      "modified path inventory",
    );
    unstagedPaths = readNulPaths(
      runGit(repoRoot, ["diff", "--name-only", "-z"]),
      "unstaged path inventory",
    );
  } catch (error) {
    exitWithUsage(error instanceof Error ? error.message : String(error));
  }

  if (!samePathSet(stagedPaths, modifiedPaths)) {
    exitWithUsage(
      "every staged path must be an existing modified file; additions, deletions, renames, copies, and type changes are rejected",
    );
  }
  const overlaps = findChangedPathOverlap(stagedPaths, unstagedPaths);
  if (overlaps.length > 0) {
    exitWithUsage(
      `staged/unstaged overlap is not allowed (${overlaps.length} path(s))`,
    );
  }

  const eligibility = stagedPaths.map((file) => ({
    file,
    result: classifyEligibleSafeFixPath(file),
  }));
  const rejected = eligibility.filter((item) => !item.result.eligible);
  if (rejected.length > 0) {
    const reasons = [...new Set(rejected.map((item) => item.result.reason))];
    exitWithUsage(
      `staged scope contains ${rejected.length} ineligible path(s): ${reasons.join(", ")}`,
    );
  }
  for (const file of stagedPaths) {
    const absolute = path.join(repoRoot, ...file.split("/"));
    const stats = fs.lstatSync(absolute);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      exitWithUsage("eligible staged paths must be regular non-symlink files");
    }
  }

  const baseResult = runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (baseResult.status !== 0) {
    exitWithUsage("unable to resolve HEAD");
  }
  const baseCommit = String(baseResult.stdout).trim();
  const originalStagedSha256 = hashBuffer(stagedDiff);
  const runId = buildSafeFixRunId(new Date(), stagedDiff);
  const worktreePath = resolveContainedFixWorktree(repoRoot, runId);
  const nodeModulesLink = path.join(worktreePath, "node_modules");
  const worktreeRelative = path
    .relative(repoRoot, worktreePath)
    .replaceAll("\\", "/");
  const evidenceDirectory = `${EVIDENCE_ROOT}/${runId}`;
  const evidencePath = path.join(repoRoot, ...evidenceDirectory.split("/"));
  fs.mkdirSync(evidencePath, { recursive: true });

  const receipt = {
    schemaVersion: 1,
    runId,
    baseCommit,
    stagedFileCount: stagedPaths.length,
    eligiblePathCount: stagedPaths.length,
    fixedPathCount: 0,
    originalStagedSha256,
    provenFinalStagedSha256: null,
    intent: {
      characters: options.intent.length,
      sha256: hashBuffer(options.intent),
      storedVerbatim: false,
    },
    scope: {
      overlapCount: 0,
      onlyModifiedRegularFiles: true,
      exactPathsStored: false,
    },
    gates: {
      formatter: false,
      formatCheck: false,
      typeCheck: false,
      lint: false,
      passed: false,
    },
    sourceApplication: {
      attempted: false,
      snapshotUnchanged: false,
      applied: false,
      postconditionPassed: false,
    },
    rollback: {
      attempted: false,
      passed: false,
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
      nextAction: "Wait for the isolated safe-fix run to finish.",
    },
    evidenceDirectory,
  };
  writeBoundedJson(path.join(evidencePath, "receipt.json"), receipt);
  for (const gate of ["formatter", "format-check", "type-check", "lint"]) {
    writeGateSummary(evidencePath, gate);
  }

  let worktreeAdded = false;
  let phaseFailure = null;
  let fixPatch = Buffer.alloc(0);

  try {
    const addResult = runSafeGit(repoRoot, [
      "worktree",
      "add",
      "--detach",
      worktreeRelative,
      "HEAD",
    ]);
    if (addResult.status !== 0 || addResult.error) {
      phaseFailure = "worktree";
      throw new Error("contained worktree creation failed");
    }
    worktreeAdded = true;

    const applyStagedResult = runGit(
      repoRoot,
      ["-C", worktreeRelative, "apply", "--index", "-"],
      { input: stagedDiff, encoding: null },
    );
    if (applyStagedResult.status !== 0 || applyStagedResult.error) {
      phaseFailure = "snapshot";
      throw new Error("staged snapshot application failed");
    }

    const rootNodeModulesEntry = path.join(repoRoot, "node_modules");
    if (!fs.existsSync(rootNodeModulesEntry)) {
      phaseFailure = "dependencies";
      throw new Error("root node_modules is missing");
    }
    const rootNodeModules = fs.realpathSync(rootNodeModulesEntry);
    fs.symlinkSync(
      rootNodeModules,
      nodeModulesLink,
      process.platform === "win32" ? "junction" : "dir",
    );

    const prettierCli = path.join(
      nodeModulesLink,
      "prettier",
      "bin",
      "prettier.cjs",
    );
    if (!fs.existsSync(prettierCli)) {
      phaseFailure = "dependencies";
      throw new Error("repository-owned Prettier binary is missing");
    }
    const formatterResult = runProcess(
      process.execPath,
      [prettierCli, "--write", "--ignore-unknown", "--", ...stagedPaths],
      { cwd: worktreePath },
    );
    writeGateSummary(evidencePath, "formatter", formatterResult);
    receipt.gates.formatter = summarizeProcess(formatterResult).passed;
    if (!receipt.gates.formatter) {
      phaseFailure = "formatter";
      throw new Error("formatter failed");
    }

    const fixedPaths = readNulPaths(
      runGit(worktreePath, ["diff", "--name-only", "-z"]),
      "formatter path inventory",
    );
    const unexpectedPaths = findUnexpectedFixPaths(stagedPaths, fixedPaths);
    if (unexpectedPaths.length > 0) {
      phaseFailure = "unexpected_paths";
      throw new Error("formatter changed a path outside the eligible scope");
    }
    receipt.fixedPathCount = fixedPaths.length;

    const fixPatchResult = runGit(
      worktreePath,
      ["diff", "--binary", "--", ...stagedPaths],
      { encoding: null },
    );
    if (fixPatchResult.status !== 0 || fixPatchResult.error) {
      phaseFailure = "fix_patch";
      throw new Error("unable to capture the mechanical fix patch");
    }
    fixPatch = Buffer.from(fixPatchResult.stdout);

    const gateRuns = [
      ["format-check", "format:check", "formatCheck"],
      ["type-check", "type-check", "typeCheck"],
      ["lint", "lint", "lint"],
    ];
    for (const [logName, scriptName, receiptKey] of gateRuns) {
      const gateResult = runNpmScript(worktreePath, scriptName);
      writeGateSummary(evidencePath, logName, gateResult);
      receipt.gates[receiptKey] = summarizeProcess(gateResult).passed;
      if (!receipt.gates[receiptKey]) {
        phaseFailure = "gates";
        throw new Error(`${scriptName} failed`);
      }
    }
    receipt.gates.passed = true;

    const stageFixedResult = runGit(worktreePath, [
      "add",
      "--",
      ...stagedPaths,
    ]);
    if (stageFixedResult.status !== 0 || stageFixedResult.error) {
      phaseFailure = "final_snapshot";
      throw new Error("unable to stage the proven formatter result");
    }
    const finalDiffResult = runGit(
      worktreePath,
      ["diff", "--cached", "--binary"],
      { encoding: null },
    );
    if (finalDiffResult.status !== 0 || finalDiffResult.error) {
      phaseFailure = "final_snapshot";
      throw new Error("unable to hash the proven formatter result");
    }
    receipt.provenFinalStagedSha256 = hashBuffer(finalDiffResult.stdout);

    if (fixPatch.length === 0) {
      receipt.sourceApplication.snapshotUnchanged = true;
      receipt.sourceApplication.postconditionPassed =
        receipt.provenFinalStagedSha256 === originalStagedSha256;
      if (!receipt.sourceApplication.postconditionPassed) {
        phaseFailure = "postcondition";
      }
    } else {
      const application = applyProvenFixPatch({
        repoRoot,
        stagedPaths,
        fixPatch,
        originalStagedSha256,
        provenFinalStagedSha256: receipt.provenFinalStagedSha256,
      });
      receipt.sourceApplication = application.sourceApplication;
      receipt.rollback = application.rollback;
      if (application.phaseFailure) {
        phaseFailure = application.phaseFailure;
        throw new Error("proven formatter patch application failed");
      }
    }
  } catch {
    if (!phaseFailure) phaseFailure = "internal";
  } finally {
    receipt.cleanup.attempted = worktreeAdded;
    if (worktreeAdded) {
      let dependencyLinkFailure = false;
      try {
        if (fs.existsSync(nodeModulesLink)) {
          if (!fs.lstatSync(nodeModulesLink).isSymbolicLink()) {
            throw new Error("unexpected worktree dependency entry");
          }
          fs.unlinkSync(nodeModulesLink);
        }
      } catch {
        dependencyLinkFailure = true;
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
    } else {
      receipt.cleanup = {
        attempted: false,
        passed: true,
        status: null,
        durationMs: 0,
      };
    }
  }

  receipt.result = classifySafeFixOutcome({
    phaseFailure,
    rollbackAttempted: receipt.rollback.attempted,
    rollbackPassed: receipt.rollback.passed,
    cleanupPassed: receipt.cleanup.passed,
    fixedPathCount: receipt.fixedPathCount,
    applied: receipt.sourceApplication.applied,
  });
  writeBoundedJson(path.join(evidencePath, "receipt.json"), receipt);

  if (options.json) console.log(JSON.stringify(receipt, null, 2));
  else printHuman(receipt);
  process.exit(receipt.result.exitCode);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
