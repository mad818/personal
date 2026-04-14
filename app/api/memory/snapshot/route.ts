import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { syncPersistedMemorySpineClientState } from "@/lib/memorySpineStore";
import type { AgentRunArtifact, Article, ModeBriefing } from "@/store/useStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      savedArticles?: Article[];
      agentRunHistory?: AgentRunArtifact[];
      modeBriefings?: ModeBriefing[];
    };

    if (
      !Array.isArray(body.savedArticles) ||
      !Array.isArray(body.agentRunHistory) ||
      !Array.isArray(body.modeBriefings)
    ) {
      return protectedJson({ error: "invalid memory snapshot body" }, { status: 400 });
    }

    const persisted = await syncPersistedMemorySpineClientState({
      savedArticles: body.savedArticles,
      agentRunHistory: body.agentRunHistory,
      modeBriefings: body.modeBriefings,
    });

    return protectedJson({
      ok: true,
      syncedAt: persisted.syncedAt,
      counts: {
        raw: body.savedArticles.length,
        outputs: body.agentRunHistory.length + body.modeBriefings.length,
      },
    });
  } catch {
    return protectedJson({ error: "invalid memory snapshot body" }, { status: 400 });
  }
}
