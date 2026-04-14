#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { config as loadDotenv } from "dotenv";

const root = process.cwd();
const DEFAULT_NEXT_DIST_DIR = ".next";
const SAFE_BUILD_DIST_DIR = ".next-build";
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");
const stageRuntimeAssetsScript = join(root, "scripts", "stage-runtime-assets.mjs");

loadDotenv({ path: join(root, ".env.local"), override: false });

function resolveNextDistDir() {
  if (process.env.NEXUS_NEXT_DIST_DIR) {
    return process.env.NEXUS_NEXT_DIST_DIR;
  }

  const defaultStandalone = join(
    root,
    DEFAULT_NEXT_DIST_DIR,
    "standalone",
    "server.js",
  );
  if (existsSync(defaultStandalone)) {
    return DEFAULT_NEXT_DIST_DIR;
  }

  const isolatedStandalone = join(
    root,
    SAFE_BUILD_DIST_DIR,
    "standalone",
    "server.js",
  );
  if (existsSync(isolatedStandalone)) {
    console.log(
      `[runtime] using ${SAFE_BUILD_DIST_DIR} because the last safe build was isolated from a live dev runtime`,
    );
    return SAFE_BUILD_DIST_DIR;
  }

  return DEFAULT_NEXT_DIST_DIR;
}

const nextDistDir = resolveNextDistDir();
const standaloneServer = join(root, nextDistDir, "standalone", "server.js");

if (!existsSync(standaloneServer)) {
  console.error(
    "[runtime] Missing standalone build output. Run `npm run build` first.",
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

const stageAssets = spawn(process.execPath, [stageRuntimeAssetsScript], {
  cwd: root,
  env: {
    ...env,
    NEXUS_NEXT_DIST_DIR: nextDistDir,
  },
  stdio: "inherit",
});

stageAssets.on("error", (error) => {
  console.error(`[runtime] failed to stage static assets: ${error.message}`);
  process.exit(1);
});

stageAssets.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  if (code !== 0) {
    process.exit(code ?? 1);
    return;
  }

  console.log(
    `[runtime] starting standalone server on http://${env.HOSTNAME}:${env.PORT}`,
  );

  const child = spawn(process.execPath, [standaloneServer], {
    cwd: join(root, nextDistDir, "standalone"),
    env,
    stdio: "inherit",
  });

  child.on("exit", (childCode, childSignal) => {
    if (childSignal) {
      process.kill(process.pid, childSignal);
      return;
    }
    process.exit(childCode ?? 0);
  });
});
