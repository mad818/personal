// ── api/sec-filings ─────────────────────────────────────────
// SEC filings API: 10-K, 10-Q, 8-K documents and corporate disclosures.

import { NextRequest, NextResponse } from "next/server";
import {
  extractSecCompanyFacts,
  findSecCompanyIdentity,
  type SecCompanyFactsSummary,
} from "@/lib/secCompanyFacts";
import { readBoundedUpstreamJson } from "@/lib/liveFeedReliability";

export const dynamic = "force-dynamic";

const SEC_HEADERS = {
  "User-Agent": "NexusPrime/1.0 (contact@nexusprime.local)",
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate",
};

interface Filing {
  company: string;
  form_type: string;
  date_filed: string;
  description: string;
  url: string;
}

interface EFTSHit {
  _source: {
    entity_name?: string;
    file_date?: string;
    form_type?: string;
    period_of_report?: string;
    file_num?: string;
    display_date_filed?: string;
    biz_location?: string;
    inc_states?: string;
    category?: string;
    file_name?: string;
    id?: string;
  };
}

interface EFTSResponse {
  hits?: {
    hits?: EFTSHit[];
    total?: { value: number };
  };
}

async function searchEFTS(query: string): Promise<Filing[]> {
  const encoded = encodeURIComponent(query);
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  // Use EFTS full-text search
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encoded}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=20`;

  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: SEC_HEADERS,
  });

  if (!r.ok) throw new Error(`SEC EFTS error: ${r.status}`);

  const data = await readBoundedUpstreamJson<EFTSResponse>(r);
  const hits = data.hits?.hits ?? [];

  return hits.map((hit) => {
    const src = hit._source;
    const fileName = src.file_name ?? "";
    const entityName = src.entity_name ?? "Unknown Entity";
    const formType = src.form_type ?? "";
    const dateFiled = src.file_date ?? src.display_date_filed ?? "";
    const id = src.id ?? "";

    // Build the EDGAR filing URL
    const secUrl = fileName
      ? `https://www.sec.gov/Archives/edgar/data/${fileName}`
      : id
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${id}`
        : "https://www.sec.gov/cgi-bin/browse-edgar";

    const description =
      [
        src.category ?? "",
        src.period_of_report ? `Period: ${src.period_of_report}` : "",
        src.biz_location ?? "",
      ]
        .filter(Boolean)
        .join(" | ") || `${formType} filing`;

    return {
      company: entityName,
      form_type: formType,
      date_filed: dateFiled,
      description,
      url: secUrl,
    };
  });
}

async function searchEDGAR(query: string): Promise<Filing[]> {
  // Alternative: use EDGAR full-text search API
  const encoded = encodeURIComponent(query);
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encoded}&from=0&size=20`;

  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: SEC_HEADERS,
  });

  if (!r.ok) throw new Error(`SEC EDGAR search error: ${r.status}`);

  const data = await readBoundedUpstreamJson<EFTSResponse>(r);
  const hits = data.hits?.hits ?? [];

  return hits.map((hit) => {
    const src = hit._source;
    const formType = src.form_type ?? "";
    const entityName = src.entity_name ?? "Unknown Entity";
    const dateFiled = src.file_date ?? "";
    const fileName = src.file_name ?? "";

    const secUrl = fileName
      ? `https://www.sec.gov/Archives/edgar/data/${fileName}`
      : "https://www.sec.gov/cgi-bin/browse-edgar";

    const description =
      [
        src.category ?? "",
        src.period_of_report ? `Period: ${src.period_of_report}` : "",
      ]
        .filter(Boolean)
        .join(" | ") || `${formType} filing`;

    return {
      company: entityName,
      form_type: formType,
      date_filed: dateFiled,
      description,
      url: secUrl,
    };
  });
}

async function fetchCompanyFacts(
  ticker: string,
): Promise<SecCompanyFactsSummary | null> {
  try {
    const tickerResponse = await fetch(
      "https://www.sec.gov/files/company_tickers.json",
      {
        signal: AbortSignal.timeout(8000),
        headers: SEC_HEADERS,
        next: { revalidate: 86_400 },
      },
    );
    if (!tickerResponse.ok) return null;
    const company = findSecCompanyIdentity(
      await readBoundedUpstreamJson<unknown>(tickerResponse),
      ticker,
    );
    if (!company) return null;

    const factsResponse = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`,
      {
        signal: AbortSignal.timeout(10_000),
        headers: SEC_HEADERS,
        next: { revalidate: 3_600 },
      },
    );
    if (!factsResponse.ok) return null;
    return extractSecCompanyFacts(
      await readBoundedUpstreamJson<unknown>(factsResponse),
      company,
    );
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const ticker = searchParams.get("ticker")?.trim().toUpperCase() ?? "";

  if (!query.trim()) {
    return NextResponse.json(
      { filings: [], error: "Missing required ?query= parameter" },
      { status: 400 },
    );
  }

  try {
    let filings: Filing[] = [];
    let companyFacts: SecCompanyFactsSummary | null = null;
    let filingsAvailable = false;

    const [filingResult, factsResult] = await Promise.allSettled([
      searchEFTS(query),
      ticker ? fetchCompanyFacts(ticker) : Promise.resolve(null),
    ]);
    if (filingResult.status === "fulfilled") {
      filings = filingResult.value;
      filingsAvailable = true;
    } else {
      try {
        filings = await searchEDGAR(query);
        filingsAvailable = true;
      } catch {
        filings = [];
      }
    }
    if (factsResult.status === "fulfilled") {
      companyFacts = factsResult.value;
    }

    return NextResponse.json(
      {
        query,
        count: filings.length,
        filings,
        companyFacts,
        timestamp: new Date().toISOString(),
        source: "SEC EDGAR EFTS + Companyfacts",
        ...(filingsAvailable
          ? {}
          : { error: "SEC filings are temporarily unavailable." }),
      },
      { status: filingsAvailable ? 200 : 502 },
    );
  } catch {
    return NextResponse.json(
      {
        query,
        filings: [],
        count: 0,
        error: "SEC filings are temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}
