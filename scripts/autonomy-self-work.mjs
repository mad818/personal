#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const todoPath = join(root, "tasks", "todo.md");
const systemStatePath = join(root, "docs", "SYSTEM_STATE.md");
const gitWrapper = join(root, "scripts", "git-with-acl-repair.ps1");

const REQUIRED_GATES = [
  "npm run publication:safety:check",
  "npm run security-scan",
  "npm run security:boundaries",
  "npm run dependency:risk:check",
  "npm run verify",
];

const HANDOFF_GATES = ["npm run handoff:write", "npm run handoff:check"];

const RESTRICTED_KEYWORDS = [
  ".env",
  "account",
  "auth",
  "billing",
  "cookie",
  "cve",
  "dependabot",
  "dependency",
  "deploy",
  "docker",
  "github",
  "git",
  "key",
  "package",
  "password",
  "payment",
  "release",
  "secret",
  "security",
  "staged",
  "token",
  "vulnerability",
];

const EXTERNAL_OR_MANUAL_KEYWORDS = [
  "coolify",
  "dependabot",
  "docker",
  "github",
  "manual",
  "metadata",
  "ollama stop",
  "phone",
  "physical",
  "pwa",
  "staged",
];

const CODE_KEYWORDS = [
  "add",
  "app",
  "build",
  "code",
  "component",
  "create",
  "fix",
  "implement",
  "lib",
  "patch",
  "refactor",
  "route",
  "script",
  "wire",
];

function parseArgs(argv) {
  const args = {
    mode: "dry-run",
    outDir: metricsDir,
    taskId: "",
    worktreeRoot: resolve(root, "..", "personal-self-work-runs"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      args.mode = "execute";
    } else if (arg === "--approve-run") {
      args.mode = "approve";
      args.approveRun = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--approve-run=")) {
      args.mode = "approve";
      args.approveRun = arg.slice("--approve-run=".length);
    } else if (arg.startsWith("--task-id=")) {
      args.taskId = arg.slice("--task-id=".length);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = resolve(root, arg.slice("--out-dir=".length));
    } else if (arg.startsWith("--worktree-root=")) {
      args.worktreeRoot = resolve(root, arg.slice("--worktree-root=".length));
    }
  }

  return args;
}

function sanitizeString(value) {
  return String(value)
    .replace(
      /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g,
      "<LAN-IP>",
    )
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g, "<repo-root>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted-local-token>")
    .replace(
      /\b(?:token|secret|password|apiKey|authHeader|cookie)\b["']?\s*[:=]\s*["'][^"']+["']/gi,
      '$1: "<redacted-local-token>"',
    );
}

function sanitizeValue(value, key = "") {
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (!value || typeof value !== "object") {
    if (typeof value !== "string") return value;
    if (/token|secret|password|authorization|cookie|header/i.test(key)) {
      return Boolean(value);
    }
    return sanitizeString(value);
  }

  return Object.fromEntries(
    Object.entries(value).map(([nestedKey, nestedValue]) => [
      nestedKey,
      sanitizeValue(nestedValue, nestedKey),
    ]),
  );
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function runCommand(command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 120_000,
    shell: false,
  });
  return sanitizeValue({
    command: [command, ...args].join(" "),
    cwd: relative(root, options.cwd ?? root).replace(/\\/g, "/") || ".",
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: (result.stdout ?? "").trim().slice(-4000),
    stderr: (result.stderr ?? "").trim().slice(-4000),
    error: result.error ? result.error.message : null,
  });
}

function runNpmScript(scriptName, options = {}) {
  return runCommand("npm", ["run", scriptName], {
    cwd: options.cwd ?? root,
    timeoutMs: options.timeoutMs ?? 600_000,
  });
}

function runGit(args, options = {}) {
  return runCommand(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", gitWrapper, ...args],
    {
      cwd: root,
      timeoutMs: options.timeoutMs ?? 180_000,
    },
  );
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function extractNextUpActiveTasks(todoText) {
  const lines = todoText.split(/\r?\n/);
  const tasks = [];
  let inNextUp = false;
  let inActiveQueue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "## Next Up") {
      inNextUp = true;
      continue;
    }

    if (inNextUp && trimmed.startsWith("## ")) break;
    if (!inNextUp) continue;

    if (trimmed === "Active open-ready queue:") {
      inActiveQueue = true;
      continue;
    }

    if (
      inActiveQueue &&
      (/^Deferred\b/i.test(trimmed) || /^Blocked\b/i.test(trimmed))
    ) {
      break;
    }

    if (!inActiveQueue || !/^[-*]\s+\[\s\]\s+/.test(trimmed)) continue;

    const taskText = trimmed.replace(/^[-*]\s+\[\s\]\s+/, "").trim();
    const [rawId, ...descriptionParts] = taskText.split(/\s+(?:\u2014|-)\s+/);
    const id = rawId.trim();
    tasks.push({
      id,
      title: id,
      text: taskText,
      description: descriptionParts.join(" - ").trim(),
      source: "tasks/todo.md#Next Up",
    });
  }

  return tasks;
}

function findMatches(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword));
}

function classifyTask(task) {
  if (!task) {
    return {
      riskTier: "none",
      approvalRequired: false,
      automationEligible: false,
      restrictedMatches: [],
      externalOrManualMatches: [],
      codeMatches: [],
      reasons: ["No active open-ready task is available."],
    };
  }

  const restrictedMatches = findMatches(task.text, RESTRICTED_KEYWORDS);
  const externalOrManualMatches = findMatches(
    task.text,
    EXTERNAL_OR_MANUAL_KEYWORDS,
  );
  const codeMatches = findMatches(task.text, CODE_KEYWORDS);
  const approvalRequired = restrictedMatches.length > 0 || codeMatches.length > 0;
  const riskTier =
    restrictedMatches.length > 0
      ? "tier3_approval_required"
      : codeMatches.length > 0
        ? "tier2_code_review"
        : task.text.toLowerCase().includes("doc")
          ? "tier1_doc_only"
          : "tier0_read_analyze";
  const reasons = [];

  if (restrictedMatches.length > 0) {
    reasons.push(
      `Approval required because task mentions guarded domain(s): ${restrictedMatches.join(", ")}.`,
    );
  }
  if (externalOrManualMatches.length > 0) {
    reasons.push(
      `Autonomous execution blocked by manual/external dependency: ${externalOrManualMatches.join(", ")}.`,
    );
  }

  return {
    riskTier,
    approvalRequired,
    automationEligible:
      externalOrManualMatches.length === 0 && restrictedMatches.length === 0,
    restrictedMatches,
    externalOrManualMatches,
    codeMatches,
    reasons,
  };
}

function parseGitStatus(statusOutput) {
  const lines = String(statusOutput)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^Removed \d+ known \.git DENY ACL entr(?:y|ies) before git /i.test(
          line,
        ),
    );
  const branchLine = lines.find((line) => line.startsWith("##")) ?? "";
  const changes = lines.filter((line) => !line.startsWith("##"));
  return {
    branchLine: sanitizeString(branchLine),
    isDirty: changes.length > 0,
    changes: changes.map(sanitizeString),
    ahead: /\[ahead\s+\d+/.test(branchLine),
  };
}

function checkDocker() {
  const result = runCommand("docker", ["--version"], { timeoutMs: 20_000 });
  return {
    available: result.ok,
    summary: result.ok
      ? sanitizeString(result.stdout || "Docker CLI available.")
      : "Docker CLI unavailable; strong container isolation cannot be claimed.",
  };
}

function buildRunId(date) {
  return `asw-${timestampForFile(date)}`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildRollback(branchOrWorktree) {
  if (!branchOrWorktree?.branch || !branchOrWorktree?.worktreePath) {
    return null;
  }

  return {
    commands: [
      `git worktree remove "${branchOrWorktree.worktreePath}"`,
      `git branch -D ${branchOrWorktree.branch}`,
    ],
    note: "Run only after confirming no wanted local changes remain in the self-work worktree.",
  };
}

function prepareWorktree({ args, runId, task }) {
  mkdirSync(args.worktreeRoot, { recursive: true });
  const branch = `codex/self-work-${slugify(task.id)}-${runId}`;
  const worktreePath = join(args.worktreeRoot, branch.replace(/[\\/]/g, "-"));
  const command = runGit(["worktree", "add", "-b", branch, worktreePath, "HEAD"], {
    timeoutMs: 180_000,
  });
  return {
    branch,
    worktreePath,
    prepared: command.ok,
    command,
  };
}

function taskNeedsHandoff(task) {
  if (!task) return false;
  return /docs|handoff|tasks|todo|system_state/i.test(task.text);
}

function buildBaseArtifact({ args, runId, capturedAt }) {
  const filesInspected = ["tasks/todo.md", "docs/SYSTEM_STATE.md"];
  const commandsRun = [];
  const blocked = [];
  const warnings = [];

  let todoText = "";
  let systemStateText = "";

  try {
    todoText = readText(todoPath);
  } catch {
    blocked.push("tasks/todo.md is unavailable.");
  }

  try {
    systemStateText = readText(systemStatePath);
  } catch {
    blocked.push("docs/SYSTEM_STATE.md is unavailable.");
  }

  const tasks = todoText ? extractNextUpActiveTasks(todoText) : [];
  const selectedTask =
    args.taskId && tasks.length
      ? tasks.find((task) => task.id === args.taskId) ?? null
      : tasks[0] ?? null;
  const classification = classifyTask(selectedTask);
  const gitStatusCommand = runGit(["status", "--short", "--branch"]);
  commandsRun.push(gitStatusCommand);
  const gitStatus = parseGitStatus(gitStatusCommand.stdout);
  const docker = checkDocker();

  if (!gitStatusCommand.ok) {
    blocked.push("Git status could not be verified.");
  }
  if (gitStatus.isDirty) {
    blocked.push("Working tree is dirty; self-work must start from a clean checkout.");
  }
  if (gitStatus.ahead) {
    warnings.push(
      "Branch has unpushed commits; local project remains source of truth until GitHub connectivity is restored.",
    );
  }
  if (!docker.available) {
    warnings.push(
      "Docker CLI is unavailable; execute mode can prepare a git worktree but cannot claim strong container isolation.",
    );
  }
  if (!selectedTask) {
    blocked.push("No active open-ready task was selected from tasks/todo.md.");
  }
  blocked.push(...classification.reasons);

  return {
    runId,
    capturedAt: capturedAt.toISOString(),
    selectedTask,
    autonomyMode: args.mode,
    riskTier: classification.riskTier,
    branchOrWorktree: null,
    filesInspected,
    filesChanged: [],
    commandsRun,
    verification: {
      requiredCommands: REQUIRED_GATES,
      handoffCommandsWhenDocsChange: HANDOFF_GATES,
      executed: [],
      passed: false,
    },
    blocked,
    warnings,
    rollback: null,
    approvalRequired: classification.approvalRequired,
    approvalStatus: "not_requested",
    readyForMerge: false,
    policy: {
      automationEligible: classification.automationEligible,
      restrictedMatches: classification.restrictedMatches,
      externalOrManualMatches: classification.externalOrManualMatches,
      codeMatches: classification.codeMatches,
      noEnvLocalRead: true,
      directProviderCallsAllowed: false,
      automaticMergeOrPushAllowed: false,
    },
    infrastructure: {
      gitStatus,
      docker,
      systemStateRead: Boolean(systemStateText),
    },
  };
}

function runVerificationGates(cwd, includeHandoff) {
  const executed = [];
  for (const command of REQUIRED_GATES) {
    const scriptName = command.replace(/^npm run\s+/, "");
    executed.push(runNpmScript(scriptName, { cwd }));
  }

  if (includeHandoff) {
    for (const command of HANDOFF_GATES) {
      const scriptName = command.replace(/^npm run\s+/, "");
      executed.push(runNpmScript(scriptName, { cwd }));
    }
  }

  return executed;
}

function writeArtifact(artifact, outDir) {
  mkdirSync(outDir, { recursive: true });
  const fileName = `autonomy-self-work-${artifact.runId}.json`;
  const outPath = join(outDir, fileName);
  writeFileSync(outPath, `${JSON.stringify(sanitizeValue(artifact), null, 2)}\n`);
  return {
    path: outPath,
    relativePath: relative(root, outPath).replace(/\\/g, "/"),
  };
}

function findRunArtifact(runId) {
  if (!existsSync(metricsDir)) return null;
  const candidates = readdirSync(metricsDir)
    .filter((file) => file.startsWith("autonomy-self-work-"))
    .filter((file) => file.endsWith(".json"))
    .filter((file) => file.includes(runId))
    .sort();
  const file = candidates.at(-1);
  if (!file) return null;
  const fullPath = join(metricsDir, file);
  try {
    return {
      path: fullPath,
      data: JSON.parse(readFileSync(fullPath, "utf8")),
    };
  } catch {
    return null;
  }
}

function approveRun(args, capturedAt) {
  const runId = args.approveRun;
  const blocked = [];
  if (!runId) blocked.push("Missing --approve-run <run-id>.");
  const run = runId ? findRunArtifact(runId) : null;
  if (!run) blocked.push(`No autonomy self-work artifact found for run ${runId}.`);

  const source = run?.data ?? null;
  if (source && source.readyForMerge !== true) {
    blocked.push("Run is not readyForMerge; approval cannot prepare merge commands.");
  }

  const artifact = {
    runId: `approval-${timestampForFile(capturedAt)}`,
    capturedAt: capturedAt.toISOString(),
    selectedTask: source?.selectedTask ?? null,
    autonomyMode: "approve",
    riskTier: source?.riskTier ?? "unknown",
    branchOrWorktree: source?.branchOrWorktree ?? null,
    filesInspected: source ? [relative(root, run.path).replace(/\\/g, "/")] : [],
    filesChanged: [],
    commandsRun: [],
    verification: source?.verification ?? {
      requiredCommands: REQUIRED_GATES,
      handoffCommandsWhenDocsChange: HANDOFF_GATES,
      executed: [],
      passed: false,
    },
    blocked,
    rollback: source?.rollback ?? null,
    approvalRequired: true,
    approvalStatus: blocked.length === 0 ? "operator_approved_prepared" : "blocked",
    readyForMerge: blocked.length === 0,
    mergePreparation:
      blocked.length === 0
        ? {
            note: "Review the worktree diff before merging. This command does not merge or push automatically.",
            commands: [
              `git -C "${source.branchOrWorktree.worktreePath}" status --short --branch`,
              `git merge --no-ff ${source.branchOrWorktree.branch}`,
            ],
          }
        : null,
  };

  return artifact;
}

function runSelfWork(args) {
  const capturedAt = new Date();
  const runId = buildRunId(capturedAt);

  if (args.mode === "approve") {
    return approveRun(args, capturedAt);
  }

  const artifact = buildBaseArtifact({ args, runId, capturedAt });

  if (args.mode === "execute" && artifact.blocked.length === 0) {
    const branchOrWorktree = prepareWorktree({
      args,
      runId,
      task: artifact.selectedTask,
    });
    artifact.branchOrWorktree = {
      branch: branchOrWorktree.branch,
      worktreePath: branchOrWorktree.worktreePath,
      isolation: "git_worktree",
      containerIsolation: artifact.infrastructure.docker.available,
    };
    artifact.commandsRun.push(branchOrWorktree.command);
    artifact.rollback = buildRollback(artifact.branchOrWorktree);

    if (!branchOrWorktree.prepared) {
      artifact.blocked.push("Git worktree preparation failed.");
    } else {
      artifact.blocked.push(
        "Executor adapter is not configured in this safety tranche; isolated worktree is prepared, but project files were not mutated automatically.",
      );
      artifact.verification.executed = runVerificationGates(
        branchOrWorktree.worktreePath,
        taskNeedsHandoff(artifact.selectedTask),
      );
      artifact.verification.passed = artifact.verification.executed.every(
        (command) => command.ok,
      );
    }
  }

  if (artifact.blocked.length === 0) {
    artifact.readyForMerge = !artifact.approvalRequired && artifact.verification.passed;
  }

  return artifact;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifact = runSelfWork(args);
  const written = writeArtifact(artifact, args.outDir);

  console.log(`Autonomy self-work artifact written: ${written.relativePath}`);
  console.log(`runId: ${artifact.runId}`);
  console.log(`mode: ${artifact.autonomyMode}`);
  console.log(
    `selectedTask: ${artifact.selectedTask?.id ?? "none"} (${artifact.riskTier})`,
  );
  console.log(`approvalRequired: ${artifact.approvalRequired ? "true" : "false"}`);
  console.log(`readyForMerge: ${artifact.readyForMerge ? "true" : "false"}`);

  if (artifact.warnings?.length) {
    console.log("warnings:");
    for (const warning of artifact.warnings) console.log(`- ${sanitizeString(warning)}`);
  }

  if (artifact.blocked.length > 0) {
    console.log("blocked:");
    for (const reason of artifact.blocked) console.log(`- ${sanitizeString(reason)}`);
  }

  if (basename(written.path).includes("<LAN-IP>")) {
    throw new Error("Unexpected placeholder replacement in artifact file name.");
  }

  if (args.mode !== "dry-run" && artifact.blocked.length > 0) {
    process.exit(1);
  }
}

main();
