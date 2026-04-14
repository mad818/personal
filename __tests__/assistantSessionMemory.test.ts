import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findStrongestUnfinishedSession,
  findStrongestUnfinishedSessionForPath,
  findStrongestUnfinishedSessionForRoute,
  rememberUnfinishedSession,
} from "@/lib/assistantSessionMemory";

describe("assistant session memory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T18:45:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores normalized continuity metadata for unfinished sessions", () => {
    const sessions = rememberUnfinishedSession(
      [],
      {
        href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
        label: "Open RE maintenance",
        detail: "Prepared the reverse-engineering repair lane.",
      },
      {
        intent: "research",
        sourceQuery: "continue that reverse-engineering thread",
        capability: "reverse-engineering",
        artifactClass: "reverse_engineering",
        continuationValue: 96,
        completionState: "active",
      },
    );

    expect(sessions[0]).toMatchObject({
      intent: "research",
      capability: "reverse-engineering",
      artifactClass: "reverse_engineering",
      continuationValue: 96,
      completionState: "active",
    });
  });

  it("prefers the strongest capability-aligned continuation", () => {
    const sessions = [
      {
        href: "/vault?focus=vault-export-second-brain",
        label: "Open export session",
        detail: "Prepared the second-brain export lane.",
        intent: "archive_continuity" as const,
        sourceQuery: "continue the second-brain export work",
        lastUsedAt: Date.now() - 1000 * 60 * 4,
        confidence: 90,
        capability: "second-brain" as const,
        artifactClass: "second_brain" as const,
        continuationValue: 78,
        completionState: "prepared" as const,
      },
      {
        href: "/recon?view=binary&focus=recon-binary",
        label: "Open binary triage",
        detail: "Prepared the reverse-engineering intake lane.",
        intent: "research" as const,
        sourceQuery: "continue that reverse-engineering thread",
        lastUsedAt: Date.now() - 1000 * 60 * 8,
        confidence: 84,
        capability: "reverse-engineering" as const,
        artifactClass: "reverse_engineering" as const,
        continuationValue: 94,
        completionState: "active" as const,
      },
    ];

    const strongest = findStrongestUnfinishedSession(sessions, {
      input: "continue that reverse engineering thread from the binary lane",
      intent: "research",
      routeHint: "/recon",
      capability: "reverse-engineering",
    });

    expect(strongest?.href).toBe("/recon?view=binary&focus=recon-binary");
  });

  it("restores the highest-value exact session for a broad route", () => {
    const strongest = findStrongestUnfinishedSessionForPath(
      [
        {
          href: "/vault?focus=vault-stewardship",
          label: "Open stewardship",
          detail: "Prepared archive stewardship.",
          intent: "archive_continuity" as const,
          sourceQuery: "repair the archive",
          lastUsedAt: Date.now() - 1000 * 60 * 30,
          confidence: 88,
          capability: "archive-continuity" as const,
          artifactClass: "archive" as const,
          continuationValue: 72,
          completionState: "prepared" as const,
        },
        {
          href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
          label: "Open RE maintenance",
          detail: "Prepared reverse-engineering archive upkeep.",
          intent: "research" as const,
          sourceQuery: "continue that reverse-engineering thread",
          lastUsedAt: Date.now() - 1000 * 60 * 10,
          confidence: 86,
          capability: "reverse-engineering" as const,
          artifactClass: "reverse_engineering" as const,
          continuationValue: 95,
          completionState: "active" as const,
        },
      ],
      "/vault",
    );

    expect(strongest?.href).toBe(
      "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
    );
  });

  it("prefers a capability-aligned unfinished session for the same route", () => {
    const strongest = findStrongestUnfinishedSessionForRoute(
      [
        {
          href: "/vault?focus=vault-stewardship",
          label: "Open stewardship",
          detail: "Prepared archive stewardship.",
          intent: "archive_continuity" as const,
          sourceQuery: "repair the archive",
          lastUsedAt: Date.now() - 1000 * 60 * 5,
          confidence: 87,
          capability: "archive-continuity" as const,
          artifactClass: "archive" as const,
          continuationValue: 72,
          completionState: "active" as const,
        },
        {
          href: "/vault?focus=vault-export-second-brain",
          label: "Open export",
          detail: "Prepared second-brain export.",
          intent: "archive_continuity" as const,
          sourceQuery: "continue the second-brain heartbeat",
          lastUsedAt: Date.now() - 1000 * 60 * 15,
          confidence: 83,
          capability: "second-brain" as const,
          artifactClass: "second_brain" as const,
          continuationValue: 92,
          completionState: "active" as const,
        },
      ],
      {
        pathname: "/vault",
        capability: "second-brain",
      },
    );

    expect(strongest?.href).toBe("/vault?focus=vault-export-second-brain");
  });
});
