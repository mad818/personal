import { describe, expect, it } from "vitest";
import {
  HQ_WORKFLOW_HELP,
  HQ_WORKFLOW_PROMPTS,
  resolveHQWorkflowCommand,
} from "@/components/home/office/workflowCommands";

describe("resolveHQWorkflowCommand", () => {
  it("returns null for non-workflow input", () => {
    expect(resolveHQWorkflowCommand("hello there")).toBeNull();
    expect(resolveHQWorkflowCommand("@orbit: fix the bug")).toBeNull();
  });

  it("resolves /deepresearch to NOVA and /intel", () => {
    const result = resolveHQWorkflowCommand(
      "/deepresearch AI chip export controls and NVIDIA supplier exposure",
    );
    expect(result?.agent).toBe("nova");
    expect(result?.route).toBe("/intel");
    expect(result?.source).toBe("feynman");
    expect(result?.userPrompt).toContain("deep research workflow");
  });

  it("resolves /brief to JANSKY and /hq", () => {
    const result = resolveHQWorkflowCommand("/brief current operating picture");
    expect(result?.agent).toBe("jansky");
    expect(result?.route).toBe("/hq");
    expect(result?.systemDirective).toContain("OPERATOR BRIEF");
  });

  it("resolves /threat-hunt to CIPHER and /cyber", () => {
    const result = resolveHQWorkflowCommand(
      "/threat-hunt suspicious outbound traffic",
    );
    expect(result?.agent).toBe("cipher");
    expect(result?.route).toBe("/cyber");
    expect(result?.systemDirective).toContain("DEFENSIVE THREAT HUNT");
  });

  it("supports aliases and fallback topics", () => {
    const litReview = resolveHQWorkflowCommand("/litreview");
    expect(litReview?.id).toBe("lit-review");
    expect(litReview?.topic.length).toBeGreaterThan(0);

    const evidencePack = resolveHQWorkflowCommand("/evidencepack");
    expect(evidencePack?.id).toBe("evidence-pack");
    expect(evidencePack?.topic.length).toBeGreaterThan(0);
  });
});

describe("workflow command discoverability", () => {
  it("exports example prompts for the strategium", () => {
    expect(HQ_WORKFLOW_PROMPTS.length).toBeGreaterThanOrEqual(6);
    expect(HQ_WORKFLOW_PROMPTS.some((prompt) => prompt.prompt.startsWith("/deepresearch"))).toBe(true);
    expect(HQ_WORKFLOW_PROMPTS.some((prompt) => prompt.prompt.startsWith("/threat-hunt"))).toBe(true);
  });

  it("exports a compact help string", () => {
    expect(HQ_WORKFLOW_HELP).toContain("/deepresearch");
    expect(HQ_WORKFLOW_HELP).toContain("/evidence-pack");
  });
});
