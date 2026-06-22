#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x repo-assimilation-depth: ${message}`);
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

const lib = readRequired("lib", "repoAssimilationQueue.ts");
const card = readRequired("components", "recon", "RepoAssimilationQueueCard.tsx");
const recon = readRequired("app", "recon", "page.tsx");

requireText(lib, "buildRepoAssimilationQueueItem", "repoAssimilationQueue.ts");
requireText(card, "repo-assimilation", "RepoAssimilationQueueCard.tsx");
requireText(recon, "RepoAssimilationQueueCard", "recon page");

console.log("ok repo-assimilation-depth (RECON assimilation queue wired)");
