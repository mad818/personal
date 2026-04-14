#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import net from "net";

const root = process.cwd();
const host = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3000");
const baseUrl = `http://${host}:${port}`;
const healthUrl = `${baseUrl}/api/health`;
const args = process.argv.slice(2);
const openAfterHeal = args.includes("--open");
const pathFlagIndex = args.findIndex((value) => value === "--path");
const targetPath =
  pathFlagIndex >= 0 && args[pathFlagIndex + 1]
    ? args[pathFlagIndex + 1]
    : "/hq";
const targetUrl = new URL(targetPath, baseUrl).toString();

function fail(message) {
  console.error(`❌ runtime:auto-heal: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`runtime:auto-heal: ${message}`);
}

function hasStandaloneBuild() {
  return (
    existsSync(join(root, ".next", "standalone", "server.js")) ||
    existsSync(join(root, ".next-build", "standalone", "server.js"))
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortReachable(targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port: targetPort,
    });

    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(400);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function probeHealth() {
  try {
    const response = await fetch(healthUrl, { cache: "no-store" });
    if (!response.ok) {
      return {
        healthy: false,
        status: response.status,
        payload: null,
      };
    }

    return {
      healthy: true,
      status: response.status,
      payload: await response.json().catch(() => null),
    };
  } catch (error) {
    return {
      healthy: false,
      status: 0,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function waitForHealthyRuntime(timeoutMs = 90_000) {
  const startedAt = Date.now();
  let lastReason = "not yet reachable";

  while (Date.now() - startedAt < timeoutMs) {
    const health = await probeHealth();
    if (health.healthy) {
      return health;
    }

    lastReason =
      health.error ??
      (health.status ? `health returned ${health.status}` : "connection refused");
    await sleep(1000);
  }

  return {
    healthy: false,
    status: 0,
    payload: null,
    error: lastReason,
  };
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${scriptPath} exited via signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${scriptPath} exited with code ${code ?? "unknown"}`));
        return;
      }
      resolve();
    });
  });
}

function launchRuntimeDetached() {
  if (process.platform === "win32") {
    const escapedRoot = root.replace(/'/g, "''");
    const command = [
      "$process = Start-Process",
      "-FilePath 'npm.cmd'",
      "-ArgumentList 'run','start'",
      `-WorkingDirectory '${escapedRoot}'`,
      "-WindowStyle Hidden",
      "-PassThru;",
      "Write-Output $process.Id",
    ].join(" ");

    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-Command", command],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      },
    );

    let pidOutput = "";
    child.stdout?.on("data", (chunk) => {
      pidOutput += chunk.toString();
    });
    return new Promise((resolve) => {
      child.once("error", () => resolve(null));
      child.once("exit", () => {
        const parsedPid = Number.parseInt(pidOutput.trim(), 10);
        resolve(Number.isFinite(parsedPid) ? parsedPid : null);
      });
    });
  }

  const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: root,
    env: process.env,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return Promise.resolve(child.pid ?? null);
}

function openUrl(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  spawn("xdg-open", [url], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

async function healRuntime() {
  const initialHealth = await probeHealth();
  if (initialHealth.healthy) {
    info(`runtime already healthy at ${baseUrl}`);
    return initialHealth;
  }

  const portReachable = await isPortReachable(port);
  if (portReachable) {
    fail(
      `port ${port} is reachable but Nexus health is unavailable. Another process may be occupying ${baseUrl}, so auto-heal will not replace it blindly.`,
    );
  }

  if (hasStandaloneBuild()) {
    info("standalone build found; attempting a background runtime start");
    const pid = await launchRuntimeDetached();
    if (pid) {
      info(`spawned background runtime (pid ${pid})`);
    }
    const warmHealth = await waitForHealthyRuntime(45_000);
    if (warmHealth.healthy) {
      return warmHealth;
    }
    info(
      `existing build did not recover cleanly (${warmHealth.error ?? "unknown"}); rebuilding and retrying`,
    );
  } else {
    info("no standalone build found; building before healing the runtime");
  }

  await runNodeScript("scripts/build-runtime.mjs");
  const pid = await launchRuntimeDetached();
  if (pid) {
    info(`spawned rebuilt background runtime (pid ${pid})`);
  }
  const healedHealth = await waitForHealthyRuntime(90_000);
  if (!healedHealth.healthy) {
    fail(
      `runtime still did not become healthy after rebuild (${healedHealth.error ?? "unknown error"})`,
    );
  }
  return healedHealth;
}

const health = await healRuntime();
const bootId =
  typeof health.payload?.runtime?.bootId === "string"
    ? health.payload.runtime.bootId
    : "unknown";
info(`runtime healthy at ${baseUrl} (boot ${bootId})`);

if (openAfterHeal) {
  openUrl(targetUrl);
  info(`opened ${targetUrl}`);
} else {
  info(`open ${targetUrl}`);
}
