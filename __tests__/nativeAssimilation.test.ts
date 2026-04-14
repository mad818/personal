import { describe, expect, it } from "vitest";
import {
  buildBrowserOpsReadinessSnapshot,
  buildCapabilityAuditSummary,
  buildMemoryLifecycleSummary,
  buildWorkflowOpsSnapshot,
} from "@/lib/nativeAssimilation";
import type { ScheduledJob, AgentRuntime } from "@/store/useStore";
import type { UnfinishedSessionMemory } from "@/lib/assistantSessionMemory";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";

const runtime: AgentRuntime = {
  runId: "run-live",
  status: "running",
  currentPhase: "executing",
  startedAt: Date.now() - 120000,
  phaseStartedAt: Date.now() - 45000,
  phaseDurations: { planning: 15000 },
  verification: {
    required: true,
    attempted: false,
    passed: true,
    adapters: [],
    details: [],
  },
  contextChars: 1940,
  contextCompacted: true,
};

const jobs: ScheduledJob[] = [
  {
    id: "job-deepresearch",
    name: "Morning deep research",
    prompt: "Run deep research on operator posture and queue pressure.",
    cron: "0 9 * * 1-5",
    enabled: true,
    type: "mission",
    outputTarget: "review",
    approvalPolicy: "human_gate",
    templateId: "deepresearch",
    missionAgent: "nova",
    lastStatus: "queued",
  },
  {
    id: "job-brief",
    name: "Operator brief",
    prompt: "Build a compact operator brief for the active fronts.",
    cron: "0 8 * * *",
    enabled: true,
    type: "mission",
    outputTarget: "vault",
    approvalPolicy: "human_gate",
    templateId: "brief",
    missionAgent: "jansky",
    lastStatus: "ok",
    lastSummary: "Operator brief compiled and filed for review.",
  },
];

const unfinishedSessions: UnfinishedSessionMemory[] = [
  {
    href: "/vault?focus=vault-memory-project",
    label: "Project memory",
    detail: "Resume the promoted project-memory trail.",
    intent: "conversation",
    sourceQuery: "prior implementation notes",
    lastUsedAt: Date.now() - 1000 * 60 * 12,
    confidence: 88,
    capability: null,
    artifactClass: "archive",
    continuationValue: 92,
    completionState: "prepared",
  },
];

describe("native assimilation helpers", () => {
  it("builds a deterministic workflow ops snapshot with queue, runtime, and handoff posture", () => {
    const snapshot = buildWorkflowOpsSnapshot({
      jobs,
      runtime,
      unfinishedSessions,
      workflowCatalog: HQ_WORKFLOW_CATALOG,
    });

    expect(snapshot.activeCount).toBe(1);
    expect(snapshot.queuedCount).toBe(1);
    expect(snapshot.handoffCount).toBe(1);
    expect(snapshot.ownerCount).toBeGreaterThanOrEqual(2);
    expect(snapshot.items[1]?.note).toContain("Deep research");
    expect(snapshot.items.some((item) => item.status === "handoff")).toBe(true);
  });

  it("summarizes memory lifecycle backlog, citations, and reopen posture", () => {
    const summary = buildMemoryLifecycleSummary({
      total: 6,
      latestUpdatedAt: Date.now(),
      countsByLayer: {
        raw: 3,
        knowledge: 1,
        output: 2,
      },
      countsByVisibility: {
        safe: 3,
        internal: 2,
        restricted: 1,
      },
      items: [
        {
          id: "page-1",
          layer: "output",
          kind: "page",
          title: "Compiled page",
        summary: "Compiled output",
        sourceLabel: "Workflow page",
        domain: "ops",
        tags: ["workflow"],
        timestamp: Date.now(),
        visibility: "internal",
        citationId: "NX-OUT-PAG-0001",
        lifecycle: "reopen_candidate",
        nextAction: "reopen",
        sensitivityTags: [],
      },
    ],
  });

  expect(summary.compactionBacklog).toBe(2);
  expect(summary.promotedCount).toBe(3);
  expect(summary.promotionReadyCount).toBe(0);
  expect(summary.citationReadyCount).toBe(1);
  expect(summary.reopenReadyCount).toBeGreaterThan(0);
  expect(summary.freshnessLabel).toBeTruthy();
  expect(summary.nextMove).toContain("Compact");
});

  it("keeps browser ops guarded by default and marks the companion ready only when configured", () => {
    const guarded = buildBrowserOpsReadinessSnapshot({
      networkMode: "internal",
    });
    const companion = buildBrowserOpsReadinessSnapshot({
      networkMode: "internal",
      lightpandaEndpoint: "http://127.0.0.1:8123/ws",
    });

    expect(guarded.state).toBe("standby");
    expect(guarded.mode).toBe("native_guarded");
    expect(companion.state).toBe("companion_ready");
    expect(companion.endpointLabel).toContain("127.0.0.1");
  });

  it("adds browser posture to recon-style capability audits without requiring a separate dashboard", () => {
    const audit = buildCapabilityAuditSummary({
      surfaceId: "recon",
      skills: [
        { level: 76, successRate: 0.82 },
        { level: 70, successRate: 0.74 },
      ],
      scheduledJobs: jobs,
      memoryTotal: 9,
      workflowCatalogCount: HQ_WORKFLOW_CATALOG.length,
      browserOps: buildBrowserOpsReadinessSnapshot({
        networkMode: "internal",
      }),
      contextLoadReport: null,
    });

    expect(audit.signals.some((signal) => signal.id === "browser")).toBe(true);
    expect(audit.nextMoves.some((move) => move.includes("Lightpanda"))).toBe(
      true,
    );
  });
});
