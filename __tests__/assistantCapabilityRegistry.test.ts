import { describe, expect, it } from "vitest";
import {
  CANONICAL_SEGMENTED_ROUTE_RULES,
  detectAssistantCapability,
  resolveAssistantCapabilityId,
} from "@/lib/assistantCapabilityRegistry";

describe("assistant capability registry", () => {
  it("normalizes capability aliases", () => {
    expect(resolveAssistantCapabilityId("market-analysis")).toBe("live-markets");
    expect(resolveAssistantCapabilityId("knowledge-export")).toBe("second-brain");
  });

  it("detects repo engineering capability from a risky file-oriented prompt", () => {
    const match = detectAssistantCapability({
      input: "Help me refactor lib/ai.ts safely and check the blast radius.",
      intent: "repo_work",
      answerStyle: "repo_work",
      routeHint: "/home",
      filePath: "lib/ai.ts",
    });

    expect(match.capability.id).toBe("repo-engineering");
    expect(match.confidence).toBeGreaterThan(60);
  });

  it("detects live markets for BTC price questions", () => {
    const match = detectAssistantCapability({
      input: "What's the latest on BTC price right now?",
      intent: "live_current",
      answerStyle: "live_current",
      routeHint: "/alpha",
    });

    expect(match.capability.id).toBe("live-markets");
    expect(match.matchedKeywords).toContain("btc");
  });

  it("keeps canonical focus-to-view mappings for segmented routes", () => {
    expect(CANONICAL_SEGMENTED_ROUTE_RULES["/recon"].focusToView["recon-binary"]).toBe(
      "binary",
    );
    expect(CANONICAL_SEGMENTED_ROUTE_RULES["/alpha"].focusToView["alpha-prices"]).toBe(
      "prices",
    );
  });
});
