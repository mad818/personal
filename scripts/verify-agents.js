#!/usr/bin/env node
// scripts/verify-agents.js
// Nexus Prime agent regression suite runner.
//
// Usage:
//   node scripts/verify-agents.js              # run full suite
//   node scripts/verify-agents.js --dry-run    # run without writing TSV
//   node scripts/verify-agents.js --agent flux # run only flux scenarios
//   node scripts/verify-agents.js --skip-agents # exit 0 immediately (CI fast mode)
//
// Exit codes:
//   0 = all scenarios pass (or skip-agents flag set)
//   1 = below pass threshold (regression detected)
//   2 = network/config error (server not running)

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const DRY_RUN     = args.includes("--dry-run");
const SKIP_AGENTS = args.includes("--skip-agents");
const agentFilter = (() => {
  const i = args.indexOf("--agent");
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
})();

if (SKIP_AGENTS) {
  console.log("[verify-agents] --skip-agents flag set. Skipping.");
  process.exit(0);
}

const REPO_ROOT    = path.resolve(__dirname, "..");
const SUITE_PATH   = path.join(REPO_ROOT, "tasks", "agent-suite.json");
const METRICS_PATH = path.join(REPO_ROOT, "tasks", "agent-metrics.tsv");
const API_BASE     = process.env.NEXUS_API_BASE ?? "http://localhost:3000";

async function callAI(query, agentHint) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API_BASE}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        system: `You are ${agentHint.toUpperCase()}, a Nexus Prime intelligence agent. Answer concisely.`,
        max_tokens: 512,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content ??
      data?.content?.[0]?.text ??
      null
    );
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") return null;
    throw e;
  }
}

function scoreResponse(answer, scenario) {
  if (!answer) return 0;
  const lower = answer.toLowerCase();

  // Keyword score: 0–0.6
  const hits = scenario.requiredKeywords.filter((kw) =>
    lower.includes(kw.toLowerCase())
  ).length;
  const keywordScore = (hits / scenario.requiredKeywords.length) * 0.6;

  // Structure score: 0 or 0.4
  // Check if answer is substantive (>50 chars) and has some structure
  const structureScore = answer.length > 50 ? 0.4 : 0;

  return keywordScore + structureScore;
}

async function run() {
  const suite = JSON.parse(fs.readFileSync(SUITE_PATH, "utf8"));
  const scenarios = suite.scenarios.filter(
    (s) => !agentFilter || s.agent === agentFilter
  );

  if (scenarios.length === 0) {
    console.log(`[verify-agents] No scenarios found${agentFilter ? ` for agent: ${agentFilter}` : ""}.`);
    process.exit(0);
  }

  console.log(`\n[verify-agents] Running ${scenarios.length} scenario(s)...\n`);

  const results = [];
  let totalDuration = 0;

  for (const scenario of scenarios) {
    const start = Date.now();
    let answer = null;

    try {
      answer = await callAI(scenario.query, scenario.agent);
    } catch (e) {
      console.error(`[verify-agents] Network error for ${scenario.id}: ${e.message}`);
      console.error("  Make sure the dev server is running: npm run dev");
      process.exit(2);
    }

    const duration = Date.now() - start;
    totalDuration += duration;
    const score    = scoreResponse(answer, scenario);
    const passed   = score >= 0.7;

    results.push({ scenario, score, passed, duration, answer });

    const icon = passed ? "✓" : "✗";
    const pct  = Math.round(score * 100);
    console.log(
      `  ${icon} [${scenario.agent.toUpperCase()}] ${scenario.id} — ${pct}% (${duration}ms)`
    );
    if (!passed) {
      console.log(`    Required: ${scenario.requiredKeywords.join(", ")}`);
      console.log(`    Got: ${(answer ?? "(no response)").slice(0, 100)}...`);
    }
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;
  const passRate  = passCount / results.length;
  const avgMs     = Math.round(totalDuration / results.length);

  console.log(`\n[verify-agents] Results: ${passCount}/${results.length} passed (${Math.round(passRate * 100)}%)`);

  if (!DRY_RUN) {
    const date = new Date().toISOString();
    const notes = failCount > 0
      ? results.filter((r) => !r.passed).map((r) => r.scenario.id).join(",")
      : "all-pass";
    const agent = agentFilter ?? "all";
    const row = `${date}\t${agent}\t${passCount}\t${failCount}\t${avgMs}\t${notes}\n`;
    fs.appendFileSync(METRICS_PATH, row, "utf8");
    console.log(`[verify-agents] Metrics appended to tasks/agent-metrics.tsv`);
  }

  if (passRate < suite.passThreshold) {
    console.error(
      `\n[verify-agents] FAIL — pass rate ${Math.round(passRate * 100)}% below threshold ${Math.round(suite.passThreshold * 100)}%`
    );
    process.exit(1);
  }

  console.log("[verify-agents] PASS\n");
  process.exit(0);
}

run().catch((e) => {
  console.error("[verify-agents] Fatal error:", e.message);
  process.exit(2);
});
