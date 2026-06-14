#!/usr/bin/env node
/* eslint-disable no-console */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const npmExecPath = process.env.npm_execpath;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code ?? 1}`));
        return;
      }
      resolve();
    });
  });
}

function runNpm(args) {
  if (!npmExecPath) {
    throw new Error("npm_execpath is unavailable; run this command through npm.");
  }
  return run(process.execPath, [npmExecPath, ...args]);
}

try {
  console.log("build:verified: running the full verification gate");
  await runNpm(["run", "verify"]);
  await run(process.execPath, ["scripts/clean-next.mjs"]);
  console.log("build:verified: building without duplicate Next lint/type checks");
  await run(process.execPath, [nextBin, "build"], {
    ...process.env,
    NEXUS_NEXT_SKIP_BUILD_CHECKS: "1",
  });
  await runNpm(["run", "performance:check"]);
  console.log("build:verified: verification, build, and generated budgets passed");
} catch (error) {
  console.error(
    `build:verified failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
