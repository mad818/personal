#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x regression-memory-checklist: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const checklistText = readRequired("docs", "regression-memory-checklist.md");
const ownersText = readRequired("docs", "regression-memory-owners.json");

let owners;
try {
  owners = JSON.parse(ownersText);
} catch {
  fail("docs/regression-memory-owners.json is not valid JSON");
}

if (!owners.sections || typeof owners.sections !== "object") {
  fail("docs/regression-memory-owners.json must have a top-level 'sections' object");
}

// Extract heading lines from the checklist
const headingRe = /^##\s+(.+)$/gm;
const checklistHeadings = [];
let m;
while ((m = headingRe.exec(checklistText)) !== null) {
  checklistHeadings.push(m[1].trim());
}

if (checklistHeadings.length === 0) {
  fail("docs/regression-memory-checklist.md has no ## sections");
}

// Verify every checklist heading maps to a section in owners
for (const heading of checklistHeadings) {
  const match = Object.values(owners.sections).find(
    (section) => section.heading && section.heading.toLowerCase() === heading.toLowerCase(),
  );
  if (!match) {
    fail(
      `checklist heading "${heading}" has no matching section in docs/regression-memory-owners.json`,
    );
  }
}

// Verify every section in owners references at least one script
for (const [key, section] of Object.entries(owners.sections)) {
  if (!Array.isArray(section.scripts) || section.scripts.length === 0) {
    fail(`owners section "${key}" must list at least one script`);
  }
  if (!section.heading) {
    fail(`owners section "${key}" is missing a heading field`);
  }
}

// Verify checklist heading count matches owners section count
if (checklistHeadings.length !== Object.keys(owners.sections).length) {
  fail(
    `checklist has ${checklistHeadings.length} sections but owners maps ${Object.keys(owners.sections).length} — they must match`,
  );
}

// Verify the checklist mentions the release sign-off scripts
assertIncludes(checklistText, "npm run verify", "regression checklist");
assertIncludes(checklistText, "npm run auth:e2e", "regression checklist");
assertIncludes(checklistText, "npm run release:smoke", "regression checklist");

console.log("ok regression-memory-checklist");
