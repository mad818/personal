#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { createRequire } from "module";
import net from "net";

const require = createRequire(import.meta.url);
const root = process.cwd();
const port = Number(process.env.PORT || "3000");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");
const devRuntimeIdentityPath = join(root, ".nexus-dev-runtime.json");
const defaultDistDir = process.env.NEXUS_NEXT_DIST_DIR || ".next";
const cleanNextScript = join(root, "scripts", "clean-next.mjs");
const stageRuntimeAssetsScript = join(root, "scripts", "stage-runtime-assets.mjs");
const nextBin = require.resolve("next/dist/bin/next");

function runNodeScript(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

function isPortReachable(targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port: targetPort,
    });

    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(350);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function resolveBuildDistDir() {
  if (process.env.NEXUS_NEXT_DIST_DIR) {
    return process.env.NEXUS_NEXT_DIST_DIR;
  }

  const runtimeIdentityPresent =
    existsSync(runtimeIdentityPath) || existsSync(devRuntimeIdentityPath);
  if (!runtimeIdentityPresent) {
    return defaultDistDir;
  }

  const portReachable = await isPortReachable(port);
  if (!portReachable) {
    return defaultDistDir;
  }

  console.error(
    `safe-build: active dev runtime detected on 127.0.0.1:${port}. Stop the live dev server before running \`npm run build\`.`,
  );
  process.exit(1);
}

const distDir = await resolveBuildDistDir();
const env = {
  ...process.env,
  NEXUS_NEXT_DIST_DIR: distDir,
};

const cleanExitCode = await runNodeScript([cleanNextScript], env);
if (cleanExitCode !== 0) {
  process.exit(cleanExitCode);
}

const buildExitCode = await runNodeScript([nextBin, "build"], env);
if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

const stageExitCode = await runNodeScript([stageRuntimeAssetsScript], env);
process.exit(stageExitCode);
