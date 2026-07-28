#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "app", "design-md.generated.css");
const outputPath = path.join(root, "data", "exports", "design-tokens.json");
const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(sourcePath)) {
  console.error("x design-tokens: app/design-md.generated.css is missing");
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf8");
const rootBlock = source.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!rootBlock) {
  console.error("x design-tokens: generated :root token block is missing");
  process.exit(1);
}

const classify = (name) => {
  if (
    /(?:color|text|accent|signal|ember|violet|steel|alert|warn|good|bg|surf|panel|line|border|glow|hairline|fhi|fmd|flo)/.test(
      name,
    )
  ) {
    return "color";
  }
  if (/(?:space|gutter)/.test(name)) return "spacing";
  if (/(?:radius|^--r$|^--rs$)/.test(name)) return "radius";
  if (/(?:fs-|lh-|font)/.test(name)) return "typography";
  if (/(?:motion|duration|delay|interval|ease)/.test(name)) return "motion";
  if (/(?:shell|max|height|bp-)/.test(name)) return "layout";
  return "other";
};

const tokens = {};
for (const line of rootBlock[1].split(/\r?\n/)) {
  const match = line.match(/^\s*(--[a-zA-Z0-9-]+):\s*(.+);\s*$/);
  if (!match) continue;
  const [, name, value] = match;
  tokens[name] = {
    value: value.trim(),
    category: classify(name),
  };
}

for (const required of [
  "--bg",
  "--text",
  "--accent",
  "--space-1",
  "--radius-md",
  "--fs-md",
  "--motion-fast",
]) {
  if (!tokens[required]) {
    console.error(`x design-tokens: required token ${required} is missing`);
    process.exit(1);
  }
}
if (Object.keys(tokens).length < 100) {
  console.error("x design-tokens: generated token inventory is unexpectedly small");
  process.exit(1);
}

const manifest = {
  schemaVersion: 1,
  name: "Nexus Prime runtime design tokens",
  source: "DESIGN.md -> app/design-md.generated.css",
  generatedAt: null,
  tokenCount: Object.keys(tokens).length,
  tokens,
};

if (checkOnly) {
  console.log(
    `ok design-tokens (tokens=${manifest.tokenCount}; source=app/design-md.generated.css; write=false)`,
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ ...manifest, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  "utf8",
);
console.log(`ok design-tokens-export ${path.relative(root, outputPath)}`);
