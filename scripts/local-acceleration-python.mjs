import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function localAccelerationPythonCandidates({
  env = process.env,
  platform = process.platform,
  home,
  root,
}) {
  const configured = env.NEXUS_LOCAL_ACCELERATION_PYTHON?.trim();
  const windows = platform === "win32";
  const localExecutable = windows
    ? path.join("Scripts", "python.exe")
    : path.join("bin", "python");
  return [
    ...(configured ? [{ command: configured, prefix: [] }] : []),
    {
      command: path.join(
        root,
        ".nexus",
        "local-acceleration-venv",
        localExecutable,
      ),
      prefix: [],
    },
    { command: path.join(root, ".venv", localExecutable), prefix: [] },
    ...(windows
      ? [
          {
            command: path.join(
              home,
              ".cache",
              "codex-runtimes",
              "codex-primary-runtime",
              "dependencies",
              "python",
              "python.exe",
            ),
            prefix: [],
          },
        ]
      : []),
    { command: "python3", prefix: [] },
    { command: "python", prefix: [] },
    ...(windows ? [{ command: "py", prefix: ["-3"] }] : []),
  ];
}

export function findLocalAccelerationPython({
  env = process.env,
  platform = process.platform,
  home,
  root,
  existsSync = fs.existsSync,
  run = (command, commandArgs) => {
    try {
      const result = spawnSync(command, commandArgs, {
        cwd: root,
        encoding: "utf8",
        timeout: 10_000,
        windowsHide: true,
      });
      return { ok: result.status === 0 };
    } catch {
      return { ok: false };
    }
  },
}) {
  for (const candidate of localAccelerationPythonCandidates({
    env,
    platform,
    home,
    root,
  })) {
    const pathLike = path.isAbsolute(candidate.command);
    if (pathLike && !existsSync(candidate.command)) continue;
    if (run(candidate.command, [...candidate.prefix, "--version"]).ok) {
      return candidate;
    }
  }
  return null;
}
