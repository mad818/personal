#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";

const root = process.cwd();
const hasToken = Boolean(process.env.NEXUS_TOKEN?.trim());
const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";

async function isServerReachable(url) {
  try {
    const response = await fetch(`${url}/api/health`, {
      signal: AbortSignal.timeout(3000),
      redirect: "manual",
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  const reachable = await isServerReachable(baseUrl);
  console.log("CP2.4 live launch preflight");
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Server reachable: ${reachable ? "yes" : "no"}`);
  console.log(`  NEXUS_TOKEN configured: ${hasToken ? "yes" : "no"}`);

  if (!reachable) {
    console.log("");
    console.log("Start managed runtime first, then rerun:");
    console.log("  npm run runtime:launch:3100");
    console.log("  set NEXUS_TOKEN=... && npm run cp2:local:launch-gate");
    process.exit(0);
  }

  if (!hasToken) {
    console.log("");
    console.log("Server is up but NEXUS_TOKEN is missing — auth E2E will skip.");
    console.log("Export NEXUS_TOKEN and rerun npm run cp2:local:launch-gate");
    process.exit(0);
  }

  const gate = spawnSync("npm", ["run", "cp2:local:launch-gate"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  process.exit(gate.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
