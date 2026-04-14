#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

loadEnv({ path: ".env.local" });

const port = process.env.NEXUS_FRESH_RUNTIME_PORT ?? "3200";
const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? `http://127.0.0.1:${port}`;
const distDir = process.env.NEXUS_NEXT_DIST_DIR ?? ".next-fresh-runtime";

function fail(message) {
  console.error(`❌ fresh-runtime-proof: ${message}`);
  process.exit(1);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 180_000) {
  const started = Date.now();
  let lastError = "unknown";
  let stableBootId = null;
  let stableHits = 0;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json().catch(() => ({}));
        const bootId = payload?.runtime?.bootId ?? "unknown";

        if (bootId === stableBootId) {
          stableHits += 1;
        } else {
          stableBootId = bootId;
          stableHits = 1;
        }

        if (stableHits >= 2) {
          return payload;
        }

        lastError = `warming boot ${bootId}`;
      } else {
        stableHits = 0;
        stableBootId = null;
        lastError = `status ${response.status}`;
      }
    } catch (error) {
      stableHits = 0;
      stableBootId = null;
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(1000);
  }

  fail(`server never became healthy on ${baseUrl} (${lastError})`);
}

async function runNodeScript(scriptPath, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${scriptPath} exited with code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}

async function runCommand(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}

async function stopRuntimeServer(child) {
  if (!child?.pid) return;

  await new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    child.once("exit", finish);
    child.once("error", finish);

    try {
      child.kill();
    } catch {
      finish();
      return;
    }

    setTimeout(() => {
      if (settled) return;

      const killer =
        process.platform === "win32"
          ? spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
              stdio: "ignore",
            })
          : spawn("kill", ["-KILL", String(child.pid)], { stdio: "ignore" });
      killer.on("exit", finish);
      killer.on("error", finish);
    }, 2500);
  });
}

async function main() {
  console.log(`fresh-runtime-proof building isolated runtime for ${baseUrl}`);

  await runNodeScript("scripts/build-runtime.mjs", {
    PORT: port,
    NEXUS_NEXT_DIST_DIR: distDir,
  });
  console.log(`fresh-runtime-proof booting isolated production runtime on ${baseUrl}`);

  const runtimeServer = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: port,
      NEXUS_NEXT_DIST_DIR: distDir,
      NEXUS_BOOT_ID: randomUUID(),
      NEXUS_STARTED_AT: new Date().toISOString(),
    },
  });

  try {
    const health = await waitForHealth();
    const bootId = health?.runtime?.bootId ?? "unknown";
    console.log(`✅ fresh runtime online (${bootId})`);

    const childEnv = {
      NEXUS_RELEASE_BASE_URL: baseUrl,
      NEXUS_FRESH_RUNTIME_PORT: port,
    };

    await runNodeScript("scripts/runtime-consistency.mjs", childEnv);
    await runNodeScript("scripts/auth-regression.mjs", childEnv);
    await runNodeScript("scripts/route-integrity.mjs", childEnv);
    await runNodeScript("scripts/release-smoke.mjs", childEnv);
    await runNodeScript("scripts/runtime-consistency.mjs", childEnv);

    console.log("✅ fresh-runtime-proof passed");
  } finally {
    await stopRuntimeServer(runtimeServer);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
