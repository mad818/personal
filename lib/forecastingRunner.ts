import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { protectedJson } from "@/lib/protectedApi";
import {
  FORECAST_RUNNER_STATE_FILE,
  ensureForecastMetricsDir,
  readForecastEvalRunnerState,
} from "@/lib/forecastingArtifacts";

export interface ForecastEvalRunResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  output: string;
  command: string;
  cooldownMin: number;
  effectiveCooldownMin: number;
  failureStreak: number;
  nextEligibleAt: string;
}

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: true, windowsHide: true });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: `Timed out after ${timeoutMs}ms` });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      out += String(chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: out.trim().slice(-4000) });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        output: String(error.message || "command error"),
      });
    });
  });
}

function writeRunnerState(state: {
  lastRunAt?: string;
  lastOk?: boolean;
  lastSummary?: string;
  cooldownMin?: number;
  effectiveCooldownMin?: number;
  nextEligibleAt?: string;
  failureStreak?: number;
}) {
  ensureForecastMetricsDir();
  writeFileSync(FORECAST_RUNNER_STATE_FILE, JSON.stringify(state, null, 2));
}

export async function runForecastEvalRecord(
  force = false,
): Promise<ForecastEvalRunResult> {
  const baseCooldownMin = Math.max(
    1,
    Math.min(
      24 * 60,
      Number(process.env.NEXUS_FORECAST_EVAL_COOLDOWN_MIN ?? "45"),
    ),
  );
  const prev = readForecastEvalRunnerState();
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
    return {
      ok: true,
      skipped: true,
      reason: `Cooldown active (${effectiveCooldownMin}m)`,
      output: "",
      command: "npm run eval:forecast:record",
      cooldownMin: baseCooldownMin,
      effectiveCooldownMin,
      failureStreak: priorFailureStreak,
      nextEligibleAt: new Date(
        lastRunMs + effectiveCooldownMin * 60000,
      ).toISOString(),
    };
  }

  const run = await runCommand(
    "npm",
    ["run", "eval:forecast:record"],
    300_000,
  );
  const nextFailureStreak = run.ok ? 0 : Math.min(priorFailureStreak + 1, 8);
  const nextEffectiveCooldownMin = Math.min(
    24 * 60,
    baseCooldownMin * Math.max(1, 2 ** nextFailureStreak),
  );
  const nextEligibleAt = new Date(
    Date.now() + nextEffectiveCooldownMin * 60000,
  ).toISOString();

  writeRunnerState({
    lastRunAt: new Date().toISOString(),
    lastOk: run.ok,
    lastSummary: run.ok
      ? "Recorded forecast baseline successfully"
      : `Forecast baseline failed: ${run.output.slice(0, 120)}`,
    cooldownMin: baseCooldownMin,
    effectiveCooldownMin: nextEffectiveCooldownMin,
    nextEligibleAt,
    failureStreak: nextFailureStreak,
  });

  return {
    ok: run.ok,
    skipped: false,
    output: run.output,
    command: "npm run eval:forecast:record",
    cooldownMin: baseCooldownMin,
    effectiveCooldownMin: nextEffectiveCooldownMin,
    failureStreak: nextFailureStreak,
    nextEligibleAt,
  };
}

export function forecastRunResponse(
  payload: ForecastEvalRunResult,
  status?: number,
) {
  return protectedJson(payload, {
    status: status ?? (payload.ok ? 200 : 500),
  });
}
