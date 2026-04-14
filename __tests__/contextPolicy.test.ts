import { describe, expect, it } from "vitest";
import {
  BASELINE_CONTEXT_BUDGET,
  CONTEXT_LANE_BUDGETS,
  renderContextBundle,
  resolveContextLane,
  selectContextAssets,
} from "@/lib/contextPolicy";
import { resolveWorkflowPackId } from "@/lib/workflowPacks";

describe("context policy", () => {
  it("maps repo engineering turns into the repo_work lane", () => {
    const lane = resolveContextLane({
      answerStyle: "repo_work",
      assistantIntent: "repo_work",
      capabilityId: "repo-engineering",
      query: "Fix the auth redirect in HQ",
      learningMission: null,
    });

    expect(lane).toBe("repo_work");
  });

  it("keeps baseline turns limited to agents, state, and one assistant context pack", () => {
    const manifest = selectContextAssets({
      query: "hello there",
      answerStyle: "conversational",
      assistantIntent: "conversation",
      capabilityId: "conversation-general",
      workflowPackId: null,
    });

    expect(manifest.assets.map((asset) => asset.id)).toEqual([
      "agents",
      "state",
      "assistant_context",
    ]);
    expect(manifest.assets.some((asset) => asset.id === "bible")).toBe(false);
  });

  it("keeps live-current turns free of study and research packs by default", () => {
    const manifest = selectContextAssets({
      query: "What changed in crypto today?",
      answerStyle: "live_current",
      assistantIntent: "live_current",
      capabilityId: "live-markets",
      workflowPackId: null,
      includeLiveContext: true,
      hasVerificationDocs: true,
    });

    expect(manifest.lane).toBe("live_current");
    expect(manifest.assets.map((asset) => asset.id)).toEqual([
      "agents",
      "state",
      "live_intel",
      "assistant_context",
      "retrieval_docs",
    ]);
  });

  it("loads process, engineering, and one route-aware standards slice for repo work", () => {
    const manifest = selectContextAssets({
      query: "Refactor the HQ shell UI safely",
      answerStyle: "repo_work",
      assistantIntent: "repo_work",
      capabilityId: "repo-engineering",
      workflowPackId: null,
      filePath: "components/home/office/OfficeCommandCenter.tsx",
      includeLessons: true,
      hasPreparedWorkspace: true,
    });
    const standards = manifest.assets.find((asset) => asset.id === "standards");

    expect(standards?.slices).toEqual(["process", "engineering", "ui"]);
  });

  it("selects only one workflow pack, one continuity layer, and one verification layer", () => {
    const workflowPackId = resolveWorkflowPackId({
      assistantIntent: "research",
      capabilityId: "reverse-engineering",
      learningMission: null,
      query: "Survey what we know about this binary sample",
    });
    const manifest = selectContextAssets({
      query: "Survey what we know about this binary sample",
      answerStyle: "workflow",
      assistantIntent: "research",
      capabilityId: "reverse-engineering",
      workflowPackId,
      hasMinedMemory: true,
      hasPreparedWorkspace: true,
      hasVerificationDocs: true,
    });

    expect(manifest.assets.filter((asset) => asset.id === "workflow_pack")).toHaveLength(1);
    expect(
      manifest.assets.filter(
        (asset) =>
          asset.bucket === "continuity" &&
          (asset.id === "mined_memory" || asset.id === "continuation"),
      ),
    ).toHaveLength(1);
    expect(
      manifest.assets.filter((asset) => asset.bucket === "verification"),
    ).toHaveLength(1);
  });

  it("enforces the baseline and lane budgets when rendering", () => {
    const manifest = selectContextAssets({
      query: "How should we ship Nexus next?",
      answerStyle: "workflow",
      assistantIntent: "research",
      capabilityId: "repo-engineering",
      workflowPackId: "research-workflow",
      hasMinedMemory: true,
      hasPreparedWorkspace: true,
      hasVerificationDocs: true,
    });
    const longText = "X".repeat(6000);
    const rendered = renderContextBundle({
      manifest,
      contentByAsset: {
        agents: longText,
        state: longText,
        workflow_pack: longText,
        assistant_context: longText,
        mined_memory: longText,
        retrieval_docs: longText,
        prepared_workspace: longText,
      },
    });

    expect(rendered.report.baselineChars).toBeLessThanOrEqual(BASELINE_CONTEXT_BUDGET);
    expect(rendered.report.laneChars).toBeLessThanOrEqual(
      CONTEXT_LANE_BUDGETS[manifest.lane],
    );
  });
});
