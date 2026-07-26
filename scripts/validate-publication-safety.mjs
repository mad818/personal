#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const root = process.cwd();
const maxScanBytes = 2 * 1024 * 1024;
const boundaryContractPath = join(
  root,
  "docs",
  "repo-hygiene",
  "cloud-local-file-boundary.json",
);

function runGitLsFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString("utf8").trim();
    throw new Error(stderr || "git ls-files failed");
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .map((file) => file.trim())
    .filter(Boolean);
}

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const normalized = normalizePath(pattern).replace(/^\.?\//, "");
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*") {
      source += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    source += escapeRegExp(char);
  }
  return new RegExp(`^${source}$`, "i");
}

function pathMatchesPattern(file, pattern) {
  const normalizedFile = normalizePath(file).replace(/^\.?\//, "");
  const normalizedPattern = normalizePath(pattern).replace(/^\.?\//, "");

  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return (
      normalizedFile === prefix.replace(/\/$/, "") ||
      normalizedFile.startsWith(prefix)
    );
  }

  if (normalizedPattern.endsWith("/")) {
    return normalizedFile.startsWith(normalizedPattern);
  }

  if (!normalizedPattern.includes("/")) {
    return globToRegExp(normalizedPattern).test(basename(normalizedFile));
  }

  return globToRegExp(normalizedPattern).test(normalizedFile);
}

function readBoundaryContract() {
  try {
    return JSON.parse(readFileSync(boundaryContractPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read cloud/local file boundary contract: ${error.message}`,
    );
  }
}

function normalizeGitignoreLine(line) {
  return line.trim().replace(/\\/g, "/");
}

function isBinary(buffer) {
  if (buffer.includes(0)) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte >= 32 && byte <= 126) continue;
    if (byte >= 128) continue;
    suspicious += 1;
  }
  return sample.length > 0 && suspicious / sample.length > 0.1;
}

const allowedPlaceholderValues = new Set([
  "",
  "...",
  "false",
  "true",
  "not-needed",
  "ollama",
  "your-token",
  "your-secret",
  "your-key",
  "your-password",
  "your-host.example",
  "<lan-ip>",
  "<repo-root>",
  "<redacted-local-token>",
  "<long-random-password>",
  "<same-token-used-in-coolify>",
  "<same local token used by the app, if auth is enabled>",
]);

function normalizeAssignmentValue(raw) {
  return raw
    .trim()
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/^[`'"]/, "")
    .replace(/[`'"],?$/, "")
    .replace(/<[^>]+>$/g, "")
    .trim()
    .toLowerCase();
}

function isPlaceholderValue(raw) {
  const value = normalizeAssignmentValue(raw);
  if (!value) return true;
  if (allowedPlaceholderValues.has(value)) return true;
  if (value.startsWith("...")) return true;
  if (/^your[-_][a-z0-9_-]+$/.test(value)) return true;
  if (/^<[^<>]+>$/.test(value)) return true;
  if (/^\$\{[^{}]+\}$/.test(value)) return true;
  if (/^%[A-Z0-9_]+%$/i.test(value)) return true;
  return false;
}

function lineNumberForOffset(src, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (src.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const textRules = [
  {
    id: "private-lan-ip",
    message:
      "Private LAN IP literal must be replaced with <LAN-IP> before publishing.",
    re: /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g,
  },
  {
    id: "windows-home-path",
    message:
      "Windows home path must be replaced with <repo-root> or a relative path.",
    re: /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g,
  },
  {
    id: "private-key-block",
    message: "Private key material must never be tracked.",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    id: "openai-like-key",
    message: "OpenAI-style key literal must never be tracked.",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "anthropic-key",
    message: "Anthropic key literal must never be tracked.",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "github-token",
    message: "GitHub token literal must never be tracked.",
    re: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    id: "aws-access-key",
    message: "AWS access key literal must never be tracked.",
    re: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: "jwt-bearer",
    message: "Bearer JWT literal must never be tracked.",
    re: /\bBearer\s+eyJ[A-Za-z0-9._-]{20,}\b/g,
  },
];

const assignmentRule =
  /\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)\b[ \t]*=(?!=|>)[ \t]*([^\s#]+)/g;
const proofRules = [
  /\b(?:orderNumber|orderId|receiptImage|receiptUrl|receiptId|paymentDetails|paymentMethod|paymentId|accountEmail|accountId|accountNumber|order_number|order_id|receipt_image|receipt_url|receipt_id|payment_details|payment_method|payment_id|account_email|account_id|account_number)\b\s*[:=]\s*["'`]?([^"',`\n\r}]+)/g,
];

function addFinding(findings, file, line, rule, message) {
  findings.push({ file, line, rule, message });
}

function scanBoundaryContract(contract, findings) {
  if (contract?.schemaVersion !== 1) {
    addFinding(
      findings,
      "docs/repo-hygiene/cloud-local-file-boundary.json",
      1,
      "invalid-boundary-contract",
      "Cloud/local file boundary contract must use schemaVersion 1.",
    );
    return;
  }

  const denyPatterns = contract?.localOnly?.trackedDenyPatterns;
  const requiredIgnores = contract?.localOnly?.requiredGitignorePatterns;

  if (!Array.isArray(denyPatterns) || denyPatterns.length === 0) {
    addFinding(
      findings,
      "docs/repo-hygiene/cloud-local-file-boundary.json",
      1,
      "invalid-boundary-contract",
      "Cloud/local file boundary contract must list localOnly.trackedDenyPatterns.",
    );
  }

  if (!Array.isArray(requiredIgnores) || requiredIgnores.length === 0) {
    addFinding(
      findings,
      "docs/repo-hygiene/cloud-local-file-boundary.json",
      1,
      "invalid-boundary-contract",
      "Cloud/local file boundary contract must list localOnly.requiredGitignorePatterns.",
    );
  }
}

function scanRequiredIgnores(contract, findings) {
  const requiredIgnores = contract?.localOnly?.requiredGitignorePatterns ?? [];
  const gitignore = readFileSync(join(root, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .map(normalizeGitignoreLine)
    .filter((line) => line && !line.startsWith("#"));
  const gitignoreSet = new Set(gitignore);

  for (const pattern of requiredIgnores) {
    if (gitignoreSet.has(pattern)) continue;
    addFinding(
      findings,
      ".gitignore",
      1,
      "missing-local-only-ignore",
      `Missing required local-only ignore pattern: ${pattern}`,
    );
  }
}

function scanPath(file, findings, contract) {
  const normalized = normalizePath(file);
  const base = basename(normalized);
  const extension = extname(normalized).toLowerCase();
  const denyPatterns = contract?.localOnly?.trackedDenyPatterns ?? [];

  for (const entry of denyPatterns) {
    if (!entry?.pattern) continue;
    if (!pathMatchesPattern(normalized, entry.pattern)) continue;
    addFinding(
      findings,
      normalized,
      1,
      "local-only-tracked-path",
      `Local-only path must stay off GitHub: ${entry.reason ?? entry.pattern}`,
    );
  }

  if (base === ".env.local" || /^\.env\..*\.local$/i.test(base)) {
    addFinding(
      findings,
      normalized,
      1,
      "tracked-env-local",
      "Local env files must stay untracked; commit .env.example placeholders only.",
    );
  }

  if (/\.(?:pem|key|p12|pfx)$/i.test(extension)) {
    addFinding(
      findings,
      normalized,
      1,
      "tracked-key-material-file",
      "Key/certificate material must stay untracked.",
    );
  }
}

function scanText(file, src, findings) {
  const normalized = normalizePath(file);
  for (const rule of textRules) {
    rule.re.lastIndex = 0;
    let match;
    while ((match = rule.re.exec(src)) !== null) {
      addFinding(
        findings,
        normalized,
        lineNumberForOffset(src, match.index),
        rule.id,
        rule.message,
      );
    }
  }

  assignmentRule.lastIndex = 0;
  let assignment;
  while ((assignment = assignmentRule.exec(src)) !== null) {
    const lineStart = src.lastIndexOf("\n", assignment.index) + 1;
    const lineEnd = src.indexOf("\n", assignment.index);
    const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
    if (line.includes("process.env")) continue;
    const value = assignment[1] ?? "";
    if (isPlaceholderValue(value)) continue;
    addFinding(
      findings,
      normalized,
      lineNumberForOffset(src, assignment.index),
      "secret-assignment",
      "Secret-like assignment must use an empty or explicit placeholder value.",
    );
  }

  for (const rule of proofRules) {
    rule.lastIndex = 0;
    let match;
    while ((match = rule.exec(src)) !== null) {
      const value = match[1] ?? "";
      if (isPlaceholderValue(value)) continue;
      addFinding(
        findings,
        normalized,
        lineNumberForOffset(src, match.index),
        "private-proof-metadata",
        "Receipt, payment, order, or account metadata must be redacted before commit.",
      );
    }
  }
}

function main() {
  const files = runGitLsFiles();
  const findings = [];
  const boundaryContract = readBoundaryContract();

  scanBoundaryContract(boundaryContract, findings);
  scanRequiredIgnores(boundaryContract, findings);

  for (const file of files) {
    scanPath(file, findings, boundaryContract);

    let buffer;
    try {
      buffer = readFileSync(join(root, file));
    } catch {
      continue;
    }
    if (buffer.length > maxScanBytes || isBinary(buffer)) continue;

    scanText(file, buffer.toString("utf8"), findings);
  }

  if (findings.length === 0) {
    console.log(
      "Publication safety OK (tracked files respect cloud/local boundary and contain no private LAN IPs, local home paths, env files, key material, or raw proof metadata).",
    );
    return;
  }

  console.log(
    `\nPublication safety found ${findings.length} blocking item(s):\n`,
  );
  for (const finding of findings) {
    console.log(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`,
    );
  }
  console.log(
    "\nReplace sensitive values with placeholders before publishing.",
  );
  process.exit(1);
}

main();
