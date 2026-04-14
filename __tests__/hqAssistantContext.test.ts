import { describe, expect, it } from "vitest";
import { resolveHQAssistantContext } from "@/components/home/office/hqAssistantContext";

describe("HQ assistant context", () => {
  it("stages the exact market-review lane for live market postmortem turns", () => {
    const resolution = resolveHQAssistantContext({
      input:
        "Review my BTC trade thesis, invalidation, and loss review before I widen back into the market.",
      answerStyle: "live_current",
      routeHint: "/alpha",
    });

    expect(resolution.intent).toBe("live_current");
    expect(resolution.preparedWorkspace?.href).toBe(
      "/alpha?view=watchlist&focus=alpha-market-review",
    );
    expect(resolution.preparedWorkspace?.label).toBe("Open ALPHA market review");
    expect(resolution.preparedWorkspace?.detail).toContain("thesis-review lane");
  });
});
