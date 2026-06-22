#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x memento-cycle: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const lib = readRequired("lib", "mementoCycle.ts");
const strip = readRequired("components", "home", "office", "MementoCycleStrip.tsx");
const hq = readRequired("components", "home", "office", "HQTerminalSection.tsx");

requireText(lib, "buildMementoCycleState", "mementoCycle.ts");
requireText(strip, "Memento cycle", "MementoCycleStrip.tsx");
requireText(hq, "MementoCycleStrip", "HQTerminalSection.tsx");

console.log("ok memento-cycle (HQ read/reflect/write strip wired)");
