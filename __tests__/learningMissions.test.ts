import { describe, expect, it } from "vitest";
import {
  buildLearningMissionPromptBlock,
  detectLearningMission,
  isLearningPrompt,
} from "@/lib/learningMissions";

describe("learning missions", () => {
  it("detects guided-learning prompts and assigns a tutor profile", () => {
    const mission = detectLearningMission(
      "Teach me how reverse engineering triage works",
    );

    expect(isLearningPrompt("Teach me how reverse engineering triage works")).toBe(true);
    expect(mission?.mode).toBe("teach");
    expect(mission?.profile).toBe("reverse-engineering-tutor");
    expect(mission?.preparedWorkspaceHref).toContain("/vault?focus=vault-memory-project");
  });

  it("builds a compact learning prompt block", () => {
    const mission = detectLearningMission("Quiz me on the memory spine");
    const block = buildLearningMissionPromptBlock(mission);

    expect(block).toContain("[GUIDED LEARNING MISSION]");
    expect(block).toContain("Mode: quiz");
  });

  it("routes research workflow prompts into the research pack with source-aware memory", () => {
    const mission = detectLearningMission(
      "Review the sources for local-first memory mining",
    );

    expect(mission?.workflowPackId).toBe("research-workflow");
    expect(mission?.mode).toBe("source-review");
    expect(mission?.memoryCompartment).toBe("research");
    expect(mission?.sourceAware).toBe(true);
    expect(mission?.preparedWorkspaceHref).toContain("/vault?focus=vault-memory-research");
  });
});
