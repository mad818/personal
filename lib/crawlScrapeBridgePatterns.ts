import "server-only";

import { readExternalToolBridgeSummary } from "@/lib/externalToolBridge";

export const CRAWL_SCRAPE_BRIDGE_VERSION = "crawl-scrape-bridge.v1" as const;

export type CrawlScrapeToolId =
  | "fetch_url_native"
  | "firecrawl_byok"
  | "browser_use_external"
  | "crawl4ai_external"
  | "crawlee_external"
  | "scrapy_external"
  | "markitdown_external"
  | "scrapling_external"
  | "scrcpy_external"
  | "autoscraper_external"
  | "curl_impersonate_reference";

export interface CrawlScrapeDescriptor {
  id: CrawlScrapeToolId;
  label: string;
  sourceRepo: string;
  sourceUrl: string;
  disposition:
    | "shipped"
    | "byok_optional"
    | "external_reference"
    | "defer"
    | "boundary";
  capability: "read" | "networked" | "exec";
  auth: "none" | "api_key" | "oauth";
  nexusSurface: string;
  operatorNote: string;
}

export function listCrawlScrapeDescriptors(): CrawlScrapeDescriptor[] {
  const firecrawlConfigured = Boolean(process.env.FIRECRAWL_KEY?.trim());
  return [
    {
      id: "fetch_url_native",
      label: "Native fetch_url",
      sourceRepo: "Nexus /api/tools",
      sourceUrl: "https://github.com/nexus-prime/fetch_url",
      disposition: "shipped",
      capability: "networked",
      auth: "none",
      nexusSurface: "NOVA / agent tools — bounded HTML strip, 4k chars",
      operatorNote: "Default passive URL read. No browser runtime bundled.",
    },
    {
      id: "firecrawl_byok",
      label: "Firecrawl scrape (BYOK)",
      sourceRepo: "firecrawl/firecrawl",
      sourceUrl: "https://github.com/firecrawl/firecrawl",
      disposition: "byok_optional",
      capability: "networked",
      auth: "api_key",
      nexusSurface:
        "Settings firecrawlKey / env FIRECRAWL_KEY · ALPHA thesis context",
      operatorNote: firecrawlConfigured
        ? "Key present — optional richer markdown scrape via external API."
        : "Set FIRECRAWL_KEY for cleaner markdown extraction; native fetch_url remains fallback.",
    },
    {
      id: "browser_use_external",
      label: "browser-use agent loop",
      sourceRepo: "browser-use/browser-use",
      sourceUrl: "https://github.com/browser-use/browser-use",
      disposition: "external_reference",
      capability: "exec",
      auth: "api_key",
      nexusSurface:
        "HQ browser tools (navigate_to, click_element) — descriptor only",
      operatorNote:
        "Run browser-use beside Nexus; do not bundle Playwright agent runtime in-app.",
    },
    {
      id: "crawl4ai_external",
      label: "Crawl4AI",
      sourceRepo: "unclecode/crawl4ai",
      sourceUrl: "https://github.com/unclecode/crawl4ai",
      disposition: "external_reference",
      capability: "networked",
      auth: "none",
      nexusSurface: "NOVA research — compare against fetch_url output quality",
      operatorNote:
        "External Python service pattern; no vendored crawler in Nexus.",
    },
    {
      id: "crawlee_external",
      label: "Crawlee",
      sourceRepo: "apify/crawlee",
      sourceUrl: "https://github.com/apify/crawlee",
      disposition: "external_reference",
      capability: "networked",
      auth: "api_key",
      nexusSurface: "Operator crawl jobs — n8n / external worker only",
      operatorNote:
        "Use for scheduled scrape workers outside the dashboard runtime.",
    },
    {
      id: "scrapy_external",
      label: "Scrapy",
      sourceRepo: "scrapy/scrapy",
      sourceUrl: "https://github.com/scrapy/scrapy",
      disposition: "defer",
      capability: "networked",
      auth: "none",
      nexusSurface: "None in-app — batch ETL reference",
      operatorNote:
        "Classic spider framework; keep external to Nexus agent loop.",
    },
    {
      id: "markitdown_external",
      label: "MarkItDown",
      sourceRepo: "microsoft/markitdown",
      sourceUrl: "https://github.com/microsoft/markitdown",
      disposition: "external_reference",
      capability: "read",
      auth: "none",
      nexusSurface: "document_to_markdown tool + VAULT document intake",
      operatorNote:
        "Binary formats stay operator-side; Nexus handles text/html/markdown passthrough.",
    },
    {
      id: "scrapling_external",
      label: "Scrapling",
      sourceRepo: "D4Vinci/Scrapling",
      sourceUrl: "https://github.com/D4Vinci/Scrapling",
      disposition: "external_reference",
      capability: "networked",
      auth: "none",
      nexusSurface: "RECON passive fetch comparisons",
      operatorNote: "Adaptive fetch hardening reference — not bundled.",
    },
    {
      id: "scrcpy_external",
      label: "scrcpy",
      sourceRepo: "Genymobile/scrcpy",
      sourceUrl: "https://github.com/Genymobile/scrcpy",
      disposition: "defer",
      capability: "exec",
      auth: "none",
      nexusSurface: "Operator Android mirror — external only",
      operatorNote: "Phone acceptance / device QA; no in-app screen mirror.",
    },
    {
      id: "autoscraper_external",
      label: "AutoScraper",
      sourceRepo: "alirezamika/autoscraper",
      sourceUrl: "https://github.com/alirezamika/autoscraper",
      disposition: "external_reference",
      capability: "networked",
      auth: "none",
      nexusSurface: "NOVA — similar-page extraction pattern reference",
      operatorNote: "Use for one-off site structure learning outside Nexus.",
    },
    {
      id: "curl_impersonate_reference",
      label: "curl-impersonate",
      sourceRepo: "lwthiker/curl-impersonate",
      sourceUrl: "https://github.com/lwthiker/curl-impersonate",
      disposition: "boundary",
      capability: "networked",
      auth: "none",
      nexusSurface:
        "fetch_url hardening notes — do not bypass robots/rate limits",
      operatorNote:
        "Reference for TLS fingerprint parity only; Nexus stays on standard fetch with policy gates.",
    },
  ];
}

export function buildCrawlScrapeBridgeBrief(): string {
  const bridge = readExternalToolBridgeSummary();
  const lines = listCrawlScrapeDescriptors()
    .filter((d) => d.disposition !== "defer")
    .map((d) => `- ${d.label} (${d.disposition}): ${d.nexusSurface}`);
  return (
    `[CRAWL/SCRAPE BRIDGE — descriptor only]\n` +
    `External tool bridge: ${bridge.status}\n` +
    `${lines.join("\n")}\n` +
    `[END CRAWL/SCRAPE BRIDGE]\n`
  );
}
