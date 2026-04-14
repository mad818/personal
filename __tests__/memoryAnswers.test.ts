import { describe, expect, it } from "vitest";
import { buildMemoryAskResult } from "@/lib/memoryAnswers";
import type { MemorySpineItem } from "@/lib/memorySpine";

const baseItems: MemorySpineItem[] = [
  {
    id: "page:1",
    layer: "knowledge",
    kind: "page",
    title: "Threat cluster dossier",
    summary: "Compiled dossier links the latest threat cluster to active exploitation and containment steps.",
    sourceLabel: "Workflow page · Threat hunt",
    domain: "cyber",
    tags: ["threat", "cluster"],
    timestamp: Date.now(),
    visibility: "internal",
  },
  {
    id: "run:1",
    layer: "output",
    kind: "run",
    title: "Incident brief",
    summary: "Operator brief recommends prioritizing containment and IOC review.",
    sourceLabel: "Agent run · nexus",
    domain: "cyber",
    tags: ["incident", "brief"],
    timestamp: Date.now() - 1_000,
    visibility: "internal",
  },
];

describe("memory answers", () => {
  it("returns a citation-first local answer from memory hits", () => {
    const result = buildMemoryAskResult("threat cluster", baseItems);

    expect(result.answer).toContain("Compiled dossier");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.sources).toHaveLength(2);
    expect(result.relatedItems[0]?.id).toBe("page:1");
    expect(result.synthesisMode).toBe("deterministic_local");
  });

  it("returns a low-confidence gap response when memory is empty", () => {
    const result = buildMemoryAskResult("unknown topic", []);

    expect(result.confidence).toBe(0);
    expect(result.sources).toHaveLength(0);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.answer).toContain("No strong local-memory match");
  });
});
