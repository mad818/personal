import { describe, expect, it } from "vitest";
import {
  buildArtifactContinuityMetadata,
  rankRelatedArtifacts,
} from "@/lib/artifactContinuity";

describe("artifact continuity", () => {
  it("derives reverse-engineering prep continuity from binary triage notes", () => {
    const continuity = buildArtifactContinuityMetadata({
      title: "Binary triage · sample.exe",
      summary: "Portable Executable · entropy 7.10",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      route: "/recon",
      topic: "Binary triage",
      sourceLabel: "Binary triage report",
      content: "## Hashes\n- SHA-256: deadbeefdeadbeef",
    });

    expect(continuity.artifactClass).toBe("reverse_engineering_prep");
    expect(continuity.promotionKind).toBe("reverse_engineering_brief");
    expect(continuity.continuityTag).toContain("re-identity:");
  });

  it("derives research continuity for durable research artifacts", () => {
    const continuity = buildArtifactContinuityMetadata({
      title: "Threat hunt research pack",
      summary: "Deep research artifact with cited findings and follow-up notes.",
      tags: ["research", "compiled"],
      route: "/vault",
      workflowId: "deepresearch",
      workflowLabel: "Deep research",
      sourceLabel: "Workflow page · Deep research",
      content: "Sources: https://example.com/report",
    });

    expect(continuity.artifactClass).toBe("research_artifact");
    expect(continuity.promotionKind).toBe("research_brief");
    expect(continuity.continuityTag).toContain("continuity:research:");
    expect(continuity.qualitySignals).toContain("cited");
    expect(continuity.routeOrigin).toBe("/vault");
    expect(continuity.workflowClass).toBe("research");
    expect(continuity.missionHints).toContain("capability:archive-continuity");
    expect(
      continuity.relatedLinkSeeds.some((entry) =>
        entry.startsWith("continuity:"),
      ),
    ).toBe(true);
  });

  it("derives learning continuity with memory compartments for study artifacts", () => {
    const continuity = buildArtifactContinuityMetadata({
      title: "Learning note · memory spine",
      summary: "Teach the memory spine with one checkpoint and one follow-up review.",
      tags: ["learning-note", "study", "memory"],
      route: "/skills",
      topic: "Memory spine",
      sourceLabel: "Guided learning",
      content: "## Concept\n- Memory spine stores durable context.\n## Checkpoint\n- Explain the raw/knowledge/output layers.",
      memoryCompartment: "conversation",
      learningMissionMode: "teach",
      tutorProfile: "concept-tutor",
    });

    expect(continuity.artifactClass).toBe("learning_note");
    expect(continuity.promotionKind).toBe("study_brief");
    expect(continuity.memoryCompartment).toBe("conversation");
    expect(continuity.learningMissionMode).toBe("teach");
    expect(continuity.tutorProfile).toBe("concept-tutor");
    expect(continuity.qualitySignals).toContain("study-ready");
  });

  it("ranks continuity matches ahead of shared-tag coincidence", () => {
    const current = {
      id: "prep-1",
      title: "Binary triage · sample.exe",
      summary: "Portable Executable with hashes and IOC hints.",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      route: "/recon",
      topic: "Binary triage",
      sourceLabel: "Binary triage report",
      content: "## Hashes\n- SHA-256: deadbeefdeadbeef\n## IOC candidates\n- URLs: https://example.com",
    };
    const sameContinuity = {
      id: "brief-1",
      title: "Reverse-engineering brief · sample.exe",
      summary: "Higher-order analyst brief derived from the same sample.",
      tags: ["reverse-engineering-brief", "derived-from-binary-triage", "pe"],
      route: "/recon",
      topic: "Reverse engineering brief",
      sourceLabel: "Reverse engineering brief",
      content: "## Hashes\n- SHA-256: deadbeefdeadbeef",
    };
    const sharedTagsOnly = {
      id: "prep-2",
      title: "Binary triage · other-sample.exe",
      summary: "Different sample with the same format tags.",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      route: "/recon",
      topic: "Binary triage",
      sourceLabel: "Binary triage report",
      content: "## Hashes\n- SHA-256: cafebabecafebabe",
    };

    const ranked = rankRelatedArtifacts(current, [
      sameContinuity,
      sharedTagsOnly,
    ]);

    expect(ranked[0]?.item.id).toBe("brief-1");
    expect(ranked[0]?.reasons).toContain("shared continuity");
    expect(ranked[1]?.item.id).toBe("prep-2");
  });
});
