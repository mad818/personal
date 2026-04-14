// ── app/api/agent-learnings/route.ts ─────────────────────────────────────────
// GET  /api/agent-learnings?agent=orbit&limit=10&category=failure
// POST /api/agent-learnings   { agent, query, answer, outcome, proposedFix }
//
// Server-only. All fs I/O lives here — never in lib/agentLearnings.ts
// (which must stay client-safe because it's imported via liveContext).
// Rate-limited 30 req/min.

import { NextRequest } from "next/server";
import { readFile, appendFile, writeFile } from "fs/promises";
import { join } from "path";
import { classifyFailure } from "@/lib/agentLearnings";
import type { AgentId } from "@/components/home/office/types";
import type { LearningEntry } from "@/lib/agentLearnings";
import { protectedJson } from "@/lib/protectedApi";

// ── Paths ─────────────────────────────────────────────────────────────────────

function getLearningsPath(): string {
  return join(process.cwd(), "tasks", "agent-learnings.jsonl");
}

// ── File I/O helpers (server-only) ────────────────────────────────────────────

async function appendLearning(
  entry: Omit<LearningEntry, "id" | "ts">,
): Promise<void> {
  try {
    const full: LearningEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    };
    await appendFile(getLearningsPath(), JSON.stringify(full) + "\n", "utf8");
  } catch {
    // Best-effort — never crash the response
  }
}

async function readLearnings(opts: {
  agent?:    AgentId;
  limit?:    number;
  category?: LearningEntry["category"];
} = {}): Promise<LearningEntry[]> {
  try {
    const raw = await readFile(getLearningsPath(), "utf8");
    const entries: LearningEntry[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim() || line.includes('"_manifest"')) continue;
      try {
        const entry = JSON.parse(line) as LearningEntry;
        if (opts.agent    && entry.agent    !== opts.agent)    continue;
        if (opts.category && entry.category !== opts.category) continue;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }
    entries.sort((a, b) => b.ts - a.ts);
    return entries.slice(0, opts.limit ?? 20);
  } catch {
    return [];
  }
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const path = getLearningsPath();
    const raw  = await readFile(path, "utf8");
    const lines = raw.split("\n").filter(l => l.trim() && !l.includes('"_manifest"'));
    if (lines.length < 1000) return;
    const archivePath = path.replace(".jsonl", ".archive.jsonl");
    await appendFile(archivePath, lines.slice(200).join("\n") + "\n", "utf8");
    await writeFile(
      path,
      ['{"_manifest":true,"version":1}', ...lines.slice(0, 200)].join("\n") + "\n",
      "utf8",
    );
  } catch {
    // Swallow rotation errors
  }
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 30;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now   = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Validation sets ───────────────────────────────────────────────────────────

const VALID_AGENTS      = new Set<string>(["jansky","orbit","nova","cipher","flux"]);
const VALID_CATEGORIES  = new Set<string>(["failure","success","pattern","correction"]);

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRate(ip)) {
    return protectedJson({ error: "rate limited" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const agent    = searchParams.get("agent")    ?? undefined;
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const category = searchParams.get("category") ?? undefined;

  if (agent && !VALID_AGENTS.has(agent)) {
    return protectedJson({ error: "invalid agent" }, { status: 400 });
  }
  if (category && !VALID_CATEGORIES.has(category)) {
    return protectedJson({ error: "invalid category" }, { status: 400 });
  }

  const entries = await readLearnings({
    agent:    agent    as AgentId                    | undefined,
    limit,
    category: category as LearningEntry["category"] | undefined,
  });

  return protectedJson({ entries, count: entries.length });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRate(ip)) {
    return protectedJson({ error: "rate limited" }, { status: 429 });
  }

  try {
    const body = await req.json() as {
      agent?:      string;
      query?:      string;
      answer?:     string;
      outcome?:    "success" | "failure";
      proposedFix?: string;
    };

    const agent = (body.agent ?? "jansky") as AgentId;
    if (!VALID_AGENTS.has(agent)) {
      return protectedJson({ error: "invalid agent" }, { status: 400 });
    }

    const outcome = body.outcome ?? "success";
    let entry: Omit<LearningEntry, "id" | "ts">;

    if (outcome === "failure" && body.query && body.answer) {
      const classified = classifyFailure(agent, body.query, body.answer);
      entry = { ...classified, agent, proposedFix: body.proposedFix, applied: false };
    } else {
      const truncQ = (body.query ?? "").slice(0, 120);
      entry = {
        agent,
        category:  "success",
        queryType: "general",
        summary:   `[${agent.toUpperCase()}] successful response: "${truncQ}"`.slice(0, 200),
        proposedFix: body.proposedFix,
        applied:   false,
      };
    }

    await appendLearning(entry);
    await rotateIfNeeded();

    return protectedJson({ ok: true });
  } catch {
    return protectedJson({ error: "invalid body" }, { status: 400 });
  }
}
