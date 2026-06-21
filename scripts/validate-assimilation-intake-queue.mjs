#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const queuePath = path.join(root, "docs", "ideas", "assimilation-intake-queue.json");
const parityDir = path.join(root, "docs", "ideas", "source-parity");

function fail(message) {
  console.error(`x assimilation-intake-queue: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(queuePath)) {
  fail("docs/ideas/assimilation-intake-queue.json is missing");
}

const pendingPath = path.join(root, "docs", "ideas", "pending-links.json");
if (!fs.existsSync(pendingPath)) {
  fail("docs/ideas/pending-links.json is missing (Wave 22 intake lane)");
}

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
if (!Array.isArray(queue.items) || queue.items.length < 10) {
  fail("intake queue must list at least 10 items");
}

for (const item of queue.items) {
  if (!item.id || !item.source || !item.targetMatrix) {
    fail(`invalid queue item: ${JSON.stringify(item)}`);
  }
  const matrixPath = path.join(root, item.targetMatrix);
  if (!fs.existsSync(matrixPath) && item.status === "shipped") {
    fail(`shipped item ${item.id} missing matrix at ${item.targetMatrix}`);
  }
}

const parityFiles = fs.readdirSync(parityDir).filter((f) => f.endsWith(".json"));
if (parityFiles.length < 18) {
  fail(`expected at least 18 parity matrices, found ${parityFiles.length}`);
}

console.log(`ok assimilation-intake-queue (${queue.items.length} queued items, ${parityFiles.length} parity matrices)`);
