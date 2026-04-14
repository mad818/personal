import { NextRequest } from "next/server";
import { connectorJson } from "@/lib/connectorResponse";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "api-recon-passive-dns",
  windowMs: 60_000,
  maxAttempts: 20,
  includeBearerToken: false,
} as const;

type PassiveDnsTargetType = "domain" | "ip";

interface PdnsRecord {
  rrtype: string;
  rrname: string;
  rdata: string;
  time_first: number;
  time_last: number;
  count: number;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectType(raw: string): PassiveDnsTargetType {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(raw) ? "ip" : "domain";
}

function validateTarget(raw: string) {
  const target = raw.trim();
  if (!target) {
    throw new Error("target is required.");
  }
  if (target.length > 253) {
    throw new Error("target is too long.");
  }
  if (!/^[A-Za-z0-9._:@/\-]+$/.test(target)) {
    throw new Error("target is invalid.");
  }
  return target;
}

async function fetchCirclPdns(target: string): Promise<string> {
  const response = await fetch(
    `https://www.circl.lu/pdns/query/${encodeURIComponent(target)}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`CIRCL passive DNS returned HTTP ${response.status}.`);
  }

  const text = await response.text();
  const records: PdnsRecord[] = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as PdnsRecord;
      } catch {
        return null;
      }
    })
    .filter((value): value is PdnsRecord => value !== null);

  if (!records.length) {
    return '<span style="color:var(--text3)">No passive DNS records found</span>';
  }

  const byType = new Map<string, PdnsRecord[]>();
  records.forEach((record) => {
    if (!byType.has(record.rrtype)) byType.set(record.rrtype, []);
    byType.get(record.rrtype)?.push(record);
  });

  let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:8px">${records.length} historical record${records.length !== 1 ? "s" : ""} · source: CIRCL pDNS</div>`;
  byType.forEach((recordsForType, type) => {
    html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:8px 0 3px;text-transform:uppercase;letter-spacing:.5px">${esc(type)}</div>`;
    recordsForType.slice(0, 10).forEach((record) => {
      const first = record.time_first
        ? new Date(record.time_first * 1000).toISOString().slice(0, 10)
        : "";
      const last = record.time_last
        ? new Date(record.time_last * 1000).toISOString().slice(0, 10)
        : "";
      const dateSpan = first
        ? ` <span style="color:var(--text3);font-size:9px">${first}${last && last !== first ? ` → ${last}` : ""}</span>`
        : "";
      html += `<div style="font-size:11px;color:var(--text);word-break:break-all;padding:2px 0;border-bottom:1px solid var(--border)">${esc(record.rdata)}${dateSpan}</div>`;
    });
    if (recordsForType.length > 10) {
      html += `<div style="font-size:9px;color:var(--text3);margin-top:2px">+${recordsForType.length - 10} more</div>`;
    }
  });

  return html;
}

async function fetchReverseIp(ip: string): Promise<string> {
  const response = await fetch(
    `https://api.hackertarget.com/reverseiplookup/?q=${encodeURIComponent(ip)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) {
    throw new Error(`HackerTarget reverse IP returned HTTP ${response.status}.`);
  }

  const text = await response.text();
  if (!text.trim() || text.includes("error") || text.includes("API count")) {
    throw new Error(text.trim() || "Reverse IP lookup unavailable.");
  }

  const hosts = text.trim().split("\n").filter(Boolean);
  if (!hosts.length) {
    return '<span style="color:var(--text3)">No co-hosted domains found</span>';
  }

  let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:8px">${hosts.length} domain${hosts.length !== 1 ? "s" : ""} on this IP · source: HackerTarget</div>`;
  hosts.slice(0, 30).forEach((host) => {
    html += `<div style="font-size:11px;color:var(--text);padding:2px 0;border-bottom:1px solid var(--border)">${esc(host.trim())}</div>`;
  });
  if (hosts.length > 30) {
    html += `<div style="font-size:9px;color:var(--text3);margin-top:2px">+${hosts.length - 30} more</div>`;
  }

  return html;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  const targetParam = req.nextUrl.searchParams.get("target") ?? "";

  let target = "";
  try {
    target = validateTarget(targetParam);
  } catch (error) {
    const response = protectedJson(
      { error: error instanceof Error ? error.message : "Invalid target." },
      { status: 400 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  const targetType = detectType(target);
  const warnings: string[] = [];

  try {
    let pdns = "";
    let reverseIp = "";

    if (targetType === "domain") {
      pdns = await fetchCirclPdns(target);
    } else {
      const [pdnsResult, reverseIpResult] = await Promise.allSettled([
        fetchCirclPdns(target),
        fetchReverseIp(target),
      ]);

      if (pdnsResult.status === "fulfilled") {
        pdns = pdnsResult.value;
      } else {
        warnings.push(
          pdnsResult.reason instanceof Error
            ? pdnsResult.reason.message
            : "Passive DNS query failed.",
        );
      }

      if (reverseIpResult.status === "fulfilled") {
        reverseIp = reverseIpResult.value;
      } else {
        warnings.push(
          reverseIpResult.reason instanceof Error
            ? reverseIpResult.reason.message
            : "Reverse IP lookup failed.",
        );
      }
    }

    if (!pdns && !reverseIp) {
      const response = connectorJson(
        {
          target,
          targetType,
          pdns: "",
          reverseIp: "",
          error: "Passive DNS sources are currently unavailable.",
        },
        {
          source: "recon-passive-dns",
          maxAgeSeconds: 60,
          degraded: true,
          warnings,
          status: 200,
        },
      );
      applyRateLimitHeaders(response, RATE_LIMIT);
      return response;
    }

    const response = connectorJson(
      {
        target,
        targetType,
        pdns,
        reverseIp,
      },
      {
        source: "recon-passive-dns",
        maxAgeSeconds: 60,
        degraded: warnings.length > 0,
        warnings,
        status: 200,
      },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch (error) {
    const response = connectorJson(
      {
        target,
        targetType,
        pdns: "",
        reverseIp: "",
        error:
          error instanceof Error
            ? error.message
            : "Passive DNS lookup failed.",
      },
      {
        source: "recon-passive-dns",
        maxAgeSeconds: 60,
        degraded: true,
        warnings: [],
        status: 200,
      },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }
}
