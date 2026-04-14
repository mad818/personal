#!/usr/bin/env node
/**
 * check-stale-todos.mjs
 * Lists all open [ ] items in docs/SYSTEM_STATE.md that have not appeared in
 * recently touched planning/handoff files in the last N days (default 14).
 *
 * Usage:
 *   node scripts/check-stale-todos.mjs
 *   node scripts/check-stale-todos.mjs --days 21
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const daysIndex = args.indexOf("--days");
const STALE_DAYS = daysIndex >= 0 ? parseInt(args[daysIndex + 1], 10) : 14;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

function extractTaskId(item) {
  const match = item.match(/^([A-Za-z0-9]+)\s+—/);
  return match?.[1] ?? null;
}

// ── Parse open queue items ────────────────────────────────────────────────────
const statePath = path.join(ROOT, "docs", "SYSTEM_STATE.md");
const stateContent = readFileSync(statePath, "utf8");
const stateLines = stateContent.split("\n");
const openItems = stateLines
  .filter((line) => /^\s*-\s*\[\s\]/.test(line))
  .map((line) => line.replace(/^\s*-\s*\[\s\]\s*/, "").trim());
const closedItems = stateLines
  .filter((line) => /^\s*-\s*\[x\]/i.test(line))
  .map((line) => line.replace(/^\s*-\s*\[x\]\s*/i, "").trim());

if (openItems.length === 0) {
  console.log("✅  No open todo items found.");
  process.exit(0);
}

function walkMarkdownFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkMarkdownFiles(resolved);
      }
      return entry.isFile() && resolved.endsWith(".md") ? [resolved] : [];
    });
  } catch {
    return [];
  }
}

function wasTouchedRecently(filePath) {
  try {
    return Date.now() - statSync(filePath).mtimeMs <= STALE_MS;
  } catch {
    return false;
  }
}

const activityFiles = [
  statePath,
  path.join(ROOT, "docs", "STANDARDS.md"),
  path.join(ROOT, "docs", "AGENT_HANDOFF.md"),
  ...walkMarkdownFiles(path.join(ROOT, "docs", "plans")),
].filter((filePath, index, list) => list.indexOf(filePath) === index && wasTouchedRecently(filePath));

const recentActivityText = activityFiles
  .map((filePath) => {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  })
  .join("\n")
  .toLowerCase();

// ── Classify items ────────────────────────────────────────────────────────────
const stale = [];
const active = [];
const openIds = openItems.map(extractTaskId).filter(Boolean);
const closedIds = new Set(closedItems.map(extractTaskId).filter(Boolean));

function hasDescendant(id) {
  return openIds.some((candidate) => candidate !== id && candidate.startsWith(id));
}

for (const item of openItems) {
  const taskId = extractTaskId(item);
  if (taskId && (hasDescendant(taskId) || closedIds.has(taskId))) {
    active.push(item);
    continue;
  }

  const tokens = [
    taskId?.toLowerCase(),
    item.slice(0, 40).toLowerCase(),
  ].filter(Boolean);

  if (
    recentActivityText &&
    tokens.some((token) => recentActivityText.includes(token.slice(0, 20)))
  ) {
    active.push(item);
  } else {
    stale.push(item);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`\n📋  Open todos: ${openItems.length}`);
console.log(`📅  Stale threshold: ${STALE_DAYS} days\n`);

if (stale.length === 0) {
  console.log("✅  All open todos appear active (referenced in recently touched planning/handoff files).");
} else {
  console.log(`⚠   ${stale.length} possibly stale item(s):\n`);
  stale.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item}`);
  });
}

if (active.length > 0) {
  console.log(
    `\n✓   ${active.length} recently active item(s) found in ${activityFiles.length} touched planning/handoff file(s) — skipped.\n`
  );
}

process.exit(stale.length > 0 ? 1 : 0);
