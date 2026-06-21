#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";

// SkillSpector: blocked skill capabilities (NVIDIA/SkillSpector patterns)
const blockedSkillCapabilities = [
  "file_system_write_unrestricted",
  "network_exfiltration",
  "credential_access",
  "privilege_escalation",
  "arbitrary_code_exec",
];

// Ponytail YAGNI: violation patterns to flag in agent traces
const yagniViolationPatterns = [
  "create a utility for future use",
  "refactor while im here",
  "add test coverage for unrelated",
  "scaffold a generic abstraction",
  "read the whole file just in case",
  "plan the full feature before starting",
];

const destructivePatterns = [
  { pattern: /\brm\s+-[^\n;|&]*r[^\n;|&]*f\b/, reason: "recursive force delete" },
  { pattern: /\brm\s+-[^\n;|&]*r[^\n;|&]*\s+(?:\/|~|[a-z]:[\\/])/, reason: "recursive delete against a root-like path" },
  { pattern: /\brmdir\s+(?:\/s|-[^\n;|&]*r)/, reason: "recursive directory delete" },
  { pattern: /\bremove-item\b[^\n;|&]*(?:-recurse|-r\b)/, reason: "recursive PowerShell delete" },
  { pattern: /\bdel\s+\/f\b/, reason: "forced Windows delete" },
  { pattern: /\bformat\s+c:/, reason: "disk format" },
  { pattern: /\bdrop\s+(?:table|database)\b/, reason: "destructive database drop" },
  { pattern: /\btruncate\s+table\b/, reason: "destructive database truncate" },
  { pattern: /\bdelete\s+from\b[\s\S]*\bwhere\s+1\b/, reason: "unbounded database delete" },
  { pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&?\s*\}/, reason: "fork bomb pattern" },
  { pattern: /\b(?:curl|wget)\b[\s\S]*\|[\s\S]*\b(?:bash|sh|pwsh|powershell)\b/, reason: "remote script piped to shell" },
];

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function collectStrings(value, output = []) {
  if (typeof value === "string") { output.push(value); return output; }
  if (Array.isArray(value)) { for (const item of value) collectStrings(item, output); return output; }
  if (value && typeof value === "object") { for (const item of Object.values(value)) collectStrings(item, output); }
  return output;
}

function parseMaybeJson(rawValue) {
  if (!rawValue?.trim()) return [];
  try { return collectStrings(JSON.parse(rawValue)); } catch { return [rawValue]; }
}

const rawInputs = [
  readStdin(),
  process.env.CLAUDE_TOOL_INPUT,
  process.env.CODEX_TOOL_INPUT,
  process.env.TOOL_INPUT,
].filter(Boolean);

const haystack = rawInputs.flatMap((rawValue) => parseMaybeJson(rawValue)).join("\n").toLowerCase();

for (const { pattern, reason } of destructivePatterns) {
  if (pattern.test(haystack)) {
    console.error(`BLOCKED: destructive command detected (${reason}). Confirm with Mario before running this.`);
    process.exit(2);
  }
}

for (const cap of blockedSkillCapabilities) {
  if (haystack.includes(cap.toLowerCase())) {
    console.error(`BLOCKED: skill capability "${cap}" is restricted by SkillSpector policy.`);
    process.exit(2);
  }
}

for (const vp of yagniViolationPatterns) {
  if (haystack.includes(vp.toLowerCase())) {
    console.warn(`YAGNI warning: detected scope-creep pattern: "${vp}". Confirm with Mario before continuing.`);
  }
}

process.exit(0);
