import { describe, expect, it } from "vitest";
import {
  detectSpecScopeDrift,
  getSpecDrivenTemplate,
} from "@/lib/specDrivenDevelopment";

describe("spec-driven scope drift", () => {
  it("flags when reverse-engineering continuity drifts into platform work", () => {
    const drift = detectSpecScopeDrift(
      getSpecDrivenTemplate("reverse-engineering-memory"),
      "Continue the reverse engineering work, then update auth middleware and connector deployment behavior.",
    );

    expect(drift?.title).toBe("Scope drift watch");
    expect(drift?.matchedSignals).toContain("auth");
    expect(drift?.matchedSignals).toContain("middleware");
  });

  it("stays quiet when the request matches the current spec scope", () => {
    const drift = detectSpecScopeDrift(
      getSpecDrivenTemplate("feature-build"),
      "Build the new panel, wire the store slice, and verify the route renders cleanly.",
    );

    expect(drift).toBeNull();
  });
});
