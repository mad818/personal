import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import {
  createCompiledMemoryPage,
  getCompiledMemoryPageById,
  listCompiledMemoryPages,
  toCompiledMemoryPageSummary,
} from "@/lib/memoryPagesStore";
import type { LearningMissionMode, TutorProfileId } from "@/lib/learningMissions";
import type { MemoryCompartment } from "@/lib/memoryMining";
import type {
  EvidenceStrength,
  ResearchSourceRef,
  ResearchSourceType,
  WorkflowPackId,
} from "@/lib/researchSources";
import type {
  MemoryDomain,
  MemoryLayer,
  MemoryVisibility,
} from "@/lib/memorySpine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  if (id) {
    const page = await getCompiledMemoryPageById(id);
    if (!page) {
      return protectedJson({ error: "compiled memory page not found" }, { status: 404 });
    }

    return protectedJson({
      status: "ok",
      page: toCompiledMemoryPageSummary(page),
    });
  }

  const limit = Math.min(
    24,
    Math.max(1, parseInt(searchParams.get("limit") ?? "8", 10) || 8),
  );
  const workflowId = searchParams.get("workflowId")?.trim() || undefined;
  const pages = await listCompiledMemoryPages({ limit, workflowId });

  return protectedJson({
    status: "ok",
    count: pages.length,
    pages: pages.map(toCompiledMemoryPageSummary),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: string;
      summary?: string;
      content?: string;
      source?: "workflow" | "manual" | "scheduler";
      sourceLabel?: string;
      workflowId?: string;
      workflowLabel?: string;
      agentId?: string;
      route?: string;
      topic?: string;
      tags?: string[];
      layer?: MemoryLayer;
      domain?: MemoryDomain;
      requestedVisibility?: MemoryVisibility;
      memoryCompartment?: MemoryCompartment;
      learningMissionMode?: LearningMissionMode;
      tutorProfile?: TutorProfileId;
      workflowPackId?: WorkflowPackId;
      repoMemoryBinding?: string;
      sourceRefs?: ResearchSourceRef[];
      sourceType?: ResearchSourceType;
      evidenceStrength?: EvidenceStrength;
      documentOriginLabel?: string;
      documentMimeType?: string;
      documentPageCount?: number;
    };

    if (
      typeof body.title !== "string" ||
      typeof body.content !== "string" ||
      body.title.trim().length === 0 ||
      body.content.trim().length === 0
    ) {
      return protectedJson({ error: "invalid compiled memory page body" }, { status: 400 });
    }

    const page = await createCompiledMemoryPage({
      title: body.title,
      summary: body.summary,
      content: body.content,
      source: body.source ?? "manual",
      sourceLabel: body.sourceLabel,
      workflowId: body.workflowId,
      workflowLabel: body.workflowLabel,
      agentId: body.agentId,
      route: body.route,
      topic: body.topic,
      tags: Array.isArray(body.tags) ? body.tags : [],
      layer: body.layer,
      domain: body.domain,
      requestedVisibility: body.requestedVisibility,
      memoryCompartment: body.memoryCompartment,
      learningMissionMode: body.learningMissionMode,
      tutorProfile: body.tutorProfile,
      workflowPackId: body.workflowPackId,
      repoMemoryBinding:
        typeof body.repoMemoryBinding === "string"
          ? body.repoMemoryBinding
          : undefined,
      sourceRefs: Array.isArray(body.sourceRefs) ? body.sourceRefs : undefined,
      sourceType: body.sourceType,
      evidenceStrength: body.evidenceStrength,
      documentOriginLabel:
        typeof body.documentOriginLabel === "string"
          ? body.documentOriginLabel
          : undefined,
      documentMimeType:
        typeof body.documentMimeType === "string"
          ? body.documentMimeType
          : undefined,
      documentPageCount:
        typeof body.documentPageCount === "number"
          ? body.documentPageCount
          : undefined,
    });

    return protectedJson({
      ok: true,
      page: toCompiledMemoryPageSummary(page),
    });
  } catch {
    return protectedJson({ error: "invalid compiled memory page body" }, { status: 400 });
  }
}
