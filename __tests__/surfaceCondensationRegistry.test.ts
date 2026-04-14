import { describe, expect, it } from "vitest";
import {
  getSurfaceCondensationSpec,
  resolveAlphaChamber,
  resolveAlphaTapeView,
  resolveCyberChamber,
  resolveCyberEvidenceView,
  resolveGroupedViewAlias,
  resolveResourcesChamber,
  resolveResourcesViewForChamber,
  resolveVaultChamber,
  SURFACE_CONDENSATION_REGISTRY,
} from "@/lib/surfaceCondensationRegistry";

describe("surface condensation registry", () => {
  it("defines one lead chamber and one continuity plan for every GA route", () => {
    expect(Object.keys(SURFACE_CONDENSATION_REGISTRY).sort()).toEqual([
      "alpha",
      "command",
      "cyber",
      "hq",
      "intel",
      "recon",
      "resources",
      "vault",
    ]);

    for (const spec of Object.values(SURFACE_CONDENSATION_REGISTRY)) {
      expect(spec.leadModuleId.length).toBeGreaterThan(0);
      expect(spec.disclosurePriority.length).toBeGreaterThan(0);
      expect(spec.disclosurePriority[0]).toBe(spec.leadModuleId);
    }
  });

  it("keeps grouped aliases deterministic for condensed routes", () => {
    expect(resolveGroupedViewAlias("alpha", "prices")).toBe("tape");
    expect(resolveGroupedViewAlias("alpha", "charts")).toBe("tape");
    expect(resolveGroupedViewAlias("cyber", "otx")).toBe("evidence");
    expect(resolveGroupedViewAlias("vault", "graph")).toBe("relations");
    expect(resolveGroupedViewAlias("resources", "playbooks")).toBe("start");
  });

  it("maps alpha legacy views into the market tape chamber", () => {
    expect(resolveAlphaChamber("prices")).toBe("tape");
    expect(resolveAlphaChamber("charts")).toBe("tape");
    expect(resolveAlphaChamber("scanner")).toBe("scanner");
    expect(resolveAlphaTapeView("charts")).toBe("charts");
    expect(resolveAlphaTapeView("prices")).toBe("prices");
  });

  it("maps cyber evidence feeds into one evidence chamber", () => {
    expect(resolveCyberChamber("cves")).toBe("evidence");
    expect(resolveCyberChamber("otx")).toBe("evidence");
    expect(resolveCyberChamber("cisa")).toBe("evidence");
    expect(resolveCyberChamber("matrix")).toBe("matrix");
    expect(resolveCyberEvidenceView("otx")).toBe("otx");
    expect(resolveCyberEvidenceView("cisa")).toBe("cisa");
    expect(resolveCyberEvidenceView("triage")).toBe("cves");
  });

  it("collapses vault and resources into grouped chambers while preserving view defaults", () => {
    expect(resolveVaultChamber("list")).toBe("archive");
    expect(resolveVaultChamber("graph")).toBe("relations");
    expect(resolveVaultChamber("export")).toBe("publish");

    expect(resolveResourcesChamber("playbooks")).toBe("start");
    expect(resolveResourcesChamber("system")).toBe("system");
    expect(resolveResourcesChamber("impact")).toBe("launch");
    expect(resolveResourcesChamber("registry")).toBe("utilities");

    expect(resolveResourcesViewForChamber("start", "specs")).toBe("specs");
    expect(resolveResourcesViewForChamber("start", null)).toBe("playbooks");
    expect(resolveResourcesViewForChamber("utilities", "kits")).toBe("kits");
    expect(resolveResourcesViewForChamber("launch", "impact")).toBe("impact");
  });

  it("exposes a stable HQ condensation contract", () => {
    const spec = getSurfaceCondensationSpec("hq");
    expect(spec.leadModuleId).toBe("command-chronicle");
    expect(spec.supportModuleId).toBe("next-move");
    expect(spec.continuityModuleId).toBe("runtime-continuity");
  });
});
