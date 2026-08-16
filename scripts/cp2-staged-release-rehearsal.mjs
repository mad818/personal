#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";
import {
  classifyReleaseTarget,
  sanitizeDiagnosticValue,
} from "./release-diagnostics-capture.mjs";
import { validateRollbackProofArtifact } from "./staging-rollback-proof.mjs";

const root = process.cwd();
const envPath = join(root, ".env.local");
const metricsDir = join(root, "docs", "metrics");
const diagnosticsPath = join(metricsDir, "release-diagnostics-latest.json");
const CHILD_PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const CHILD_PROCESS_MAX_BUFFER_BYTES = 4 * 1024 * 1024;

function loadLocalEnv() {
  if (!existsSync(envPath)) return {};
  return parseEnv(readFileSync(envPath, "utf8"));
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return sanitizeDiagnosticValue(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function runNpm(script, extraEnv = {}, args = []) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) {
    return {
      status: 1,
      stdout: "",
      stderr: "npm runner unavailable; invoke through npm run.",
    };
  }
  return spawnSync(
    process.execPath,
    [npmCli, "run", script, ...(args.length ? ["--", ...args] : [])],
    {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true,
      timeout: CHILD_PROCESS_TIMEOUT_MS,
      killSignal: "SIGTERM",
      maxBuffer: CHILD_PROCESS_MAX_BUFFER_BYTES,
      env: { ...process.env, ...extraEnv },
    },
  );
}

export function createRollbackPosture({
  rollbackArtifact,
  targetId = null,
  diagnosticsIdentity = null,
  diagnostics = null,
  assurance = null,
  knownGood = null,
  protectedActionProof = null,
  evidenceKey = "",
  now = new Date(),
}) {
  const verified = validateRollbackProofArtifact({
    proof: rollbackArtifact,
    knownGood,
    diagnostics,
    assurance,
    protectedActionProof,
    targetId,
    sourceCommit: diagnosticsIdentity?.sourceCommit,
    imageDigest: diagnosticsIdentity?.imageDigest,
    capturedAt: now,
    evidenceKey,
  }).passed;
  if (!verified) {
    return {
      required: true,
      verified: false,
      source: null,
      reason:
        "Diagnostics are not rollback proof; a separate platform rollback proof is required.",
    };
  }
  return {
    required: true,
    verified: true,
    source: "docs/metrics/rollback-proof-latest.json",
    reason:
      "Separate known-good restoration and post-rollback checks are verified.",
  };
}

function writeArtifact(artifact) {
  mkdirSync(metricsDir, { recursive: true });
  const latestPath = join(
    metricsDir,
    "cp2-staged-release-rehearsal-latest.json",
  );
  writeFileSync(
    latestPath,
    `${JSON.stringify(sanitizeDiagnosticValue(artifact), null, 2)}\n`,
    "utf8",
  );
  console.log(`  Wrote ${latestPath.replace(/\\/g, "/")}`);
}

function blockedArtifact({
  message,
  target = null,
  tokenConfigured = false,
  evidenceKeyConfigured = false,
}) {
  return {
    schemaVersion: "nexus-cp2-staged-rehearsal.v1",
    generatedAt: new Date().toISOString(),
    slice: "CP2.1-STAGED-REHEARSAL",
    envLocalPresent: existsSync(envPath),
    target,
    tokenConfigured,
    evidenceKeyConfigured,
    smoke: { attempted: false, passed: false, exitCode: null },
    diagnostics: { attempted: false, passed: false, exitCode: null },
    rollbackProof: createRollbackPosture({ rollbackArtifact: null }),
    blocked: [message],
    remaining: ["Real platform rollback proof remains separate."],
  };
}

function main() {
  const fileEnv = loadLocalEnv();
  const baseUrl =
    process.env.NEXUS_RELEASE_BASE_URL?.trim() ||
    fileEnv.NEXUS_RELEASE_BASE_URL?.trim() ||
    "";
  const token =
    process.env.NEXUS_TOKEN?.trim() || fileEnv.NEXUS_TOKEN?.trim() || "";
  const evidenceKey =
    process.env.NEXUS_EVIDENCE_KEY?.trim() ||
    fileEnv.NEXUS_EVIDENCE_KEY?.trim() ||
    "";

  if (!token) {
    const artifact = blockedArtifact({
      message: "NEXUS_TOKEN is required for staged smoke and diagnostics.",
      tokenConfigured: false,
    });
    writeArtifact(artifact);
    console.error("x cp2-staged-release-rehearsal: NEXUS_TOKEN is missing");
    process.exit(2);
  }
  if (evidenceKey.length < 16) {
    const artifact = blockedArtifact({
      message:
        "NEXUS_EVIDENCE_KEY is required for stable staged target identity.",
      tokenConfigured: true,
      evidenceKeyConfigured: false,
    });
    writeArtifact(artifact);
    console.error(
      "x cp2-staged-release-rehearsal: NEXUS_EVIDENCE_KEY is missing",
    );
    process.exit(2);
  }

  let target;
  try {
    target = classifyReleaseTarget(baseUrl, { evidenceKey });
    if (!target.staged)
      throw new Error("A real HTTPS staged target is required.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid staged target.";
    writeArtifact(
      blockedArtifact({
        message,
        tokenConfigured: Boolean(token),
        evidenceKeyConfigured: evidenceKey.length >= 16,
      }),
    );
    console.error(`x cp2-staged-release-rehearsal: ${message}`);
    process.exit(2);
  }

  console.log("CP2.1 / FD2 staged release rehearsal");
  console.log(`  .env.local present: ${existsSync(envPath) ? "yes" : "no"}`);
  console.log(`  Target: ${target.display}`);
  console.log(`  Target identity: ${target.targetId}`);
  console.log(`  NEXUS_TOKEN configured: ${token ? "yes" : "no"}`);
  console.log("  NEXUS_EVIDENCE_KEY configured: yes");

  const artifact = {
    schemaVersion: "nexus-cp2-staged-rehearsal.v1",
    generatedAt: new Date().toISOString(),
    slice: "CP2.1-STAGED-REHEARSAL",
    envLocalPresent: existsSync(envPath),
    target,
    tokenConfigured: true,
    evidenceKeyConfigured: true,
    smoke: { attempted: false, passed: false, exitCode: null },
    diagnostics: {
      attempted: false,
      passed: false,
      exitCode: null,
      targetIdentityMatches: false,
    },
    rollbackProof: createRollbackPosture({ rollbackArtifact: null }),
    blocked: [],
    remaining: [],
  };
  const env = {
    NEXUS_RELEASE_BASE_URL: baseUrl,
    NEXUS_TOKEN: token,
    NEXUS_EVIDENCE_KEY: evidenceKey,
  };

  console.log("  Running release:smoke …");
  artifact.smoke.attempted = true;
  const smoke = runNpm("release:smoke", env);
  artifact.smoke.exitCode = smoke.status;
  artifact.smoke.passed = smoke.status === 0;
  if (!artifact.smoke.passed) {
    artifact.blocked.push("release:smoke failed against the staged target.");
  }

  console.log("  Running release:diagnostics:capture --require-staged …");
  artifact.diagnostics.attempted = true;
  const diagnostics = runNpm("release:diagnostics:capture", env, [
    "--require-staged",
  ]);
  artifact.diagnostics.exitCode = diagnostics.status;
  const diagnosticsArtifact = readJson(diagnosticsPath);
  artifact.diagnostics.targetIdentityMatches =
    diagnosticsArtifact?.target?.targetId === target.targetId;
  artifact.diagnostics.passed =
    diagnostics.status === 0 &&
    diagnosticsArtifact?.releaseProofReady === true &&
    artifact.diagnostics.targetIdentityMatches;
  if (!artifact.diagnostics.passed) {
    artifact.blocked.push(
      "Release diagnostics did not prove the same HTTPS target and immutable deployment identity.",
    );
  }

  if (!artifact.rollbackProof.verified) {
    artifact.remaining.push(artifact.rollbackProof.reason);
  }
  writeArtifact(artifact);

  if (artifact.blocked.length > 0) {
    console.error(
      `x cp2-staged-release-rehearsal: ${artifact.blocked.join("; ")}`,
    );
    process.exit(1);
  }

  console.log(
    "ok cp2-staged-release-rehearsal (staged smoke and diagnostics passed; rollback proof remains separate)",
  );
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
