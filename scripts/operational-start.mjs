#!/usr/bin/env node
/* eslint-disable no-console */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

import { buildSecureRuntimeProfile } from "./secure-runtime-gate.mjs";

const root = process.cwd();
const EXPECTED_NODE_MAJOR = 24;
const EXPECTED_NPM_MAJOR = 11;
const DEFAULT_PORT = 3000;
const DEFAULT_TIMEOUT_MS = 90_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;
const HEALTH_SERVICE = "homefront";

function parseBoundedInteger(value, label, minimum, maximum) {
  if (!/^\d+$/.test(String(value ?? ""))) {
    throw new Error(`${label} must be an integer.`);
  }
  const parsed = Number.parseInt(String(value), 10);
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

export function parseOperationalArgs(argv) {
  const options = {
    check: false,
    json: false,
    openBrowser: true,
    port: DEFAULT_PORT,
    smoke: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--no-open") {
      options.openBrowser = false;
      continue;
    }
    if (arg === "--smoke") {
      options.smoke = true;
      options.openBrowser = false;
      continue;
    }
    if (arg === "--port" || arg.startsWith("--port=")) {
      const value = arg === "--port" ? argv[++index] : arg.slice("--port=".length);
      options.port = parseBoundedInteger(value, "port", 1, 65_535);
      continue;
    }
    if (arg === "--timeout-ms" || arg.startsWith("--timeout-ms=")) {
      const value =
        arg === "--timeout-ms"
          ? argv[++index]
          : arg.slice("--timeout-ms=".length);
      options.timeoutMs = parseBoundedInteger(
        value,
        "timeout",
        MIN_TIMEOUT_MS,
        MAX_TIMEOUT_MS,
      );
      continue;
    }
    throw new Error(`Unknown operational-start option: ${arg}`);
  }

  return options;
}

function majorOf(version) {
  const match = String(version ?? "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function hasStrongRuntimeToken(envText, port) {
  let env;
  try {
    env = parseEnv(String(envText ?? ""));
  } catch {
    return false;
  }
  try {
    buildSecureRuntimeProfile({
      profile: "local",
      port: String(port),
      token: env.NEXUS_TOKEN,
    });
    return true;
  } catch {
    return false;
  }
}

function exactHealthPayload(payload) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    payload.status === "ok" &&
    payload.service === HEALTH_SERVICE &&
    payload.runtime !== null &&
    typeof payload.runtime === "object" &&
    typeof payload.runtime.bootId === "string" &&
    payload.runtime.bootId.trim().length > 0 &&
    typeof payload.runtime.startedAt === "string" &&
    payload.runtime.startedAt.trim().length > 0
  );
}

export function classifyHealthProbe(probe) {
  if (probe?.reachable === true) {
    return probe.status === 200 && exactHealthPayload(probe.payload)
      ? "nexus_healthy"
      : "occupied_non_nexus";
  }
  return probe?.code === "ECONNREFUSED" ? "available" : "occupied_unhealthy";
}

export function buildOperationalReadiness(options) {
  const runtimeState = classifyHealthProbe(options.existingProbe);
  const issues = [];

  if (majorOf(options.nodeVersion) !== EXPECTED_NODE_MAJOR) {
    issues.push({
      id: "node",
      detail: `Node ${EXPECTED_NODE_MAJOR}.x is required; found ${options.nodeVersion || "unknown"}.`,
      recovery: `Install Node ${EXPECTED_NODE_MAJOR}.x, then rerun npm run operational:start.`,
    });
  }
  if (majorOf(options.npmVersion) !== EXPECTED_NPM_MAJOR) {
    issues.push({
      id: "npm",
      detail: `npm ${EXPECTED_NPM_MAJOR}.x is required; found ${options.npmVersion || "unknown"}.`,
      recovery: `Install npm ${EXPECTED_NPM_MAJOR}.x, then rerun npm run operational:start.`,
    });
  }
  if (!options.nextCliExists) {
    issues.push({
      id: "dependencies",
      detail: "Local Next.js dependencies are missing.",
      recovery: "Run npm install from the repository root, then retry.",
    });
  }
  if (!hasStrongRuntimeToken(options.envText, options.port)) {
    issues.push({
      id: "token",
      detail: "The single .env.local file does not contain a strong NEXUS_TOKEN.",
      recovery:
        "Run npm run secure:start -- --init-token --check; the value is created locally and is never printed.",
    });
  }
  if (runtimeState === "occupied_non_nexus") {
    issues.push({
      id: "port",
      detail: `Port ${options.port} answered but did not return the exact Homefront health contract.`,
      recovery: `Stop the other process or rerun with --port=<free-port>.`,
    });
  } else if (runtimeState === "occupied_unhealthy") {
    issues.push({
      id: "port",
      detail: `Port ${options.port} could not be proven free or healthy.`,
      recovery: `Inspect the process using port ${options.port}, stop it if safe, then retry.`,
    });
  }

  return {
    ready: issues.length === 0,
    runtimeState,
    runtimeMode: options.runtimeMode,
    port: options.port,
    healthUrl: `http://127.0.0.1:${options.port}/api/health`,
    hqUrl: `http://127.0.0.1:${options.port}/hq`,
    checks: {
      nodeMajor: majorOf(options.nodeVersion),
      npmMajor: majorOf(options.npmVersion),
      dependenciesReady: options.nextCliExists === true,
      envFilePresent: String(options.envText ?? "").length > 0,
      tokenReady: hasStrongRuntimeToken(options.envText, options.port),
    },
    issues,
  };
}

function errorCode(error) {
  const candidate =
    error?.cause?.code ?? error?.code ?? error?.name ?? "PROBE_FAILED";
  return String(candidate);
}

export async function probeNexusHealth(healthUrl, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetchImpl(healthUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return {
      reachable: true,
      status: response.status,
      payload,
    };
  } catch (error) {
    const code = errorCode(error);
    return {
      reachable: false,
      code: code === "AbortError" ? "ETIMEDOUT" : code,
    };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function waitForHealthyRuntime(options) {
  const startedAt = Date.now();
  const intervalMs = Math.max(1, options.intervalMs ?? 500);

  while (Date.now() - startedAt < options.timeoutMs) {
    const state = options.childState();
    if (state.exited) {
      if (state.error) {
        throw new Error(`Runtime failed to start: ${state.error}`);
      }
      if (state.signal) {
        throw new Error(
          `Runtime exited from signal ${state.signal} before health was ready.`,
        );
      }
      throw new Error(
        `Runtime exited with code ${state.exitCode ?? "unknown"} before health was ready.`,
      );
    }

    const probe = await options.probe(options.healthUrl);
    if (classifyHealthProbe(probe) === "nexus_healthy") {
      return probe.payload;
    }
    await sleep(intervalMs);
  }

  await options.terminate();
  throw new Error(
    `Runtime health timed out after ${options.timeoutMs}ms at ${options.healthUrl}. The owned child was stopped.`,
  );
}

function readNpmVersion() {
  const userAgentMatch = String(process.env.npm_config_user_agent ?? "").match(
    /\bnpm\/([^\s]+)/,
  );
  if (userAgentMatch) return userAgentMatch[1];

  const result = spawnSync("npm --version", {
    cwd: root,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    stdio: "pipe",
  });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
}

function readEnvText() {
  const envPath = join(root, ".env.local");
  return existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
}

function resolveRuntimeMode() {
  if (existsSync(join(root, ".next", "standalone", "server.js"))) {
    return "standalone";
  }
  if (existsSync(join(root, ".next", "BUILD_ID"))) return "production";
  return "development";
}

function printReadiness(report) {
  console.log("Nexus operational startup");
  console.log(`runtime: ${report.runtimeMode}`);
  console.log(`port: ${report.port}`);
  console.log(`existing state: ${report.runtimeState}`);
  console.log(`Node: ${report.checks.nodeMajor ?? "unknown"} / required 24`);
  console.log(`npm: ${report.checks.npmMajor ?? "unknown"} / required 11`);
  console.log(
    `dependencies: ${report.checks.dependenciesReady ? "ready" : "missing"}`,
  );
  console.log(`local token: ${report.checks.tokenReady ? "ready" : "blocked"}`);
  if (report.issues.length === 0) {
    console.log("readiness: ready");
    return;
  }
  console.log(`readiness: blocked (${report.issues.length} issue(s))`);
  for (const issue of report.issues) {
    console.log(`- ${issue.detail}`);
    console.log(`  Recovery: ${issue.recovery}`);
  }
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolvePromise(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolvePromise(true);
    };
    child.once("exit", onExit);
  });
}

async function terminateOwnedChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (child.stdin?.writable) {
    child.stdin.on("error", () => undefined);
    child.stdin.write("NEXUS_SHUTDOWN\n");
    if (await waitForChildExit(child, 10_000)) return;
  }
  child.kill("SIGTERM");
  if (await waitForChildExit(child, 5_000)) return;
  child.kill("SIGKILL");
}

async function waitForReleasedPort(healthUrl, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const probe = await probeNexusHealth(healthUrl);
    if (classifyHealthProbe(probe) === "available") return true;
    await sleep(250);
  }
  return false;
}

export async function openLocalBrowser(url, options = {}) {
  const platform = options.platform ?? process.platform;
  const spawnImpl = options.spawnImpl ?? spawn;
  const environment = options.env ?? process.env;
  const command =
    platform === "win32"
      ? {
          executable: environment.ComSpec || "cmd.exe",
          args: ["/d", "/s", "/c", "start", '""', url],
        }
      : platform === "darwin"
        ? { executable: "open", args: [url] }
        : { executable: "xdg-open", args: [url] };

  return new Promise((resolvePromise) => {
    const opener = spawnImpl(command.executable, command.args, {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    opener.once("error", (error) =>
      resolvePromise({ opened: false, error: error.message }),
    );
    opener.once("exit", (code) =>
      resolvePromise({
        opened: code === 0,
        error: code === 0 ? null : `browser opener exited with code ${code}`,
      }),
    );
  });
}

async function waitForRuntimeExit(child) {
  if (child.exitCode !== null) return child.exitCode;
  if (child.signalCode === "SIGINT") return 130;
  if (child.signalCode === "SIGTERM") return 143;
  if (child.signalCode) return 1;

  return new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (signal === "SIGINT") {
        resolvePromise(130);
        return;
      }
      if (signal === "SIGTERM") {
        resolvePromise(143);
        return;
      }
      resolvePromise(code ?? 0);
    });
  });
}

async function main() {
  const args = parseOperationalArgs(process.argv.slice(2));
  const healthUrl = `http://127.0.0.1:${args.port}/api/health`;
  const existingProbe = await probeNexusHealth(healthUrl);
  const report = buildOperationalReadiness({
    nodeVersion: process.version,
    npmVersion: readNpmVersion(),
    nextCliExists: existsSync(
      join(root, "node_modules", "next", "dist", "bin", "next"),
    ),
    envText: readEnvText(),
    port: args.port,
    runtimeMode: resolveRuntimeMode(),
    existingProbe,
  });

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReadiness(report);
  }
  if (!report.ready) {
    process.exitCode = 1;
    return;
  }
  if (args.check) return;

  if (report.runtimeState === "nexus_healthy") {
    if (!args.json) {
      console.log(
        args.smoke
          ? `Operational smoke passed against an existing verified runtime; it was left running: ${report.hqUrl}`
          : `Reusing verified runtime: ${report.hqUrl}`,
      );
    }
    if (args.openBrowser) {
      const opened = await openLocalBrowser(report.hqUrl);
      if (!opened.opened) {
        console.warn(
          `Browser did not open (${opened.error}). Open ${report.hqUrl} manually.`,
        );
      }
    }
    return;
  }

  const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      NEXUS_MANAGED_PARENT: "operational-start",
      PORT: String(args.port),
    },
    stdio: ["pipe", "inherit", "inherit"],
  });
  const childStatus = {
    exited: false,
    exitCode: null,
    signal: null,
    error: null,
  };
  child.once("error", (error) => {
    childStatus.exited = true;
    childStatus.error = error.message;
  });
  child.once("exit", (code, signal) => {
    childStatus.exited = true;
    childStatus.exitCode = code;
    childStatus.signal = signal;
  });

  const onSigint = () => {
    void terminateOwnedChild(child);
  };
  const onSigterm = () => {
    void terminateOwnedChild(child);
  };
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  try {
    const health = await waitForHealthyRuntime({
      healthUrl,
      timeoutMs: args.timeoutMs,
      childState: () => ({ ...childStatus }),
      probe: probeNexusHealth,
      terminate: () => terminateOwnedChild(child),
    });
    if (!args.json) {
      console.log(
        `Nexus healthy: ${report.hqUrl} (boot ${health.runtime.bootId})`,
      );
    }
    if (args.openBrowser) {
      const opened = await openLocalBrowser(report.hqUrl);
      if (!opened.opened) {
        console.warn(
          `Browser did not open (${opened.error}). Open ${report.hqUrl} manually.`,
        );
      }
    }
    if (args.smoke) {
      await terminateOwnedChild(child);
      if (!(await waitForReleasedPort(healthUrl))) {
        throw new Error(
          `Operational smoke cleanup failed; port ${args.port} was not released.`,
        );
      }
      if (!args.json) {
        console.log(
          `Operational smoke passed; the owned runtime stopped and port ${args.port} was released.`,
        );
      }
      return;
    }
    process.exitCode = await waitForRuntimeExit(child);
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(
      `x operational-start: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
