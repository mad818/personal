import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import {
  buildMinedMemoryPromptBlock,
  mineMemorySpine,
  type MemoryCompartment,
} from "@/lib/memoryMining";
import { readPersistedMemorySpineSources } from "@/lib/memorySpineStore";

export const dynamic = "force-dynamic";

const VALID_COMPARTMENTS = new Set<MemoryCompartment>([
  "project",
  "conversation",
  "general",
  "research",
  "study",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const compartmentParam = searchParams.get("compartment")?.trim() ?? "";
  const compartment = VALID_COMPARTMENTS.has(compartmentParam as MemoryCompartment)
    ? (compartmentParam as MemoryCompartment)
    : null;
  const limit = Math.min(
    8,
    Math.max(1, parseInt(searchParams.get("limit") ?? "4", 10) || 4),
  );

  if (!query) {
    return protectedJson(
      { error: "memory mine requires a non-empty query" },
      { status: 400 },
    );
  }

  const { items, syncedAt } = await readPersistedMemorySpineSources();
  const mined = mineMemorySpine(items, {
    query,
    limit,
    compartment,
  });

  return protectedJson({
    status: "ok",
    query,
    compartment,
    mined,
    syncedAt,
    summary: buildMinedMemoryPromptBlock(mined),
    verifiedFacts: mined.flatMap((entry) => (entry.inferred ? [] : entry.facts)).slice(0, 8),
    inferred: mined.filter((entry) => entry.inferred).map((entry) => entry.title),
    gaps:
      mined.length === 0
        ? ["No strong local memory match was found for this query."]
        : mined.some((entry) => entry.inferred)
          ? ["Some mined memory is inferred carry-forward and should not be treated as sourced fact."]
          : [],
  });
}
