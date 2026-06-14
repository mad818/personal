#!/usr/bin/env node
/* eslint-disable no-console */
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { findLocalAccelerationPython } from "./local-acceleration-python.mjs";

const root = process.cwd();
const python = findLocalAccelerationPython({
  home: os.homedir(),
  root,
});

if (!python) {
  console.error(
    "No Python 3 runtime found. Set NEXUS_LOCAL_ACCELERATION_PYTHON or create .nexus/local-acceleration-venv.",
  );
  process.exit(1);
}

const checkOnly = process.argv.includes("--check");
const target = path.join(
  root,
  "scripts",
  checkOnly
    ? "check-local-acceleration-service.py"
    : "local-acceleration-service.py",
);
const commandArgs = [...python.prefix, target];

if (checkOnly) {
  const result = spawnSync(python.command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  process.exit(result.status ?? 1);
}

const child = spawn(python.command, commandArgs, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 1));
