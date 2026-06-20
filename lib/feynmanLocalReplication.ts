// Operator-approved local replication plan executor.
//
// Security model — fail closed on every gate:
//   1. approve === true in tool input (explicit per-call operator consent)
//   2. Script path must be under the SCRIPT_PATH_ALLOWLIST subdirectories in the project root
//   3. No path traversal, no absolute paths, no blocked directory segments
//   4. child_process spawned with shell: false and a hard timeout
//   5. Output captured and bounded; subprocess receives NEXUS_REPLICATION_APPROVED=1

import * as path from "path";
import * as childProcess from "child_process";

export type ReplicationResult = {
  approved: boolean;
  script: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean;
  error?: string;
};

export type ReplicationRunOptions = {
  approve: boolean;
  scriptRelPath: string;
  args?: string[];
  timeoutMs?: number;
};

export type FeynmanLocalReplicationDeps = {
  spawnImpl?: (
    scriptAbsPath: string,
    args: string[],
    options: { cwd: string; timeoutMs: number; env: NodeJS.ProcessEnv },
  ) => Promise<{ exitCode: number | null; stdout: string; stderr: string }>;
  cwd?: string;
};

export const FEYNMAN_REPLICATION_LIMITS = {
  defaultTimeoutMs: 30_000,
  maximumTimeoutMs: 120_000,
  maximumOutputBytes: 32_000,
} as const;

// Allowlisted subdirectory prefixes under the project root.
// Scripts must reside inside one of these paths.
export const REPLICATION_SCRIPT_ALLOWLIST = [
  "scripts/replication/",
  "scripts/experiments/",
] as const;

// Segments that must never appear in the resolved path (defense in depth).
const BLOCKED_PATH_SEGMENTS = ["node_modules", ".git", ".next", ".env"];

export function validateReplicationScriptPath(
  relPath: string,
  projectRoot: string,
): { safe: true; absolute: string } | { safe: false; reason: string } {
  const trimmed = relPath.trim();
  if (!trimmed) return { safe: false, reason: "Script path is required." };
  if (trimmed.length > 512) return { safe: false, reason: "Script path is too long." };

  // Normalise: forward slashes, strip leading slash
  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");

  // Block path traversal
  if (normalized.includes("..")) {
    return { safe: false, reason: "Path traversal is not allowed in script path." };
  }

  // Enforce allowlist
  const allowed = REPLICATION_SCRIPT_ALLOWLIST.some((prefix) =>
    normalized.startsWith(prefix),
  );
  if (!allowed) {
    return {
      safe: false,
      reason: `Script must be under one of: ${REPLICATION_SCRIPT_ALLOWLIST.join(", ")}.`,
    };
  }

  const absolute = path.join(projectRoot, normalized);

  // Defense-in-depth: no blocked segments in resolved path
  for (const seg of BLOCKED_PATH_SEGMENTS) {
    if (absolute.includes(seg)) {
      return { safe: false, reason: `Resolved path contains blocked segment: "${seg}".` };
    }
  }

  return { safe: true, absolute };
}

function truncateOutput(
  value: string,
  maxBytes: number,
): { value: string; truncated: boolean } {
  const encoded = Buffer.byteLength(value, "utf-8");
  if (encoded <= maxBytes) return { value, truncated: false };
  const slice = Buffer.from(value, "utf-8").subarray(0, maxBytes).toString("utf-8");
  return {
    value: `${slice}\n[Output truncated at ${maxBytes} bytes]`,
    truncated: true,
  };
}

function defaultSpawnImpl(
  scriptAbsPath: string,
  args: string[],
  options: { cwd: string; timeoutMs: number; env: NodeJS.ProcessEnv },
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const proc = childProcess.spawn("node", [scriptAbsPath, ...args], {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeoutMs,
      shell: false,
    });

    proc.stdout.on("data", (d: Buffer) => stdoutChunks.push(d.toString("utf-8")));
    proc.stderr.on("data", (d: Buffer) => stderrChunks.push(d.toString("utf-8")));

    proc.on("close", (code: number | null) => {
      resolve({
        exitCode: code,
        stdout: stdoutChunks.join(""),
        stderr: stderrChunks.join(""),
      });
    });

    proc.on("error", (err: Error) => {
      resolve({ exitCode: null, stdout: "", stderr: err.message });
    });
  });
}

export async function runReplicationScript(
  opts: ReplicationRunOptions,
  deps: FeynmanLocalReplicationDeps = {},
): Promise<ReplicationResult> {
  const projectRoot = deps.cwd ?? process.cwd();

  // SECURITY GATE 1: explicit operator approval (fail closed)
  if (!opts.approve) {
    return {
      approved: false,
      script: opts.scriptRelPath,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      truncated: false,
      error: "Execution blocked: approve must be true in tool input.",
    };
  }

  // SECURITY GATE 2: script path allowlist
  const pathCheck = validateReplicationScriptPath(opts.scriptRelPath, projectRoot);
  if (!pathCheck.safe) {
    return {
      approved: false,
      script: opts.scriptRelPath,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      truncated: false,
      error: `Blocked: ${pathCheck.reason}`,
    };
  }

  const timeoutMs = Math.min(
    Math.max(1_000, opts.timeoutMs ?? FEYNMAN_REPLICATION_LIMITS.defaultTimeoutMs),
    FEYNMAN_REPLICATION_LIMITS.maximumTimeoutMs,
  );

  const spawn = deps.spawnImpl ?? defaultSpawnImpl;
  const start = Date.now();

  try {
    const { exitCode, stdout, stderr } = await spawn(
      pathCheck.absolute,
      opts.args ?? [],
      {
        cwd: projectRoot,
        timeoutMs,
        env: { ...process.env, NEXUS_REPLICATION_APPROVED: "1" },
      },
    );

    const durationMs = Date.now() - start;
    const outResult = truncateOutput(stdout, FEYNMAN_REPLICATION_LIMITS.maximumOutputBytes);
    const errResult = truncateOutput(stderr, FEYNMAN_REPLICATION_LIMITS.maximumOutputBytes);

    return {
      approved: true,
      script: opts.scriptRelPath,
      exitCode,
      stdout: outResult.value,
      stderr: errResult.value,
      durationMs,
      truncated: outResult.truncated || errResult.truncated,
    };
  } catch (err) {
    return {
      approved: true,
      script: opts.scriptRelPath,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: Date.now() - start,
      truncated: false,
      error: err instanceof Error ? err.message : "Script execution failed.",
    };
  }
}

export function formatReplicationResult(result: ReplicationResult): string {
  const lines: string[] = [
    "Feynman replication result",
    `Script: ${result.script}`,
    `Approved: ${result.approved}`,
    `Exit code: ${result.exitCode ?? "null"}`,
    `Duration: ${result.durationMs}ms`,
    `Truncated: ${result.truncated}`,
  ];

  if (result.error) {
    lines.push(`Error: ${result.error}`);
  }
  if (result.stdout) {
    lines.push("", "stdout:", result.stdout);
  }
  if (result.stderr) {
    lines.push("", "stderr:", result.stderr);
  }

  return lines.join("\n");
}
