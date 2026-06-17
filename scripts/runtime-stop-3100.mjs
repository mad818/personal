#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

const root = process.cwd();
const pidPath = join(root, ".nexus-runtime.pid");

function fail(message) {
  console.error(`❌ runtime:stop:3100: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[runtime:stop:3100] ${message}`);
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
    };
  } catch {
    return null;
  }
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });

    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilGone(pid, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!pidIsAlive(pid)) {
      return true;
    }
    await sleep(250);
  }
  return !pidIsAlive(pid);
}

async function stopWindowsRuntimePid(pid) {
  const taskkillExit = await runProcess("taskkill", ["/PID", String(pid), "/T", "/F"]);
  if (taskkillExit === 0 || !pidIsAlive(pid)) {
    return;
  }

  const stopProcessExit = await runProcess("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Stop-Process -Id ${pid} -Force`,
  ]);

  if (stopProcessExit === 0 || !pidIsAlive(pid)) {
    return;
  }

  throw new Error(
    `failed to stop pid ${pid} (taskkill exit ${taskkillExit}; Stop-Process exit ${stopProcessExit})`,
  );
}

async function stopPosixRuntimePid(pid) {
  const exitCode = await runProcess("kill", ["-TERM", String(pid)]);
  if (exitCode === 0 || !pidIsAlive(pid)) {
    return;
  }

  throw new Error(`failed to stop pid ${pid} (kill exit ${exitCode})`);
}

async function main() {
  const runtime = readRuntimeRecord();
  if (!runtime) {
    rmSync(pidPath, { force: true });
    log("no managed runtime pid file found");
    return;
  }

  if (!pidIsAlive(runtime.pid)) {
    rmSync(pidPath, { force: true });
    log(`pid ${runtime.pid} is already gone`);
    return;
  }

  log(`stopping managed runtime pid ${runtime.pid}${runtime.baseUrl ? ` (${runtime.baseUrl})` : ""}`);

  try {
    if (process.platform === "win32") {
      await stopWindowsRuntimePid(runtime.pid);
    } else {
      await stopPosixRuntimePid(runtime.pid);
    }
  } catch (error) {
    if (await waitUntilGone(runtime.pid)) {
      rmSync(pidPath, { force: true });
      log("managed runtime already stopped during shutdown");
      return;
    }
    throw error;
  }

  if (!(await waitUntilGone(runtime.pid))) {
    fail(`failed to stop pid ${runtime.pid}`);
  }

  rmSync(pidPath, { force: true });
  log("managed runtime stopped");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
