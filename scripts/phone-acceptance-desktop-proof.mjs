#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pidPath = join(root, ".nexus-runtime.pid");
const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const skipBuild = argv.includes("--skip-build");
const keepRunning = argv.includes("--keep-running");

export const PHONE_ACCEPTANCE_DESKTOP_PROOF_STEPS = [
  "runtime:stop:3100",
  "desktop:build-runtime",
  "runtime:launch:3100",
  "phone:acceptance:capture",
  "phone:acceptance:report",
];

const proofEnv = {
  ...process.env,
  NEXUS_PHONE_LAN_ENABLED: "true",
  NEXUS_NETWORK_MODE: "isolated",
  NEXUS_ALLOW_PAID_APIS: "false",
  NEXUS_ENABLE_HIGH_RISK_TOOLS: "false",
  NEXUS_RUNTIME_HOST: "0.0.0.0",
  NEXUS_RUNTIME_HEALTH_HOST: "127.0.0.1",
  NEXUS_RUNTIME_PORT: "3100",
  NEXUS_PHONE_LAN_PORT: "3100",
  HOSTNAME: "0.0.0.0",
  PORT: "3100",
};

const directNodeScripts = {
  "runtime:stop:3100": "scripts/runtime-stop-3100.mjs",
  "runtime:launch:3100": "scripts/runtime-launch-3100.mjs",
  "phone:acceptance:capture": "scripts/phone-acceptance-capture.mjs",
  "phone:acceptance:report": "scripts/phone-acceptance-report.mjs",
};

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runNpmScript(scriptName, options = {}) {
  const env = options.env ?? proofEnv;
  console.log(`[phone:acceptance:desktop-proof] npm run ${scriptName}`);
  const directScript = directNodeScripts[scriptName];
  const result = directScript
    ? spawnSync(process.execPath, [directScript], {
        cwd: root,
        env,
        stdio: "inherit",
      })
    : spawnSync(npmExecutable(), ["run", scriptName], {
        cwd: root,
        env,
        shell: process.platform === "win32",
        stdio: "inherit",
      });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} exited with ${result.status ?? "unknown"}`);
  }
}

function stopManagedRuntime() {
  const runStop = () =>
    spawnSync(process.execPath, [directNodeScripts["runtime:stop:3100"]], {
      cwd: root,
      env: proofEnv,
      stdio: "inherit",
    });

  let result = runStop();

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    result = runStop();
    if (result.error) {
      throw result.error;
    }
  }

  return result.status ?? 0;
}

function printCheck() {
  console.log("ok phone-acceptance-desktop-proof");
  console.log("Mode: static check only; no runtime launch, capture, build, or artifact write.");
  console.log("Desktop proof posture: LAN enabled, isolated network mode, paid APIs off, high-risk tools off.");
  console.log("Physical phone/iPad receipt items remain manual and are not simulated.");
}

if (checkOnly) {
  printCheck();
  process.exit(0);
}

let launchedRuntime = false;
let exitCode = 0;

try {
  runNpmScript("runtime:stop:3100");

  if (skipBuild) {
    console.log("[phone:acceptance:desktop-proof] skipping desktop runtime build");
  } else {
    runNpmScript("desktop:build-runtime", { env: process.env });
  }

  runNpmScript("runtime:launch:3100");
  launchedRuntime = true;
  runNpmScript("phone:acceptance:capture");
  runNpmScript("phone:acceptance:report");

  console.log("[phone:acceptance:desktop-proof] desktop-side proof captured.");
  console.log("[phone:acceptance:desktop-proof] Use a real phone/iPad for the remaining receipt checklist.");
} catch (error) {
  exitCode = 1;
  console.error(
    `[phone:acceptance:desktop-proof] ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  if (launchedRuntime && !keepRunning) {
    const stopCode = stopManagedRuntime();
    if (stopCode !== 0) {
      rmSync(pidPath, { force: true });
      console.warn(
        `[phone:acceptance:desktop-proof] runtime stop returned ${stopCode}; verify port 3100 before starting another runtime.`,
      );
    }
  } else if (launchedRuntime) {
    console.log("[phone:acceptance:desktop-proof] keeping managed runtime alive on port 3100.");
  }
}

process.exitCode = exitCode;
