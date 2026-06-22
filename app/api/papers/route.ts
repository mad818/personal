import { NextResponse } from "next/server";
import { createCache } from "@/lib/apiCache";
import {
  fetchHuggingFaceDailyPapers,
  normalizePapersQuery,
  type PapersResearchResponse,
} from "@/lib/papersResearch";

export const dynamic = "force-dynamic";

const cache = createCache<PapersResearchResponse>({
  defaultTTL: 300_000,
  registryId: "papers",
});

/**
 * GET /api/papers?q=...
 * Bounded HuggingFace daily papers lane for INTEL research tooling.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizePapersQuery(searchParams.get("q") ?? "");
  const cacheKey = query ? `q:${query.toLowerCase()}` : "all";
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const response = await fetchHuggingFaceDailyPapers(query);
  if (response.status !== "error") {
    cache.set(cacheKey, response);
  }
  return NextResponse.json(response);
}
