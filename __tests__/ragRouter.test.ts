import { describe, it, expect } from "vitest";
import { routeQuery, buildRagContextBlock } from "@/lib/ragRouter";

// ── routeQuery ────────────────────────────────────────────────────────────────
describe("routeQuery", () => {
  it("returns General/web_search for empty input", () => {
    const { strategy, confidence } = routeQuery("");
    expect(strategy.domain).toBe("General");
    expect(strategy.primaryTools).toContain("web_search");
    expect(confidence).toBe(0);
  });

  it("routes crypto keywords to Markets/Crypto domain", () => {
    const { strategy } = routeQuery("What is the current Bitcoin price?");
    expect(strategy.domain).toBe("Markets / Crypto");
  });

  it("routes BTC/ETH shorthand to Markets/Crypto domain", () => {
    expect(routeQuery("btc mempool congestion").strategy.domain).toBe("Markets / Crypto");
    expect(routeQuery("eth defi yield").strategy.domain).toBe("Markets / Crypto");
  });

  it("routes CVE/exploit keywords to Cybersecurity domain", () => {
    const { strategy } = routeQuery("Tell me about the latest CVE exploits");
    expect(strategy.domain).toContain("Cyber");
    expect(strategy.primaryTools.length).toBeGreaterThan(0);
  });

  it("routes vulnerability/patch to Cybersecurity domain", () => {
    expect(routeQuery("zero-day vulnerability in OpenSSL").strategy.domain).toContain("Cyber");
    expect(routeQuery("ransomware patch required").strategy.domain).toContain("Cyber");
  });

  it("routes AI/ML keywords to AI / ML domain", () => {
    const { strategy } = routeQuery("Compare LLM transformers and fine-tuning approaches");
    expect(strategy.domain).toContain("AI");
  });

  it("routes SEC/EDGAR keywords to SEC Filings domain", () => {
    const { strategy } = routeQuery("Get the SEC EDGAR 10-K filing for Apple");
    expect(strategy.domain).toContain("SEC");
  });

  it("routes weather keywords to Weather domain", () => {
    const { strategy } = routeQuery("What is the weather forecast for Miami?");
    expect(strategy.domain).toContain("Weather");
  });

  it("routes codebase keywords to Project Codebase domain", () => {
    const { strategy } = routeQuery("Read the store/useStore.ts file and explain the state");
    expect(strategy.domain).toBe("Project Codebase");
    expect(strategy.primaryTools).toContain("list_project_files");
  });

  it("routes geopolitical keywords to Geopolitical domain", () => {
    const { strategy } = routeQuery("NATO sanctions over Russia war conflict");
    expect(strategy.domain).toContain("Geopolit");
  });

  it("routes healthcare keywords to Healthcare domain", () => {
    const { strategy } = routeQuery("FDA clinical trial vaccine outbreak");
    expect(strategy.domain).toContain("Health");
  });

  it("uses web_search as default fallback for unknown queries", () => {
    const { strategy } = routeQuery("Who was Julius Caesar?");
    expect(strategy.domain).toBe("General");
    expect(strategy.primaryTools).toContain("web_search");
    expect(strategy.credibility).toBe("MEDIUM");
  });

  it("returns HIGH credibility for known data domains", () => {
    expect(routeQuery("bitcoin price").strategy.credibility).toBe("HIGH");
    expect(routeQuery("cve exploit").strategy.credibility).toBe("HIGH");
  });

  it("returns a rationale string for every route", () => {
    const queries = [
      "bitcoin", "cve exploit", "llm transformer", "sec filing",
      "weather forecast", "github repo", "reddit thread",
      "rss blog post", "useStore.ts file", "who was einstein",
    ];
    for (const q of queries) {
      const { strategy } = routeQuery(q);
      expect(typeof strategy.rationale).toBe("string");
      expect(strategy.rationale.length).toBeGreaterThan(0);
    }
  });

  it("returns a confidence score between 0 and 1", () => {
    const results = [
      routeQuery("bitcoin price"),
      routeQuery("cve exploit"),
      routeQuery("who was einstein"),
    ];
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("returns higher confidence for queries with more keyword hits", () => {
    const weak  = routeQuery("crypto");
    const strong = routeQuery("bitcoin btc ethereum defi mempool price");
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });
});

// ── buildRagContextBlock ──────────────────────────────────────────────────────
describe("buildRagContextBlock", () => {
  it("returns a non-empty string", () => {
    expect(buildRagContextBlock("bitcoin price today").length).toBeGreaterThan(0);
  });

  it("returns compact one-liner for short queries (< 8 words)", () => {
    const result = buildRagContextBlock("btc price");
    expect(result).toContain("[RAG:");
    expect(result).not.toContain("[RAG ROUTING —");
  });

  it("returns full block for long queries (>= 8 words)", () => {
    const result = buildRagContextBlock(
      "What is the current Bitcoin price and how does it compare to last week?"
    );
    expect(result).toContain("[RAG ROUTING —");
    expect(result).toContain("Primary tools:");
    expect(result).toContain("Fallback tools:");
    expect(result).toContain("[END RAG ROUTING]");
  });

  it("includes the domain name in both formats", () => {
    const short = buildRagContextBlock("btc eth");
    expect(short).toContain("Markets / Crypto");

    const long = buildRagContextBlock(
      "Tell me everything about bitcoin and ethereum price movements this week"
    );
    expect(long).toContain("Markets / Crypto");
  });

  it("includes credibility tag in compact format", () => {
    const result = buildRagContextBlock("cve exploit");
    expect(result).toContain("Credibility:");
  });

  it("includes confidence percentage in output", () => {
    const result = buildRagContextBlock(
      "bitcoin btc ethereum defi mempool price market analysis"
    );
    expect(result).toContain("%");
  });
});
