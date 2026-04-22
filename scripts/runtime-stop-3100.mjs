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

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
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

  const child =
    process.platform === "win32"
      ? spawn("taskkill", ["/PID", String(runtime.pid), "/T", "/F"], {
          cwd: root,
          stdio: "ignore",
        })
      : spawn("kill", ["-TERM", String(runtime.pid)], {
          cwd: root,
          stdio: "ignore",
        });

  const exitCode = await waitForExit(child);
  if (exitCode !== 0) {
    fail(`failed to stop pid ${runtime.pid} (exit ${exitCode})`);
  }

  rmSync(pidPath, { force: true });
  log("managed runtime stopped");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
