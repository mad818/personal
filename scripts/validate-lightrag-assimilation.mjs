#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x lightrag-assimilation: ${message}`);
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

const ragRouter = readRequired("lib", "ragRouter.ts");
const office = readRequired("components", "home", "office", "OfficeCommandCenter.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "lightrag.json"));

requireText(ragRouter, "buildRagContextBlockAsync", "lib/ragRouter.ts");
requireText(ragRouter, "boostRagConfidenceWithEntities", "lib/ragRouter.ts");
requireText(ragRouter, "reasoningRoute", "lib/ragRouter.ts");
requireText(ragRouter, "Entity boost:", "lib/ragRouter.ts");
requireText(office, "buildRagContextBlockAsync", "OfficeCommandCenter.tsx");

if (parity.status !== "complete") {
  fail("lightrag.json status must be complete");
}

const boostRow = parity.capabilities?.find((c) => c.id === "entity-confidence-boost");
if (!boostRow || boostRow.disposition !== "adapted") {
  fail("lightrag.json entity-confidence-boost must be adapted");
}

console.log("ok lightrag-assimilation (async RAG routing + entity boost wired)");
