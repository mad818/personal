import { NextRequest, NextResponse } from "next/server";
import {
  createCompiledMemoryPage,
  getCompiledMemoryPageById,
  listCompiledMemoryPages,
  toCompiledMemoryPageSummary,
  type CompiledMemoryPageSource,
} from "@/lib/memoryPagesStore";
import { turboVecSearch } from "@/lib/localAcceleration";

export const dynamic = "force-dynamic";

function boundedLimit(value: string | null) {
  const parsed = Number(value ?? "20");
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}
function isPageSource(value: unknown): value is CompiledMemoryPageSource {
  return value === "workflow" || value === "manual" || value === "scheduler";
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (id) {
      const page = await getCompiledMemoryPageById(id);
      if (!page) {
        return NextResponse.json({ error: "Compiled page not found." }, { status: 404 });
      }
      return NextResponse.json({ page: toCompiledMemoryPageSummary(page) });
    }

    const limit = boundedLimit(req.nextUrl.searchParams.get("limit"));
    const pages = await listCompiledMemoryPages({
      limit: req.nextUrl.searchParams.get("semanticQuery") ? 160 : limit,
      workflowId: req.nextUrl.searchParams.get("workflowId")?.trim() || undefined,
    });
    const semanticQuery = req.nextUrl.searchParams.get("semanticQuery")?.trim() ?? "";
    if (semanticQuery) {
      const visiblePages = pages.filter((page) => page.visibility !== "restricted");
      try {
        const matches = await turboVecSearch({
          query: semanticQuery,
          limit,
          allowlist: visiblePages.map((page) => page.id),
        });
        if (matches.length > 0) {
          const pageById = new Map(visiblePages.map((page) => [page.id, page]));
          return NextResponse.json({
            pages: matches
              .map((match) => pageById.get(match.id))
              .filter((page): page is NonNullable<typeof page> => Boolean(page))
              .map(toCompiledMemoryPageSummary),
            retrieval: "turbovec",
          });
        }
      } catch {
        // Preserve local keyword fallback when the optional runtime is unavailable.
      }
      const tokens = semanticQuery.toLowerCase().split(/\W+/).filter(Boolean);
      const keywordPages = visiblePages
        .map((page) => ({
          page,
          score: tokens.filter((token) =>
            [page.title, page.summary, page.content, page.tags.join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(token),
          ).length,
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((entry) => toCompiledMemoryPageSummary(entry.page));
      return NextResponse.json({ pages: keywordPages, retrieval: "keyword_fallback" });
    }
    return NextResponse.json({
      pages: pages.map(toCompiledMemoryPageSummary),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read compiled memory pages." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const source = isPageSource(body.source) ? body.source : "manual";
    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required." },
        { status: 400 },
      );
    }

    const page = await createCompiledMemoryPage({
      ...(body as Parameters<typeof createCompiledMemoryPage>[0]),
      title,
      content,
      source,
    });
    return NextResponse.json(
      { page: toCompiledMemoryPageSummary(page) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not create compiled memory page." },
      { status: 500 },
    );
  }
}
