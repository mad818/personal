#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { evaluateSkillCapabilities } from "../lib/skillSpectrumPolicy.ts";

const root = process.cwd();
const skillsDir = path.join(root, ".claude", "skills");

function fail(message) {
  console.error(`x skill-capabilities: ${message}`);
  process.exit(1);
}

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.name === "SKILL.md") output.push(full);
  }
  return output;
}

const capabilityRe =
  /\b(?:filesystem|network|process|secrets|agent|memory|tool):[a-z_]+\b/g;

let scanned = 0;
let blocked = 0;

for (const skillFile of walk(skillsDir)) {
  const text = fs.readFileSync(skillFile, "utf8");
  const declared = [...new Set(text.match(capabilityRe) ?? [])];
  if (!declared.length) continue;
  scanned += 1;
  const { violations } = evaluateSkillCapabilities(declared);
  if (violations.length) {
    blocked += violations.length;
    fail(
      `${path.relative(root, skillFile)} declares blocked capabilities: ${violations
        .map((v) => v.capability)
        .join(", ")}`,
    );
  }
}

console.log(
  `ok skill-capabilities (${scanned} skill file(s) with capability declarations, ${blocked} blocked)`,
);
