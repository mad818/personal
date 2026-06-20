#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  DOCKER_IMAGE_ALLOWLIST,
  FEYNMAN_DOCKER_LIMITS,
  buildDockerFlags,
  formatDockerManifest,
  runDockerExperiment,
  validateDockerImage,
} from "../lib/feynmanDockerExperiments.ts";

// ── validateDockerImage ───────────────────────────────────────────────────────

// Allowlisted images pass
assert.deepEqual(validateDockerImage("python:3.11"), { valid: true });
assert.deepEqual(validateDockerImage("python:3.11-slim"), { valid: true });
assert.deepEqual(validateDockerImage("python:3.9-alpine"), { valid: true });
assert.deepEqual(validateDockerImage("node:20"), { valid: true });
assert.deepEqual(validateDockerImage("node:18-alpine"), { valid: true });
assert.deepEqual(validateDockerImage("pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime"), { valid: true });
assert.deepEqual(validateDockerImage("tensorflow/tensorflow:2.13.0"), { valid: true });
assert.deepEqual(validateDockerImage("tensorflow/tensorflow:2.13.0-gpu"), { valid: true });
assert.deepEqual(validateDockerImage("ghcr.io/astral-sh/uv:0.4.3"), { valid: true });
assert.deepEqual(
  validateDockerImage("jupyter/scipy-notebook:2023-10-20"),
  { valid: true },
);

// Non-allowlisted images rejected
const latestCheck = validateDockerImage("python:latest");
assert.equal(latestCheck.valid, false);

const privateReg = validateDockerImage("myregistry.io/myimage:1.0");
assert.equal(privateReg.valid, false);

const userImage = validateDockerImage("someuser/someimage:tag");
assert.equal(userImage.valid, false);

const emptyImage = validateDockerImage("");
assert.equal(emptyImage.valid, false);

// Characters that indicate injection attempts
const spacedImage = validateDockerImage("python:3.11 --privileged");
assert.equal(spacedImage.valid, false);

// ── buildDockerFlags ──────────────────────────────────────────────────────────
const flags = buildDockerFlags({
  approve: true,
  image: "python:3.11",
  workDir: "/workspace",
  envVars: { MY_VAR: "hello", ANOTHER: "world" },
  timeoutMs: 10_000,
});
assert.ok(flags.includes("--rm"));
assert.ok(flags.includes("--read-only"));
assert.ok(flags.includes("--network=none"));
assert.ok(flags.includes("--security-opt=no-new-privileges"));
assert.ok(flags.includes("--cap-drop=ALL"));
assert.ok(flags.some((f) => f.startsWith("--stop-timeout=")));
assert.ok(flags.includes("--workdir=/workspace"));
assert.ok(flags.includes("--env=MY_VAR=hello"));
assert.ok(flags.includes("--env=ANOTHER=world"));

// No --privileged ever
assert.ok(!flags.some((f) => f.includes("privileged")));

// Invalid env var names filtered out
const flagsWithBadEnv = buildDockerFlags({
  approve: true,
  image: "python:3.11",
  envVars: { "bad-key": "val", GOOD_KEY: "ok" },
});
assert.ok(!flagsWithBadEnv.some((f) => f.includes("bad-key")));
assert.ok(flagsWithBadEnv.includes("--env=GOOD_KEY=ok"));

// Timeout clamped
const flagsBig = buildDockerFlags({
  approve: true,
  image: "python:3.11",
  timeoutMs: FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs + 999_999,
});
const stopTimeout = flagsBig.find((f) => f.startsWith("--stop-timeout="));
assert.ok(stopTimeout !== undefined);
const parsedTimeout = parseInt((stopTimeout ?? "=0").split("=")[1], 10) * 1000;
assert.ok(parsedTimeout <= FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs);

// ── FEYNMAN_DOCKER_LIMITS exported ───────────────────────────────────────────
assert.ok(FEYNMAN_DOCKER_LIMITS.defaultTimeoutMs > 0);
assert.ok(FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs > FEYNMAN_DOCKER_LIMITS.defaultTimeoutMs);
assert.ok(FEYNMAN_DOCKER_LIMITS.maximumOutputBytes > 0);

// ── DOCKER_IMAGE_ALLOWLIST exported ──────────────────────────────────────────
assert.ok(Array.isArray(DOCKER_IMAGE_ALLOWLIST));
assert.ok(DOCKER_IMAGE_ALLOWLIST.length >= 5);

// ── runDockerExperiment — blocked without approve ─────────────────────────────
const blockedResult = await runDockerExperiment({
  approve: false,
  image: "python:3.11",
  command: ["python", "-c", "print('hello')"],
});
assert.equal(blockedResult.approved, false);
assert.equal(blockedResult.dryRun, true);
assert.ok(blockedResult.error?.includes("approve"));
assert.equal(blockedResult.exitCode, null);

// ── runDockerExperiment — blocked on invalid image even if approved ───────────
const badImageResult = await runDockerExperiment({
  approve: true,
  image: "evil/image:latest",
  command: ["sh"],
});
assert.equal(badImageResult.approved, false);
assert.equal(badImageResult.dryRun, true);
assert.ok(badImageResult.error?.includes("Blocked"));

// ── runDockerExperiment — dry-run when env var missing ───────────────────────
const dryRunResult = await runDockerExperiment(
  {
    approve: true,
    image: "python:3.11",
    command: ["python", "--version"],
  },
  {
    getEnv: (_k) => undefined,
    spawnImpl: async () => ({ exitCode: 0, stdout: "should not run", stderr: "" }),
  },
);
assert.equal(dryRunResult.dryRun, true);
assert.equal(dryRunResult.stdout, "");
assert.ok(dryRunResult.error?.includes("NEXUS_FEYNMAN_DOCKER_APPROVED"));

// ── runDockerExperiment — fixture mode (both gates open) ─────────────────────
const FIXTURE_STDOUT = "Python 3.11.5";
const fixtureResult = await runDockerExperiment(
  {
    approve: true,
    image: "python:3.11",
    command: ["python", "--version"],
    timeoutMs: 5_000,
  },
  {
    getEnv: (k) => (k === "NEXUS_FEYNMAN_DOCKER_APPROVED" ? "1" : undefined),
    spawnImpl: async (_image, _cmd, _flags, _opts) => ({
      exitCode: 0,
      stdout: FIXTURE_STDOUT,
      stderr: "",
    }),
  },
);
assert.equal(fixtureResult.approved, true);
assert.equal(fixtureResult.dryRun, false);
assert.equal(fixtureResult.exitCode, 0);
assert.equal(fixtureResult.stdout, FIXTURE_STDOUT);
assert.equal(fixtureResult.truncated, false);
assert.ok(fixtureResult.durationMs >= 0);
// Flags always include safety flags
assert.ok(fixtureResult.flags.includes("--read-only"));
assert.ok(fixtureResult.flags.includes("--network=none"));

// ── runDockerExperiment — spawn receives correct args ─────────────────────────
let capturedImage = "";
let capturedCommand = [];
let capturedFlags = [];
let capturedTimeoutMs = 0;
await runDockerExperiment(
  {
    approve: true,
    image: "node:20",
    command: ["node", "-e", "console.log('test')"],
    timeoutMs: 15_000,
  },
  {
    getEnv: (k) => (k === "NEXUS_FEYNMAN_DOCKER_APPROVED" ? "1" : undefined),
    spawnImpl: async (img, cmd, flgs, opts) => {
      capturedImage = img;
      capturedCommand = cmd;
      capturedFlags = flgs;
      capturedTimeoutMs = opts.timeoutMs;
      return { exitCode: 0, stdout: "", stderr: "" };
    },
  },
);
assert.equal(capturedImage, "node:20");
assert.deepEqual(capturedCommand, ["node", "-e", "console.log('test')"]);
assert.ok(capturedFlags.includes("--rm"));
assert.ok(capturedTimeoutMs <= FEYNMAN_DOCKER_LIMITS.maximumTimeoutMs);

// ── output truncation ─────────────────────────────────────────────────────────
const bigOutput = "y".repeat(FEYNMAN_DOCKER_LIMITS.maximumOutputBytes + 10_000);
const truncResult = await runDockerExperiment(
  {
    approve: true,
    image: "python:3.11",
  },
  {
    getEnv: (k) => (k === "NEXUS_FEYNMAN_DOCKER_APPROVED" ? "1" : undefined),
    spawnImpl: async () => ({ exitCode: 0, stdout: bigOutput, stderr: "" }),
  },
);
assert.equal(truncResult.truncated, true);
assert.ok(
  Buffer.byteLength(truncResult.stdout, "utf-8") <=
    FEYNMAN_DOCKER_LIMITS.maximumOutputBytes + 200,
);

// ── formatDockerManifest ──────────────────────────────────────────────────────
const formatted = formatDockerManifest(fixtureResult);
assert.ok(formatted.includes("Feynman Docker experiment manifest"));
assert.ok(formatted.includes("python:3.11"));
assert.ok(formatted.includes("Approved: true"));
assert.ok(formatted.includes("Dry-run: false"));
assert.ok(formatted.includes(FIXTURE_STDOUT));

const blockedFormatted = formatDockerManifest(blockedResult);
assert.ok(blockedFormatted.includes("Approved: false"));
assert.ok(blockedFormatted.includes("Dry-run: true"));
assert.ok(blockedFormatted.includes("approve"));

console.log("ok feynman-docker-experiments (image allowlist, approve gate, env gate, fixture spawn, safety flags, output truncation, format)");
