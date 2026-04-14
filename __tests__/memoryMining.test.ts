import { describe, expect, it } from "vitest";
import {
  buildMinedMemoryPromptBlock,
  detectMemoryCompartment,
  mineMemorySpine,
} from "@/lib/memoryMining";
import type { MemorySpineItem } from "@/lib/memorySpine";

const ITEMS: MemorySpineItem[] = [
  {
    id: "page:1",
    layer: "knowledge",
    kind: "page",
    title: "Learning note · memory spine",
    summary: "Teach the memory spine and keep one checkpoint handy.",
    sourceLabel: "Guided learning",
    domain: "engineering",
    tags: ["learning-note", "memory-spine"],
    timestamp: Date.now(),
    visibility: "internal",
  },
  {
    id: "run:1",
    layer: "output",
    kind: "run",
    title: "HQ review session",
    summary: "Review what we know about archive continuity.",
    sourceLabel: "Office chronicle",
    domain: "general",
    tags: ["review", "continuity"],
    timestamp: Date.now() - 1000 * 60 * 30,
    visibility: "internal",
  },
  {
    id: "article:1",
    layer: "raw",
    kind: "clip",
    title: "Evergreen reference",
    summary: "General background note.",
    sourceLabel: "Saved article",
    domain: "general",
    tags: ["reference"],
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    visibility: "safe",
  },
  {
    id: "page:research",
    layer: "knowledge",
    kind: "page",
    title: "Research source inventory",
    summary: "Citation-backed source review for local-first memory mining.",
    sourceLabel: "Project-memory source inventory",
    domain: "intel",
    tags: ["project-memory", "compartment:research", "citation", "source-backed"],
    timestamp: Date.now() - 1000 * 60 * 10,
    visibility: "internal",
  },
  {
    id: "page:study",
    layer: "knowledge",
    kind: "page",
    title: "Study and synthesis map",
    summary: "Checkpoint-ready synthesis loop for the memory spine.",
    sourceLabel: "Project-memory synthesis map",
    domain: "strategy",
    tags: ["project-memory", "compartment:study", "study-ready", "workflow:synthesis"],
    timestamp: Date.now() - 1000 * 60 * 5,
    visibility: "internal",
  },
];

describe("memory mining", () => {
  it("classifies memory items into project, conversation, general, research, and study compartments", () => {
    expect(detectMemoryCompartment(ITEMS[0])).toBe("project");
    expect(detectMemoryCompartment(ITEMS[1])).toBe("conversation");
    expect(detectMemoryCompartment(ITEMS[2])).toBe("general");
    expect(detectMemoryCompartment(ITEMS[3])).toBe("research");
    expect(detectMemoryCompartment(ITEMS[4])).toBe("study");
  });

  it("prefers the requested compartment when mining relevant memory", () => {
    const mined = mineMemorySpine(ITEMS, {
      query: "review what we know about memory spine",
      compartment: "conversation",
      limit: 2,
    });

    expect(mined[0]?.compartment).toBe("conversation");
    expect(buildMinedMemoryPromptBlock(mined)).toContain("[MINED LOCAL MEMORY]");
  });

  it("labels page and clip memory as source-backed while conversation summaries stay inferred", () => {
    const projectMemory = mineMemorySpine(ITEMS, {
      query: "memory spine",
      compartment: "project",
      limit: 1,
    });
    const conversationMemory = mineMemorySpine(ITEMS, {
      query: "review archive continuity",
      compartment: "conversation",
      limit: 1,
    });

    expect(projectMemory[0]?.inferred).toBe(false);
    expect(conversationMemory[0]?.inferred).toBe(true);
    expect(buildMinedMemoryPromptBlock(projectMemory)).toContain("source-backed");
    expect(buildMinedMemoryPromptBlock(conversationMemory)).toContain("inferred");
  });

  it("carries workflow and evidence metadata through mined research and study memory", () => {
    const researchMemory = mineMemorySpine(ITEMS, {
      query: "review sources for memory mining",
      compartment: "research",
      limit: 1,
    });
    const studyMemory = mineMemorySpine(ITEMS, {
      query: "synthesis checkpoint for memory spine",
      compartment: "study",
      limit: 1,
    });

    expect(researchMemory[0]?.compartment).toBe("research");
    expect(researchMemory[0]?.workflowPackId).toBe("research-workflow");
    expect(researchMemory[0]?.evidenceStrength).toBe("synthesis-ready");
    expect(studyMemory[0]?.compartment).toBe("study");
    expect(studyMemory[0]?.workflowPackId).toBe("guided-learning");
  });
});
