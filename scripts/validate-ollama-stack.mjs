#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const metricsDir = join(repoRoot, "docs", "metrics");

function fail(message) {
  console.error(`❌ ollama-stack: ${message}`);
  process.exit(1);
}

const list = spawnSync("ollama", ["list"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (list.status !== 0) {
  console.warn(
    "⚠️  ollama-stack: `ollama list` unavailable — skipping live model proof.",
  );
  process.exit(0);
}

const output = list.stdout || "";
const models = output
  .split("\n")
  .slice(1)
  .map((line) => line.trim().split(/\s+/)[0])
  .filter(Boolean);

const embedInstalled = models.some((name) => name.includes("nomic-embed"));
const chatInstalled = models.length > 0;

if (!chatInstalled) {
  fail("no Ollama models installed — run `ollama pull qwen3:8b`.");
}

try {
  mkdirSync(metricsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    join(metricsDir, `ollama-stack-${stamp}.json`),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        modelCount: models.length,
        models: models.slice(0, 32),
        embedInstalled,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
} catch {
  // metrics write is optional
}

console.log(
  `✅ ollama-stack: ${models.length} model(s) installed${embedInstalled ? "; embed model present" : "; optional nomic-embed-text not detected"}.`,
);
