// ── api/cisa-kev ────────────────────────────────────────────
// CISA KEV catalog API: fetch and cache CISA known exploited vulnerabilities.

import { NextResponse } from "next/server";
import { isCisaKevEntry, type CisaKevEntry } from "@/lib/cisaKev";
// Free JSON feed — no key required.

export const dynamic = "force-dynamic";

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CISA_UNAVAILABLE = "CISA KEV feed is temporarily unavailable.";

function unavailableResponse() {
  return NextResponse.json(
    { error: CISA_UNAVAILABLE, vulnerabilities: [] },
    { status: 502 },
  );
}

export async function GET() {
  try {
    const r = await fetch(KEV_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return unavailableResponse();

    const data: unknown = await r.json();
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { vulnerabilities?: unknown }).vulnerabilities) ||
      !(data as { vulnerabilities: unknown[] }).vulnerabilities.every(
        isCisaKevEntry,
      )
    ) {
      return unavailableResponse();
    }

    const catalog = data as {
      vulnerabilities: CisaKevEntry[];
      catalogVersion?: unknown;
      dateReleased?: unknown;
      count?: unknown;
    };
    // Sort by dateAdded descending and return the most recent 50
    const sorted = catalog.vulnerabilities
      .slice()
      .sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
      .slice(0, 50);
    return NextResponse.json({
      vulnerabilities: sorted,
      catalogVersion:
        typeof catalog.catalogVersion === "string"
          ? catalog.catalogVersion
          : "",
      dateReleased:
        typeof catalog.dateReleased === "string" ? catalog.dateReleased : "",
      total:
        typeof catalog.count === "number" && Number.isFinite(catalog.count)
          ? catalog.count
          : sorted.length,
    });
  } catch {
    return unavailableResponse();
  }
}
