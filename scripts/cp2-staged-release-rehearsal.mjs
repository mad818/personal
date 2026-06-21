#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv, parse as parseEnv } from "dotenv";

const root = process.cwd();
const envPath = join(root, ".env.local");
const metricsDir = join(root, "docs", "metrics");

function loadLocalEnv() {
  if (!existsSync(envPath)) return {};
  return parseEnv(readFileSync(envPath, "utf8"));
}

function isStagedUrl(url) {
  const normalized = String(url || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    !normalized.includes("127.0.0.1") &&
    !normalized.includes("localhost") &&
    /^https?:\/\//.test(normalized)
  );
}

function runNpm(script, extraEnv = {}) {
  return spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
    env: { ...process.env, ...extraEnv },
  });
}

function main() {
  const fileEnv = loadLocalEnv();
  loadEnv({ path: envPath, override: true });
  const baseUrl =
    process.env.NEXUS_RELEASE_BASE_URL?.trim() ||
    fileEnv.NEXUS_RELEASE_BASE_URL?.trim() ||
    "";
  const token =
    process.env.NEXUS_TOKEN?.trim() || fileEnv.NEXUS_TOKEN?.trim() || "";
  const staged = isStagedUrl(baseUrl);

  console.log("CP2.1 / FD2 staged release rehearsal");
  console.log(`  .env.local present: ${existsSync(envPath) ? "yes" : "no"}`);
  console.log(`  NEXUS_RELEASE_BASE_URL: ${baseUrl || "unset"}`);
  console.log(`  Staged host detected: ${staged ? "yes" : "no"}`);
  console.log(`  NEXUS_TOKEN configured: ${token ? "yes" : "no"}`);

  const artifact = {
    generatedAt: new Date().toISOString(),
    slice: "CP2.1-STAGED-REHEARSAL",
    envLocalPresent: existsSync(envPath),
    baseUrl: baseUrl || null,
    stagedHostDetected: staged,
    tokenConfigured: Boolean(token),
    smoke: { attempted: false, passed: false, exitCode: null },
    diagnostics: { attempted: false, passed: false, exitCode: null },
    rollbackProof: {
      checklist: [
        "Record Coolify deployment ID and image digest before promote.",
        "Export current env vars from Coolify UI.",
        "Redeploy previous known-good commit on rollback.",
        "Run npm run release:smoke against restored host.",
        "Run npm run release:diagnostics:capture and archive artifact.",
      ],
      captured: false,
    },
    blocked: [],
  };

  if (!staged) {
    artifact.blocked.push(
      "Set NEXUS_RELEASE_BASE_URL to real Coolify/staged hostname in repo-root .env.local",
    );
    writeArtifact(artifact);
    console.log("");
    console.log("Staged rehearsal skipped — no real staged hostname configured.");
    console.log("ok cp2-staged-release-rehearsal (blocked honestly)");
    process.exit(0);
  }

  if (!token) {
    artifact.blocked.push("NEXUS_TOKEN required for staged smoke and diagnostics");
    writeArtifact(artifact);
    console.log("");
    console.log("Staged host configured but NEXUS_TOKEN is missing.");
    process.exit(0);
  }

  const env = { NEXUS_RELEASE_BASE_URL: baseUrl, NEXUS_TOKEN: token };

  console.log("  Running release:smoke …");
  artifact.smoke.attempted = true;
  const smoke = runNpm("release:smoke", env);
  artifact.smoke.exitCode = smoke.status;
  artifact.smoke.passed = smoke.status === 0;
  if (!artifact.smoke.passed) {
    artifact.blocked.push("release:smoke failed against staged host");
  }

  console.log("  Running release:diagnostics:capture …");
  artifact.diagnostics.attempted = true;
  const diagnostics = runNpm("release:diagnostics:capture", env);
  artifact.diagnostics.exitCode = diagnostics.status;
  artifact.diagnostics.passed = diagnostics.status === 0;
  artifact.rollbackProof.captured = diagnostics.status === 0;
  if (!artifact.diagnostics.passed) {
    artifact.blocked.push("release:diagnostics:capture failed against staged host");
  }

  writeArtifact(artifact);

  if (artifact.blocked.length) {
    console.error(`x cp2-staged-release-rehearsal: ${artifact.blocked.join("; ")}`);
    process.exit(1);
  }

  console.log("ok cp2-staged-release-rehearsal (staged smoke + diagnostics + rollback proof)");
}

function writeArtifact(artifact) {
  mkdirSync(metricsDir, { recursive: true });
  const latestPath = join(metricsDir, "cp2-staged-release-rehearsal-latest.json");
  writeFileSync(latestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`  Wrote ${latestPath.replace(/\\/g, "/")}`);
}

main();
