#!/usr/bin/env node
/* eslint-disable no-console */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { findLocalAccelerationPython } from "./local-acceleration-python.mjs";

export const INSTALL_CONFIRMATION = "INSTALL_VERIFIED_TURBOVEC_LOCAL_WHEEL";
const MAX_WHEEL_BYTES = 256 * 1024 * 1024;

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function verifyLocalTurboVecWheel({
  wheelPath,
  expectedSha256,
  confirmation,
}) {
  if (confirmation !== INSTALL_CONFIRMATION) {
    throw new Error(`Installation confirmation must equal ${INSTALL_CONFIRMATION}.`);
  }
  const expected = expectedSha256?.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected ?? "")) {
    throw new Error("An exact 64-character SHA-256 checksum is required.");
  }
  const requestedPath = path.resolve(wheelPath?.trim() ?? "");
  if (!requestedPath.toLowerCase().endsWith(".whl")) {
    throw new Error("The reviewed TurboVec artifact must be a local .whl file.");
  }
  if (!/^turbovec[-_].+\.whl$/i.test(path.basename(requestedPath))) {
    throw new Error("The local wheel filename must identify TurboVec.");
  }
  const stat = fs.lstatSync(requestedPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("The reviewed TurboVec wheel must be a regular non-symlink file.");
  }
  if (stat.size <= 0 || stat.size > MAX_WHEEL_BYTES) {
    throw new Error("The reviewed TurboVec wheel size is invalid.");
  }
  const actual = sha256File(requestedPath);
  if (actual !== expected) {
    throw new Error("The reviewed TurboVec wheel checksum does not match.");
  }
  return { wheelPath: requestedPath, sha256: actual, sizeBytes: stat.size };
}

function readFlag(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runChecked(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error("The reviewed local TurboVec installation command failed.");
  }
}

function venvPythonPath(root) {
  return path.join(
    root,
    ".nexus",
    "local-acceleration-venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
}

function main() {
  const root = process.cwd();
  const verified = verifyLocalTurboVecWheel({
    wheelPath: readFlag("wheel"),
    expectedSha256: readFlag("sha256"),
    confirmation: readFlag("confirmation"),
  });
  const python = findLocalAccelerationPython({
    home: os.homedir(),
    root,
  });
  if (!python) {
    throw new Error(
      "No Python 3 runtime found. Set NEXUS_LOCAL_ACCELERATION_PYTHON first.",
    );
  }
  const venvDir = path.join(root, ".nexus", "local-acceleration-venv");
  const venvPython = venvPythonPath(root);
  if (fs.existsSync(venvDir) && fs.lstatSync(venvDir).isSymbolicLink()) {
    throw new Error("The private local acceleration environment cannot be a symlink.");
  }
  if (!fs.existsSync(venvPython)) {
    runChecked(
      python.command,
      [...python.prefix, "-m", "venv", "--system-site-packages", venvDir],
      root,
    );
  }
  runChecked(
    venvPython,
    [
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      "--no-index",
      "--no-deps",
      verified.wheelPath,
    ],
    root,
  );
  runChecked(venvPython, ["-c", "import turbovec"], root);
  console.log(
    "Installed the checksum-verified local TurboVec wheel. Run npm run local:acceleration:acceptance.",
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Local TurboVec installation failed.",
    );
    process.exit(1);
  }
}
