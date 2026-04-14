import { describe, expect, it } from "vitest";
import { resolveAssistantIndexedRetrieval } from "@/lib/assistantIndexedRetrieval";

describe("assistant indexed retrieval", () => {
  it("builds repo-work scaffolding around impact, system, and engineering helpers", () => {
    const result = resolveAssistantIndexedRetrieval({
      input: "Help me refactor components/home/office/OfficeCommandCenter.tsx safely.",
      intent: "repo_work",
      answerStyle: "repo_work",
      routeHint: "/hq",
      filePath: "components/home/office/OfficeCommandCenter.tsx",
    });

    expect(result.capabilityId).toBe("repo-engineering");
    expect(result.documents.some((document) => document.kind === "impact")).toBe(true);
    expect(result.documents.some((document) => document.kind === "playbook")).toBe(true);
    expect(result.documents.some((document) => document.kind === "system")).toBe(true);
  });

  it("builds reverse-engineering continuity docs from RE prompts", () => {
    const result = resolveAssistantIndexedRetrieval({
      input: "Continue that reverse engineering thread from the binary triage lane.",
      intent: "research",
      answerStyle: "workflow",
      routeHint: "/recon",
    });

    expect(result.capabilityId).toBe("reverse-engineering");
    expect(result.documents.some((document) => document.kind === "playbook")).toBe(true);
    expect(result.documents.some((document) => document.kind === "spec")).toBe(true);
    expect(result.documents[0]?.confidence ?? 0).toBeGreaterThan(60);
  });
});
