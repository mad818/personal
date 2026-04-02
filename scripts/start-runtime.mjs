#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

const root = process.cwd();
const nextDistDir = process.env.NEXUS_NEXT_DIST_DIR ?? ".next";
const standaloneServer = join(root, nextDistDir, "standalone", "server.js");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");

if (!existsSync(standaloneServer)) {
  console.error(
    "[runtime] Missing .next/standalone/server.js. Run `npm run build` first.",
  );
  process.exit(1);
}

if (existsSync(runtimeIdentityPath)) {
  rmSync(runtimeIdentityPath, { force: true });
}

const env = {
  ...process.env,
  HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1",
  PORT: process.env.PORT ?? "3000",
  NEXUS_STARTED_AT: process.env.NEXUS_STARTED_AT ?? new Date().toISOString(),
  NEXUS_BOOT_ID: process.env.NEXUS_BOOT_ID ?? randomUUID(),
  NEXUS_RUNTIME_IDENTITY_PATH:
    process.env.NEXUS_RUNTIME_IDENTITY_PATH ?? runtimeIdentityPath,
};

console.log(
  `[runtime] starting standalone server on http://${env.HOSTNAME}:${env.PORT}`,
);

const child = spawn(process.execPath, [standaloneServer], {
  cwd: join(root, nextDistDir, "standalone"),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
