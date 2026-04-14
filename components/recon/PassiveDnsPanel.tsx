// ── components/recon/PassiveDnsPanel ──────────────────────────────────
// Passive DNS: historical resolutions (CIRCL pDNS) + reverse IP (HackerTarget).
// Fully free — no API key required.

"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { sanitizeHtml } from "@/lib/security/sanitizeHtml";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";

function detectType(raw: string): "domain" | "ip" {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(raw) ? "ip" : "domain";
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
  const { internetReachable } = useInternetAvailability();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdns, setPdns] = useState("");
  const [revIp, setRevIp] = useState("");
  const [error, setError] = useState("");
  const [lastLookupTarget, setLastLookupTarget] = useState("");

  const hasRetainedLookup = Boolean(pdns || revIp) && Boolean(lastLookupTarget);

  async function lookup() {
    const raw = target.trim();
    if (!raw || !internetReachable) return;
    const type = detectType(raw);
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/recon/passive-dns?target=${encodeURIComponent(raw)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        pdns?: string;
        reverseIp?: string;
        error?: string;
      };
      if (data.error) {
        throw new Error(data.error);
      }
      setPdns(data.pdns ?? "");
      setRevIp(type === "ip" ? (data.reverseIp ?? "") : "");
      setLastLookupTarget(raw);
    } catch (e) {
      setError(
        hasRetainedLookup
          ? `${String(e)} Keeping the last successful lookup visible.`
          : String(e),
      );
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
        Look up historical DNS resolutions and co-hosted domains. Free — no API
        key required.
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
          disabled={loading || !internetReachable}
          style={{ ...BTN, background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Loading…" : internetReachable ? "📡 Look up" : "Offline"}
        </button>
        <button
          onClick={() => {
            setTarget("");
            setPdns("");
            setRevIp("");
            setError("");
            setLastLookupTarget("");
          }}
          style={{ ...BTN, background: "var(--surf3)", color: "var(--text2)" }}
        >
          Clear
        </button>
      </div>

      {!internetReachable ? (
        <SurfaceCallout
          tone={hasRetainedLookup ? "info" : "warning"}
          compact
          icon="↺"
          title={
            hasRetainedLookup
              ? "Internet offline · showing retained lookup results"
              : "Internet offline · passive DNS lookup paused"
          }
          description={
            hasRetainedLookup
              ? `The last successful lookup for ${lastLookupTarget} remains visible locally until reconnect.`
              : "Passive DNS and reverse-IP lookups depend on remote sources, so live queries pause until reconnect."
          }
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {error ? (
        <SurfaceCallout
          tone={hasRetainedLookup ? "warning" : "critical"}
          compact
          icon={hasRetainedLookup ? "↺" : "!"}
          title={
            hasRetainedLookup
              ? "Latest passive DNS lookup failed · showing last good result"
              : "Passive DNS lookup failed"
          }
          description={error}
          style={{ marginBottom: "10px" }}
        />
      ) : null}

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
