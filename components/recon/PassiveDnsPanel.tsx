// ── components/recon/PassiveDnsPanel ──────────────────────────────────
// Passive DNS: historical resolutions (CIRCL pDNS) + reverse IP (HackerTarget).
// Fully free — no API key required.

"use client";

import { useState } from "react";
import {
  reconLookupErrorMessage,
  requestReconLookup,
} from "@/lib/reconLookupContract";
import { sanitizeHtml } from "@/lib/security/sanitizeHtml";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectType(raw: string): "domain" | "ip" {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(raw) ? "ip" : "domain";
}

interface PdnsRecord {
  rrtype: string;
  rrname: string;
  rdata: string;
  time_first: number;
  time_last: number;
  count: number;
}

async function fetchCirclPdns(domain: string): Promise<string> {
  try {
    const text = await requestReconLookup<string>({
      operation: "passive_dns",
      target: domain,
    });
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
      .filter((x): x is PdnsRecord => x !== null);

    if (!records.length)
      return '<span style="color:var(--text3)">No passive DNS records found</span>';

    // Group by rrtype
    const byType = new Map<string, PdnsRecord[]>();
    records.forEach((rec) => {
      if (!byType.has(rec.rrtype)) byType.set(rec.rrtype, []);
      byType.get(rec.rrtype)!.push(rec);
    });

    let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:8px">${records.length} historical record${records.length !== 1 ? "s" : ""} · source: CIRCL pDNS</div>`;
    byType.forEach((recs, type) => {
      html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:8px 0 3px;text-transform:uppercase;letter-spacing:.5px">${esc(type)}</div>`;
      recs.slice(0, 10).forEach((rec) => {
        const first = rec.time_first
          ? new Date(rec.time_first * 1000).toISOString().slice(0, 10)
          : "";
        const last = rec.time_last
          ? new Date(rec.time_last * 1000).toISOString().slice(0, 10)
          : "";
        const dateSpan = first
          ? ` <span style="color:var(--text3);font-size:9px">${first}${last && last !== first ? ` → ${last}` : ""}</span>`
          : "";
        html += `<div style="font-size:11px;color:var(--text);word-break:break-all;padding:2px 0;border-bottom:1px solid var(--border)">${esc(rec.rdata)}${dateSpan}</div>`;
      });
      if (recs.length > 10) {
        html += `<div style="font-size:9px;color:var(--text3);margin-top:2px">+${recs.length - 10} more</div>`;
      }
    });
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(reconLookupErrorMessage(e, "CIRCL pDNS"))}</span>`;
  }
}

async function fetchReverseIp(ip: string): Promise<string> {
  try {
    const text = await requestReconLookup<string>({
      operation: "reverse_ip",
      target: ip,
    });
    if (!text.trim() || text.includes("error") || text.includes("API count")) {
      return `<span style="color:var(--text3)">${esc(text.trim() || "No results")}</span>`;
    }
    const hosts = text.trim().split("\n").filter(Boolean);
    if (!hosts.length)
      return '<span style="color:var(--text3)">No co-hosted domains found</span>';
    let html = `<div style="font-size:10px;color:var(--text3);margin-bottom:8px">${hosts.length} domain${hosts.length !== 1 ? "s" : ""} on this IP · source: HackerTarget</div>`;
    hosts.slice(0, 30).forEach((h) => {
      html += `<div style="font-size:11px;color:var(--text);padding:2px 0;border-bottom:1px solid var(--border)">${esc(h.trim())}</div>`;
    });
    if (hosts.length > 30) {
      html += `<div style="font-size:9px;color:var(--text3);margin-top:2px">+${hosts.length - 30} more</div>`;
    }
    return html;
  } catch (e) {
    return `<span style="color:var(--flo)">${esc(reconLookupErrorMessage(e, "HackerTarget"))}</span>`;
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

export default function PassiveDnsPanel() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdns, setPdns] = useState("");
  const [revIp, setRevIp] = useState("");

  async function lookup() {
    const raw = target.trim();
    if (!raw) return;
    const type = detectType(raw);
    setLoading(true);
    setPdns("");
    setRevIp("");

    try {
      if (type === "domain") {
        const result = await fetchCirclPdns(raw);
        setPdns(result);
      } else {
        const [pdnsResult, revResult] = await Promise.allSettled([
          fetchCirclPdns(raw),
          fetchReverseIp(raw),
        ]);
        if (pdnsResult.status === "fulfilled") setPdns(pdnsResult.value);
        if (revResult.status === "fulfilled") setRevIp(revResult.value);
      }
    } finally {
      setLoading(false);
    }
  }

  const detectedType = target.trim() ? detectType(target.trim()) : null;

  return (
    <div>
      <p
        style={{
          fontSize: "12px",
          color: "var(--text2)",
          marginBottom: "14px",
          marginTop: 0,
        }}
      >
        Look up historical DNS resolutions and co-hosted domains through the
        protected Nexus server boundary. Free — no API key required.
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          aria-label="Passive DNS domain or IP address"
          style={{ ...INPUT, flex: 1, minWidth: "200px" }}
          placeholder="Domain (e.g. example.com) or IP address"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void lookup();
          }}
        />
        <button
          onClick={() => void lookup()}
          disabled={loading}
          style={{ ...BTN, background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Loading…" : "📡 Look up"}
        </button>
        <button
          onClick={() => {
            setTarget("");
            setPdns("");
            setRevIp("");
          }}
          style={{ ...BTN, background: "var(--surf3)", color: "var(--text2)" }}
        >
          Clear
        </button>
      </div>

      {detectedType && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            marginBottom: "14px",
          }}
        >
          Detected:{" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            {detectedType.toUpperCase()}
          </span>
          {detectedType === "domain"
            ? " — will query CIRCL pDNS for historical A/MX/NS records"
            : " — will query CIRCL pDNS + HackerTarget reverse IP lookup"}
        </div>
      )}

      {(pdns || revIp) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              pdns && revIp ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr",
            gap: "16px",
            marginTop: "8px",
          }}
        >
          {pdns && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                📜 Historical DNS Records
              </div>
              <div
                style={{ fontSize: "11px", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(pdns) }}
              />
            </div>
          )}
          {revIp && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                🌐 Reverse IP — Co-hosted Domains
              </div>
              <div
                style={{ fontSize: "11px", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(revIp) }}
              />
            </div>
          )}
        </div>
      )}

      {!pdns && !revIp && !loading && (
        <p
          style={{ fontSize: "10px", color: "var(--text3)", marginTop: "12px" }}
        >
          Sources: <strong>CIRCL Passive DNS</strong> (circl.lu) — historical A,
          MX, NS, TXT records with first/last seen dates ·{" "}
          <strong>HackerTarget</strong> — reverse IP lookup showing co-hosted
          domains. Both free, no key required.
        </p>
      )}
    </div>
  );
}
