// ── components/cyber/CISAFeed ──────────────────────────────
// CISA known exploited vulnerabilities feed with advisory details.

"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import DataLoadingState from "@/components/ui/DataLoadingState";
import { ShellButton } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
} from "@/components/ui/surfacePrimitives";
import { loadClientJsonResource } from "@/lib/clientJsonResource";
import {
  isCisaKevPayload,
  type CisaKevEntry,
  type CisaKevPayload,
} from "@/lib/cisaKev";

// ── Ransomware risk badge ──────────────────────────────────────────────────────
const RANSOM_COLOR = {
  Known: "#ef4444",
  Unknown: "#f59e0b",
};

function RansomBadge({ val }: { val: string }) {
  const isKnown = val === "Known";
  const col = isKnown ? RANSOM_COLOR.Known : RANSOM_COLOR.Unknown;
  if (!isKnown) return null;
  return (
    <span
      style={{
        fontSize: "8.5px",
        fontWeight: 800,
        padding: "1px 6px",
        borderRadius: "5px",
        background: `${col}22`,
        color: col,
        textTransform: "uppercase",
        letterSpacing: ".4px",
      }}
    >
      🦠 Ransomware
    </span>
  );
}

// ── Days until due bar ────────────────────────────────────────────────────────
function DueBar({ dueDate }: { dueDate: string }) {
  if (!dueDate) return null;
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffMs = due - now;
  const diffDays = Math.ceil(diffMs / 86_400_000);
  const overdue = diffDays < 0;

  const label = overdue
    ? `${Math.abs(diffDays)}d overdue`
    : diffDays === 0
      ? "Due today"
      : `${diffDays}d left`;

  const col =
    overdue || diffDays <= 3
      ? "#ef4444"
      : diffDays <= 14
        ? "#f59e0b"
        : "#10b981";
  // Fill: 0 days left = full red, 30+ days = nearly empty
  const pct = overdue
    ? 100
    : Math.max(5, Math.min(100, 100 - (diffDays / 30) * 100));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "6px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          color: "var(--text3)",
          fontWeight: 700,
          minWidth: "44px",
        }}
      >
        PATCH DUE
      </span>
      <div
        style={{
          flex: 1,
          height: "3px",
          background: "var(--surf3)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: col,
            borderRadius: "2px",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: col,
          minWidth: "60px",
          textAlign: "right",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CISAFeed() {
  const [entries, setEntries] = useState<CisaKevEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [retryToken, setRetryToken] = useState(0);
  const [meta, setMeta] = useState({ version: "", released: "", total: 0 });
  const loading = loadState === "loading";

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadState("loading");
      const result = await loadClientJsonResource<CisaKevPayload>(
        () => apiFetch("/api/cisa-kev"),
        isCisaKevPayload,
      );
      if (!active) return;
      if (!result.ok) {
        setLoadState("error");
        return;
      }

      const payload = result.payload;
      setEntries(payload.vulnerabilities);
      setMeta({
        version: payload.catalogVersion,
        released: payload.dateReleased,
        total: payload.total,
      });
      setLoadState("ready");
    };

    void load();
    return () => {
      active = false;
    };
  }, [retryToken]);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          🛡️ CISA KEV
        </span>
        {meta.total > 0 && (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            {meta.total.toLocaleString()} total · v{meta.version} ·{" "}
            {meta.released}
          </span>
        )}
        <button
          type="button"
          onClick={() => setRetryToken((current) => current + 1)}
          disabled={loading}
          aria-label={
            loading ? "Refreshing CISA KEV feed" : "Refresh CISA KEV feed"
          }
          style={{
            marginLeft: "auto",
            height: "24px",
            padding: "0 10px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {loading && entries.length > 0 && (
        <div
          role="status"
          style={{
            marginBottom: "8px",
            color: "var(--text3)",
            fontSize: "10px",
          }}
        >
          Refreshing CISA KEV; retained catalog remains visible.
        </div>
      )}

      {loadState === "error" && (
        <div style={{ marginBottom: entries.length > 0 ? "10px" : 0 }}>
          <SurfaceCallout
            tone="warning"
            compact
            role="alert"
            title="CISA KEV unavailable"
            description={
              entries.length > 0
                ? "The latest refresh failed. The last verified catalog remains visible."
                : "The catalog could not be verified. Retry without leaving CYBER."
            }
          >
            <ShellButton
              onClick={() => setRetryToken((current) => current + 1)}
            >
              Retry CISA KEV
            </ShellButton>
          </SurfaceCallout>
        </div>
      )}

      {loading && entries.length === 0 && (
        <DataLoadingState dataName="CISA KEV catalog" height={140} />
      )}

      {loadState === "ready" && entries.length === 0 && (
        <SurfaceEmpty
          icon="🛡️"
          title="No CISA KEV entries returned"
          description="The catalog responded successfully with no current records."
          compact
          action={
            <ShellButton
              onClick={() => setRetryToken((current) => current + 1)}
            >
              Refresh catalog
            </ShellButton>
          }
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {entries.map((e) => (
          <a
            key={e.cveID}
            href={`https://nvd.nist.gov/vuln/detail/${e.cveID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "11px 13px",
              textDecoration: "none",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginBottom: "5px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: "var(--accent)",
                }}
              >
                {e.cveID}
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "5px",
                  background: "var(--surf3)",
                  color: "var(--text3)",
                }}
              >
                {e.vendorProject}
              </span>
              <RansomBadge val={e.knownRansomwareCampaignUse} />
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  marginLeft: "auto",
                }}
              >
                Added {e.dateAdded}
              </span>
            </div>

            {/* Name */}
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.35,
                marginBottom: "4px",
              }}
            >
              {e.vulnerabilityName}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: "11px",
                color: "var(--text2)",
                lineHeight: 1.5,
              }}
            >
              {e.shortDescription.slice(0, 160)}
              {e.shortDescription.length > 160 ? "…" : ""}
            </div>

            {/* Patch deadline bar */}
            <DueBar dueDate={e.dueDate} />
          </a>
        ))}
      </div>
    </div>
  );
}
