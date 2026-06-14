#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import path from "node:path";
import {
  findLocalAccelerationPython,
  localAccelerationPythonCandidates,
} from "./local-acceleration-python.mjs";

const root = path.resolve("C:\\workspace");
const home = path.resolve("C:\\Users\\operator");
const configured = path.resolve("C:\\reviewed\\python.exe");
const candidates = localAccelerationPythonCandidates({
  env: { NEXUS_LOCAL_ACCELERATION_PYTHON: configured },
  platform: "win32",
  home,
  root,
});
assert.equal(candidates[0].command, configured);
assert.ok(
  candidates.some((candidate) =>
    candidate.command.endsWith(
      path.join(
        ".nexus",
        "local-acceleration-venv",
        "Scripts",
        "python.exe",
      ),
    ),
  ),
);
assert.ok(candidates.some((candidate) => candidate.command === "py"));

const resolved = findLocalAccelerationPython({
  env: { NEXUS_LOCAL_ACCELERATION_PYTHON: configured },
  platform: "win32",
  home,
  root,
  existsSync: (candidate) => candidate === configured,
  run: (command) => ({ ok: command === configured }),
});
assert.equal(resolved?.command, configured);

console.log("ok local-acceleration-launcher (configured, venv, platform candidates)");
