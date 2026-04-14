// ── components/cyber/CISAFeed ──────────────────────────────
// CISA known exploited vulnerabilities feed with advisory details.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import FeedStatusPill from "@/components/ui/FeedStatusPill";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";
import { useStore } from "@/store/useStore";

interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

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
  const cisaKevStatus = useStore((s) => s.feedStatus.cisaKev);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);
  const { internetReachable } = useInternetAvailability();
  const [entries, setEntries] = useState<KEVEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ version: "", released: "", total: 0 });
  const [error, setError] = useState<string | null>(null);
  const hasLocalEntriesRef = useRef(false);
  const lastFailureIsNewest =
    Boolean(cisaKevStatus.lastFailureAt) &&
    (cisaKevStatus.lastSuccessAt === null ||
      (cisaKevStatus.lastFailureAt ?? 0) > (cisaKevStatus.lastSuccessAt ?? 0));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    updateFeedStatus("cisaKev", {
      lastAttemptAt: Date.now(),
      lastError: null,
    });
    try {
      const r = await apiFetch("/api/cisa-kev");
      if (!r.ok) {
        throw new Error("CISA KEV feed unavailable.");
      }
      const d = await r.json();
      const nextEntries = d.vulnerabilities ?? [];
      setEntries(nextEntries);
      setMeta({
        version: d.catalogVersion ?? "",
        released: d.dateReleased ?? "",
        total: d.total ?? 0,
      });
      if (nextEntries.length > 0) {
        updateFeedStatus("cisaKev", {
          lastSuccessAt: Date.now(),
          lastError: null,
        });
      } else {
        throw new Error("CISA KEV returned no entries.");
      }
    } catch {
      setError(
        hasLocalEntriesRef.current ? null : "Could not load the CISA KEV feed.",
      );
      updateFeedStatus("cisaKev", {
        lastFailureAt: Date.now(),
        lastError: "Could not load the CISA KEV feed.",
      });
    } finally {
      setLoading(false);
    }
  }, [hasLocalEntriesRef, updateFeedStatus]);

  useEffect(() => {
    hasLocalEntriesRef.current = entries.length > 0;
  }, [entries.length, hasLocalEntriesRef]);

  useEffect(() => {
    load();
  }, [load]);

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
        <FeedStatusPill
          label="CISA KEV"
          status={cisaKevStatus}
          internetReachable={internetReachable}
        />
        {meta.total > 0 && (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            {meta.total.toLocaleString()} total · v{meta.version} ·{" "}
            {meta.released}
          </span>
        )}
        <button
          onClick={load}
          disabled={loading || !internetReachable}
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
            cursor:
              loading || !internetReachable ? "not-allowed" : "pointer",
            opacity: internetReachable ? 1 : 0.65,
          }}
        >
          {loading ? "…" : internetReachable ? "↻" : "Offline"}
        </button>
      </div>

      {!internetReachable && cisaKevStatus.lastSuccessAt !== null ? (
        <SurfaceCallout
          tone="info"
          icon="↺"
          title="Internet offline · showing last-known CISA KEV state"
          description="KEV refresh is paused until reconnect. The current catalog view remains available locally."
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {internetReachable && lastFailureIsNewest && entries.length > 0 ? (
        <SurfaceCallout
          tone="info"
          icon="!"
          title="Showing last good CISA KEV snapshot"
          description="The latest KEV refresh failed, so this panel is preserving the most recent successful catalog state."
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {error && entries.length === 0 ? (
        <SurfaceCallout
          tone="warning"
          icon="!"
          title="CISA KEV feed unavailable"
          description={error}
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {!entries.length && loading && (
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "12px",
          }}
        >
          Fetching CISA KEV catalog…
        </div>
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
