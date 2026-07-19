#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import {
  detectCssHiddenPromptSmuggling,
  detectUnicodeHiddenPromptSmuggling,
  evaluateSkillCapabilities,
} from "../lib/skillSpectrumPolicy.ts";

const root = process.cwd();
const skillRoots = [
  path.join(root, ".agents", "skills"),
  path.join(root, ".claude", "skills"),
  path.join(root, "docs", "ideas", "skills"),
];

function fail(message) {
  console.error(`x skill-capabilities: ${message}`);
  process.exit(1);
}

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.name === "SKILL.md" || entry.name === "GUIDE.md")
      output.push(full);
  }
  return output;
}

const capabilityRe =
  /\b(?:filesystem|network|process|secrets|agent|memory|tool):[a-z_]+\b/g;

let scanned = 0;
let blocked = 0;
let contentScanned = 0;

for (const skillRoot of skillRoots) {
  if (!fs.existsSync(skillRoot)) {
    fail(`required skill root is missing: ${path.relative(root, skillRoot)}`);
  }
}

const skillFiles = skillRoots.flatMap((skillRoot) => walk(skillRoot)).sort();

for (const skillFile of skillFiles) {
  const text = fs.readFileSync(skillFile, "utf8");
  contentScanned += 1;
  const cssFindings = detectCssHiddenPromptSmuggling(text);
  if (cssFindings.length) {
    fail(
      `${path.relative(root, skillFile)} has CSS-hidden prompt smuggling (line ${cssFindings[0].line}): ${cssFindings[0].excerpt}`,
    );
  }
  const unicodeFindings = detectUnicodeHiddenPromptSmuggling(text);
  if (unicodeFindings.length) {
    const finding = unicodeFindings[0];
    fail(
      `${path.relative(root, skillFile)} has Unicode hidden-channel content (${finding.category} ${finding.codePoint}, line ${finding.line}, column ${finding.column}): ${finding.excerpt}`,
    );
  }
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
  `ok skill-capabilities (${skillRoots.length} roots, ${contentScanned} skill markdown file(s) CSS/Unicode-scanned, ${scanned} with capability declarations, ${blocked} blocked)`,
);
