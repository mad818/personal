#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(`x glossopetrae-hidden-channel: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const policy = read("lib/skillSpectrumPolicy.ts");
const scanner = read("scripts/validate-skill-capabilities.mjs");
const packageJson = JSON.parse(read("package.json"));
const parity = JSON.parse(
  read("docs/ideas/source-parity/elder-plinius-portfolio.json"),
);
const context = read(
  "docs/ideas/repo-analysis/elder-plinius/glossopetrae/REPO_CONTEXT.md",
);
const spec = read("specs/features/glossopetrae-hidden-channel-defense.md");

for (const needle of [
  "detectUnicodeHiddenPromptSmuggling",
  "unicode_tag",
  "bidi_control",
  "zero_width_format",
  "private_use",
  "MAX_UNICODE_HIDDEN_FINDINGS",
]) {
  requireText(policy, needle, "policy");
}
for (const skillRoot of [
  'path.join(root, ".agents", "skills")',
  'path.join(root, ".claude", "skills")',
  'path.join(root, "docs", "ideas", "skills")',
]) {
  requireText(scanner, skillRoot, "scanner root inventory");
}
requireText(scanner, "detectCssHiddenPromptSmuggling", "CSS scan preservation");
requireText(
  scanner,
  "detectUnicodeHiddenPromptSmuggling",
  "Unicode scan wiring",
);
requireText(scanner, ".sort(", "deterministic scanner ordering");
requireText(spec, "copies no implementation", "AGPL boundary");
requireText(context, "defensive inspection lesson", "analysis boundary");

const capability = parity.capabilities.find(
  (candidate) => candidate.id === "unicode-hidden-channel-defense",
);
if (capability?.disposition !== "implemented") {
  fail("source parity must mark Unicode hidden-channel defense implemented");
}
const scripts = packageJson.scripts ?? {};
requireText(
  String(scripts["glossopetrae:hidden-channel:check"] ?? ""),
  "validate-skill-capabilities.mjs",
  "focused scanner chain",
);
requireText(
  String(scripts["agentshield:check"] ?? ""),
  "glossopetrae:hidden-channel:check",
  "AgentShield canonical wiring",
);
requireText(
  String(scripts.verify ?? ""),
  "npm run agentshield:check",
  "verify wiring",
);

console.log("ok glossopetrae-hidden-channel-static");
