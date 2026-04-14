import {
  internalWorkbenchMetaSchema,
  flattenZodIssues,
  geoDeltaSnapshotSchema,
  modelLabCreateRequestSchema,
  registryMutationSchema,
  simulationLabel,
  sweepsRequestSchema,
  workflowDefinitionSchema,
} from "@/lib/assimilation/contracts";

describe("assimilation contracts", () => {
  it("validates workflow definitions with bounded structure", () => {
    const result = workflowDefinitionSchema.safeParse({
      id: "wf-1",
      name: "Morning Brief",
      description: "Collect overnight market moves and prep a short operator brief.",
      theater: "markets",
      tags: ["markets", "briefing"],
      version: 1,
      updatedAt: new Date().toISOString(),
      approvalMode: "human_gate",
      nodes: [
        {
          id: "src-1",
          type: "source",
          title: "Prices",
          detail: "Pull the current watchlist.",
          x: 0,
          y: 0,
        },
      ],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects blank model lab requests with actionable issues", () => {
    const result = modelLabCreateRequestSchema.safeParse({
      title: " ",
      mutationFamilies: [],
      models: [],
      promptLabel: " ",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(flattenZodIssues(result.error)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "title" }),
        expect.objectContaining({ path: "mutationFamilies" }),
        expect.objectContaining({ path: "models" }),
        expect.objectContaining({ path: "promptLabel" }),
      ]),
    );
  });

  it("accepts either a registry item or an asset kit mutation", () => {
    const itemResult = registryMutationSchema.safeParse({
      item: {
        id: "registry-1",
        title: "OTX Feed",
        type: "tool",
        summary: "Optional threat intel connector.",
        owner: "CIPHER",
        custody: "Ops",
        costTier: "free_local",
        status: "ready",
        license: "Internal",
        tags: ["cyber"],
        lastReviewedAt: new Date().toISOString(),
      },
    });
    const kitResult = registryMutationSchema.safeParse({
      kit: {
        id: "kit-1",
        title: "Morning kit",
        summary: "Reusable morning review bundle.",
        itemIds: ["registry-1"],
        owner: "JANSKY",
        status: "ready",
        lastReviewedAt: new Date().toISOString(),
      },
    });

    expect(itemResult.success).toBe(true);
    expect(kitResult.success).toBe(true);
  });

  it("constrains sweep and geo-delta payloads to supported theaters", () => {
    expect(
      sweepsRequestSchema.safeParse({ theater: "cyber", persistSnapshot: true }).success,
    ).toBe(true);
    expect(
      geoDeltaSnapshotSchema.safeParse({
        id: "geo-1",
        theater: "invalid",
        title: "Bad snapshot",
        summary: "Nope",
        severity: "low",
        capturedAt: new Date().toISOString(),
        observations: [],
      }).success,
    ).toBe(false);
  });

  it("maps simulation modes to user-facing labels", () => {
    expect(simulationLabel("live")).toBe("Live local persistence");
    expect(simulationLabel("seeded")).toBe("Seeded defaults");
    expect(simulationLabel("derived")).toBe("Derived or simulated");
  });

  it("parses internal workbench meta with default warnings", () => {
    const result = internalWorkbenchMetaSchema.safeParse({
      support: "internal",
      surface: "workflow-forge",
      storage: "local-file",
      validation: "zod",
      simulation: {
        mode: "seeded",
        label: simulationLabel("seeded"),
      },
      timestamp: Date.now(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.warnings).toEqual([]);
    expect(result.data.simulation.label).toBe("Seeded defaults");
  });
});
