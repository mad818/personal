import { describe, expect, it } from "vitest";
import { mergeAssistantGuidance } from "@/lib/assistantGuidance";

describe("assistant guidance", () => {
  it("dedupes repeated guidance and keeps the stronger priority", () => {
    const guidance = mergeAssistantGuidance(
      {
        kind: "archive",
        tone: "neutral",
        title: "Archive cue",
        detail: "Resume the durable archive lane.",
        href: "/vault?focus=vault-stewardship",
        priority: 50,
      },
      {
        kind: "archive",
        tone: "neutral",
        title: "Archive cue",
        detail: "Resume the durable archive lane.",
        href: "/vault?focus=vault-stewardship",
        priority: 70,
      },
    );

    expect(guidance).toHaveLength(1);
    expect(guidance[0]?.priority).toBe(70);
    expect(guidance[0]?.href).toBe("/vault?focus=vault-stewardship");
  });

  it("sorts higher-priority guidance first", () => {
    const guidance = mergeAssistantGuidance(
      {
        kind: "archive",
        tone: "neutral",
        title: "Archive cue",
        detail: "Resume the durable archive lane.",
      },
      {
        kind: "scope_drift",
        tone: "caution",
        title: "Scope drift watch",
        detail: "Keep the active spec narrower.",
      },
    );

    expect(guidance.map((entry) => entry.kind)).toEqual([
      "scope_drift",
      "archive",
    ]);
  });
});
