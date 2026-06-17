#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const root = process.cwd();
const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const skipBuild = argv.includes("--skip-build");
const noWait = argv.includes("--no-wait");

export const PHONE_ACCEPTANCE_SESSION_STEPS = [
  "runtime:stop:3100",
  "desktop:build-runtime",
  "runtime:launch:3100",
  "phone:acceptance:guide",
  "phone:acceptance:capture",
  "phone:acceptance:report",
  "offline:local:report",
  "ops:first-three",
];

const sessionEnv = {
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
  "phone:acceptance:guide": "scripts/phone-acceptance-guide.mjs",
  "phone:acceptance:capture": "scripts/phone-acceptance-capture.mjs",
  "phone:acceptance:report": "scripts/phone-acceptance-report.mjs",
  "offline:local:report": "scripts/offline-local-ai-report.mjs",
  "ops:first-three": "scripts/first-three-operational-closure.mjs",
};

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runScript(scriptName, options = {}) {
  const env = options.env ?? sessionEnv;
  console.log(`[phone:acceptance:session] npm run ${scriptName}`);
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
  if ((result.status ?? 0) !== 0) {
    throw new Error(`npm run ${scriptName} exited with ${result.status ?? "unknown"}`);
  }
}

async function waitForOperator() {
  if (!process.stdin.isTTY || noWait) {
    console.log(
      "[phone:acceptance:session] not waiting; keep this runtime open while you complete the phone/iPad checklist.",
    );
    console.log("[phone:acceptance:session] after device steps, run:");
    console.log("  npm run phone:acceptance:capture");
    console.log("  npm run phone:acceptance:report");
    console.log("  npm run offline:local:report");
    console.log("  npm run ops:first-three");
    console.log("  npm run runtime:stop:3100");
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await rl.question(
      "\nComplete the real phone/iPad checklist, then Press Enter to capture/report and stop the runtime. Ctrl+C stops the managed runtime.\n",
    );
    return true;
  } finally {
    rl.close();
  }
}

async function main() {
  if (checkOnly) {
    console.log("ok phone-acceptance-session");
    console.log("Mode: static check only; no runtime launch, capture, build, or artifact write.");
    console.log("Session posture: LAN enabled, isolated mode, paid APIs off, high-risk tools off.");
    console.log("Physical phone/iPad receipt items remain manual and are not simulated.");
    return;
  }

  let launchedRuntime = false;
  let shouldStopRuntime = true;
  let stopping = false;

  const stopRuntime = () => {
    if (!launchedRuntime || stopping) return;
    stopping = true;
    try {
      runScript("runtime:stop:3100");
    } catch (error) {
      console.warn(
        `[phone:acceptance:session] runtime stop warning: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  process.once("SIGINT", () => {
    console.log("\n[phone:acceptance:session] Ctrl+C received; stopping managed runtime.");
    stopRuntime();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    console.log("\n[phone:acceptance:session] SIGTERM received; stopping managed runtime.");
    stopRuntime();
    process.exit(143);
  });

  try {
    runScript("runtime:stop:3100");

    if (skipBuild) {
      console.log("[phone:acceptance:session] skipping desktop runtime build");
    } else {
      runScript("desktop:build-runtime", { env: process.env });
    }

    runScript("runtime:launch:3100");
    launchedRuntime = true;
    runScript("phone:acceptance:guide");

    const shouldCapture = await waitForOperator();
    if (!shouldCapture) {
      shouldStopRuntime = false;
      return;
    }

    runScript("phone:acceptance:capture");
    runScript("phone:acceptance:report");
    runScript("offline:local:report");
    runScript("ops:first-three");
  } finally {
    if (shouldStopRuntime) {
      stopRuntime();
    } else {
      console.log("[phone:acceptance:session] managed runtime is still running on port 3100.");
    }
  }
}

main().catch((error) => {
  console.error(
    `[phone:acceptance:session] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
