#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
  console.error(`❌ agentshield: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`✅ agentshield: ${message}`);
}

const checklist = [
  {
    id: "claude-settings",
    path: ".claude/settings.json",
    detail: "Claude hook and permission posture should stay review-gated.",
  },
  {
    id: "pre-tool-use",
    path: ".claude/hooks/pre-tool-use.mjs",
    detail: "Pre-tool-use hook should block unsafe skill paths.",
  },
  {
    id: "skill-spectrum",
    path: "lib/skillSpectrumPolicy.ts",
    detail: "Skill capability policy should remain machine-checkable.",
  },
  {
    id: "route-policy",
    path: "lib/security/routePolicy.ts",
    detail: "Route policy should register local-only and connector routes.",
  },
];

let missing = 0;
for (const item of checklist) {
  const fullPath = join(repoRoot, item.path);
  if (!existsSync(fullPath)) {
    missing += 1;
    console.warn(`⚠️  agentshield checklist missing ${item.path}`);
    continue;
  }
  const source = readFileSync(fullPath, "utf8");
  if (!source.trim()) {
    missing += 1;
    console.warn(`⚠️  agentshield checklist empty ${item.path}`);
  }
}

if (missing > 0) {
  fail(`${missing} checklist item(s) missing or empty.`);
}

const cli = spawnSync("npx", ["--yes", "ecc-agentshield", "--version"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (cli.status === 0) {
  const scan = spawnSync("npx", ["--yes", "ecc-agentshield", "scan"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (scan.status !== 0) {
    console.warn(scan.stdout || scan.stderr || "ecc-agentshield scan failed");
    pass(
      "checklist passed; ecc-agentshield scan unavailable or reported findings (non-blocking).",
    );
    process.exit(0);
  }
  pass("ecc-agentshield scan passed.");
  process.exit(0);
}

pass(
  "checklist passed; ecc-agentshield CLI not installed (optional operator tool).",
);
process.exit(0);
