import { describe, expect, it } from "vitest";
import { buildArtifactContinuityMetadata } from "@/lib/artifactContinuity";
import {
  buildArtifactPromotionDraft,
  findExistingPromotionTarget,
  getArtifactPromotionEvaluation,
} from "@/lib/artifactPromotion";

describe("artifact promotion", () => {
  it("reopens an existing reverse-engineering brief for the same continuity identity", () => {
    const prep = {
      id: "prep-1",
      title: "Binary triage · sample.exe",
      summary: "Portable Executable with hashes and IOC candidates.",
      content:
        "## Hashes\n- SHA-256: deadbeefdeadbeef\n## IOC candidates\n- URLs: https://example.com",
      sourceLabel: "Binary triage report",
      route: "/recon",
      topic: "Binary triage",
      workflowId: "binary-triage",
      workflowLabel: "Binary triage",
      layer: "knowledge" as const,
      domain: "cyber",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      continuity: buildArtifactContinuityMetadata({
        title: "Binary triage · sample.exe",
        summary: "Portable Executable with hashes and IOC candidates.",
        content:
          "## Hashes\n- SHA-256: deadbeefdeadbeef\n## IOC candidates\n- URLs: https://example.com",
        route: "/recon",
        topic: "Binary triage",
        sourceLabel: "Binary triage report",
        workflowId: "binary-triage",
        workflowLabel: "Binary triage",
        tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      }),
      researchSignals: {
        sourceCount: 0,
        citationCount: 0,
        structure: "light" as const,
        referencedDomains: [],
        sectionHeadings: [],
        documentHints: [],
      },
    };
    const existingBrief = {
      ...prep,
      id: "brief-1",
      title: "Reverse-engineering brief · sample.exe",
      topic: "Reverse engineering brief",
      sourceLabel: "Reverse engineering brief",
      tags: ["reverse-engineering-brief", "derived-from-binary-triage", "pe"],
      continuity: buildArtifactContinuityMetadata({
        title: "Reverse-engineering brief · sample.exe",
        summary: "Higher-order analyst brief derived from the same sample.",
        content: "## Hashes\n- SHA-256: deadbeefdeadbeef",
        route: "/recon",
        topic: "Reverse engineering brief",
        sourceLabel: "Reverse engineering brief",
        tags: ["reverse-engineering-brief", "derived-from-binary-triage", "pe"],
      }),
    };

    const evaluation = getArtifactPromotionEvaluation(prep);
    const existing = findExistingPromotionTarget(prep, [existingBrief]);

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.targetClass).toBe("reverse_engineering_brief");
    expect(existing?.id).toBe("brief-1");
  });

  it("creates a research brief draft only for evidence-backed research artifacts", () => {
    const researchArtifact = {
      id: "research-1",
      title: "Threat hunt research pack",
      summary: "Structured findings with citations and follow-up sections.",
      content:
        "## Findings\n- Lateral movement pattern observed.\nSource: https://example.com/report",
      sourceLabel: "Workflow page · Deep research",
      route: "/vault",
      topic: "Research pack",
      workflowId: "deepresearch",
      workflowLabel: "Deep research",
      layer: "knowledge" as const,
      domain: "cyber",
      tags: ["research", "compiled"],
      continuity: buildArtifactContinuityMetadata({
        title: "Threat hunt research pack",
        summary: "Structured findings with citations and follow-up sections.",
        content:
          "## Findings\n- Lateral movement pattern observed.\nSource: https://example.com/report",
        route: "/vault",
        topic: "Research pack",
        sourceLabel: "Workflow page · Deep research",
        workflowId: "deepresearch",
        workflowLabel: "Deep research",
        tags: ["research", "compiled"],
      }),
      researchSignals: {
        sourceCount: 3,
        citationCount: 2,
        structure: "structured" as const,
        referencedDomains: ["example.com"],
        sectionHeadings: ["Findings", "Next steps"],
        documentHints: ["briefing"],
      },
    };

    const evaluation = getArtifactPromotionEvaluation(researchArtifact);
    const draft = buildArtifactPromotionDraft(researchArtifact);

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.targetClass).toBe("research_brief");
    expect(draft?.title).toContain("Research brief");
    expect(draft?.tags).toContain("research-brief");
  });

  it("keeps low-evidence research artifacts non-promotable", () => {
    const weakResearchArtifact = {
      id: "research-2",
      title: "Research scratchpad",
      summary: "Loose notes without citations.",
      content: "Initial thoughts only.",
      sourceLabel: "Workflow page · Deep research",
      route: "/vault",
      topic: "Research scratchpad",
      workflowId: "deepresearch",
      workflowLabel: "Deep research",
      layer: "knowledge" as const,
      domain: "cyber",
      tags: ["research", "compiled"],
      continuity: buildArtifactContinuityMetadata({
        title: "Research scratchpad",
        summary: "Loose notes without citations.",
        content: "Initial thoughts only.",
        route: "/vault",
        topic: "Research scratchpad",
        sourceLabel: "Workflow page · Deep research",
        workflowId: "deepresearch",
        workflowLabel: "Deep research",
        tags: ["research", "compiled"],
      }),
      researchSignals: {
        sourceCount: 1,
        citationCount: 0,
        structure: "light" as const,
        referencedDomains: [],
        sectionHeadings: [],
        documentHints: [],
      },
    };

    const evaluation = getArtifactPromotionEvaluation(weakResearchArtifact);

    expect(evaluation.eligible).toBe(false);
    expect(buildArtifactPromotionDraft(weakResearchArtifact)).toBeNull();
  });

  it("reopens an existing study brief for the same learning continuity", () => {
    const learningNote = {
      id: "learn-1",
      title: "Learning note · memory spine",
      summary: "Teach the memory spine with a compact checkpoint.",
      content: "## Concept\n- Memory spine keeps durable context.\n## Checkpoint\n- Explain raw, knowledge, and output layers.",
      sourceLabel: "Guided learning",
      route: "/skills",
      topic: "Memory spine",
      workflowId: "guided-learning",
      workflowLabel: "Guided learning",
      layer: "knowledge" as const,
      domain: "engineering",
      tags: ["learning-note", "memory-spine"],
      continuity: buildArtifactContinuityMetadata({
        title: "Learning note · memory spine",
        summary: "Teach the memory spine with a compact checkpoint.",
        content: "## Concept\n- Memory spine keeps durable context.\n## Checkpoint\n- Explain raw, knowledge, and output layers.",
        route: "/skills",
        topic: "Memory spine",
        sourceLabel: "Guided learning",
        workflowId: "guided-learning",
        workflowLabel: "Guided learning",
        tags: ["learning-note", "memory-spine"],
        memoryCompartment: "conversation",
        learningMissionMode: "teach",
        tutorProfile: "concept-tutor",
      }),
      researchSignals: {
        sourceCount: 0,
        citationCount: 0,
        structure: "structured" as const,
        referencedDomains: [],
        sectionHeadings: ["Concept", "Checkpoint"],
        documentHints: [],
      },
    };
    const existingStudyBrief = {
      ...learningNote,
      id: "study-1",
      title: "Study brief · memory spine",
      topic: "Study brief",
      sourceLabel: "Study brief",
      tags: ["study-brief", "derived-from-learning-note"],
      continuity: buildArtifactContinuityMetadata({
        title: "Study brief · memory spine",
        summary: "Higher-order study brief derived from the same learning note.",
        content: "## Scope\n- Memory spine study brief.",
        route: "/vault",
        topic: "Study brief",
        sourceLabel: "Study brief",
        tags: ["study-brief", "derived-from-learning-note"],
        memoryCompartment: "conversation",
        learningMissionMode: "teach",
        tutorProfile: "concept-tutor",
      }),
    };

    const evaluation = getArtifactPromotionEvaluation(learningNote);
    const existing = findExistingPromotionTarget(learningNote, [existingStudyBrief]);

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.targetClass).toBe("study_brief");
    expect(existing?.id).toBe("study-1");
  });
});
