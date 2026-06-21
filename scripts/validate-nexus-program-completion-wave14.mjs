#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-program-completion-wave14: ${message}`);
  process.exit(1);
}

function readTodoSection() {
  const todo = fs.readFileSync(path.join(root, "tasks", "todo.md"), "utf8");
  const start = todo.indexOf("**Active open-ready queue:**");
  const end = todo.indexOf("**Assimilation wave map");
  if (start === -1 || end === -1) {
    fail("tasks/todo.md active queue section not found");
  }
  return todo.slice(start, end);
}

const activeQueue = readTodoSection();
const openInActiveQueue = (activeQueue.match(/^- \[ \]/gm) ?? []).length;
if (openInActiveQueue > 0) {
  fail(`active open-ready queue still has ${openInActiveQueue} unchecked item(s)`);
}

for (const script of [
  "scripts/validate-nexus-closure-wave10.mjs",
  "scripts/validate-nexus-operational-wave11.mjs",
  "scripts/validate-nexus-release-closure-wave12.mjs",
  "scripts/validate-nexus-final-closure-wave13.mjs",
  "scripts/nexus-completion-status.mjs",
  "scripts/nexus-operator-bundle.mjs",
]) {
  if (!fs.existsSync(path.join(root, script))) {
    fail(`${script} is missing`);
  }
}

for (const artifact of [
  "docs/metrics/cp2-operational-live-gate-latest.json",
  "docs/metrics/cp2-web-release-local-rehearsal-latest.json",
  "docs/metrics/cp2-staged-release-rehearsal-latest.json",
  "docs/metrics/desktop-signing-preflight-latest.json",
]) {
  if (!fs.existsSync(path.join(root, artifact))) {
    fail(`missing metrics artifact ${artifact} — run operator preflight scripts first`);
  }
}

const p2Section = fs.readFileSync(path.join(root, "tasks", "todo.md"), "utf8");
const cp2Open = (p2Section.match(/### P2[\s\S]*?## Next Up/g)?.[0].match(/^- \[ \]/gm) ?? [])
  .length;
if (cp2Open > 0) {
  fail(`P2 release engineering still has ${cp2Open} unchecked item(s)`);
}

console.log(
  "ok nexus-program-completion-wave14 (active queue drained, waves 10-13 + completion manifest)",
);
