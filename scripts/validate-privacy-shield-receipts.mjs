#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x privacy-shield-receipts: ${message}`);
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

const lib = readRequired("lib", "privacyShieldReceipt.ts");
const card = readRequired("components", "command", "PrivacyShieldReceiptCard.tsx");
const command = readRequired("app", "command", "page.tsx");

requireText(lib, "buildPrivacyShieldReceipt", "privacyShieldReceipt.ts");
requireText(card, "Privacy receipt", "PrivacyShieldReceiptCard.tsx");
requireText(command, "PrivacyShieldReceiptCard", "command page");

console.log("ok privacy-shield-receipts (COMMAND receipt card wired)");
