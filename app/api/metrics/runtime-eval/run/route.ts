import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

type RunnerState = {
  lastRunAt?: string;
  lastOk?: boolean;
  lastSummary?: string;
  cooldownMin?: number;
  effectiveCooldownMin?: number;
  nextEligibleAt?: string;
  failureStreak?: number;
};

const PROJECT_ROOT = resolveRuntimeProjectRoot();
const METRICS_DIR = join(PROJECT_ROOT, "docs", "metrics");
const RUNNER_STATE_FILE = join(METRICS_DIR, "agent-runtime-runner.json");

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      shell: true,
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: `Timed out after ${timeoutMs}ms` });
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      out += String(d);
    });
    child.stderr.on("data", (d) => {
      out += String(d);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: out.trim().slice(-4000) });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: String(err.message || "command error") });
    });
  });
}

function ensureMetricsDir() {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true });
}

function readRunnerState(): RunnerState {
  if (!existsSync(RUNNER_STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(RUNNER_STATE_FILE, "utf-8")) as RunnerState;
  } catch {
    return {};
  }
}

function writeRunnerState(state: RunnerState) {
  ensureMetricsDir();
  writeFileSync(RUNNER_STATE_FILE, JSON.stringify(state, null, 2));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);
  const baseCooldownMin = Math.max(
    1,
    Math.min(
      24 * 60,
      Number(process.env.NEXUS_RUNTIME_EVAL_COOLDOWN_MIN ?? "30"),
    ),
  );
  const prev = readRunnerState();
  const priorFailureStreak = Number(prev.failureStreak ?? 0);
  const effectiveCooldownMin = Math.min(
    24 * 60,
    baseCooldownMin * Math.max(1, 2 ** priorFailureStreak),
  );
  const now = Date.now();
  const lastRunMs = prev.lastRunAt ? new Date(prev.lastRunAt).getTime() : 0;
  const elapsedMin =
    lastRunMs > 0 ? (now - lastRunMs) / 60000 : Number.POSITIVE_INFINITY;
  const eligible = elapsedMin >= effectiveCooldownMin;

  if (!eligible && !force) {
    const nextEligibleAt = new Date(
      lastRunMs + effectiveCooldownMin * 60000,
    ).toISOString();
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Cooldown active (${effectiveCooldownMin}m)`,
      nextEligibleAt,
      cooldownMin: baseCooldownMin,
      effectiveCooldownMin,
      failureStreak: priorFailureStreak,
    });
  }

  const r = await runCommand(
    "npm",
    ["run", "eval:agent-runtime:record"],
    300_000,
  );
  const nextFailureStreak = r.ok ? 0 : Math.min(priorFailureStreak + 1, 8);
  const nextEffectiveCooldownMin = Math.min(
    24 * 60,
    baseCooldownMin * Math.max(1, 2 ** nextFailureStreak),
  );
  const summary = r.ok
    ? "Recorded runtime eval successfully"
    : `Runtime eval failed: ${r.output.slice(0, 120)}`;
  const nextEligibleAt = new Date(
    Date.now() + nextEffectiveCooldownMin * 60000,
  ).toISOString();
  writeRunnerState({
    lastRunAt: new Date().toISOString(),
    lastOk: r.ok,
    lastSummary: summary,
    cooldownMin: baseCooldownMin,
    effectiveCooldownMin: nextEffectiveCooldownMin,
    nextEligibleAt,
    failureStreak: nextFailureStreak,
  });
  return NextResponse.json(
    {
      ok: r.ok,
      skipped: false,
      command: "npm run eval:agent-runtime:record",
      output: r.output,
      cooldownMin: baseCooldownMin,
      effectiveCooldownMin: nextEffectiveCooldownMin,
      failureStreak: nextFailureStreak,
      nextEligibleAt,
    },
    { status: r.ok ? 200 : 500 },
  );
}
