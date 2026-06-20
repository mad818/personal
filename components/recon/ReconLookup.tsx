// ── components/recon/ReconLookup ────────────────────────────
// OSINT lookup suite — 11 panels across 3 categories.
// Free: RDAP, DNS, TLS certs, IP geo, subdomain enum, email rep, username, DNS security.
// BYOK optional: HIBP, VirusTotal, Shodan.

"use client";

import { useState, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { sanitizeHtml } from "@/lib/security/sanitizeHtml";
import { buildUsernameCasefileDraft, type UsernameEnumSummary } from "@/lib/recon/usernameCasefileSeed";

// ── types ─────────────────────────────────────────────────────────────────────
type TargetType =
  | "auto"
  | "domain"
  | "ip"
  | "email"
  | "hash"
  | "url"
  | "username";

type PanelKey =
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

type PanelState = Record<PanelKey, string>;
type LoadingMap = Record<PanelKey, boolean>;

const EMPTY_PANELS: PanelState = {
  rdap: "",
  dns: "",
  certs: "",
  geo: "",
  subdomains: "",
  dnssec: "",
  emailrep: "",
  username: "",
  hibp: "",
  vt: "",
  shodan: "",
};
const EMPTY_LOADING: LoadingMap = {
  rdap: false,
  dns: false,
  certs: false,
  geo: false,
  subdomains: false,
  dnssec: false,
  emailrep: false,
  username: false,
  hibp: false,
  vt: false,
  shodan: false,
};

// ── helpers ───────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectType(raw: string): Exclude<TargetType, "auto"> {
  if (/^[\da-f]{32,64}$/i.test(raw)) return "hash";
  if (/^https?:\/\//i.test(raw)) return "url";
  if (/@/.test(raw)) return "email";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(raw)) return "ip";
  if (/^[a-z0-9_.-]+$/i.test(raw) && !raw.includes(".")) return "username";
  return "domain";
}

function table(rows: [string, string][]): string {
  if (!rows.length) return "";
  return (
    '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
    rows
      .map(
        ([k, v]) =>
          `<tr>
          <td style="color:var(--text3);padding:3px 8px 3px 0;white-space:nowrap;vertical-align:top">${k}</td>
          <td style="color:var(--text);word-break:break-all">${v}</td>
        </tr>`,
      )
      .join("") +
    "</table>"
  );
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${color}22;color:${color}">${esc(text)}</span>`;
}

// ── free fetch functions ──────────────────────────────────────────────────────

async function fetchRdapDomain(domain: string): Promise<string> {
  try {
    const r = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const rows: [string, string][] = [];
    if (d.ldhName) rows.push(["Domain", esc(d.ldhName)]);
    if (d.status)
      rows.push(["Status", (d.status as string[]).map(esc).join(", ")]);
    const ns = ((d.nameservers || []) as { ldhName?: string }[])
      .map((n) => esc(n.ldhName ?? ""))
      .filter(Boolean);
    if (ns.length) rows.push(["NS", ns.join(", ")]);
    const registrar = (
      d.entities as { roles?: string[]; vcardArray?: unknown[][] }[]
    )?.find((e) => e.roles?.includes("registrar"));
    if (registrar?.vcardArray?.[1]) {
      const fn = (registrar.vcardArray[1] as unknown[][]).find(
        (v) => v[0] === "fn",
      );
      if (fn) rows.push(["Registrar", esc(String(fn[3] ?? ""))]);
    }
    const reg = (
      d.events as { eventAction: string; eventDate?: string }[]
    )?.find((e) => e.eventAction === "registration");
    const exp = (
      d.events as { eventAction: string; eventDate?: string }[]
    )?.find((e) => e.eventAction === "expiration");
    if (reg) rows.push(["Registered", esc(reg.eventDate?.slice(0, 10) ?? "")]);
    if (exp) rows.push(["Expires", esc(exp.eventDate?.slice(0, 10) ?? "")]);
    return table(rows) || '<span style="color:var(--text3)">No data</span>';
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchRdapIp(ip: string): Promise<string> {
  try {
    const r = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const rows: [string, string][] = [];
    if (d.name) rows.push(["Name", esc(d.name)]);
    if (d.type) rows.push(["Type", esc(d.type)]);
    if (d.handle) rows.push(["Handle", esc(d.handle)]);
    const cidr = (
      (d.cidr0CIDRs || []) as {
        v4prefix?: string;
        v6prefix?: string;
        length?: number;
      }[]
    ).map((c) => `${c.v4prefix ?? c.v6prefix}/${c.length}`);
    if (cidr.length) rows.push(["CIDR", esc(cidr[0])]);
    if (d.country) rows.push(["Country", esc(d.country)]);
    const org = (
      d.entities as { roles?: string[]; vcardArray?: unknown[][] }[]
    )?.find((e) => e.roles?.includes("registrant"));
    if (org?.vcardArray?.[1]) {
      const fn = (org.vcardArray[1] as unknown[][]).find((v) => v[0] === "fn");
      if (fn) rows.push(["Org", esc(String(fn[3] ?? ""))]);
    }
    return table(rows) || '<span style="color:var(--text3)">No data</span>';
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchDns(domain: string): Promise<string> {
  try {
    const types = ["A", "MX", "NS", "TXT"] as const;
    const results = await Promise.allSettled(
      types.map((t) =>
        fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${t}`,
        ).then((r) => r.json()),
      ),
    );
    let html = "";
    types.forEach((type, i) => {
      const res = results[i];
      if (
        res.status === "fulfilled" &&
        (res.value as { Answer?: { data: string }[] }).Answer?.length
      ) {
        html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:6px 0 2px">${type}</div>`;
        (res.value as { Answer: { data: string }[] }).Answer.forEach((a) => {
          html += `<div style="font-size:11px;color:var(--text);word-break:break-all;padding:1px 0">${esc(String(a.data ?? ""))}</div>`;
        });
      }
    });
    return html || '<span style="color:var(--text3)">No records found</span>';
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchCerts(domain: string): Promise<string> {
  try {
    const r = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data: {
      common_name?: string;
      not_before?: string;
      not_after?: string;
      issuer_name?: string;
    }[] = await r.json();
    const seen = new Set<string>();
    const uniq = data
      .filter((c) => {
        if (seen.has(c.common_name ?? "")) return false;
        seen.add(c.common_name ?? "");
        return true;
      })
      .slice(0, 12);
    if (!uniq.length)
      return '<span style="color:var(--text3)">No certificates found</span>';
    let html = "";
    uniq.forEach((c) => {
      const issued = (c.not_before ?? "").slice(0, 10);
      const expires = (c.not_after ?? "").slice(0, 10);
      const issuer = esc(
        (c.issuer_name ?? "").replace(/.*CN=/, "").split(",")[0] ?? "",
      );
      html += `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text);font-weight:700">${esc(c.common_name ?? "")}</span>
        <span style="color:var(--text3);margin-left:8px">${esc(issued)} → ${esc(expires)}</span>
        <span style="color:var(--accent);margin-left:8px;font-size:10px">${issuer}</span>
      </div>`;
    });
    if (data.length > 12)
      html += `<div style="font-size:10px;color:var(--text3);margin-top:6px">+${data.length - 12} more — see crt.sh</div>`;
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchIpGeo(ip: string): Promise<string> {
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (d.error)
      return `<span style="color:var(--flo)">${esc(d.reason ?? d.error)}</span>`;
    const rows: [string, string][] = [
      ["IP", esc(d.ip ?? ip)],
      ["City", esc(d.city ?? "—")],
      ["Region", esc(d.region ?? "—")],
      [
        "Country",
        esc(`${d.country_name ?? ""} ${d.country_code ?? ""}`.trim()),
      ],
      ["Org", esc(d.org ?? "—")],
      ["ASN", esc(d.asn ?? "—")],
      ["Timezone", esc(d.timezone ?? "—")],
    ];
    return table(rows);
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchDomainGeo(domain: string): Promise<string> {
  try {
    const rr = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
    );
    const dd = await rr.json();
    const ip: string = dd.Answer?.[0]?.data;
    if (!ip)
      return '<span style="color:var(--text3)">Could not resolve domain to IP</span>';
    return fetchIpGeo(ip);
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchSubdomains(domain: string): Promise<string> {
  try {
    // HackerTarget free tier — no key needed
    const r = await fetch(
      `https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`,
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (text.includes("API count exceeded") || text.includes("error")) {
      return '<span style="color:var(--text3)">HackerTarget free limit reached — try again later</span>';
    }
    const lines = text.trim().split("\n").filter(Boolean).slice(0, 40);
    if (!lines.length)
      return '<span style="color:var(--text3)">No subdomains found</span>';
    let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:6px">${lines.length} subdomain${lines.length !== 1 ? "s" : ""} found</div>`;
    lines.forEach((line) => {
      const [sub, ip] = line.split(",");
      html += `<div style="font-size:11px;display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text)">${esc(sub ?? "")}</span>
        <span style="color:var(--text3)">${esc(ip ?? "")}</span>
      </div>`;
    });
    if (lines.length === 40)
      html += `<div style="font-size:10px;color:var(--text3);margin-top:4px">Showing first 40 — more may exist</div>`;
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchDnsSecurity(domain: string): Promise<string> {
  try {
    const [spfRes, dmarcRes, dkimRes] = await Promise.allSettled([
      fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`,
      ).then((r) => r.json()),
      fetch(
        `https://dns.google/resolve?name=_dmarc.${encodeURIComponent(domain)}&type=TXT`,
      ).then((r) => r.json()),
      fetch(
        `https://dns.google/resolve?name=default._domainkey.${encodeURIComponent(domain)}&type=TXT`,
      ).then((r) => r.json()),
    ]);

    const spfRecords =
      spfRes.status === "fulfilled"
        ? (
            (spfRes.value as { Answer?: { data: string }[] }).Answer ?? []
          ).filter((a) => a.data.includes("v=spf1"))
        : [];
    const dmarcRecords =
      dmarcRes.status === "fulfilled"
        ? (
            (dmarcRes.value as { Answer?: { data: string }[] }).Answer ?? []
          ).filter((a) => a.data.includes("v=DMARC1"))
        : [];
    const dkimRecords =
      dkimRes.status === "fulfilled"
        ? (
            (dkimRes.value as { Answer?: { data: string }[] }).Answer ?? []
          ).filter((a) => a.data.includes("v=DKIM1"))
        : [];

    const hasSPF = spfRecords.length > 0;
    const hasDMARC = dmarcRecords.length > 0;
    const hasDKIM = dkimRecords.length > 0;

    const check = (ok: boolean, label: string, val: string) =>
      `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="color:${ok ? "#10b981" : "#ef4444"};font-size:12px">${ok ? "✅" : "❌"}</span>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text)">${label}</div>
          <div style="font-size:10px;color:var(--text3);word-break:break-all">${esc(val)}</div>
        </div>
      </div>`;

    return (
      check(
        hasSPF,
        "SPF",
        hasSPF
          ? spfRecords[0].data
          : "No SPF record — anyone can spoof this domain",
      ) +
      check(
        hasDMARC,
        "DMARC",
        hasDMARC ? dmarcRecords[0].data : "No DMARC policy — phishing risk",
      ) +
      check(
        hasDKIM,
        "DKIM",
        hasDKIM
          ? dkimRecords[0].data
          : "No DKIM (default selector) — check selector name",
      )
    );
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchEmailRep(email: string): Promise<string> {
  try {
    // emailrep.io — free, no key for basic lookups
    const r = await fetch(`https://emailrep.io/${encodeURIComponent(email)}`, {
      headers: { "User-Agent": "Nexus-Prime" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const riskCol = d.suspicious ? "#ef4444" : "#10b981";
    const rows: [string, string][] = [
      ["Email", esc(d.email ?? email)],
      ["Reputation", badge(d.reputation ?? "—", riskCol)],
      [
        "Suspicious",
        badge(
          d.suspicious ? "YES" : "NO",
          d.suspicious ? "#ef4444" : "#10b981",
        ),
      ],
      ["References", String(d.references ?? 0)],
    ];
    if (d.details?.blacklisted)
      rows.push(["Blacklisted", badge("YES", "#ef4444")]);
    if (d.details?.malicious_activity)
      rows.push(["Malicious activity", badge("YES", "#ef4444")]);
    if (d.details?.credentials_leaked)
      rows.push(["Credentials leaked", badge("YES", "#f59e0b")]);
    if (d.details?.spam) rows.push(["Spam source", badge("YES", "#f59e0b")]);
    if (d.details?.data_breach)
      rows.push(["Data breach", badge("YES", "#f59e0b")]);
    if (d.details?.days_since_domain_creation)
      rows.push(["Domain age", `${d.details.days_since_domain_creation} days`]);
    if (d.details?.profiles?.length)
      rows.push([
        "Profiles",
        (d.details.profiles as string[]).map(esc).join(", "),
      ]);
    return table(rows);
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchUsername(username: string): Promise<{ html: string; enumPayload: UsernameEnumSummary | null }> {
  try {
    const [ghRes, gravatarRes, enumRes] = await Promise.allSettled([
      fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
      ).then((r) => r.json()),
      fetch(
        `https://www.gravatar.com/${encodeURIComponent(username)}.json`,
      ).then((r) => r.json()),
      fetch("/api/recon/username-enum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username }),
        signal: AbortSignal.timeout(30_000),
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    let html = "";

    if (
      ghRes.status === "fulfilled" &&
      (ghRes.value as { login?: string }).login
    ) {
      const g = ghRes.value as Record<string, unknown>;
      html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">GitHub</div>`;
      const rows: [string, string][] = [
        ["Login", esc(String(g.login ?? ""))],
        ["Name", esc(String(g.name ?? "—"))],
        ["Bio", esc(String(g.bio ?? "—"))],
        ["Location", esc(String(g.location ?? "—"))],
        ["Repos", String(g.public_repos ?? 0)],
        ["Followers", String(g.followers ?? 0)],
        ["Created", esc(String(g.created_at ?? "").slice(0, 10))],
      ];
      if (g.company) rows.push(["Company", esc(String(g.company))]);
      if (g.blog) rows.push(["Website", esc(String(g.blog))]);
      html += table(rows);
    } else {
      html += `<div style="color:var(--text3);font-size:11px">No GitHub profile found for "${esc(username)}"</div>`;
    }

    if (
      gravatarRes.status === "fulfilled" &&
      (gravatarRes.value as { entry?: unknown[] }).entry?.length
    ) {
      const entry = (gravatarRes.value as { entry: Record<string, unknown>[] })
        .entry[0];
      html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:10px 0 6px">Gravatar</div>`;
      const gRows: [string, string][] = [];
      if (entry.displayName)
        gRows.push(["Name", esc(String(entry.displayName))]);
      if (entry.currentLocation)
        gRows.push(["Location", esc(String(entry.currentLocation))]);
      if ((entry.emails as { value?: string }[] | undefined)?.[0]?.value)
        gRows.push([
          "Email",
          esc((entry.emails as { value: string }[])[0].value),
        ]);
      if (gRows.length) html += table(gRows);
    }

    let enumPayload: UsernameEnumSummary | null = null;

    if (
      enumRes.status === "fulfilled" &&
      enumRes.value &&
      typeof (enumRes.value as { html?: string }).html === "string"
    ) {
      const raw = enumRes.value as {
        html: string;
        checked?: number;
        found?: number;
        results?: Array<{ name: string; uri: string; found: boolean }>;
      };
      const enumHtml = raw.html;
      html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">`;
      html += enumHtml;
      html += `</div>`;
      if (
        typeof raw.checked === "number" &&
        typeof raw.found === "number" &&
        Array.isArray(raw.results)
      ) {
        enumPayload = {
          checked: raw.checked,
          found: raw.found,
          results: raw.results,
        };
      }
    }

    return {
      html: html || '<span style="color:var(--text3)">No public profiles found</span>',
      enumPayload,
    };
  } catch (e) {
    return { html: `<span style="color:var(--flo)">${esc(String(e))}</span>`, enumPayload: null };
  }
}

// ── BYOK fetch functions ──────────────────────────────────────────────────────

async function fetchHibp(email: string, key: string): Promise<string> {
  if (!key)
    return '<span style="color:var(--text3)">Add HIBP key in Settings to check breaches</span>';
  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": key, "User-Agent": "Nexus-Prime" } },
    );
    if (r.status === 404)
      return '<span style="color:var(--fhi)">✅ No breaches found</span>';
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const breaches: {
      Name?: string;
      Title?: string;
      BreachDate?: string;
      DataClasses?: string[];
      IsSensitive?: boolean;
      IsVerified?: boolean;
    }[] = await r.json();
    let html = `<div style="font-weight:700;color:var(--flo);margin-bottom:6px">${breaches.length} breach${breaches.length !== 1 ? "es" : ""} found</div>`;
    breaches.forEach((b) => {
      const col = b.IsSensitive
        ? "var(--flo)"
        : b.IsVerified
          ? "var(--fmd)"
          : "var(--text2)";
      html += `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
        <span style="color:${col};font-weight:700">${esc(b.Name ?? b.Title ?? "")}</span>
        <span style="color:var(--text3);margin-left:8px">${esc((b.BreachDate ?? "").slice(0, 10))}</span>
        <span style="color:var(--text2);margin-left:8px;font-size:10px">${(b.DataClasses ?? []).slice(0, 4).map(esc).join(" · ")}</span>
      </div>`;
    });
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchVirusTotal(
  target: string,
  type: Exclude<TargetType, "auto">,
  key: string,
): Promise<string> {
  if (!key)
    return '<span style="color:var(--text3)">Add VirusTotal key in Settings</span>';
  try {
    let endpoint = "";
    if (type === "hash")
      endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(target)}`;
    else if (type === "ip")
      endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`;
    else {
      const dom = type === "url" ? new URL(target).hostname : target;
      endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(dom)}`;
    }
    const r = await fetch(endpoint, { headers: { "x-apikey": key } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const stats = d.data?.attributes?.last_analysis_stats ?? {};
    const total = (Object.values(stats) as number[]).reduce(
      (a, b) => a + (b ?? 0),
      0,
    );
    const mal = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
    const col =
      mal === 0 ? "var(--fhi)" : mal < 5 ? "var(--fmd)" : "var(--flo)";
    let html = `<div style="font-size:16px;font-weight:900;color:${col};margin-bottom:8px">${mal}/${total} engines flagged</div>`;
    const rows: [string, string][] = [];
    if (d.data?.attributes?.reputation !== undefined)
      rows.push(["Reputation", String(d.data.attributes.reputation)]);
    if (d.data?.attributes?.last_analysis_date)
      rows.push([
        "Last scan",
        new Date(d.data.attributes.last_analysis_date * 1000)
          .toISOString()
          .slice(0, 10),
      ]);
    if (d.data?.attributes?.registrar)
      rows.push(["Registrar", esc(d.data.attributes.registrar)]);
    if (d.data?.attributes?.country)
      rows.push(["Country", esc(d.data.attributes.country)]);
    html += table(rows);
    const engines = Object.entries(
      d.data?.attributes?.last_analysis_results ?? {},
    )
      .filter(
        ([, v]) =>
          (v as { category: string }).category === "malicious" ||
          (v as { category: string }).category === "suspicious",
      )
      .slice(0, 6);
    if (engines.length) {
      html += '<div style="margin-top:8px">';
      engines.forEach(([name, v]) => {
        html += `<div style="font-size:11px;display:flex;justify-content:space-between;padding:2px 0">
          <span style="color:var(--text)">${esc(name)}</span>
          <span style="color:var(--flo)">${esc((v as { result?: string; category: string }).result ?? (v as { category: string }).category)}</span>
        </div>`;
      });
      html += "</div>";
    }
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchShodan(ip: string, key: string): Promise<string> {
  if (!key)
    return '<span style="color:var(--text3)">Add Shodan key in Settings</span>';
  try {
    const r = await fetch(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`,
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const rows: [string, string][] = [];
    if (d.org) rows.push(["Org", esc(d.org)]);
    if (d.country_name) rows.push(["Country", esc(d.country_name)]);
    if (d.city) rows.push(["City", esc(d.city)]);
    if (d.isp) rows.push(["ISP", esc(d.isp)]);
    if (d.asn) rows.push(["ASN", esc(d.asn)]);
    if (d.os) rows.push(["OS", esc(d.os)]);
    if ((d.vulns as string[])?.length)
      rows.push([
        "CVEs",
        (d.vulns as string[]).slice(0, 5).map(esc).join(", "),
      ]);
    let html = table(rows);
    if (
      (
        d.data as {
          port?: number;
          transport?: string;
          product?: string;
          _shodan?: { module?: string };
        }[]
      )?.length
    ) {
      html += '<div style="margin-top:8px;font-size:11px">';
      (
        d.data as {
          port?: number;
          transport?: string;
          product?: string;
          _shodan?: { module?: string };
        }[]
      )
        .slice(0, 10)
        .forEach((svc) => {
          html += `<div style="display:flex;gap:8px;padding:2px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--accent);font-weight:700;min-width:40px">${esc(String(svc.port ?? ""))}</span>
          <span style="color:var(--text3)">${esc(svc.transport ?? "tcp")}</span>
          <span style="color:var(--text)">${esc((svc.product ?? svc._shodan?.module ?? "").slice(0, 40))}</span>
        </div>`;
        });
      if ((d.data as unknown[]).length > 10)
        html += `<div style="color:var(--text3);margin-top:4px;font-size:10px">+${(d.data as unknown[]).length - 10} more ports</div>`;
      html += "</div>";
    }
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

// ── Panel component ────────────────────────────────────────────────────────────
function Panel({
  title,
  tag,
  content,
  loading,
}: {
  title: string;
  tag?: string;
  content: string;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          {title}
        </div>
        {tag && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "var(--surf3)",
              color: "var(--text3)",
            }}
          >
            {tag}
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: "11px" }}>Scanning…</div>
      ) : content ? (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
      ) : (
        <div style={{ color: "var(--text3)", fontSize: "11px" }}>—</div>
      )}
    </div>
  );
}

// ── Category header ────────────────────────────────────────────────────────────
function Category({ label }: { label: string }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        fontSize: "10px",
        fontWeight: 700,
        color: "var(--accent)",
        textTransform: "uppercase",
        letterSpacing: ".8px",
        paddingBottom: "4px",
        borderBottom: "1px solid var(--border)",
        marginTop: "6px",
      }}
    >
      {label}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReconLookup() {
  const settings = useStore((s) => s.settings);

  const [target, setTarget] = useState("");
  const [typeVal, setTypeVal] = useState<TargetType>("auto");
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState<PanelState>(EMPTY_PANELS);
  const [loadingMap, setLoadingMap] = useState<LoadingMap>(EMPTY_LOADING);
  const lastEnumRef = useRef<{ username: string; payload: UsernameEnumSummary } | null>(null);
  const [seedCopied, setSeedCopied] = useState(false);

  const set = useCallback((key: PanelKey, val: string) => {
    setPanels((p) => ({ ...p, [key]: val }));
    setLoadingMap((m) => ({ ...m, [key]: false }));
  }, []);

  const placeholder = useCallback(
    (key: PanelKey, msg: string) => {
      set(key, `<span style="color:var(--text3)">${msg}</span>`);
    },
    [set],
  );

  async function scan() {
    const raw = target.trim();
    if (!raw) return;
    const resolvedType = typeVal === "auto" ? detectType(raw) : typeVal;

    const isDomain = resolvedType === "domain" || resolvedType === "email";
    const isIp = resolvedType === "ip";
    const isEmail = resolvedType === "email";
    const isUsername = resolvedType === "username";
    const isHash = resolvedType === "hash";
    const isUrl = resolvedType === "url";
    const domain = isDomain ? (isEmail ? raw.split("@")[1] : raw) : null;
    const ip = isIp ? raw : null;

    setLoading(true);
    setLoadingMap({
      rdap: true,
      dns: true,
      certs: true,
      geo: true,
      subdomains: true,
      dnssec: true,
      emailrep: true,
      username: true,
      hibp: true,
      vt: true,
      shodan: true,
    });

    const tasks: Promise<void>[] = [];

    // ── Domain lookups ──────────────────────────────────────────────────────
    if (domain) {
      tasks.push(fetchRdapDomain(domain).then((v) => set("rdap", v)));
      tasks.push(fetchDns(domain).then((v) => set("dns", v)));
      tasks.push(fetchCerts(domain).then((v) => set("certs", v)));
      tasks.push(fetchDomainGeo(domain).then((v) => set("geo", v)));
      tasks.push(fetchSubdomains(domain).then((v) => set("subdomains", v)));
      tasks.push(fetchDnsSecurity(domain).then((v) => set("dnssec", v)));
    } else if (ip) {
      tasks.push(fetchRdapIp(ip).then((v) => set("rdap", v)));
      placeholder("dns", "DNS not applicable for raw IPs");
      placeholder("certs", "Cert transparency requires a domain");
      tasks.push(fetchIpGeo(ip).then((v) => set("geo", v)));
      placeholder("subdomains", "Subdomain enum requires a domain");
      placeholder("dnssec", "DNS security requires a domain");
    } else {
      placeholder("rdap", "RDAP requires a domain or IP");
      placeholder("dns", "—");
      placeholder("certs", "—");
      placeholder("geo", "Geo requires a domain or IP");
      placeholder("subdomains", "Subdomain enum requires a domain");
      placeholder("dnssec", "DNS security requires a domain");
    }

    // ── Email lookups ───────────────────────────────────────────────────────
    if (isEmail) {
      tasks.push(fetchEmailRep(raw).then((v) => set("emailrep", v)));
      tasks.push(fetchHibp(raw, settings.hibpKey).then((v) => set("hibp", v)));
    } else {
      placeholder("emailrep", "Email targets only");
      placeholder("hibp", "Email targets only");
    }

    // ── Username lookups ────────────────────────────────────────────────────
    if (isUsername || isDomain) {
      const uname = isUsername ? raw : raw.split(".")[0];
      tasks.push(
        fetchUsername(uname).then(({ html, enumPayload }) => {
          set("username", html);
          if (enumPayload) {
            lastEnumRef.current = { username: uname, payload: enumPayload };
          }
        }),
      );
    } else {
      placeholder("username", "Username or domain targets only");
    }

    // ── VirusTotal ──────────────────────────────────────────────────────────
    if (domain || ip || isHash || isUrl) {
      tasks.push(
        fetchVirusTotal(raw, resolvedType, settings.vtKey).then((v) =>
          set("vt", v),
        ),
      );
    } else {
      placeholder("vt", "—");
    }

    // ── Shodan ──────────────────────────────────────────────────────────────
    if (ip) {
      tasks.push(
        fetchShodan(ip, settings.shodanKey).then((v) => set("shodan", v)),
      );
    } else {
      placeholder("shodan", "IP targets only");
    }

    await Promise.allSettled(tasks);
    setLoading(false);
  }

  function clear() {
    setTarget("");
    setPanels(EMPTY_PANELS);
    setLoadingMap(EMPTY_LOADING);
  }

  function seedCasefile() {
    const enumSnapshot = lastEnumRef.current;
    if (!enumSnapshot) return;
    try {
      const draft = buildUsernameCasefileDraft(enumSnapshot.username, enumSnapshot.payload);
      window.dispatchEvent(
        new CustomEvent("nexus-osint-casefile-seed", { detail: draft }),
      );
      setSeedCopied(true);
      window.setTimeout(() => setSeedCopied(false), 2000);
    } catch {
      // silent
    }
  }

  const INPUT: React.CSSProperties = {
    background: "var(--surf2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "13px",
    padding: "8px 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const BTN: React.CSSProperties = {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  const resolvedType =
    typeVal === "auto" && target.trim() ? detectType(target.trim()) : typeVal;

  return (
    <div>
      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <input
          style={{ ...INPUT, flex: 1, minWidth: "200px" }}
          placeholder="Domain · IP · Email · Hash · URL · Username"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void scan();
          }}
        />
        <select
          style={{ ...INPUT, width: "auto", cursor: "pointer" }}
          value={typeVal}
          onChange={(e) => setTypeVal(e.target.value as TargetType)}
        >
          <option value="auto">Auto-detect</option>
          <option value="domain">Domain</option>
          <option value="ip">IP Address</option>
          <option value="email">Email</option>
          <option value="username">Username</option>
          <option value="hash">File Hash</option>
          <option value="url">URL</option>
        </select>
        <button
          onClick={() => void scan()}
          disabled={loading}
          style={{ ...BTN, background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Scanning…" : "🔍 Scan"}
        </button>
        <button
          onClick={clear}
          style={{ ...BTN, background: "var(--surf3)", color: "var(--text2)" }}
        >
          Clear
        </button>
        {lastEnumRef.current ? (
          <button
            onClick={seedCasefile}
            title="Seed an OSINT casefile from the username enum results"
            style={{
              ...BTN,
              background: seedCopied ? "#10b981" : "var(--surf3)",
              color: seedCopied ? "#fff" : "var(--accent)",
              border: "1px solid var(--border)",
            }}
          >
            {seedCopied ? "Casefile seeded ✓" : "Seed casefile"}
          </button>
        ) : null}
      </div>

      {/* Detected type hint */}
      {target.trim() && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            marginBottom: "14px",
          }}
        >
          Detected:{" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            {resolvedType.toUpperCase()}
          </span>{" "}
          — free panels will run automatically. BYOK panels require optional
          keys in ⚙️ Settings.
        </div>
      )}

      {/* Results grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "10px",
        }}
      >
        <Category label="🌐 Domain & Network Intelligence" />
        <Panel
          title="RDAP / WHOIS"
          content={panels.rdap}
          loading={loadingMap.rdap}
        />
        <Panel
          title="DNS Records"
          content={panels.dns}
          loading={loadingMap.dns}
        />
        <Panel
          title="TLS Certificates"
          content={panels.certs}
          loading={loadingMap.certs}
        />
        <Panel
          title="IP Geolocation"
          content={panels.geo}
          loading={loadingMap.geo}
        />
        <Panel
          title="Subdomain Enumeration"
          content={panels.subdomains}
          loading={loadingMap.subdomains}
        />
        <Panel
          title="DNS Security (SPF / DMARC / DKIM)"
          content={panels.dnssec}
          loading={loadingMap.dnssec}
        />

        <Category label="👤 Identity & Email Intelligence" />
        <Panel
          title="Email Reputation"
          content={panels.emailrep}
          loading={loadingMap.emailrep}
        />
        <Panel
          title="Username OSINT"
          content={panels.username}
          loading={loadingMap.username}
        />
        <Panel
          title="Breach Check"
          content={panels.hibp}
          loading={loadingMap.hibp}
          tag="BYOK"
        />

        <Category label="🔬 Threat Intelligence" />
        <Panel
          title="VirusTotal"
          content={panels.vt}
          loading={loadingMap.vt}
          tag="BYOK"
        />
        <Panel
          title="Shodan"
          content={panels.shodan}
          loading={loadingMap.shodan}
          tag="BYOK"
        />
      </div>

      <p style={{ fontSize: "10px", color: "var(--text3)", marginTop: "12px" }}>
        Free — no key needed: RDAP · DNS · crt.sh · ipapi.co · HackerTarget ·
        emailrep.io · GitHub · dns.google (SPF/DMARC/DKIM). BYOK (optional):
        Have I Been Pwned · VirusTotal · Shodan — add in ⚙️ Settings.
      </p>
    </div>
  );
}
