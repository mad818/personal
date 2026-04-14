import { NextRequest } from "next/server";
import { buildInternalApiHeaders } from "@/lib/authSession";
import { getSweepSources } from "@/lib/assimilation/sweep";
import type { SweepTheater } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

function normalizeTheater(value: string | null): SweepTheater {
  if (
    value === "markets" ||
    value === "cyber" ||
    value === "geopolitics" ||
    value === "air-sea" ||
    value === "infra" ||
    value === "watchlist"
  ) {
    return value;
  }
  return "markets";
}

export async function GET(req: NextRequest): Promise<Response> {
  const theater = normalizeTheater(req.nextUrl.searchParams.get("theater"));
  const encoder = new TextEncoder();
  const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const headers = buildInternalApiHeaders();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      push("start", { theater, startedAt: new Date().toISOString() });

      for (const source of getSweepSources(theater)) {
        const startedAt = Date.now();
        try {
          const response = await fetch(new URL(source.endpoint, origin), {
            cache: "no-store",
            headers,
          });
          const payload = (await response.json()) as unknown;
          const count = Array.isArray(payload)
            ? payload.length
            : payload && typeof payload === "object"
              ? Object.keys(payload as Record<string, unknown>).length
              : 0;
          push("source", {
            id: source.id,
            label: source.label,
            count,
            durationMs: Date.now() - startedAt,
            ok: response.ok,
          });
        } catch (error) {
          push("source", {
            id: source.id,
            label: source.label,
            count: 0,
            durationMs: Date.now() - startedAt,
            ok: false,
            message: error instanceof Error ? error.message : "Sweep source failed.",
          });
        }
      }

      push("complete", { theater, completedAt: new Date().toISOString() });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
