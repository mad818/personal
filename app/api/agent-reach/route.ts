// ── api/agent-reach ──────────────────────────────────────────────────────────
// Proxy to the local Agent Reach Python service (localhost:5051).
// Provides agents with free-tier connectors: Reddit, GitHub Trending, RSS, DDG.
//
// If the service is not running, all calls degrade gracefully with a
// human-readable error — the rest of Nexus continues to work normally.
//
// Start the service:  python scripts/agent-reach-service.py
// See:                docs/deployment/agent-reach.md

import { NextRequest, NextResponse } from "next/server";

const AGENT_REACH_BASE = process.env.AGENT_REACH_URL ?? "http://127.0.0.1:5051";

// Allowed endpoints — whitelist prevents open proxy abuse
const ALLOWED_PATHS = new Set([
  "/reddit",
  "/github-trending",
  "/rss",
  "/search",
  "/health",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // ?endpoint=/reddit&q=cybersecurity
  const endpoint = searchParams.get("endpoint") ?? "";
  if (!ALLOWED_PATHS.has(endpoint)) {
    return NextResponse.json(
      {
        error: `Unknown endpoint "${endpoint}". Allowed: ${Array.from(ALLOWED_PATHS).join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Forward all other query params to the Python service
  const forward = new URLSearchParams();
  searchParams.forEach((v, k) => {
    if (k !== "endpoint") forward.set(k, v);
  });

  const target = `${AGENT_REACH_BASE}${endpoint}${forward.size ? `?${forward}` : ""}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        error: "Agent Reach service is not running.",
        hint: "Run `python scripts/agent-reach-service.py` to start it. See docs/deployment/agent-reach.md.",
      },
      { status: 503 },
    );
  }
}
