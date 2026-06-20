#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * CP2.4 — Local Launch Gate Bundle
 *
 * Runs release-readiness checks sequentially. Checks that require a running
 * server or env credentials are gracefully skipped with documentation.
 *
 * Always-run (no server or secrets needed):
 *   type-check   — tsc --noEmit via npm run type-check
 *   lint         — next lint via npm run lint
 *
 * Server-required (skipped if server unreachable):
 *   route:integrity   — needs NEXUS_RELEASE_BASE_URL (defaults http://127.0.0.1:3000)
 *   release:smoke     — same as above
 *
 * Env-required (skipped if env absent):
 *   eval:agent-runtime:ci — runs locally but may need eval baseline; runs with
 *                           graceful degradation, logs result as advisory
 *   auth-regression       — requires NEXUS_TOKEN + running server
 *
 * Usage:
 *   npm run cp2:local:launch-gate               # run all gates
 *   node scripts/cp2-local-launch-gate.mjs --ci # non-zero exit only on always-run failures
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const ciMode = args.includes("--ci");

const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";
const hasToken = Boolean(process.env.NEXUS_TOKEN?.trim());

function runNpm(script, { optional = false } = {}) {
  const startedAt = Date.now();
  const result = spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
    windowsHide: true,
  });
  return {
    script,
    passed: result.status === 0,
    optional,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
  };
}

async function isServerReachable(url) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${url}/api/health`, {
      signal: ctrl.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return false;
  }
}

function printResult(result, label) {
  const duration = `${(result.durationMs / 1000).toFixed(1)}s`;
  if (result.passed) {
    console.log(`  [PASS] ${label} (${duration})`);
  } else {
    console.log(`  [FAIL] ${label} (${duration})`);
    const out = result.stdout.trim();
    const err = result.stderr.trim();
    if (out) console.log(`         stdout: ${out.split("\n").slice(-3).join(" | ")}`);
    if (err) console.log(`         stderr: ${err.split("\n").slice(-3).join(" | ")}`);
  }
}

function printSkip(label, reason) {
  console.log(`  [SKIP] ${label} — ${reason}`);
}

async function main() {
  console.log("CP2.4 Local Launch Gate");
  console.log(`server url: ${baseUrl}`);
  console.log(`token present: ${hasToken ? "yes" : "no"}`);
  console.log("");

  const results = [];
  let hardFailures = 0;

  // ── Always-run static checks ───────────────────────────────────────────────

  console.log("Static checks (always run):");

  const typeCheck = runNpm("type-check");
  printResult(typeCheck, "type-check (tsc --noEmit)");
  results.push({ ...typeCheck, category: "static" });
  if (!typeCheck.passed) hardFailures++;

  const lint = runNpm("lint");
  printResult(lint, "lint");
  results.push({ ...lint, category: "static" });
  if (!lint.passed) hardFailures++;

  // ── Server-required checks ─────────────────────────────────────────────────

  console.log("");
  console.log("Server-required checks:");

  const serverReachable = await isServerReachable(baseUrl);
  if (!serverReachable) {
    printSkip(
      "route:integrity",
      `server-required: ${baseUrl} is not reachable. Set NEXUS_RELEASE_BASE_URL and start npm run dev or npm run desktop:start-runtime.`,
    );
    printSkip(
      "release:smoke",
      `server-required: ${baseUrl} is not reachable. Same as above.`,
    );
    results.push({ script: "route:integrity", skipped: true, reason: "server-unreachable" });
    results.push({ script: "release:smoke", skipped: true, reason: "server-unreachable" });
  } else {
    const routeIntegrity = runNpm("route:integrity");
    printResult(routeIntegrity, "route:integrity");
    results.push({ ...routeIntegrity, category: "server" });
    if (!routeIntegrity.passed && !ciMode) hardFailures++;

    const smoke = runNpm("release:smoke");
    printResult(smoke, "release:smoke");
    results.push({ ...smoke, category: "server" });
    if (!smoke.passed && !ciMode) hardFailures++;
  }

  // ── Env-optional checks ────────────────────────────────────────────────────

  console.log("");
  console.log("Advisory checks (skip without required env):");

  // eval:agent-runtime:ci runs locally — run it and treat as advisory
  const evalScript = join(root, "scripts", "eval-agent-runtime.js");
  if (existsSync(evalScript)) {
    const evalResult = runNpm("eval:agent-runtime:ci");
    const label = "eval:agent-runtime:ci";
    const duration = `${(evalResult.durationMs / 1000).toFixed(1)}s`;
    if (evalResult.passed) {
      console.log(`  [PASS] ${label} (${duration}) — advisory`);
    } else {
      console.log(`  [WARN] ${label} (${duration}) — advisory, non-blocking in local gate`);
      const out = evalResult.stdout.trim();
      const err = evalResult.stderr.trim();
      if (out) console.log(`         stdout: ${out.split("\n").slice(-3).join(" | ")}`);
      if (err) console.log(`         stderr: ${err.split("\n").slice(-3).join(" | ")}`);
    }
    results.push({ ...evalResult, category: "advisory" });
  } else {
    printSkip("eval:agent-runtime:ci", "eval-agent-runtime.js not found");
    results.push({ script: "eval:agent-runtime:ci", skipped: true, reason: "script-missing" });
  }

  // auth-regression requires NEXUS_TOKEN + running server
  const authScript = join(root, "scripts", "auth-regression.mjs");
  if (!existsSync(authScript)) {
    printSkip("auth-regression", "auth-regression.mjs not found");
    results.push({ script: "auth-regression", skipped: true, reason: "script-missing" });
  } else if (!hasToken) {
    printSkip(
      "auth-regression",
      "token-required: set NEXUS_TOKEN in .env.local or env, then re-run.",
    );
    results.push({ script: "auth-regression", skipped: true, reason: "token-absent" });
  } else if (!serverReachable) {
    printSkip(
      "auth-regression",
      `server-required: ${baseUrl} is not reachable. Start the runtime first.`,
    );
    results.push({ script: "auth-regression", skipped: true, reason: "server-unreachable" });
  } else {
    const authResult = runNpm("auth:regression");
    printResult(authResult, "auth-regression");
    results.push({ ...authResult, category: "auth" });
    if (!authResult.passed && !ciMode) hardFailures++;
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("");
  const passed = results.filter((r) => !r.skipped && r.passed).length;
  const failed = results.filter((r) => !r.skipped && !r.passed).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (hardFailures > 0) {
    console.error(`x cp2-local-launch-gate: ${hardFailures} hard failure(s). Fix static checks before promoting.`);
    process.exit(1);
  }

  if (failed > 0) {
    console.log(`  Note: ${failed} advisory/server check(s) failed — review above. Use --ci flag to suppress non-blocking failures.`);
  }

  if (skipped > 0) {
    console.log("  Skipped checks require a running server or NEXUS_TOKEN:");
    for (const r of results.filter((res) => res.skipped)) {
      console.log(`    - ${r.script}: ${r.reason}`);
    }
    console.log("  For full CP2.4 coverage: start the runtime and set NEXUS_TOKEN, then re-run.");
  }

  console.log("ok cp2-local-launch-gate (static checks passed; skipped checks documented above)");
}

main().catch((error) => {
  console.error(
    `x cp2-local-launch-gate: ${error instanceof Error ? error.message : "Unknown failure."}`,
  );
  process.exit(1);
});
