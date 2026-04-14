#!/usr/bin/env node
/* eslint-disable no-console */
import { existsSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { createRequire } from "module";

const root = process.cwd();
const nextDir = join(root, ".next");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");
const devRuntimeIdentityPath = join(root, ".nexus-dev-runtime.json");
const require = createRequire(import.meta.url);
const cleanupRetryOptions = {
  force: true,
  maxRetries: 5,
  retryDelay: 200,
};

function clearPath(targetPath, label, options = {}) {
  if (!existsSync(targetPath)) return;
  try {
    rmSync(targetPath, { ...cleanupRetryOptions, ...options });
    console.log(`nexus-dev: cleared ${label} for a fresh runtime`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `nexus-dev: could not clear ${label}; continuing with the existing runtime cache (${message})`,
    );
  }
}

clearPath(nextDir, ".next", { recursive: true });
clearPath(runtimeIdentityPath, ".nexus-runtime-identity.json");
clearPath(devRuntimeIdentityPath, ".nexus-dev-runtime.json");

const nextBin = require.resolve("next/dist/bin/next");
const startedAt = new Date().toISOString();
const bootId = process.env.NEXUS_BOOT_ID ?? randomUUID();
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXUS_STARTED_AT: startedAt,
    NEXUS_BOOT_ID: bootId,
    NEXUS_RUNTIME_IDENTITY_PATH:
      process.env.NEXUS_RUNTIME_IDENTITY_PATH ?? runtimeIdentityPath,
  },
});

try {
  writeFileSync(
    devRuntimeIdentityPath,
    JSON.stringify({
      bootId,
      startedAt,
      pid: process.pid,
      childPid: child.pid ?? null,
      port: process.env.PORT ?? "3000",
    }),
    "utf-8",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `nexus-dev: could not persist .nexus-dev-runtime.json; continuing without the dev runtime marker (${message})`,
  );
}

child.on("exit", (code, signal) => {
  clearPath(devRuntimeIdentityPath, ".nexus-dev-runtime.json");
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
