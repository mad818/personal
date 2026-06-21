#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x context-session-cache: ${message}`);
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

const cache = readRequired("lib", "contextSessionCache.ts");
const liveContext = readRequired("lib", "liveContext.ts");
const office = readRequired("components", "home", "office", "OfficeCommandCenter.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "context-optimizer.json"));

requireText(cache, "shouldSuppressContextSection", "lib/contextSessionCache.ts");
requireText(cache, "recordContextSessionReads", "lib/contextSessionCache.ts");
requireText(liveContext, "shouldSuppressContextSection", "lib/liveContext.ts");
requireText(liveContext, "recentReadPaths", "lib/liveContext.ts");
requireText(office, "getRecentContextSessionReads", "OfficeCommandCenter.tsx");

if (parity.status !== "complete") {
  fail("context-optimizer.json status must be complete");
}

console.log("ok context-session-cache (context-optimizer session read cache wired)");
