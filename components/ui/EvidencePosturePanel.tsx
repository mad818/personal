"use client";

import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import type { StructuredEvidenceAnswer } from "@/lib/aiStructuredEvidence";

function sectionStyle() {
  return {
    border: "1px solid rgba(123, 167, 212, 0.14)",
    borderRadius: "14px",
    padding: "12px",
    background:
      "linear-gradient(180deg, rgba(11, 17, 32, 0.92), rgba(11, 17, 32, 0.66))",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  };
}

export default function EvidencePosturePanel({
  title,
  summary,
  observed,
  inferred,
  verifyNext,
  compact = false,
}: {
  title: string;
  summary: string;
  observed: string[];
  inferred: string[];
  verifyNext: string[];
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="Sparkles"
        title={title}
        description={summary}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">{observed.length} observed</ShellBadge>
          <ShellBadge tone="muted">{inferred.length} inferred</ShellBadge>
          <ShellBadge tone="muted">{verifyNext.length} verify next</ShellBadge>
        </div>
      </SurfaceCallout>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact
            ? "repeat(auto-fit, minmax(180px, 1fr))"
            : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={sectionStyle()}>
          <div
            style={{
              fontSize: compact ? "11px" : "12px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Observed
          </div>
          {observed.length === 0 ? (
            <div
              style={{
                fontSize: compact ? "11px" : "12px",
                color: "var(--text2)",
              }}
            >
              No explicit observed facts were separated out.
            </div>
          ) : (
            observed.map((entry) => (
              <div
                key={entry}
                style={{
                  fontSize: compact ? "11px" : "12px",
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {entry}
              </div>
            ))
          )}
        </div>

        <div style={sectionStyle()}>
          <div
            style={{
              fontSize: compact ? "11px" : "12px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Inferred
          </div>
          {inferred.length === 0 ? (
            <div
              style={{
                fontSize: compact ? "11px" : "12px",
                color: "var(--text2)",
              }}
            >
              No explicit inference layer was returned.
            </div>
          ) : (
            inferred.map((entry) => (
              <div
                key={entry}
                style={{
                  fontSize: compact ? "11px" : "12px",
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {entry}
              </div>
            ))
          )}
        </div>

        <div style={sectionStyle()}>
          <div
            style={{
              fontSize: compact ? "11px" : "12px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Verify next
          </div>
          {verifyNext.length === 0 ? (
            <div
              style={{
                fontSize: compact ? "11px" : "12px",
                color: "var(--text2)",
              }}
            >
              No follow-up checks suggested.
            </div>
          ) : (
            verifyNext.map((entry) => (
              <div
                key={entry}
                style={{
                  fontSize: compact ? "11px" : "12px",
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
