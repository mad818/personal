// ── components/recon/ReconLookup ────────────────────────────
// OSINT lookup suite — 11 panels across 3 categories.
// Free: RDAP, DNS, TLS certs, IP geo, subdomain enum, email rep, username, DNS security.
// BYOK optional: HIBP, VirusTotal, Shodan.

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { sanitizeHtml } from "@/lib/security/sanitizeHtml";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";

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

async function fetchLookupPanel(
  panel: PanelKey,
  target: string,
  targetType: Exclude<TargetType, "auto">,
): Promise<string> {
  try {
    const response = await apiFetch("/api/recon/lookup", {
      method: "POST",
      body: JSON.stringify({ panel, target, targetType }),
      cache: "no-store",
    });
    const data = (await response.json()) as { result?: string; error?: string };
    if (data.result) return data.result;
    throw new Error(data.error ?? `HTTP ${response.status}`);
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(String(e))}</span>`;
  }
}

async function fetchRdapDomain(domain: string): Promise<string> {
  return fetchLookupPanel("rdap", domain, "domain");
}

async function fetchRdapIp(ip: string): Promise<string> {
  return fetchLookupPanel("rdap", ip, "ip");
}

async function fetchDns(domain: string): Promise<string> {
  return fetchLookupPanel("dns", domain, "domain");
}

async function fetchCerts(domain: string): Promise<string> {
  return fetchLookupPanel("certs", domain, "domain");
}

async function fetchIpGeo(ip: string): Promise<string> {
  return fetchLookupPanel("geo", ip, "ip");
}

async function fetchDomainGeo(domain: string): Promise<string> {
  return fetchLookupPanel("geo", domain, "domain");
}

async function fetchSubdomains(domain: string): Promise<string> {
  return fetchLookupPanel("subdomains", domain, "domain");
}

async function fetchDnsSecurity(domain: string): Promise<string> {
  return fetchLookupPanel("dnssec", domain, "domain");
}

async function fetchEmailRep(email: string): Promise<string> {
  return fetchLookupPanel("emailrep", email, "email");
}

async function fetchUsername(username: string): Promise<string> {
  return fetchLookupPanel("username", username, "username");
}

async function fetchHibp(email: string): Promise<string> {
  return fetchLookupPanel("hibp", email, "email");
}

async function fetchVirusTotal(
  target: string,
  type: Exclude<TargetType, "auto">,
): Promise<string> {
  return fetchLookupPanel("vt", target, type);
}

async function fetchShodan(ip: string): Promise<string> {
  return fetchLookupPanel("shodan", ip, "ip");
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
  const { internetReachable } = useInternetAvailability();

  const [target, setTarget] = useState("");
  const [typeVal, setTypeVal] = useState<TargetType>("auto");
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState<PanelState>(EMPTY_PANELS);
  const [loadingMap, setLoadingMap] = useState<LoadingMap>(EMPTY_LOADING);
  const [error, setError] = useState("");
  const [lastLookupTarget, setLastLookupTarget] = useState("");

  const set = useCallback((key: PanelKey, val: string) => {
    const isErrorResult = val.startsWith('<span style="color:var(--flo)">');
    setPanels((p) => {
      if (isErrorResult && p[key]) return p;
      return { ...p, [key]: val };
    });
    setLoadingMap((m) => ({ ...m, [key]: false }));
    if (isErrorResult) {
      setError((prev) =>
        prev ||
        "Some lookups failed. Keeping the last successful panel results where available.",
      );
    }
  }, []);

  const placeholder = useCallback(
    (key: PanelKey, msg: string) => {
      set(key, `<span style="color:var(--text3)">${msg}</span>`);
    },
    [set],
  );

  async function scan() {
    const raw = target.trim();
    if (!raw || !internetReachable) return;
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
    setError("");
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
      tasks.push(fetchHibp(raw).then((v) => set("hibp", v)));
    } else {
      placeholder("emailrep", "Email targets only");
      placeholder("hibp", "Email targets only");
    }

    // ── Username lookups ────────────────────────────────────────────────────
    if (isUsername || isDomain) {
      const uname = isUsername ? raw : raw.split(".")[0];
      tasks.push(fetchUsername(uname).then((v) => set("username", v)));
    } else {
      placeholder("username", "Username or domain targets only");
    }

    // ── VirusTotal ──────────────────────────────────────────────────────────
    if (domain || ip || isHash || isUrl) {
      tasks.push(
        fetchVirusTotal(raw, resolvedType).then((v) => set("vt", v)),
      );
    } else {
      placeholder("vt", "—");
    }

    // ── Shodan ──────────────────────────────────────────────────────────────
    if (ip) {
      tasks.push(fetchShodan(ip).then((v) => set("shodan", v)));
    } else {
      placeholder("shodan", "IP targets only");
    }

    await Promise.allSettled(tasks);
    setLastLookupTarget(raw);
    setLoading(false);
  }

  function clear() {
    setTarget("");
    setPanels(EMPTY_PANELS);
    setLoadingMap(EMPTY_LOADING);
    setError("");
    setLastLookupTarget("");
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
  const hasRetainedLookup = Object.values(panels).some(Boolean) && Boolean(lastLookupTarget);

  return (
    <div>
      {!internetReachable && (
        <SurfaceCallout tone="warning" style={{ marginBottom: 12 }}>
          {hasRetainedLookup
            ? `Internet offline. ReconLookup is paused and still showing the last successful local result set for ${lastLookupTarget}.`
            : "Internet offline. New ReconLookup scans are paused until connectivity returns."}
        </SurfaceCallout>
      )}

      {error && (
        <SurfaceCallout tone="warning" style={{ marginBottom: 12 }}>
          {error}
        </SurfaceCallout>
      )}

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
          disabled={loading || !internetReachable}
          style={{ ...BTN, background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Scanning…" : !internetReachable ? "Offline" : "🔍 Scan"}
        </button>
        <button
          onClick={clear}
          style={{ ...BTN, background: "var(--surf3)", color: "var(--text2)" }}
        >
          Clear
        </button>
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
          — free panels will run automatically. HIBP, VirusTotal, and Shodan
          now route through the local Nexus proxy and use optional server-side
          keys from ⚙️ Settings.
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
