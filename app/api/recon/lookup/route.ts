import { NextRequest } from "next/server";
import { connectorJson } from "@/lib/connectorResponse";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { getRuntimeEnvValue } from "@/lib/serverEnvRuntime";

export const dynamic = "force-dynamic";

type LookupPanel =
  | "rdap"
  | "dns"
  | "certs"
  | "geo"
  | "subdomains"
  | "dnssec"
  | "emailrep"
  | "username"
  | "hibp"
  | "vt"
  | "shodan";
type TargetType =
  | "auto"
  | "domain"
  | "ip"
  | "email"
  | "hash"
  | "url"
  | "username";
type ResolvedTargetType = Exclude<TargetType, "auto">;

const RATE_LIMIT = {
  bucket: "api-recon-lookup",
  windowMs: 60_000,
  maxAttempts: 40,
  includeBearerToken: false,
} as const;

const VALID_PANELS = new Set<LookupPanel>([
  "rdap",
  "dns",
  "certs",
  "geo",
  "subdomains",
  "dnssec",
  "emailrep",
  "username",
  "hibp",
  "vt",
  "shodan",
]);
const VALID_TARGET_TYPES = new Set<TargetType>([
  "auto",
  "domain",
  "ip",
  "email",
  "hash",
  "url",
  "username",
]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function placeholder(msg: string): string {
  return `<span style="color:var(--text3)">${esc(msg)}</span>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${color}22;color:${color}">${esc(text)}</span>`;
}

function table(rows: [string, string][]): string {
  if (!rows.length) return "";
  return (
    '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:var(--text3);padding:3px 8px 3px 0;white-space:nowrap;vertical-align:top">${k}</td><td style="color:var(--text);word-break:break-all">${v}</td></tr>`,
      )
      .join("") +
    "</table>"
  );
}

function detectType(raw: string): ResolvedTargetType {
  if (/^[\da-f]{32,64}$/i.test(raw)) return "hash";
  if (/^https?:\/\//i.test(raw)) return "url";
  if (/@/.test(raw)) return "email";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(raw)) return "ip";
  if (/^[a-z0-9_.-]+$/i.test(raw) && !raw.includes(".")) return "username";
  return "domain";
}

function extractDomainFromTarget(
  target: string,
  targetType: ResolvedTargetType,
): string {
  if (targetType === "email") return target.split("@")[1] ?? "";
  if (targetType === "url") return new URL(target).hostname;
  return target;
}

function validateTarget(raw: string, targetType: ResolvedTargetType): string {
  const target = raw.trim();
  if (!target) throw new Error("target is required.");
  if (target.length > 512) throw new Error("target is too long.");

  switch (targetType) {
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
        throw new Error("email target is invalid.");
      }
      return target.toLowerCase();
    case "ip":
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(target)) {
        throw new Error("IP target is invalid.");
      }
      return target;
    case "hash":
      if (!/^[\da-f]{32,64}$/i.test(target)) {
        throw new Error("hash target is invalid.");
      }
      return target.toLowerCase();
    case "url":
      try {
        const parsed = new URL(target);
        if (!/^https?:$/.test(parsed.protocol)) {
          throw new Error("Only http and https URLs are supported.");
        }
        return parsed.toString();
      } catch {
        throw new Error("URL target is invalid.");
      }
    case "domain":
      if (!/^[A-Za-z0-9.-]{1,253}$/.test(target) || !target.includes(".")) {
        throw new Error("domain target is invalid.");
      }
      return target.toLowerCase();
    case "username":
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(target)) {
        throw new Error("username target is invalid.");
      }
      return target;
  }
}

function readEntityDisplayName(entity?: Record<string, unknown>): string | null {
  const vcardArray = entity?.vcardArray;
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) {
    return null;
  }
  const fn = (vcardArray[1] as unknown[]).find(
    (value) => Array.isArray(value) && value[0] === "fn",
  ) as unknown[] | undefined;
  const name = fn ? String(fn[3] ?? "") : "";
  return name || null;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchRdap(target: string, targetType: ResolvedTargetType) {
  if (targetType === "ip") {
    const d = (await fetchJson(
      `https://rdap.org/ip/${encodeURIComponent(target)}`,
      { signal: AbortSignal.timeout(10_000) },
    )) as Record<string, unknown>;
    const rows: [string, string][] = [];
    if (typeof d.name === "string") rows.push(["Name", esc(d.name)]);
    if (typeof d.type === "string") rows.push(["Type", esc(d.type)]);
    if (typeof d.handle === "string") rows.push(["Handle", esc(d.handle)]);
    const cidr = ((d.cidr0CIDRs ?? []) as Array<Record<string, unknown>>)
      .map((c) => `${String(c.v4prefix ?? c.v6prefix ?? "")}/${String(c.length ?? "")}`)
      .filter(Boolean);
    if (cidr.length) rows.push(["CIDR", esc(cidr[0] ?? "")]);
    if (typeof d.country === "string") rows.push(["Country", esc(d.country)]);
    const org = ((d.entities ?? []) as Array<Record<string, unknown>>).find((entity) =>
      Array.isArray(entity.roles) && entity.roles.includes("registrant"),
    );
    const orgName = readEntityDisplayName(org);
    if (orgName) rows.push(["Org", esc(orgName)]);
    return table(rows) || placeholder("No data");
  }

  const domain = extractDomainFromTarget(target, targetType);
  const d = (await fetchJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    signal: AbortSignal.timeout(10_000),
  })) as Record<string, unknown>;
  const rows: [string, string][] = [];
  if (typeof d.ldhName === "string") rows.push(["Domain", esc(d.ldhName)]);
  if (Array.isArray(d.status)) {
    rows.push(["Status", (d.status as string[]).map(esc).join(", ")]);
  }
  const ns = ((d.nameservers ?? []) as Array<Record<string, unknown>>)
    .map((entry) => esc(String(entry.ldhName ?? "")))
    .filter(Boolean);
  if (ns.length) rows.push(["NS", ns.join(", ")]);
  const registrar = ((d.entities ?? []) as Array<Record<string, unknown>>).find((entity) =>
    Array.isArray(entity.roles) && entity.roles.includes("registrar"),
  );
  const registrarName = readEntityDisplayName(registrar);
  if (registrarName) rows.push(["Registrar", esc(registrarName)]);
  const registration = ((d.events ?? []) as Array<Record<string, unknown>>).find(
    (event) => event.eventAction === "registration",
  );
  const expiration = ((d.events ?? []) as Array<Record<string, unknown>>).find(
    (event) => event.eventAction === "expiration",
  );
  if (registration) {
    rows.push(["Registered", esc(String(registration.eventDate ?? "").slice(0, 10))]);
  }
  if (expiration) {
    rows.push(["Expires", esc(String(expiration.eventDate ?? "").slice(0, 10))]);
  }
  return table(rows) || placeholder("No data");
}

async function fetchDns(domain: string) {
  const types = ["A", "MX", "NS", "TXT"] as const;
  const results = await Promise.allSettled(
    types.map((type) =>
      fetchJson(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        { signal: AbortSignal.timeout(10_000) },
      ),
    ),
  );
  let html = "";
  types.forEach((type, index) => {
    const result = results[index];
    if (
      result?.status === "fulfilled" &&
      Array.isArray((result.value as { Answer?: unknown[] }).Answer) &&
      (result.value as { Answer: unknown[] }).Answer.length > 0
    ) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:6px 0 2px">${type}</div>`;
      ((result.value as { Answer: Array<{ data?: string }> }).Answer ?? []).forEach(
        (answer) => {
          html += `<div style="font-size:11px;color:var(--text);word-break:break-all;padding:1px 0">${esc(String(answer.data ?? ""))}</div>`;
        },
      );
    }
  });
  return html || placeholder("No records found");
}

async function fetchCerts(domain: string) {
  const data = (await fetchJson(
    `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
    { signal: AbortSignal.timeout(10_000) },
  )) as Array<Record<string, unknown>>;
  const seen = new Set<string>();
  const uniq = data
    .filter((cert) => {
      const commonName = String(cert.common_name ?? "");
      if (!commonName || seen.has(commonName)) return false;
      seen.add(commonName);
      return true;
    })
    .slice(0, 12);
  if (!uniq.length) return placeholder("No certificates found");
  let html = "";
  uniq.forEach((cert) => {
    const issued = String(cert.not_before ?? "").slice(0, 10);
    const expires = String(cert.not_after ?? "").slice(0, 10);
    const issuer = esc(
      String(cert.issuer_name ?? "").replace(/.*CN=/, "").split(",")[0] ?? "",
    );
    html += `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text);font-weight:700">${esc(String(cert.common_name ?? ""))}</span><span style="color:var(--text3);margin-left:8px">${esc(issued)} → ${esc(expires)}</span><span style="color:var(--accent);margin-left:8px;font-size:10px">${issuer}</span></div>`;
  });
  if (data.length > 12) {
    html += `<div style="font-size:10px;color:var(--text3);margin-top:6px">+${data.length - 12} more — see crt.sh</div>`;
  }
  return html;
}

async function fetchIpGeo(ip: string) {
  const d = (await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
    signal: AbortSignal.timeout(10_000),
  })) as Record<string, unknown>;
  if (d.error) return `<span style="color:var(--flo)">${esc(String(d.reason ?? d.error))}</span>`;
  return table([
    ["IP", esc(String(d.ip ?? ip))],
    ["City", esc(String(d.city ?? "—"))],
    ["Region", esc(String(d.region ?? "—"))],
    [
      "Country",
      esc(`${String(d.country_name ?? "")} ${String(d.country_code ?? "")}`.trim()),
    ],
    ["Org", esc(String(d.org ?? "—"))],
    ["ASN", esc(String(d.asn ?? "—"))],
    ["Timezone", esc(String(d.timezone ?? "—"))],
  ]);
}

async function fetchDomainGeo(domain: string) {
  const dd = (await fetchJson(
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
    { signal: AbortSignal.timeout(10_000) },
  )) as { Answer?: Array<{ data?: string }> };
  const ip = dd.Answer?.[0]?.data;
  if (!ip) return placeholder("Could not resolve domain to IP");
  return fetchIpGeo(ip);
}

async function fetchSubdomains(domain: string) {
  const text = await fetchText(
    `https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (text.includes("API count exceeded") || text.toLowerCase().includes("error")) {
    return placeholder("HackerTarget free limit reached — try again later");
  }
  const lines = text.trim().split("\n").filter(Boolean).slice(0, 40);
  if (!lines.length) return placeholder("No subdomains found");
  let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:6px">${lines.length} subdomain${lines.length !== 1 ? "s" : ""} found</div>`;
  lines.forEach((line) => {
    const [subdomain, ip] = line.split(",");
    html += `<div style="font-size:11px;display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text)">${esc(subdomain ?? "")}</span><span style="color:var(--text3)">${esc(ip ?? "")}</span></div>`;
  });
  if (lines.length === 40) {
    html += `<div style="font-size:10px;color:var(--text3);margin-top:4px">Showing first 40 — more may exist</div>`;
  }
  return html;
}

async function fetchDnsSecurity(domain: string) {
  const [spfRes, dmarcRes, dkimRes] = await Promise.allSettled([
    fetchJson(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`,
      { signal: AbortSignal.timeout(10_000) },
    ),
    fetchJson(
      `https://dns.google/resolve?name=_dmarc.${encodeURIComponent(domain)}&type=TXT`,
      { signal: AbortSignal.timeout(10_000) },
    ),
    fetchJson(
      `https://dns.google/resolve?name=default._domainkey.${encodeURIComponent(domain)}&type=TXT`,
      { signal: AbortSignal.timeout(10_000) },
    ),
  ]);

  const spfRecords =
    spfRes.status === "fulfilled"
      ? (((spfRes.value as { Answer?: Array<{ data: string }> }).Answer ?? []).filter(
          (answer) => answer.data.includes("v=spf1"),
        ))
      : [];
  const dmarcRecords =
    dmarcRes.status === "fulfilled"
      ? (((dmarcRes.value as { Answer?: Array<{ data: string }> }).Answer ?? []).filter(
          (answer) => answer.data.includes("v=DMARC1"),
        ))
      : [];
  const dkimRecords =
    dkimRes.status === "fulfilled"
      ? (((dkimRes.value as { Answer?: Array<{ data: string }> }).Answer ?? []).filter(
          (answer) => answer.data.includes("v=DKIM1"),
        ))
      : [];

  const check = (ok: boolean, label: string, value: string) =>
    `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:${ok ? "#10b981" : "#ef4444"};font-size:12px">${ok ? "✅" : "❌"}</span><div><div style="font-size:11px;font-weight:700;color:var(--text)">${label}</div><div style="font-size:10px;color:var(--text3);word-break:break-all">${esc(value)}</div></div></div>`;

  return (
    check(
      spfRecords.length > 0,
      "SPF",
      spfRecords.length > 0
        ? spfRecords[0]?.data ?? ""
        : "No SPF record — anyone can spoof this domain",
    ) +
    check(
      dmarcRecords.length > 0,
      "DMARC",
      dmarcRecords.length > 0
        ? dmarcRecords[0]?.data ?? ""
        : "No DMARC policy — phishing risk",
    ) +
    check(
      dkimRecords.length > 0,
      "DKIM",
      dkimRecords.length > 0
        ? dkimRecords[0]?.data ?? ""
        : "No DKIM (default selector) — check selector name",
    )
  );
}

async function fetchEmailRep(email: string) {
  const d = (await fetchJson(`https://emailrep.io/${encodeURIComponent(email)}`, {
    headers: { "User-Agent": "Nexus-Prime" },
    signal: AbortSignal.timeout(10_000),
  })) as Record<string, unknown>;
  const suspicious = Boolean(d.suspicious);
  const riskColor = suspicious ? "#ef4444" : "#10b981";
  const rows: [string, string][] = [
    ["Email", esc(String(d.email ?? email))],
    ["Reputation", badge(String(d.reputation ?? "—"), riskColor)],
    ["Suspicious", badge(suspicious ? "YES" : "NO", suspicious ? "#ef4444" : "#10b981")],
    ["References", String(d.references ?? 0)],
  ];
  const details = (d.details ?? {}) as Record<string, unknown>;
  if (details.blacklisted) rows.push(["Blacklisted", badge("YES", "#ef4444")]);
  if (details.malicious_activity) {
    rows.push(["Malicious activity", badge("YES", "#ef4444")]);
  }
  if (details.credentials_leaked) {
    rows.push(["Credentials leaked", badge("YES", "#f59e0b")]);
  }
  if (details.spam) rows.push(["Spam source", badge("YES", "#f59e0b")]);
  if (details.data_breach) rows.push(["Data breach", badge("YES", "#f59e0b")]);
  if (details.days_since_domain_creation) {
    rows.push(["Domain age", `${String(details.days_since_domain_creation)} days`]);
  }
  if (Array.isArray(details.profiles) && details.profiles.length > 0) {
    rows.push(["Profiles", details.profiles.map((value) => esc(String(value))).join(", ")]);
  }
  return table(rows);
}

async function fetchUsername(username: string) {
  const [githubRes, gravatarRes] = await Promise.allSettled([
    fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(10_000),
    }),
    fetchJson(`https://www.gravatar.com/${encodeURIComponent(username)}.json`, {
      signal: AbortSignal.timeout(10_000),
    }),
  ]);

  let html = "";
  if (
    githubRes.status === "fulfilled" &&
    typeof (githubRes.value as Record<string, unknown>).login === "string"
  ) {
    const github = githubRes.value as Record<string, unknown>;
    html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">GitHub</div>`;
    html += table([
      ["Login", esc(String(github.login ?? ""))],
      ["Name", esc(String(github.name ?? "—"))],
      ["Bio", esc(String(github.bio ?? "—"))],
      ["Location", esc(String(github.location ?? "—"))],
      ["Repos", String(github.public_repos ?? 0)],
      ["Followers", String(github.followers ?? 0)],
      ["Created", esc(String(github.created_at ?? "").slice(0, 10))],
      ...(github.company ? [["Company", esc(String(github.company))] as [string, string]] : []),
      ...(github.blog ? [["Website", esc(String(github.blog))] as [string, string]] : []),
    ]);
  } else {
    html += `<div style="color:var(--text3);font-size:11px">No GitHub profile found for "${esc(username)}"</div>`;
  }

  if (
    gravatarRes.status === "fulfilled" &&
    Array.isArray((gravatarRes.value as { entry?: unknown[] }).entry) &&
    (gravatarRes.value as { entry: unknown[] }).entry.length > 0
  ) {
    const entry = ((gravatarRes.value as { entry: Array<Record<string, unknown>> }).entry[0] ??
      {}) as Record<string, unknown>;
    const gravatarRows: [string, string][] = [];
    if (entry.displayName) gravatarRows.push(["Name", esc(String(entry.displayName))]);
    if (entry.currentLocation) {
      gravatarRows.push(["Location", esc(String(entry.currentLocation))]);
    }
    if (
      Array.isArray(entry.emails) &&
      typeof (entry.emails[0] as { value?: string } | undefined)?.value === "string"
    ) {
      gravatarRows.push(["Email", esc(String((entry.emails[0] as { value: string }).value))]);
    }
    if (gravatarRows.length > 0) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:10px 0 6px">Gravatar</div>`;
      html += table(gravatarRows);
    }
  }

  return html || placeholder("No public profiles found");
}

async function fetchHibp(email: string): Promise<string> {
  const key = await getRuntimeEnvValue("HIBP_API_KEY");
  if (!key) return placeholder("Add HIBP key in Settings to check breaches");
  const response = await fetch(
    `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
    {
      headers: { "hibp-api-key": key, "User-Agent": "Nexus-Prime" },
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (response.status === 404) {
    return '<span style="color:var(--fhi)">✅ No breaches found</span>';
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const breaches: {
    Name?: string;
    Title?: string;
    BreachDate?: string;
    DataClasses?: string[];
    IsSensitive?: boolean;
    IsVerified?: boolean;
  }[] = await response.json();
  let html = `<div style="font-weight:700;color:var(--flo);margin-bottom:6px">${breaches.length} breach${breaches.length !== 1 ? "es" : ""} found</div>`;
  breaches.forEach((breach) => {
    const color = breach.IsSensitive
      ? "var(--flo)"
      : breach.IsVerified
        ? "var(--fmd)"
        : "var(--text2)";
    html += `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:${color};font-weight:700">${esc(breach.Name ?? breach.Title ?? "")}</span><span style="color:var(--text3);margin-left:8px">${esc((breach.BreachDate ?? "").slice(0, 10))}</span><span style="color:var(--text2);margin-left:8px;font-size:10px">${(breach.DataClasses ?? []).slice(0, 4).map(esc).join(" · ")}</span></div>`;
  });
  return html;
}

async function fetchVirusTotal(
  target: string,
  targetType: ResolvedTargetType,
): Promise<string> {
  const key = await getRuntimeEnvValue("VT_API_KEY");
  if (!key) return placeholder("Add VirusTotal key in Settings");
  let endpoint = "";
  if (targetType === "hash") {
    endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(target)}`;
  } else if (targetType === "ip") {
    endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`;
  } else {
    const domain = targetType === "url" ? new URL(target).hostname : target;
    endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`;
  }
  const response = await fetch(endpoint, {
    headers: { "x-apikey": key },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const stats = data.data?.attributes?.last_analysis_stats ?? {};
  const total = (Object.values(stats) as number[]).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const malicious = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
  const color =
    malicious === 0 ? "var(--fhi)" : malicious < 5 ? "var(--fmd)" : "var(--flo)";
  let html = `<div style="font-size:16px;font-weight:900;color:${color};margin-bottom:8px">${malicious}/${total} engines flagged</div>`;
  const rows: [string, string][] = [];
  if (data.data?.attributes?.reputation !== undefined) {
    rows.push(["Reputation", String(data.data.attributes.reputation)]);
  }
  if (data.data?.attributes?.last_analysis_date) {
    rows.push([
      "Last scan",
      new Date(data.data.attributes.last_analysis_date * 1000).toISOString().slice(0, 10),
    ]);
  }
  if (data.data?.attributes?.registrar) {
    rows.push(["Registrar", esc(data.data.attributes.registrar)]);
  }
  if (data.data?.attributes?.country) {
    rows.push(["Country", esc(data.data.attributes.country)]);
  }
  html += table(rows);
  return html;
}

async function fetchShodan(ip: string): Promise<string> {
  const key = await getRuntimeEnvValue("SHODAN_API_KEY");
  if (!key) return placeholder("Add Shodan key in Settings");
  const response = await fetch(
    `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const rows: [string, string][] = [];
  if (data.org) rows.push(["Org", esc(data.org)]);
  if (data.country_name) rows.push(["Country", esc(data.country_name)]);
  if (data.city) rows.push(["City", esc(data.city)]);
  if (data.isp) rows.push(["ISP", esc(data.isp)]);
  if (data.asn) rows.push(["ASN", esc(data.asn)]);
  if (data.os) rows.push(["OS", esc(data.os)]);
  if ((data.vulns as string[] | undefined)?.length) {
    rows.push(["CVEs", (data.vulns as string[]).slice(0, 5).map(esc).join(", ")]);
  }
  return table(rows);
}

function parseBody(body: unknown) {
  const payload = body as {
    panel?: unknown;
    target?: unknown;
    targetType?: unknown;
  } | null;
  const panel =
    typeof payload?.panel === "string" && VALID_PANELS.has(payload.panel as LookupPanel)
      ? (payload.panel as LookupPanel)
      : null;
  const target = typeof payload?.target === "string" ? payload.target : "";
  const requestedType =
    typeof payload?.targetType === "string" &&
    VALID_TARGET_TYPES.has(payload.targetType as TargetType)
      ? (payload.targetType as TargetType)
      : "auto";
  return { panel, target, requestedType };
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response = protectedJson(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  const { panel, target: rawTarget, requestedType } = parseBody(body);
  if (!panel) {
    const response = protectedJson(
      { error: "panel is required." },
      { status: 400 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  const resolvedType =
    requestedType === "auto" ? detectType(rawTarget.trim()) : requestedType;

  let target = "";
  try {
    target = validateTarget(rawTarget, resolvedType);
  } catch (error) {
    const response = protectedJson(
      { error: error instanceof Error ? error.message : "Invalid target." },
      { status: 400 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  try {
    let result = "";
    if (panel === "rdap") {
      result = await fetchRdap(target, resolvedType);
    } else if (panel === "dns") {
      result = await fetchDns(extractDomainFromTarget(target, resolvedType));
    } else if (panel === "certs") {
      result = await fetchCerts(extractDomainFromTarget(target, resolvedType));
    } else if (panel === "geo") {
      result =
        resolvedType === "ip"
          ? await fetchIpGeo(target)
          : await fetchDomainGeo(extractDomainFromTarget(target, resolvedType));
    } else if (panel === "subdomains") {
      result = await fetchSubdomains(extractDomainFromTarget(target, resolvedType));
    } else if (panel === "dnssec") {
      result = await fetchDnsSecurity(extractDomainFromTarget(target, resolvedType));
    } else if (panel === "emailrep") {
      result = await fetchEmailRep(target);
    } else if (panel === "username") {
      result = await fetchUsername(target);
    } else if (panel === "hibp") {
      result = await fetchHibp(target);
    } else if (panel === "vt") {
      result = await fetchVirusTotal(target, resolvedType);
    } else {
      result = await fetchShodan(target);
    }

    const response = connectorJson(
      { panel, target, resolvedType, result },
      {
        source: "recon-lookup",
        maxAgeSeconds: 60,
        degraded: false,
        warnings: [],
        status: 200,
      },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch (error) {
    const response = connectorJson(
      {
        panel,
        target,
        resolvedType,
        result: `<span style="color:var(--flo)">${esc(String(error))}</span>`,
        error: error instanceof Error ? error.message : "Lookup failed.",
      },
      {
        source: "recon-lookup",
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
