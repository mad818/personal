import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAssistantSessionHref } from "@/lib/assistantSessionRecovery";

describe("assistant session recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T20:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prefers a fresh prepared workspace over a broad route", () => {
    const href = resolveAssistantSessionHref({
      href: "/vault",
      pathname: "/vault",
      preparedWorkspace: {
        href: "/vault?focus=vault-stewardship",
        preparedAt: Date.now() - 1000 * 60 * 4,
      },
      includeRouteDefault: true,
    });

    expect(href).toBe("/vault?focus=vault-stewardship");
  });

  it("falls back to the strongest unfinished exact session for the same route", () => {
    const href = resolveAssistantSessionHref({
      href: "/recon",
      pathname: "/recon",
      unfinishedSessions: [
        {
          href: "/recon?view=binary&focus=recon-binary",
          label: "Open binary triage",
          detail: "Prepared binary triage.",
          intent: "research",
          sourceQuery: "continue that reverse-engineering thread",
          lastUsedAt: Date.now() - 1000 * 60 * 6,
          confidence: 92,
          capability: "reverse-engineering",
          artifactClass: "reverse_engineering",
          continuationValue: 96,
          completionState: "active",
        },
      ],
      capability: "reverse-engineering",
      includeRouteDefault: true,
    });

    expect(href).toBe("/recon?view=binary&focus=recon-binary");
  });

  it("uses the canonical default exact session when no stronger recovery exists", () => {
    const href = resolveAssistantSessionHref({
      href: "/command",
      pathname: "/command",
      includeRouteDefault: true,
    });

    expect(href).toBe("/command?focus=runtime-efficiency");
  });
});
