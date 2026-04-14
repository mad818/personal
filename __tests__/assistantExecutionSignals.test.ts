import { describe, expect, it } from "vitest";
import {
  buildAssistantArchiveCue,
  buildAssistantExecutionAttachment,
  detectAssistantRiskyWork,
} from "@/lib/assistantExecutionSignals";

describe("assistant execution signals", () => {
  it("detects high-blast-radius repo work and prepares bounded execution context", () => {
    const attachment = buildAssistantExecutionAttachment({
      input: "Help me refactor auth middleware and provider routing for lib/ai.ts safely.",
      intent: "repo_work",
      capabilityId: "repo-engineering",
      routeHint: "/hq",
      filePath: "lib/ai.ts",
      systemId: "ai-runtime-boundary",
      playbookId: "security-boundary-audit",
      specId: "api-integration",
      hasImpactSeed: true,
    });

    expect(attachment.signal.risky).toBe(true);
    expect(attachment.preferredPreparedHref).toBe(
      "/resources?view=impact&file=lib%2Fai.ts",
    );
    expect(attachment.cue?.title).toBe("Execution context attached");
    expect(attachment.cue?.kind).toBe("execution");
    expect(attachment.cue?.href).toBe("/resources?view=impact&file=lib%2Fai.ts");
  });

  it("stays quiet for low-risk conversational turns", () => {
    const signal = detectAssistantRiskyWork({
      input: "Hello there",
      intent: "conversation",
      capabilityId: "conversation-general",
    });

    expect(signal.risky).toBe(false);
    expect(signal.confidence).toBeLessThan(60);
  });

  it("surfaces a compact archive cue when continuity already exists", () => {
    const cue = buildAssistantArchiveCue({
      input: "continue that reverse-engineering thread",
      capabilityId: "reverse-engineering",
      unfinishedSession: {
        href: "/recon?view=binary&focus=recon-binary",
        label: "Open binary triage",
        detail: "Prepared binary triage.",
        intent: "research",
        sourceQuery: "continue that reverse-engineering thread",
        lastUsedAt: Date.now(),
        confidence: 92,
        capability: "reverse-engineering",
        artifactClass: "reverse_engineering",
        continuationValue: 96,
        completionState: "active",
      },
      preparedWorkspaceHref:
        "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
    });

    expect(cue?.title).toBe("Archive continuity");
    expect(cue?.detail).toContain("reverse-engineering continuity");
    expect(cue?.kind).toBe("archive");
  });
});
