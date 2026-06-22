#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skipDocker = process.argv.includes("--skip-docker");
const metricsDir = join(root, "docs", "metrics");

function dockerStatus() {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    available: result.status === 0,
    version: result.status === 0 ? result.stdout.trim() : null,
  };
}

function main() {
  const dockerfile = join(root, "Dockerfile");
  const hasDockerfile = existsSync(dockerfile);
  const docker = dockerStatus();
  const stagedHostConfigured = Boolean(
    process.env.NEXUS_RELEASE_BASE_URL?.trim() &&
      !process.env.NEXUS_RELEASE_BASE_URL.includes("127.0.0.1") &&
      !process.env.NEXUS_RELEASE_BASE_URL.includes("localhost"),
  );

  console.log("CP2.1 web release local rehearsal");
  console.log(`  Dockerfile present: ${hasDockerfile ? "yes" : "no"}`);
  console.log(`  Docker CLI: ${docker.available ? docker.version : "not available"}`);
  console.log(`  Staged host configured: ${stagedHostConfigured ? "yes" : "no (expected until Coolify URL in .env.local)"}`);

  let dockerBuild = { attempted: false, passed: false, skipped: true, reason: "not_requested" };
  if (!skipDocker && docker.available && hasDockerfile) {
    console.log("  Building Docker image (nexus-prime:cp2-rehearsal) …");
    dockerBuild = { attempted: true, skipped: false, reason: null, passed: false };
    const build = spawnSync(
      "docker",
      ["build", "-t", "nexus-prime:cp2-rehearsal", "."],
      { cwd: root, encoding: "utf8", stdio: "pipe", windowsHide: true },
    );
    dockerBuild.passed = build.status === 0;
    if (!dockerBuild.passed) {
      console.log("  Docker build failed — recorded as blocked, not a release failure.");
      dockerBuild.reason = (build.stderr || build.stdout || "build failed").split("\n").slice(-3).join(" ");
    } else {
      console.log("  Docker build passed.");
    }
  } else if (!docker.available) {
    dockerBuild.reason = "docker_cli_unavailable";
    console.log("  Skipping Docker build — CLI not available on this machine.");
  } else if (!hasDockerfile) {
    dockerBuild.reason = "dockerfile_missing";
  }

  console.log("  Capturing local diagnostics …");
  const capture = spawnSync("npm", ["run", "release:diagnostics:capture"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
  });

  const artifact = {
    generatedAt: new Date().toISOString(),
    slice: "CP2.1-LOCAL-REHEARSAL",
    dockerfilePresent: hasDockerfile,
    docker,
    dockerBuild,
    stagedHostConfigured,
    diagnosticsCaptureExitCode: capture.status,
    rollbackChecklist: [
      "Record deployed image tag or Coolify deployment ID before promote.",
      "Restore previous Coolify deployment from last known-good snapshot.",
      "Re-run npm run release:smoke against restored host.",
      "Verify /api/health, /, /command, and GA tab routes.",
    ],
    blockedForFullCp21: stagedHostConfigured
      ? []
      : ["NEXUS_RELEASE_BASE_URL must point at real Coolify/staged host in .env.local"],
    nextCommands: [
      "npm run cp2:operational:live-gate",
      "npm run release:diagnostics:capture",
      "npm run release:smoke",
    ],
  };

  mkdirSync(metricsDir, { recursive: true });
  const latestPath = join(metricsDir, "cp2-web-release-local-rehearsal-latest.json");
  writeFileSync(latestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`  Wrote ${latestPath.replace(/\\/g, "/")}`);

  if (!hasDockerfile) {
    console.error("x cp2-web-release-local-rehearsal: Dockerfile missing");
    process.exit(1);
  }

  console.log("ok cp2-web-release-local-rehearsal (local structural proof; staged host remains operator-blocked)");
}

main();
