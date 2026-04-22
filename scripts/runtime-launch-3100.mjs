#!/usr/bin/env node
/* eslint-disable no-console */

import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

const root = process.cwd();
const host = process.env.NEXUS_RUNTIME_HOST ?? "127.0.0.1";
const port = process.env.NEXUS_RUNTIME_PORT ?? "3100";
const baseUrl = `http://${host}:${port}`;
const pidPath = join(root, ".nexus-runtime.pid");
const stdoutPath = join(root, ".nexus-runtime.out");
const stderrPath = join(root, ".nexus-runtime.err");

function fail(message) {
  console.error(`❌ runtime:launch:3100: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[runtime:launch:3100] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function psEscape(value) {
  return value.replace(/'/g, "''");
}

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readRuntimeRecord() {
  if (!existsSync(pidPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(pidPath, "utf8"));
    const pid = Number(parsed?.pid);
    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }

    return {
      pid,
      baseUrl: String(parsed?.baseUrl ?? ""),
      startedAt: String(parsed?.startedAt ?? ""),
    };
  } catch {
    return null;
  }
}

function writeRuntimeRecord(pid) {
  writeFileSync(
    pidPath,
    `${JSON.stringify(
      {
        pid,
        baseUrl,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function readHealth() {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    return response.json().catch(() => ({}));
  } catch {
    return null;
  }
}

async function waitForHealth(pid, timeoutMs = 45_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const payload = await readHealth();
    if (payload) {
      return payload;
    }

    if (!pidIsAlive(pid)) {
      throw new Error(
        `runtime pid ${pid} exited before ${baseUrl} became healthy. Check ${stderrPath}`,
      );
    }

    await sleep(1000);
  }

  throw new Error(
    `runtime never became healthy on ${baseUrl}. Check ${stdoutPath} and ${stderrPath}`,
  );
}

async function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
}

async function stopRuntime(pid) {
  if (!pidIsAlive(pid)) {
    rmSync(pidPath, { force: true });
    return;
  }

  const child =
    process.platform === "win32"
      ? spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
          cwd: root,
          stdio: "ignore",
        })
      : spawn("kill", ["-TERM", String(pid)], {
          cwd: root,
          stdio: "ignore",
        });

  await waitForExit(child);
  rmSync(pidPath, { force: true });
}

async function launchWindowsRuntime() {
  const powershellCommand = [
    `$env:PORT='${psEscape(port)}'`,
    `$env:HOSTNAME='${psEscape(host)}'`,
    `$process = Start-Process -FilePath '${psEscape(process.execPath)}' -ArgumentList 'scripts/start-runtime.mjs' -WorkingDirectory '${psEscape(root)}' -RedirectStandardOutput '${psEscape(stdoutPath)}' -RedirectStandardError '${psEscape(stderrPath)}' -WindowStyle Hidden -PassThru`,
    "$process.Id",
  ].join("; ");

  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      powershellCommand,
    ],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await waitForExit(child);
  if (exitCode !== 0) {
    fail(stderr.trim() || `powershell launcher exited with code ${exitCode}`);
  }

  const pid = Number.parseInt(stdout.trim(), 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    fail(`launcher did not return a valid pid (${stdout.trim() || "empty"})`);
  }

  return pid;
}

async function launchPosixRuntime() {
  const stdoutFd = openSync(stdoutPath, "a");
  const stderrFd = openSync(stderrPath, "a");

  try {
    const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
      cwd: root,
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: host,
      },
      stdio: ["ignore", stdoutFd, stderrFd],
      detached: true,
    });

    child.unref();
    return child.pid;
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }
}

async function main() {
  const existingHealth = await readHealth();
  const existingRecord = readRuntimeRecord();

  if (existingRecord?.pid && pidIsAlive(existingRecord.pid) && existingHealth) {
    log(`managed runtime already healthy on ${baseUrl} (pid ${existingRecord.pid})`);
    return;
  }

  if (existingRecord?.pid) {
    log(`stopping stale managed runtime pid ${existingRecord.pid}`);
    await stopRuntime(existingRecord.pid);
  }

  if (existingHealth && !existingRecord) {
    log(`${baseUrl} is already healthy without a managed pid file; leaving the current runtime in place`);
    return;
  }

  rmSync(pidPath, { force: true });

  log(`launching root-main review runtime on ${baseUrl}`);
  const pid =
    process.platform === "win32"
      ? await launchWindowsRuntime()
      : await launchPosixRuntime();

  writeRuntimeRecord(pid);

  try {
    const payload = await waitForHealth(pid);
    const bootId = payload?.runtime?.bootId ?? "unknown";
    log(`runtime healthy on ${baseUrl} (pid ${pid}, boot ${bootId})`);
  } catch (error) {
    await stopRuntime(pid).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
