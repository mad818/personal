#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

loadEnv({ path: ".env.local" });

const root = process.cwd();
const nextDistDir = process.env.NEXUS_NEXT_DIST_DIR ?? ".next";
const standaloneServer = join(root, nextDistDir, "standalone", "server.js");
const standaloneRoot = join(root, nextDistDir, "standalone");
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const buildIdPath = join(root, nextDistDir, "BUILD_ID");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");

function syncRuntimeAsset(relativeSource, relativeTarget = relativeSource) {
  const source = join(root, relativeSource);
  const target = join(standaloneRoot, relativeTarget);

  if (!existsSync(source)) {
    return;
  }

  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
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

const useStandalone = existsSync(standaloneServer);
const fallbackMode = existsSync(buildIdPath) ? "start" : "dev";
if (useStandalone) {
  // Next standalone output excludes static and public assets, so mirror them
  // into the runtime folder before booting the local production server.
  syncRuntimeAsset("public");
  syncRuntimeAsset(join(nextDistDir, "static"), join(".next", "static"));
} else if (!existsSync(nextCli)) {
  console.error(
    "[runtime] Missing .next/standalone/server.js and local Next CLI. Run `npm install` and `npm run build` first.",
  );
  process.exit(1);
}

console.log(
  useStandalone
    ? `[runtime] starting standalone server on http://${env.HOSTNAME}:${env.PORT}`
    : `[runtime] standalone server missing; falling back to next ${fallbackMode} on http://${env.HOSTNAME}:${env.PORT}`,
);

const child = spawn(
  process.execPath,
  useStandalone
    ? [standaloneServer]
    : [nextCli, fallbackMode, "-H", env.HOSTNAME, "-p", env.PORT],
  {
    cwd: useStandalone ? standaloneRoot : root,
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
