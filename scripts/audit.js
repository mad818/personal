#!/usr/bin/env node
// scripts/audit.js — npm run audit:full
// Runs the canonical verifier itself, then prints honest local task posture.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const VERIFY_TIMEOUT_MS = 10 * 60 * 1000;

function getSectionLines(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return [];

  const section = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("## ")) break;
    section.push(lines[index]);
  }
  return section;
}

function taskPosture() {
  const file = path.join(process.cwd(), "tasks", "todo.md");
  try {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    const nextUp = getSectionLines(lines, "## Next Up");
    return {
      nextUpOpen: nextUp.filter((line) => /^- \[ \]/.test(line)).length,
      totalOpen: (content.match(/\[ \]/g) ?? []).length,
      totalClosed: (content.match(/\[x\]/gi) ?? []).length,
    };
  } catch {
    return null;
  }
}

function runCanonicalVerify() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !fs.existsSync(npmCli)) {
    return {
      passed: false,
      detail:
        "npm runner unavailable; invoke this audit through npm run audit:full.",
    };
  }

  const result = spawnSync(process.execPath, [npmCli, "run", "verify"], {
    cwd: process.cwd(),
    shell: false,
    stdio: "inherit",
    timeout: VERIFY_TIMEOUT_MS,
    windowsHide: true,
  });

  if (result.error) {
    return { passed: false, detail: result.error.message };
  }
  if (result.signal) {
    return {
      passed: false,
      detail: `canonical verifier ended by signal ${result.signal}`,
    };
  }
  return {
    passed: result.status === 0,
    detail:
      result.status === 0
        ? "canonical npm run verify completed"
        : `canonical verifier exited with status ${result.status ?? "unknown"}`,
  };
}

function main() {
  const unsupportedArguments = process.argv.slice(2);
  if (unsupportedArguments.length > 0) {
    console.error(
      "ERROR: audit:full accepts no arguments; verification cannot be bypassed.",
    );
    process.exit(2);
  }

  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  NEXUS PRIME — FULL LOCAL AUDIT${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`);
  console.log("  Running canonical npm run verify…\n");

  const verification = runCanonicalVerify();
  const verificationColor = verification.passed ? GREEN : RED;
  const verificationLabel = verification.passed ? "✓ PASS" : "✗ FAIL";
  console.log(
    `\n  Canonical verification: ${verificationColor}${verificationLabel}${RESET}`,
  );
  console.log(`    ${verificationColor}→ ${verification.detail}${RESET}`);

  const tasks = taskPosture();
  if (tasks) {
    const nextUpColor = tasks.nextUpOpen === 0 ? GREEN : YELLOW;
    console.log(
      `\n  Next Up queue: ${nextUpColor}${tasks.nextUpOpen} open top-level task(s)${RESET}`,
    );
    console.log(
      `  All task checkboxes: ${tasks.totalOpen} open, ${tasks.totalClosed} closed`,
    );
  } else {
    console.log(`\n  ${YELLOW}Task posture unavailable.${RESET}`);
  }

  console.log(`\n${CYAN}───────────────────────────────────────${RESET}`);
  if (verification.passed) {
    console.log(`${GREEN}  ✓ Local verification passed.${RESET}`);
    console.log(
      "  Publication readiness and remote CI remain separate external checks.",
    );
  } else {
    console.log(`${RED}  ✗ Local verification failed; do not publish.${RESET}`);
    process.exitCode = 1;
  }
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`);
}

main();
