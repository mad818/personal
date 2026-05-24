#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fail(message) {
  console.error(`x phone-assistant-receipt-bridge: ${message}`);
  process.exit(1);
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function assertNotIncludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

function assertFileExists(...segments) {
  const filePath = path.join(repoRoot, ...segments);
  if (!fs.existsSync(filePath)) {
    fail(`${segments.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const assistantTurnReceipt = readProjectFile(
  "components",
  "assistant",
  "AssistantTurnReceipt.tsx",
);
const receiptCapture = readProjectFile("scripts", "phone-acceptance-capture.mjs");
const receiptBridge = assertFileExists("lib", "phoneAssistantReceiptBridge.ts");

assertIncludes(receiptBridge, "/api/phone-acceptance/receipt", "receipt bridge");
assertIncludes(receiptBridge, "localFastPathReceipt", "receipt bridge");
assertIncludes(receiptBridge, "localAiReceipt", "receipt bridge");
assertIncludes(receiptBridge, "paidApisAllowed", "receipt bridge");
assertIncludes(receiptBridge, "recoveryCode", "receipt bridge");
assertIncludes(receiptBridge, "filesChanged", "receipt bridge");
assertIncludes(receiptBridge, "sessionStorage", "receipt bridge");
assertNotIncludes(receiptBridge, "sourceText", "receipt bridge");
assertNotIncludes(receiptBridge, "text:", "receipt bridge");
assertNotIncludes(receiptBridge, "Authorization", "receipt bridge");
assertNotIncludes(receiptBridge, "Cookie", "receipt bridge");

assertIncludes(
  assistantTurnReceipt,
  "markPhoneAssistantReceipt",
  "assistant turn receipt component",
);
assertIncludes(assistantTurnReceipt, "useEffect", "assistant turn receipt component");
assertIncludes(assistantTurnReceipt, "useRef", "assistant turn receipt component");

assertIncludes(receiptCapture, "localFastPathReceipt", "acceptance capture");
assertIncludes(receiptCapture, "localAiReceipt", "acceptance capture");

if (!packageJson.scripts?.["phone:assistant:receipts:check"]) {
  fail("package.json is missing phone:assistant:receipts:check");
}
if (
  !packageJson.scripts?.["phone:acceptance:receipts:check"]?.includes(
    "phone:assistant:receipts:check",
  )
) {
  fail("phone:acceptance:receipts:check does not run phone:assistant:receipts:check");
}

console.log(
  "Phone assistant receipt bridge OK (shared assistant turn receipt silently marks local fast-path and Ollama proof without storing chat content).",
);
