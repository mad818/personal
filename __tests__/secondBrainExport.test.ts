import { describe, expect, it } from "vitest";
import { buildArtifactContinuityMetadata } from "@/lib/artifactContinuity";
import { buildSecondBrainExportBundle } from "@/lib/secondBrainExport";

describe("second brain export", () => {
  it("links durable artifacts by continuity before falling back to tags or source", () => {
    const continuityPrep = buildArtifactContinuityMetadata({
      title: "Binary triage · sample.exe",
      summary: "Portable Executable with hashes and IOC hints.",
      content:
        "## Hashes\n- SHA-256: deadbeefdeadbeef\n## IOC candidates\n- URLs: https://example.com",
      route: "/recon",
      topic: "Binary triage",
      sourceLabel: "Binary triage report",
      workflowId: "binary-triage",
      workflowLabel: "Binary triage",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
    });
    const continuityBrief = buildArtifactContinuityMetadata({
      title: "Reverse-engineering brief · sample.exe",
      summary: "Higher-order brief for the same sample.",
      content: "## Hashes\n- SHA-256: deadbeefdeadbeef",
      route: "/recon",
      topic: "Reverse engineering brief",
      sourceLabel: "Reverse engineering brief",
      tags: ["reverse-engineering-brief", "derived-from-binary-triage", "pe"],
    });

    const bundle = buildSecondBrainExportBundle({
      articles: [
        {
          id: "clip-1",
          title: "General cyber note",
          desc: "Saved clip that shares the source lane but not the continuity id.",
          link: "https://example.com/clip",
          date: "2026-04-10",
          src: "Threat feed",
          cat: "cyber",
          tags: ["cyber"],
        },
      ],
      compiledPages: [
        {
          id: "prep-1",
          title: "Binary triage · sample.exe",
          summary: "Portable Executable with hashes and IOC hints.",
          contentPreview: "Portable Executable with hashes and IOC hints.",
          sourceLabel: "Binary triage report",
          route: "/recon",
          topic: "Binary triage",
          workflowId: "binary-triage",
          workflowLabel: "Binary triage",
          domain: "cyber",
          visibility: "internal",
          tags: ["binary-triage", "reverse-engineering-prep", "pe"],
          continuity: continuityPrep,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content:
            "## Hashes\n- SHA-256: deadbeefdeadbeef\n## IOC candidates\n- URLs: https://example.com",
        },
        {
          id: "brief-1",
          title: "Reverse-engineering brief · sample.exe",
          summary: "Higher-order brief for the same sample.",
          contentPreview: "Higher-order brief for the same sample.",
          sourceLabel: "Reverse engineering brief",
          route: "/recon",
          topic: "Reverse engineering brief",
          workflowId: "binary-triage",
          workflowLabel: "Binary triage",
          domain: "cyber",
          visibility: "internal",
          tags: ["reverse-engineering-brief", "derived-from-binary-triage", "pe"],
          continuity: continuityBrief,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: "## Hashes\n- SHA-256: deadbeefdeadbeef",
        },
      ],
    });

    const prepNote = bundle.files.find((file) =>
      file.path.includes("Binary triage"),
    );

    expect(prepNote?.content).toContain("Reverse-engineering brief");
    expect(prepNote?.content).toContain("shared continuity");
    expect(bundle.files.some((file) => file.path === "02 Reverse Engineering Continuity.md")).toBe(
      true,
    );
    expect(bundle.files.some((file) => file.path === "03 Research Continuity.md")).toBe(
      false,
    );
  });

  it("records research continuity counts in the heartbeat and continuity index", () => {
    const researchContinuity = buildArtifactContinuityMetadata({
      title: "Threat hunt research pack",
      summary: "Structured findings with citations.",
      content: "## Findings\n- Source: https://example.com/report",
      route: "/vault",
      topic: "Research pack",
      sourceLabel: "Workflow page · Deep research",
      workflowId: "deepresearch",
      workflowLabel: "Deep research",
      tags: ["research", "compiled"],
    });
    const researchBriefContinuity = buildArtifactContinuityMetadata({
      title: "Research brief · Threat hunt research pack",
      summary: "Higher-order research brief.",
      content: "## Findings\n- Source: https://example.com/report",
      route: "/vault",
      topic: "Research brief",
      sourceLabel: "Research brief",
      workflowId: "deepresearch",
      workflowLabel: "Deep research",
      tags: ["research-brief", "compiled"],
    });

    const bundle = buildSecondBrainExportBundle({
      articles: [],
      compiledPages: [
        {
          id: "research-1",
          title: "Threat hunt research pack",
          summary: "Structured findings with citations.",
          contentPreview: "Structured findings with citations.",
          sourceLabel: "Workflow page · Deep research",
          route: "/vault",
          topic: "Research pack",
          workflowId: "deepresearch",
          workflowLabel: "Deep research",
          domain: "cyber",
          visibility: "safe",
          tags: ["research", "compiled"],
          continuity: researchContinuity,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: "## Findings\n- Source: https://example.com/report",
        },
        {
          id: "research-brief-1",
          title: "Research brief · Threat hunt research pack",
          summary: "Higher-order research brief.",
          contentPreview: "Higher-order research brief.",
          sourceLabel: "Research brief",
          route: "/vault",
          topic: "Research brief",
          workflowId: "deepresearch",
          workflowLabel: "Deep research",
          domain: "cyber",
          visibility: "safe",
          tags: ["research-brief", "compiled"],
          continuity: researchBriefContinuity,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: "## Findings\n- Source: https://example.com/report",
        },
      ],
    });

    const heartbeat = bundle.files.find((file) => file.path === "01 Second Brain Heartbeat.md");
    const researchIndex = bundle.files.find((file) => file.path === "03 Research Continuity.md");

    expect(heartbeat?.content).toContain("| Research artifacts | 1 |");
    expect(heartbeat?.content).toContain("| Research briefs | 1 |");
    expect(researchIndex?.content).toContain("Research artifacts: 1");
    expect(researchIndex?.content).toContain("Research briefs: 1");
  });
});
