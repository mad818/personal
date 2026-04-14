import { describe, it, expect } from "vitest";
import { buildLiveContext, buildCapabilitiesBlock } from "@/lib/liveContext";

// Minimal mock state that satisfies LiveState without importing the full store
const emptyState = {
  prices: {},
  signals: {},
  worldRisk: undefined,
  cves: [],
  articles: [],
  agentStats: {},
};

const richState = {
  prices: {
    bitcoin: { price: 84000, chg: 1.4, sym: "BTC", mcap: 1_600_000_000_000, vol: 42_000_000_000 },
    ethereum: { price: 3100, chg: -0.2, sym: "ETH", mcap: 370_000_000_000, vol: 18_000_000_000 },
    solana: { price: 165, chg: 3.1, sym: "SOL", mcap: 72_000_000_000, vol: 5_000_000_000 },
  },
  signals: {
    fg: { value: 62, label: "GREED" },
  },
  worldRisk: 34,
  cves: [
    { id: "CVE-2026-1234", severity: "CRITICAL", cvssScore: 9.8, description: "Remote code execution in OpenSSL" },
    { id: "CVE-2026-5678", severity: "HIGH", cvssScore: 7.5, description: "Privilege escalation in Linux kernel" },
    { id: "CVE-2026-9012", severity: "MEDIUM", cvssScore: 5.0, description: "XSS in popular framework" },
  ],
  articles: [
    { title: "Fed holds rates steady for third month", source: "Reuters" },
    { title: "BTC ETF inflows hit record $500M", source: "CoinDesk" },
    { title: "NATO summit concludes with new commitments", source: "Guardian" },
  ],
  agentStats: {
    JANSKY: { totalTasks: 42, lastTask: "Market brief", lastConfidence: 0.87, lastActiveAt: Date.now() },
  },
};

// ── buildLiveContext ───────────────────────────────────────────────────────────
describe("buildLiveContext", () => {
  it("returns a non-empty string for empty state", () => {
    const result = buildLiveContext(emptyState);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the NEXUS LIVE INTEL header", () => {
    const result = buildLiveContext(richState);
    expect(result).toContain("[NEXUS LIVE INTEL");
  });

  it("contains an end marker", () => {
    const result = buildLiveContext(richState);
    expect(result).toContain("[END LIVE INTEL]");
  });

  it("includes BTC price when available", () => {
    const result = buildLiveContext(richState);
    expect(result).toContain("BTC");
  });

  it("includes Fear & Greed label when available", () => {
    const result = buildLiveContext(richState);
    expect(result).toContain("GREED");
  });

  it("includes world risk when available", () => {
    const result = buildLiveContext(richState);
    expect(result).toContain("34");
  });

  it("includes CVE information when available", () => {
    const result = buildLiveContext(richState);
    // Should mention CVE count or specific CVE
    expect(result.toLowerCase()).toContain("cve");
  });

  it("includes article headlines when available", () => {
    const result = buildLiveContext(richState);
    // Should include at least one article title
    const hasArticle =
      result.includes("Fed holds") ||
      result.includes("BTC ETF") ||
      result.includes("NATO");
    expect(hasArticle).toBe(true);
  });

  it("returns a shorter block for empty state than rich state", () => {
    const empty = buildLiveContext(emptyState);
    const rich = buildLiveContext(richState);
    expect(rich.length).toBeGreaterThan(empty.length);
  });

  it("can omit stack context when selective loading wants it as a separate asset", () => {
    const result = buildLiveContext(richState, { includeStackContext: false });

    expect(result).not.toContain("[NEXUS STACK CONTEXT]");
  });


});

// ── buildCapabilitiesBlock ────────────────────────────────────────────────────
describe("buildCapabilitiesBlock", () => {
  const agents = ["JANSKY", "ORBIT", "NOVA", "CIPHER", "FLUX"] as const;

  for (const agent of agents) {
    it(`returns a non-empty block for ${agent}`, () => {
      const result = buildCapabilitiesBlock(agent);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it(`${agent} block mentions the agent name`, () => {
      const result = buildCapabilitiesBlock(agent);
      expect(result.toUpperCase()).toContain(agent);
    });
  }

  it("returns different blocks for different agents", () => {
    const jansky = buildCapabilitiesBlock("JANSKY");
    const orbit = buildCapabilitiesBlock("ORBIT");
    const nova = buildCapabilitiesBlock("NOVA");
    expect(jansky).not.toBe(orbit);
    expect(orbit).not.toBe(nova);
    expect(nova).not.toBe(jansky);
  });
});
