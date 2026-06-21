#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const sourcePath = path.join(
  repoRoot,
  "assets",
  "arpg",
  "illustrated",
  "generated-source",
  "prologue-hifi-story-pack.png",
);
const runtimePath = path.join(
  repoRoot,
  "public",
  "arpg",
  "illustrated",
  "prologue-hifi-story-pack.png",
);
const templatePath = path.join(
  repoRoot,
  "docs",
  "game",
  "aether-reliquary",
  "promotion-templates",
  "prologue-hifi-story-pack.json",
);
const metricsDir = path.join(repoRoot, "docs", "metrics");
const metricsOutputPath = path.join(metricsDir, "prologue-hifi-promotion-template-latest.json");

function runNpm(script) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
  });
  if (result.status !== 0) {
    console.error(result.stdout || result.stderr || `npm run ${script} failed`);
    process.exit(result.status ?? 1);
  }
}

if (args.has("--check")) {
  runNpm("arpg:prologue-hifi:promote:check");
  process.exit(0);
}

if (!fs.existsSync(sourcePath)) {
  console.error(
    [
      "Prologue hifi promotion blocked: source sheet missing.",
      `Place operator-approved art at assets/arpg/illustrated/generated-source/prologue-hifi-story-pack.png`,
      "Prompt contract: docs/game/aether-reliquary/generation-records/next-prologue-hifi-story-pack.md",
      "Structural wiring only: npm run arpg:prologue-hifi:promote:check",
    ].join("\n"),
  );
  process.exit(1);
}

runNpm("arpg:prologue-hifi:generate");

if (!fs.existsSync(runtimePath)) {
  console.error(`Expected runtime output at public/arpg/illustrated/prologue-hifi-story-pack.png`);
  process.exit(1);
}

const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
const promotionArtifact = {
  generatedAt: new Date().toISOString(),
  batchId: template.batchId,
  runtimePath: "public/arpg/illustrated/prologue-hifi-story-pack.png",
  sourcePath: "assets/arpg/illustrated/generated-source/prologue-hifi-story-pack.png",
  manifestEntry: template.manifestEntry,
  benchBatch: template.benchBatch,
  nextSteps: [
    "Review the runtime sheet and update next-prologue-hifi-story-pack.md with operator approval date/tool.",
    "Merge manifestEntry into lib/arpgAssetManifestData.json.",
    "Merge benchBatch into lib/arpgIllustratedAssetBenchContent.json batches.",
    "Run npm run arpg:assets:check && npm run arpg:visual-replacement-runtime:check && npm run hq:e2e",
  ],
};

fs.mkdirSync(metricsDir, { recursive: true });
fs.writeFileSync(metricsOutputPath, `${JSON.stringify(promotionArtifact, null, 2)}\n`);

console.log(
  [
    "# Prologue Hifi Promotion Ready",
    "",
    `Runtime sheet: public/arpg/illustrated/prologue-hifi-story-pack.png`,
    `Template artifact: docs/metrics/prologue-hifi-promotion-template-latest.json`,
    "",
    "Merge the manifest and bench snippets from the artifact, then rerun the asset and browser gates.",
    "After promotion, /hq Adventure, Map, Journal, and People auto-switch from approved fallbacks to hifi frames.",
  ].join("\n"),
);
