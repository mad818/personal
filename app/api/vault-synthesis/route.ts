// ── app/api/vault-synthesis/route.ts ─────────────────────────────────────────
// POST /api/vault-synthesis
// Receives VaultGraphData, returns a VaultSynthesis summary.
// Uses the /api/ai chain (no direct provider calls).
// Rate-limited 5 req/min (synthesis is expensive).

import { NextRequest, NextResponse } from "next/server";
import type { VaultGraphData, VaultSynthesis } from "@/components/home/office/types";
import { callInternalAi } from "@/lib/internalAi";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "rate limited — synthesis is expensive, wait 1 min" }, { status: 429 });
  }

  try {
    const graph = await req.json() as VaultGraphData;

    if (!graph?.nodes || !Array.isArray(graph.nodes)) {
      return NextResponse.json({ error: "invalid graph data" }, { status: 400 });
    }

    const nodeCount   = graph.nodes.length;
    const edgeCount   = graph.edges.length;
    const clusterCount = graph.clusters.length;
    const orphanCount  = graph.orphans.length;

    // Build a compact prompt from the graph structure
    const topClusters = graph.clusters.slice(0, 5).map((cluster, i) => {
      const nodeNames = cluster
        .slice(0, 4)
        .map(id => graph.nodes.find(n => n.id === id)?.title ?? id)
        .join(", ");
      return `  Cluster ${i + 1} (${cluster.length} items): ${nodeNames}${cluster.length > 4 ? "…" : ""}`;
    });

    const topTags = (() => {
      const tagCount: Record<string, number> = {};
      for (const n of graph.nodes) {
        for (const t of n.tags ?? []) {
          tagCount[t] = (tagCount[t] ?? 0) + 1;
        }
      }
      return Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => `${tag}(${count})`)
        .join(", ");
    })();

    const prompt = [
      `You are the Nexus Prime Vault Librarian. Analyze this knowledge graph and provide a concise synthesis.`,
      ``,
      `VAULT STATS:`,
      `  Total items: ${nodeCount}`,
      `  Connections: ${edgeCount}`,
      `  Topic clusters: ${clusterCount}`,
      `  Isolated items: ${orphanCount}`,
      `  Top tags: ${topTags || "none"}`,
      ``,
      `TOP CLUSTERS:`,
      topClusters.join("\n") || "  (no clusters detected)",
      ``,
      `Provide a JSON response with this exact structure:`,
      `{`,
      `  "summary": "2-3 sentence overview of what this vault contains and its main themes",`,
      `  "gaps": ["topic or area with insufficient coverage"],`,
      `  "clusters": ["one-line description of each topic cluster"]`,
      `}`,
    ].join("\n");

    // Call the internal /api/ai endpoint
    const aiResult = await callInternalAi({
      origin: req.nextUrl.origin,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 512,
    });

    if (!aiResult.ok) {
      return NextResponse.json({ error: "AI synthesis failed" }, { status: 502 });
    }

    const content = aiResult.text;

    // Parse JSON from AI response
    let parsed: { summary?: string; gaps?: string[]; clusters?: string[] } = {};
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      // Fallback to plain text
      parsed = { summary: content.slice(0, 300), gaps: [], clusters: [] };
    }

    const synthesis: VaultSynthesis = {
      agentId:   "jansky",
      summary:   parsed.summary   ?? "Unable to synthesize vault contents.",
      gaps:      parsed.gaps      ?? [],
      clusters:  parsed.clusters  ?? [],
      createdAt: Date.now(),
    };

    return NextResponse.json(synthesis, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
