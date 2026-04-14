import { describe, expect, it } from "vitest";
import {
  getSurfaceModuleSpec,
  getResourcesWorkbenchViewSpec,
  RESOURCES_WORKBENCH_JOBS,
  SURFACE_REDESIGN_REGISTRY,
} from "@/lib/surfaceRedesignRegistry";

describe("surface redesign registry", () => {
  it("covers the eight GA surfaces", () => {
    expect(Object.keys(SURFACE_REDESIGN_REGISTRY).sort()).toEqual([
      "alpha",
      "command",
      "cyber",
      "hq",
      "intel",
      "recon",
      "resources",
      "vault",
    ]);
  });

  it("maps every visible source box to an existing target module", () => {
    for (const spec of Object.values(SURFACE_REDESIGN_REGISTRY)) {
      const moduleIds = new Set(spec.modules.map((module) => module.id));
      expect(spec.modules.length).toBeGreaterThan(0);
      expect(spec.boxMatrix.length).toBeGreaterThan(0);
      for (const entry of spec.boxMatrix) {
        expect(moduleIds.has(entry.targetModuleId)).toBe(true);
      }
    }
  });

  it("keeps resources workbench views aligned with the redesign jobs", () => {
    const jobIds = new Set(RESOURCES_WORKBENCH_JOBS.map((job) => job.id));

    for (const view of [
      "finder",
      "manual",
      "surfaces",
      "playbooks",
      "specs",
      "system",
      "registry",
      "kits",
      "impact",
    ] as const) {
      const spec = getResourcesWorkbenchViewSpec(view);
      expect(spec.view).toBe(view);
      if (spec.jobId !== "supporting-utilities") {
        expect(jobIds.has(spec.jobId)).toBe(true);
      }
      expect(spec.panelTitle.length).toBeGreaterThan(0);
      expect(spec.introTitle.length).toBeGreaterThan(0);
    }
  });

  it("resolves segmented module overrides for shared redesign titles", () => {
    const alphaTape = getSurfaceModuleSpec("alpha", "market-tape", "charts");
    const cyberFeeds = getSurfaceModuleSpec("cyber", "evidence-feeds", "otx");
    const reconWorkbench = getSurfaceModuleSpec("recon", "collection-workbench", "headers");

    expect(alphaTape?.title).toBe("Market Tape");
    expect(alphaTape?.detail).toContain("Visual follow-through");
    expect(cyberFeeds?.title).toBe("Evidence Feeds");
    expect(cyberFeeds?.detail).toContain("pulse");
    expect(reconWorkbench?.title).toBe("Collection Workbench");
    expect(reconWorkbench?.detail).toContain("Security header posture");
  });
});
