import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

type VerificationAdapter = "typecheck" | "lint" | "route_smoke";

type AdapterResult = {
  adapter: VerificationAdapter;
  passed: boolean;
  summary: string;
};

type VerificationResponse = {
  ok: boolean;
  adapters: AdapterResult[];
};

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
    child.stdout.on("data", (d) => {
      out += String(d);
    });
    child.stderr.on("data", (d) => {
      out += String(d);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: out.trim().slice(-1500) });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: String(err.message || "command error") });
    });
  });
}

async function checkRouteSmoke(req: NextRequest): Promise<AdapterResult> {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const base = `${proto}://${host}`;
  const publicUrls = ["/api/health"];
  const protectedUrls = [
    "/api/status",
    "/api/project?section=tree",
    "/api/tools",
    "/api/ai",
  ];

  const publicChecks = await Promise.all(
    publicUrls.map(async (u) => {
      try {
        const r = await fetch(`${base}${u}`, {
          signal: AbortSignal.timeout(6000),
        });
        return { u, ok: r.ok, status: r.status };
      } catch {
        return { u, ok: false, status: 0 };
      }
    }),
  );

  // Protected endpoints count as reachable when they return auth-gated responses.
  const protectedChecks = await Promise.all(
    protectedUrls.map(async (u) => {
      try {
        const r = await fetch(`${base}${u}`, {
          signal: AbortSignal.timeout(6000),
        });
        const ok = r.status === 200 || r.status === 401 || r.status === 403;
        return { u, ok, status: r.status };
      } catch {
        return { u, ok: false, status: 0 };
      }
    }),
  );

  const checks = [...publicChecks, ...protectedChecks];
  const failed = checks.filter((c) => !c.ok);
  return {
    adapter: "route_smoke",
    passed: failed.length === 0,
    summary: failed.length
      ? `Route smoke failed: ${failed.map((f) => `${f.u}(${f.status})`).join(", ")}`
      : "Route smoke passed for public + protected API reachability (/api/health,/api/status,/api/project,/api/tools,/api/ai)",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const adapters = (
      Array.isArray(body.adapters)
        ? body.adapters
        : ["typecheck", "lint", "route_smoke"]
    ) as VerificationAdapter[];
    const uniq = Array.from(new Set(adapters)).filter(
      (a): a is VerificationAdapter =>
        a === "typecheck" || a === "lint" || a === "route_smoke",
    );

    const results: AdapterResult[] = [];

    for (const adapter of uniq) {
      if (adapter === "typecheck") {
        const r = await runCommand("npx", ["tsc", "--noEmit"], 120000);
        results.push({
          adapter,
          passed: r.ok,
          summary: r.ok
            ? "Type check passed"
            : `Type check failed: ${r.output || "unknown error"}`,
        });
        continue;
      }
      if (adapter === "lint") {
        const r = await runCommand(
          "npm",
          ["run", "lint", "--", "--max-warnings=0"],
          180000,
        );
        results.push({
          adapter,
          passed: r.ok,
          summary: r.ok
            ? "Lint passed"
            : `Lint failed: ${r.output || "unknown error"}`,
        });
        continue;
      }
      if (adapter === "route_smoke") {
        results.push(await checkRouteSmoke(req));
      }
    }

    const payload: VerificationResponse = {
      ok: results.every((r) => r.passed),
      adapters: results,
    };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        adapters: [
          {
            adapter: "route_smoke",
            passed: false,
            summary: `Verification route error: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        ],
      } satisfies VerificationResponse,
      { status: 500 },
    );
  }
}
