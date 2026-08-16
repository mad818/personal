// ── api/cves ────────────────────────────────────────────────
// CVE API: fetch and cache NVD CVE data with filtering and search.
// Cached for 10 minutes — NVD has a 30-45s response time; caching is critical.

import { NextResponse } from "next/server";
import { createCache } from "@/lib/apiCache";
import { readBoundedUpstreamJson } from "@/lib/liveFeedReliability";

// Returns last 30 days of CVEs, sorted by severity.

export const dynamic = "force-dynamic";

// Use a longer default TTL since NVD free tier is extremely slow
const cache = createCache<unknown[]>({ defaultTTL: 600_000 }); // 10 min
const CISA_KEV_FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface KevEntry {
  cveID: string;
  dateAdded?: string;
  vulnerabilityName?: string;
  shortDescription?: string;
  knownRansomwareCampaignUse?: string;
}

function mapKevToNvdLikeVulnerability(entry: KevEntry) {
  const isRansomware = String(entry.knownRansomwareCampaignUse ?? "")
    .toLowerCase()
    .includes("known");
  return {
    cve: {
      id: entry.cveID,
      descriptions: [
        {
          lang: "en",
          value:
            entry.shortDescription ||
            entry.vulnerabilityName ||
            "Known exploited vulnerability from the CISA KEV catalog.",
        },
      ],
      metrics: {
        cvssMetricV31: [
          {
            cvssData: {
              baseScore: isRansomware ? 9.3 : 8.1,
              baseSeverity: isRansomware ? "CRITICAL" : "HIGH",
            },
          },
        ],
      },
      published: entry.dateAdded ?? "",
    },
  };
}

async function fetchCisaKevFallback() {
  const r = await fetch(CISA_KEV_FEED, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) return [];
  const d = await readBoundedUpstreamJson<{
    vulnerabilities?: KevEntry[];
  }>(r);
  return ((d.vulnerabilities ?? []) as KevEntry[])
    .slice(0, 40)
    .map(mapKevToNvdLikeVulnerability);
}

export async function GET() {
  const CACHE_KEY = "cves";
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return NextResponse.json(
      { vulnerabilities: cached },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
    );
  }

  try {
    const since =
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19) + ".000";

    const apiKey = process.env.NVD_KEY ?? "";
    const headers: Record<string, string> = {};
    if (apiKey) headers["apiKey"] = apiKey;

    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=40&pubStartDate=${since}`;

    const r = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(50000), // NVD free tier can take 30-45s
    });

    if (!r.ok) {
      const fallback = await fetchCisaKevFallback();
      if (fallback.length) cache.set(CACHE_KEY, fallback);
      return NextResponse.json(
        {
          vulnerabilities: fallback,
          ...(fallback.length
            ? { degraded: true }
            : { error: "Vulnerability feeds are temporarily unavailable." }),
          source: fallback.length ? "cisa-kev-fallback" : "unavailable",
        },
        { status: fallback.length ? 200 : 503 },
      );
    }

    const d = await readBoundedUpstreamJson<{
      vulnerabilities?: unknown[];
    }>(r);
    const vulns = d.vulnerabilities ?? [];
    if (!vulns.length) {
      const fallback = await fetchCisaKevFallback();
      if (!fallback.length) {
        return NextResponse.json({
          vulnerabilities: [],
          source: "nvd",
          verifiedEmpty: true,
        });
      }
      cache.set(CACHE_KEY, fallback);
      return NextResponse.json(
        {
          vulnerabilities: fallback,
          source: "cisa-kev-fallback",
        },
        { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
      );
    }
    cache.set(CACHE_KEY, vulns);

    return NextResponse.json(
      { vulnerabilities: vulns, source: "nvd" },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
    );
  } catch {
    const fallback = await fetchCisaKevFallback().catch(() => []);
    if (fallback.length) cache.set(CACHE_KEY, fallback);
    return NextResponse.json(
      {
        vulnerabilities: fallback,
        ...(fallback.length
          ? { degraded: true }
          : { error: "Vulnerability feeds are temporarily unavailable." }),
        source: fallback.length ? "cisa-kev-fallback" : "unavailable",
      },
      { status: fallback.length ? 200 : 503 },
    );
  }
}
