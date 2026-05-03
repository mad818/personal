import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";
import { flattenZodIssues } from "@/lib/assimilation/contracts";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";
import {
  runtimeExperimentDefinitionInputSchema,
  type RuntimeExperimentRun,
} from "@/lib/runtimeExperimentContracts";
import { buildRuntimeExperimentWorkbenchMeta } from "@/lib/runtimeExperimentLedger";

export const dynamic = "force-dynamic";
const PROJECT_ROOT = resolveRuntimeProjectRoot();

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      shell: false,
      windowsHide: true,
    });
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
      resolve({ ok: code === 0, output: out.trim() });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, output: String(error.message || "command error") });
    });
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = runtimeExperimentDefinitionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Runtime experiment definition is invalid.",
        issues: flattenZodIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  const definition64 = Buffer.from(
    JSON.stringify(parsed.data),
    "utf-8",
  ).toString("base64url");
  const scriptPath = join(PROJECT_ROOT, "scripts", "eval-runtime-experiment.js");
  const result = await runCommand(
    process.execPath,
    [scriptPath, "--json", "--record", "--definition64", definition64],
    180_000,
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Runtime experiment execution failed.",
        output: result.output.slice(-4000),
      },
      { status: 500 },
    );
  }

  try {
    const run = JSON.parse(result.output) as RuntimeExperimentRun;
    return NextResponse.json({
      ok: true,
      run,
      summary: run.comparison,
      meta: buildRuntimeExperimentWorkbenchMeta(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Runtime experiment completed but returned unreadable output.",
        output: result.output.slice(-4000),
      },
      { status: 500 },
    );
  }
}
