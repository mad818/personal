#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv, parse as parseEnv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { initializeSecureToken } from "./secure-runtime-gate.mjs";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3100";
const metricsDir = join(root, "docs", "metrics");
const skipStop = process.argv.includes("--no-stop");

function runNpm(script, extraEnv = {}) {
  return spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
    env: { ...process.env, ...extraEnv },
  });
}

function readTokenFromEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return "";
  return parseEnv(readFileSync(envPath, "utf8")).NEXUS_TOKEN?.trim() ?? "";
}

async function waitForHealth(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(3000),
        redirect: "manual",
      });
      if (response.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

async function main() {
  console.log("CP2.4 operational live gate");
  const tokenInit = initializeSecureToken(".env.local");
  if (tokenInit.changed) {
    console.log(`  Initialized NEXUS_TOKEN (${tokenInit.reason})`);
  }
  loadEnv({ path: ".env.local", override: true });
  const token = process.env.NEXUS_TOKEN?.trim() || readTokenFromEnvLocal();
  if (!token) {
    console.error("x cp2-operational-live-gate: NEXUS_TOKEN missing after secure init");
    process.exit(1);
  }

  console.log("  Launching managed runtime on :3100 …");
  const launch = runNpm("runtime:launch:3100");
  if (launch.status !== 0) {
    console.error(launch.stdout);
    console.error(launch.stderr);
    console.error("x cp2-operational-live-gate: runtime launch failed");
    process.exit(1);
  }

  const healthy = await waitForHealth(baseUrl);
  if (!healthy) {
    if (!skipStop) runNpm("runtime:stop:3100");
    console.error("x cp2-operational-live-gate: runtime never became healthy");
    process.exit(1);
  }

  console.log("  Running cp2:local:launch-gate …");
  const gate = runNpm("cp2:local:launch-gate", {
    NEXUS_RELEASE_BASE_URL: baseUrl,
    NEXUS_TOKEN: token,
  });

  const gateStdout = gate.stdout ?? "";
  const gateStderr = gate.stderr ?? "";
  process.stdout.write(gateStdout);
  process.stderr.write(gateStderr);

  if (!skipStop) {
    console.log("  Stopping managed runtime …");
    runNpm("runtime:stop:3100");
  }

  const passed =
    gate.status === 0 &&
    (gateStdout + gateStderr).includes("Outcome: target_checks_passed");
  const artifact = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    tokenConfigured: true,
    launchExitCode: launch.status,
    gateExitCode: gate.status,
    passed,
    tokenInitReason: tokenInit.reason,
  };
  mkdirSync(metricsDir, { recursive: true });
  const artifactPath = join(metricsDir, "cp2-operational-live-gate-latest.json");
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`  Wrote ${artifactPath.replace(/\\/g, "/")}`);

  if (!passed || gate.status !== 0) {
    console.error("x cp2-operational-live-gate: launch gate did not pass cleanly");
    process.exit(gate.status || 1);
  }
  console.log("ok cp2-operational-live-gate");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
