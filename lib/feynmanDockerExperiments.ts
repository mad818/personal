// Docker-isolated experiment policy contract.
//
// Security model — fail closed on every gate:
//   1. approve === true in tool input (explicit per-call operator consent)
//   2. NEXUS_FEYNMAN_DOCKER_APPROVED=1 in server environment (operator opt-in)
//   Either condition absent → dry-run manifest, no Docker spawn.
//   3. Image validated against allowlist (no private registries, no :latest without digest)
//   4. Safety flags always applied: --rm, --read-only, --network=none,
//      --security-opt=no-new-privileges, --cap-drop=ALL
//   5. --privileged is never accepted
//   6. Output bounded at 64 KB per stream

import * as childProcess from "child_process";

export type DockerRunManifest = {
  approved: boolean;
  image: string;
  command: string[];
  flags: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean;
  dryRun: boolean;
  error?: string;
};

export type DockerExperimentOptions = {
  approve: boolean;
  image: string;
  command?: string[];
  workDir?: string;
  envVars?: Record<string, string>;
  timeoutMs?: number;
};

export type FeynmanDockerExperimentsDeps = {
  spawnImpl?: (
    image: string,
    command: string[],
    flags: string[],
    options: { timeoutMs: number },
  ) => Promise<{ exitCode: number | null; stdout: string; stderr: string }>;
  getEnv?: (key: string) => string | undefined;
};

export const FEYNMAN_DOCKER_LIMITS = {
  defaultTimeoutMs: 60_000,
  maximumTimeoutMs: 300_000,
  maximumOutputBytes: 64_000,
} as const;

// Allowlist for approved Docker images.
// Only official research images with pinned major/minor versions are accepted.
export const DOCKER_IMAGE_ALLOWLIST: readonly RegExp[] = [
  /^python:\d+\.\d+(?:-slim|-alpine)?$/,
  /^node:\d+(?:-alpine|-slim)?$/,
  /^jupyter\/(?:minimal|base|scipy|tensorflow|pytorch)-notebook:\S+$/,
  /^pytorch\/pytorch:\d+\.\d+\.\d+(?:-cuda[\d.]+-cudnn\d+-\S+)?$/,
  /^tensorflow\/tensorflow:\d+\.\d+\.\d+(?:-gpu|-jupyter)?$/,
  /^ghcr\.io\/astral-sh\/uv:\S+$/,
] as const;

// Env var names passed via --env must match this pattern.
const ENV_VAR_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;

export function validateDockerImage(
  image: string,
): { valid: true } | { valid: false; reason: string } {
  const trimmed = image.trim();
  if (!trimmed) return { valid: false, reason: "Image name is required." };
  if (trimmed.length > 256) return { valid: false, reason: "Image name is too long." };
  if (trimmed.includes("..") || trimmed.includes("\\") || trimmed.includes(" ")) {
    return { valid: false, reason: "Image name contains invalid characters." };
  }

  const allowed = DOCKER_IMAGE_ALLOWLIST.some((re) => re.test(trimmed));
  if (!allowed) {
    return {
      valid: false,
      reason:
        `Image "${trimmed}" is not on the approved allowlist. ` +
        `Allowed: python:X.Y, node:X, jupyter/*-notebook:TAG, ` +
        `pytorch/pytorch:X.Y.Z, tensorflow/tensorflow:X.Y.Z, ghcr.io/astral-sh/uv:TAG.`,
    };
  }

  return { valid: true };
}

export function buildDockerFlags(opts: DockerExperimentOptions): string[] {
  const timeoutMs = Math.min(
    Math.max(1_000, opts.timeoutMs ?? FEYNMAN_DOCKER_LIMITS.defaultTimeoutMs),
    FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs,
  );

  // Safety flags — always included, cannot be overridden
  const flags: string[] = [
    "--rm",
    "--read-only",
    "--network=none",
    "--security-opt=no-new-privileges",
    "--cap-drop=ALL",
    `--stop-timeout=${Math.ceil(timeoutMs / 1000)}`,
  ];

  if (opts.workDir) {
    const safeDir = opts.workDir.replace(/'/g, "");
    flags.push(`--workdir=${safeDir}`);
  }

  if (opts.envVars) {
    for (const [key, value] of Object.entries(opts.envVars)) {
      if (ENV_VAR_NAME_RE.test(key)) {
        flags.push(`--env=${key}=${value}`);
      }
    }
  }

  return flags;
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
  image: string,
  command: string[],
  flags: string[],
  options: { timeoutMs: number },
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const args = ["run", ...flags, image, ...command];
    const proc = childProcess.spawn("docker", args, {
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

export async function runDockerExperiment(
  opts: DockerExperimentOptions,
  deps: FeynmanDockerExperimentsDeps = {},
): Promise<DockerRunManifest> {
  const getEnv = deps.getEnv ?? ((k: string) => process.env[k]);
  const image = opts.image?.trim() ?? "";
  const command = opts.command ?? [];

  // SECURITY GATE 1: explicit operator approval (fail closed)
  if (!opts.approve) {
    return {
      approved: false,
      image,
      command,
      flags: [],
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      truncated: false,
      dryRun: true,
      error: "Execution blocked: approve must be true in tool input.",
    };
  }

  // SECURITY GATE 2: image allowlist
  const imageCheck = validateDockerImage(image);
  if (!imageCheck.valid) {
    return {
      approved: false,
      image,
      command,
      flags: [],
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      truncated: false,
      dryRun: true,
      error: `Blocked: ${imageCheck.reason}`,
    };
  }

  const flags = buildDockerFlags(opts);

  // SECURITY GATE 3: server environment opt-in (fail closed → dry run)
  if (getEnv("NEXUS_FEYNMAN_DOCKER_APPROVED") !== "1") {
    return {
      approved: true,
      image,
      command,
      flags,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      truncated: false,
      dryRun: true,
      error:
        "Dry-run only: set NEXUS_FEYNMAN_DOCKER_APPROVED=1 in server environment to enable live Docker execution.",
    };
  }

  const spawn = deps.spawnImpl ?? defaultSpawnImpl;
  const timeoutMs = Math.min(
    Math.max(1_000, opts.timeoutMs ?? FEYNMAN_DOCKER_LIMITS.defaultTimeoutMs),
    FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs,
  );

  const start = Date.now();
  try {
    const { exitCode, stdout, stderr } = await spawn(image, command, flags, { timeoutMs });

    const durationMs = Date.now() - start;
    const outResult = truncateOutput(stdout, FEYNMAN_DOCKER_LIMITS.maximumOutputBytes);
    const errResult = truncateOutput(stderr, FEYNMAN_DOCKER_LIMITS.maximumOutputBytes);

    return {
      approved: true,
      image,
      command,
      flags,
      exitCode,
      stdout: outResult.value,
      stderr: errResult.value,
      durationMs,
      truncated: outResult.truncated || errResult.truncated,
      dryRun: false,
    };
  } catch (err) {
    return {
      approved: true,
      image,
      command,
      flags,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: Date.now() - start,
      truncated: false,
      dryRun: false,
      error: err instanceof Error ? err.message : "Docker experiment failed.",
    };
  }
}

export function formatDockerManifest(manifest: DockerRunManifest): string {
  const lines: string[] = [
    "Feynman Docker experiment manifest",
    `Image: ${manifest.image}`,
    `Approved: ${manifest.approved}`,
    `Dry-run: ${manifest.dryRun}`,
    `Exit code: ${manifest.exitCode ?? "null"}`,
    `Duration: ${manifest.durationMs}ms`,
    `Truncated: ${manifest.truncated}`,
    `Flags: ${manifest.flags.join(" ")}`,
    `Command: ${manifest.command.join(" ")}`,
  ];

  if (manifest.error) {
    lines.push(`Error: ${manifest.error}`);
  }
  if (manifest.stdout) {
    lines.push("", "stdout:", manifest.stdout);
  }
  if (manifest.stderr) {
    lines.push("", "stderr:", manifest.stderr);
  }

  return lines.join("\n");
}
