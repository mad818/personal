#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { createRequire } from "module";

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

async function runStandaloneRuntime() {
  Object.assign(process.env, env);
  process.chdir(standaloneRoot);

  const require = createRequire(import.meta.url);
  require(standaloneServer);

  const keepAliveInterval = setInterval(() => undefined, 60_000);
  process.once("exit", () => clearInterval(keepAliveInterval));
  await new Promise(() => undefined);
}

function runFallbackRuntime() {
  const child = spawn(
    process.execPath,
    [nextCli, fallbackMode, "-H", env.HOSTNAME, "-p", env.PORT],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );

  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  const onSigint = () => forwardSignal("SIGINT");
  const onSigterm = () => forwardSignal("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  child.on("exit", (code, signal) => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    if (signal) {
      process.exitCode = signal === "SIGINT" ? 130 : 143;
      return;
    }
    process.exit(code ?? 0);
  });
}

if (useStandalone) {
  await runStandaloneRuntime();
} else {
  runFallbackRuntime();
}
