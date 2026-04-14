import { describe, expect, it } from "vitest";
import {
  compareMemoryAdapterResults,
  parseLoopbackSidecarUrl,
} from "@/lib/memoryAdapters";

describe("memory adapters", () => {
  it("accepts loopback sidecar URLs and rejects remote hosts", () => {
    expect(parseLoopbackSidecarUrl("http://127.0.0.1:8787/search").hostname).toBe(
      "127.0.0.1",
    );
    expect(parseLoopbackSidecarUrl("http://localhost:8787/search").hostname).toBe(
      "localhost",
    );
    expect(() => parseLoopbackSidecarUrl("https://stixdb.example.com/search")).toThrow(
      /loopback host/i,
    );
  });

  it("computes shared and unique retrieval keys without leaking raw ids", () => {
    const comparison = compareMemoryAdapterResults(
      [
        {
          id: "run:1",
          title: "Threat cluster brief",
          summary: "Compiled cyber brief",
          sourceLabel: "Agent run",
          layer: "output",
          visibility: "internal",
          timestamp: 10,
        },
        {
          id: "page:1",
          title: "Research memo",
          summary: "Intel note",
          sourceLabel: "Vault page",
          layer: "knowledge",
          visibility: "internal",
          timestamp: 20,
        },
      ],
      [
        {
          id: "doc-a",
          title: "Threat cluster brief",
          summary: "Independent sidecar result",
          sourceLabel: "Agent run",
          layer: "unknown",
          visibility: "unknown",
          timestamp: null,
        },
      ],
    );

    expect(comparison.sharedCount).toBe(1);
    expect(comparison.nativeOnlyCount).toBe(1);
    expect(comparison.sidecarOnlyCount).toBe(0);
    expect(comparison.overlapRatio).toBe(0.5);
  });
});
