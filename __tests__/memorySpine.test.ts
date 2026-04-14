import { describe, expect, it } from "vitest";
import {
  buildMemorySpineSnapshot,
  materializeMemorySpineItem,
  searchMemorySpine,
} from "@/lib/memorySpine";
import type { LearningEntry } from "@/lib/agentLearnings";
import type { AgentRunArtifact, Article, ModeBriefing } from "@/store/useStore";

const savedArticles: Article[] = [
  {
    id: "article-1",
    title: "CVE feed shifts toward active exploitation",
    desc: "Security teams tracked a new threat cluster and response timeline.",
    link: "https://example.com/cve",
    date: "2026-04-05T12:00:00.000Z",
    src: "Example Wire",
    tags: ["cve", "threat"],
  },
];

const agentLearnings: Record<string, LearningEntry[]> = {
  orbit: [
    {
      id: "learn-1",
      ts: Date.parse("2026-04-05T14:00:00.000Z"),
      agent: "orbit",
      category: "pattern",
      queryType: "planning",
      summary: "Mission planning works better when the checklist is included up front.",
      proposedFix: "Inject the checklist before generating the final plan.",
      applied: false,
    },
  ],
};

const agentRunHistory: AgentRunArtifact[] = [
  {
    runId: "run-1",
    runtimeEngine: "nexus",
    startedAt: Date.parse("2026-04-05T14:30:00.000Z"),
    finishedAt: Date.parse("2026-04-05T14:35:00.000Z"),
    userMessage: "Generate a cyber incident brief for the latest threat cluster.",
    finalAnswer: "Produced a concise incident brief with key indicators and next actions.",
    verificationSummary: "verify green",
    contextChars: 1820,
    contextCompacted: true,
    toolTraces: [
      {
        tool: "web_search",
        risk: "tier0",
        input: "latest threat cluster incident brief",
      },
    ],
    efficiency: {
      contextScope: "agent_scoped",
      systemPromptChars: 420,
      liveContextChars: 530,
      liveContextCompacted: true,
      memoryDiffChars: 100,
      memoryContextChars: 220,
      ragChars: 120,
      lessonsChars: 80,
      toolCatalogCount: 4,
      toolCatalogChars: 360,
      toolPackId: "research-pack",
      readCacheHits: 2,
      duplicateReadCount: 0,
    },
  },
  {
    runId: "run-2",
    runtimeEngine: "nexus",
    startedAt: Date.parse("2026-04-05T14:10:00.000Z"),
    finishedAt: Date.parse("2026-04-05T14:20:00.000Z"),
    userMessage: "Store the API key in .env and keep the bearer token handy.",
    finalAnswer: "Added bearer token=super-secret-value and updated C:\\secure\\.env.local for later use.",
    verificationSummary: "verify green",
    contextChars: 980,
    contextCompacted: true,
    toolTraces: [
      {
        tool: "write_file",
        risk: "tier1",
        input: "store sensitive values",
      },
    ],
    efficiency: {
      contextScope: "agent_scoped",
      systemPromptChars: 300,
      liveContextChars: 280,
      liveContextCompacted: true,
      memoryDiffChars: 50,
      memoryContextChars: 120,
      ragChars: 0,
      lessonsChars: 40,
      toolCatalogCount: 3,
      toolCatalogChars: 210,
      toolPackId: "write-pack",
      readCacheHits: 0,
      duplicateReadCount: 0,
    },
  },
];

const modeBriefings: ModeBriefing[] = [
  {
    id: "brief-1",
    mode: "war",
    jobId: "job-1",
    jobName: "Night watch",
    status: "ok",
    summary: "War mode briefing summarized the current threat and weather posture.",
    relatedTab: "CYBER",
    createdAt: Date.parse("2026-04-05T15:00:00.000Z"),
  },
];

describe("memory spine", () => {
  it("builds a layered snapshot from existing durable sources", () => {
    const snapshot = buildMemorySpineSnapshot({
      savedArticles,
      agentLearnings,
      agentRunHistory,
      modeBriefings,
    });

    expect(snapshot.total).toBe(5);
    expect(snapshot.countsByLayer.raw).toBe(1);
    expect(snapshot.countsByLayer.knowledge).toBe(1);
    expect(snapshot.countsByLayer.output).toBe(3);
    expect(snapshot.countsByDomain.cyber).toBeGreaterThan(0);
    expect(snapshot.countsByVisibility.safe).toBe(1);
    expect(snapshot.countsByVisibility.internal).toBe(3);
    expect(snapshot.countsByVisibility.restricted).toBe(1);
    expect(snapshot.latestUpdatedAt).toBe(modeBriefings[0].createdAt);
    expect(snapshot.items[0]?.citationId).toMatch(/^NX-/);
  });

  it("filters by layer and ranks matching memory entries", () => {
    const snapshot = buildMemorySpineSnapshot({
      savedArticles,
      agentLearnings,
      agentRunHistory,
      modeBriefings,
    });

    const planningResults = searchMemorySpine(snapshot, {
      query: "checklist plan",
      layer: "knowledge",
      limit: 5,
    });

    expect(planningResults).toHaveLength(1);
    expect(planningResults[0]?.id).toBe("learning:learn-1");
    expect(planningResults[0]?.layer).toBe("knowledge");
    expect(planningResults[0]?.visibility).toBe("internal");
  });

  it("returns newest items first when no query is supplied", () => {
    const snapshot = buildMemorySpineSnapshot({
      savedArticles,
      agentLearnings,
      agentRunHistory,
      modeBriefings,
    });

    const recentResults = searchMemorySpine(snapshot, {
      layer: "all",
      limit: 2,
    });

    expect(recentResults).toHaveLength(2);
    expect(recentResults[0]?.id).toBe("briefing:brief-1");
    expect(recentResults[1]?.id).toBe("run:run-1");
  });

  it("withholds restricted artifacts from broad search by default", () => {
    const snapshot = buildMemorySpineSnapshot({
      savedArticles,
      agentLearnings,
      agentRunHistory,
      modeBriefings,
    });

    const tokenResults = searchMemorySpine(snapshot, {
      query: "token",
      layer: "all",
      limit: 5,
    });

    expect(tokenResults).toHaveLength(0);
    expect(
      snapshot.items.find((item) => item.id === "run:run-2")?.visibility,
    ).toBe("restricted");
    expect(
      snapshot.items.find((item) => item.id === "run:run-2")?.summary,
    ).toContain("withheld");
    expect(
      snapshot.items.find((item) => item.id === "run:run-2")?.lifecycle,
    ).toBe("sensitive_hold");
    expect(
      snapshot.items.find((item) => item.id === "run:run-2")?.nextAction,
    ).toBe("review");
  });

  it("marks compiled pages restricted when sensitive content appears only in the body", () => {
    const item = materializeMemorySpineItem(
      {
        id: "page:test",
        layer: "knowledge",
        kind: "page",
        title: "Research memo",
        summary: "Operator summary without obvious secrets.",
        sourceLabel: "Workflow page · Deep research",
        domain: "intel",
        tags: ["workflow-artifact", "deepresearch"],
        timestamp: Date.now(),
      },
      {
        extraText: "See tasks/memory-pages.json and C:\\Users\\mario\\.ssh\\id_rsa for details.",
      },
    );

    expect(item.visibility).toBe("restricted");
    expect(item.summary).toContain("withheld");
    expect(item.citationId).toMatch(/^NX-/);
    expect(item.sensitivityTags).toContain("protected-path");
  });
});
