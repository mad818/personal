// ── lib/recon/usernameEnum ────────────────────────────────────
// Username enumeration across a curated site manifest.
// Adapted from WhatsMyName / Blackbird patterns — TypeScript re-implementation.
// No Python vendoring, no Blackbird AI, no unbounded scans.

import SITES_JSON from "./whatsMyNameSites.json" with { type: "json" };

// ── Constants ─────────────────────────────────────────────────────────────────
export const USERNAME_ENUM_LIMITS = {
  maxUsernameLength: 39,
  minUsernameLength: 1,
  defaultMaxSites: 25,
  absoluteMaxSites: 30,
  maxConcurrency: 5,
  timeoutMs: 8_000,
  totalGuardMs: 30_000,
  maxFormattedChars: 4_000,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export type DetectionMode = "status_code" | "message";
export type SiteCategory = "dev" | "social" | "blog" | "forum" | "creative" | "career";
export type CheckStatus = "found" | "not_found" | "error" | "timeout";

export interface SiteEntry {
  name: string;
  uri_check: string;
  detection: DetectionMode;
  found_code?: number;
  miss_code?: number;
  found_string?: string;
  miss_string?: string;
  category: SiteCategory;
}

export interface UsernameCheckResult {
  name: string;
  uri: string;
  found: boolean;
  status: CheckStatus;
  category: SiteCategory;
  responseCode?: number;
}

export interface UsernameEnumSummary {
  username: string;
  checked: number;
  found: number;
  results: UsernameCheckResult[];
}

// ── Site manifest ─────────────────────────────────────────────────────────────
const SITES: SiteEntry[] = SITES_JSON as SiteEntry[];

export function getSiteManifest(): SiteEntry[] {
  return SITES;
}

// ── Input validation ──────────────────────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const PATH_TRAVERSAL_RE = /\.\.|[/\\]/;

export function normalizeUsername(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < USERNAME_ENUM_LIMITS.minUsernameLength) {
    throw new Error("Username must be at least 1 character");
  }
  if (trimmed.length > USERNAME_ENUM_LIMITS.maxUsernameLength) {
    throw new Error(
      `Username must be at most ${USERNAME_ENUM_LIMITS.maxUsernameLength} characters`,
    );
  }
  if (PATH_TRAVERSAL_RE.test(trimmed)) {
    throw new Error("Username contains invalid characters (path traversal)");
  }
  if (!USERNAME_RE.test(trimmed)) {
    throw new Error(
      "Username must contain only letters, numbers, hyphens, underscores, and dots",
    );
  }
  return trimmed;
}

// ── URL builder ───────────────────────────────────────────────────────────────
export function buildSiteUrl(site: SiteEntry, username: string): string {
  return site.uri_check.replace("{account}", encodeURIComponent(username));
}

// ── Concurrency pool ──────────────────────────────────────────────────────────
async function withBoundedConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker(): Promise<void> {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      results[idx] = await tasks[idx]!();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ── Fetcher type ──────────────────────────────────────────────────────────────
export type SiteFetcher = (
  url: string,
  timeoutMs: number,
  needsBody: boolean,
) => Promise<{ status: number; body?: string }>;

async function defaultFetcher(
  url: string,
  timeoutMs: number,
  needsBody: boolean,
): Promise<{ status: number; body?: string }> {
  const method = needsBody ? "GET" : "HEAD";
  const r = await fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusRecon/1.0)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = needsBody ? await r.text() : undefined;
  return { status: r.status, body };
}

// ── Single site check ─────────────────────────────────────────────────────────
async function checkSite(
  site: SiteEntry,
  username: string,
  timeoutMs: number,
  fetcher: SiteFetcher,
): Promise<UsernameCheckResult> {
  const uri = buildSiteUrl(site, username);
  const needsBody = site.detection === "message";

  try {
    const { status, body } = await fetcher(uri, timeoutMs, needsBody);

    if (site.detection === "status_code") {
      const foundCode = site.found_code ?? 200;
      const found = status === foundCode;
      const checkStatus: CheckStatus = found
        ? "found"
        : status === (site.miss_code ?? 404)
          ? "not_found"
          : "error";
      return { name: site.name, uri, found, status: checkStatus, category: site.category, responseCode: status };
    }

    // message detection
    const text = body ?? "";
    if (site.miss_string && text.includes(site.miss_string)) {
      return { name: site.name, uri, found: false, status: "not_found", category: site.category, responseCode: status };
    }
    if (site.found_string && text.includes(site.found_string)) {
      return { name: site.name, uri, found: true, status: "found", category: site.category, responseCode: status };
    }
    const found = status >= 200 && status < 300;
    return { name: site.name, uri, found, status: found ? "found" : "not_found", category: site.category, responseCode: status };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.message.includes("timed out") || err.message.includes("abort"));
    return {
      name: site.name,
      uri,
      found: false,
      status: isTimeout ? "timeout" : "error",
      category: site.category,
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface CheckUsernameOptions {
  maxSites?: number;
  timeoutMs?: number;
  _fetcher?: SiteFetcher;
}

export async function checkUsername(
  username: string,
  opts: CheckUsernameOptions = {},
): Promise<UsernameCheckResult[]> {
  const {
    maxSites = USERNAME_ENUM_LIMITS.defaultMaxSites,
    timeoutMs = USERNAME_ENUM_LIMITS.timeoutMs,
    _fetcher = defaultFetcher,
  } = opts;

  const clampedMax = Math.min(
    Math.max(1, maxSites),
    USERNAME_ENUM_LIMITS.absoluteMaxSites,
  );
  const clampedTimeout = Math.min(Math.max(1_000, timeoutMs), 15_000);

  const sites = SITES.slice(0, clampedMax);

  const tasks = sites.map(
    (site) => () => checkSite(site, username, clampedTimeout, _fetcher),
  );

  return withBoundedConcurrency(tasks, USERNAME_ENUM_LIMITS.maxConcurrency);
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatUsernameEnumResults(
  results: UsernameCheckResult[],
  username: string,
): string {
  const found = results.filter((r) => r.found);
  const errors = results.filter((r) => r.status === "error" || r.status === "timeout");

  if (results.length === 0) {
    return '<span style="color:var(--text3)">No sites checked</span>';
  }

  let html = `<div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">`;
  html += `"${esc(username)}" — ${found.length} of ${results.length} sites found`;
  html += `</div>`;

  if (found.length > 0) {
    html += `<div style="margin-bottom:6px">`;
    for (const r of found) {
      html += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)">`;
      html += `<span style="color:#10b981;font-size:11px">✓</span>`;
      html += `<a href="${esc(r.uri)}" target="_blank" rel="noopener noreferrer" `;
      html += `style="color:var(--text);font-size:11px;font-weight:700;text-decoration:none">${esc(r.name)}</a>`;
      html += `<span style="color:var(--text3);font-size:10px;margin-left:auto">${esc(r.category)}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  const notFound = results.filter((r) => r.status === "not_found");
  if (notFound.length > 0) {
    const names = notFound.map((r) => esc(r.name)).join(" · ");
    html += `<div style="font-size:10px;color:var(--text3);margin-top:4px">`;
    html += `Not found (${notFound.length}): ${names}`;
    html += `</div>`;
  }

  if (errors.length > 0) {
    html += `<div style="font-size:10px;color:var(--text3);margin-top:2px">`;
    html += `${errors.length} site${errors.length !== 1 ? "s" : ""} unreachable or timed out`;
    html += `</div>`;
  }

  if (html.length > USERNAME_ENUM_LIMITS.maxFormattedChars) {
    return html.slice(0, USERNAME_ENUM_LIMITS.maxFormattedChars) + "…";
  }

  return html;
}

