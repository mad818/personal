#!/usr/bin/env node
/* eslint-disable no-console */
import { spawn } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const port = process.env.FEYNMAN_SMOKE_PORT ?? "3104";
const baseUrl = `http://127.0.0.1:${port}`;
const token = process.env.NEXUS_TOKEN ?? "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
      });
      if (response.ok) return response.status;
    } catch {
      // wait for the production runtime
    }
    await sleep(500);
  }
  throw new Error("Feynman smoke runtime did not become healthy.");
}

async function waitForExit(child, timeoutMs = 10_000) {
  if (child.exitCode !== null) return;
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(timeoutMs).then(() => {
      throw new Error("Feynman smoke runtime did not stop cleanly.");
    }),
  ]);
}

async function main() {
  if (!token) {
    throw new Error("Feynman smoke requires the existing local NEXUS_TOKEN.");
  }

  const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: port,
      NEXUS_NETWORK_MODE: "isolated",
      NEXUS_ALLOW_PAID_APIS: "false",
      NEXUS_ENABLE_HIGH_RISK_TOOLS: "false",
    },
    stdio: "ignore",
  });

  try {
    const healthStatus = await waitForHealth();
    const headers = {
      "content-type": "application/json",
      "x-nexus-internal-auth": token,
    };
    const pages = await fetch(`${baseUrl}/api/memory/pages?limit=2`, {
      headers,
      cache: "no-store",
    });
    const outputs = await fetch(`${baseUrl}/api/tools`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tool: "feynman_outputs", input: {} }),
    });
    const research = await fetch(`${baseUrl}/api/tools`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tool: "feynman_research",
        input: { workflow: "audit", topic: "runtime smoke fixture" },
      }),
    });
    const outputsPayload = await outputs.json().catch(() => ({}));

    if (
      healthStatus !== 200 ||
      pages.status !== 200 ||
      outputs.status !== 200 ||
      typeof outputsPayload.result !== "string" ||
      research.status !== 403
    ) {
      throw new Error(
        `Unexpected smoke posture: health=${healthStatus} pages=${pages.status} outputs=${outputs.status} research=${research.status}`,
      );
    }

    console.log(
      `ok feynman-smoke (health=${healthStatus}, memory-pages=${pages.status}, outputs=${outputs.status}, isolated-research-guard=${research.status})`,
    );
  } finally {
    child.kill("SIGTERM");
    await waitForExit(child);
  }
}

main().catch((error) => {
  console.error(
    `x feynman-smoke: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
