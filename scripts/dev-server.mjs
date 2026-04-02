#!/usr/bin/env node
/* eslint-disable no-console */
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { createRequire } from "module";

const root = process.cwd();
const nextDir = join(root, ".next");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");
const require = createRequire(import.meta.url);

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("nexus-dev: cleared .next for a fresh runtime");
}

if (existsSync(runtimeIdentityPath)) {
  rmSync(runtimeIdentityPath, { force: true });
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXUS_STARTED_AT: new Date().toISOString(),
    NEXUS_BOOT_ID: process.env.NEXUS_BOOT_ID ?? randomUUID(),
    NEXUS_RUNTIME_IDENTITY_PATH:
      process.env.NEXUS_RUNTIME_IDENTITY_PATH ?? runtimeIdentityPath,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
