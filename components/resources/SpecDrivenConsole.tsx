"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import {
  SPEC_DRIVEN_TEMPLATES,
  buildSpecDrivenBrief,
  getSpecDrivenTemplate,
} from "@/lib/specDrivenDevelopment";
import { DEFAULT_SPEC_TEMPLATE_ID } from "@/lib/resourceSessionRegistry";

function pillStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(120, 196, 255, 0.55)" : "1px solid var(--border)",
    background: active ? "rgba(56, 122, 255, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "11px",
    cursor: "pointer",
    textDecoration: "none",
  } as const;
}

function listCardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

export default function SpecDrivenConsole() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const [briefStatus, setBriefStatus] = useState<"" | "copied" | "requested" | "failed">("");

  const selectedId = useMemo(() => {
    return normalizedParams.get("spec") ?? DEFAULT_SPEC_TEMPLATE_ID;
  }, [normalizedParams]);

  const selectedTemplate = useMemo(
    () => getSpecDrivenTemplate(selectedId),
    [selectedId],
  );
  const briefText = useMemo(
    () => buildSpecDrivenBrief(selectedTemplate),
    [selectedTemplate],
  );

  useEffect(() => {
    setBriefStatus("");
  }, [selectedTemplate.id]);

  const handleCopyBrief = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setBriefStatus("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(briefText);
      setBriefStatus("copied");
    } catch {
      setBriefStatus("failed");
    }
  };

  const handleDownloadBrief = () => {
    const requested = requestTextDownload({
      filename: `spec-${selectedTemplate.id}.txt`,
      content: briefText,
      label: "Spec starter",
      mimeType: "text/plain;charset=utf-8",
      announce: false,
    });
    setBriefStatus(requested ? "requested" : "failed");
  };

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="≣"
        title="Spec-first working lane"
        description="Use this before implementation when the change is expensive, cross-surface, or easy to let drift. Start from problem, non-goals, constraints, acceptance, and verification, then open the exact repair sessions that spec requires."
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {SPEC_DRIVEN_TEMPLATES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(normalizedParams.toString());
              params.set("view", "specs");
              params.set("spec", entry.id);
              router.replace(`/resources?${params.toString()}`);
            }}
            style={pillStyle(entry.id === selectedTemplate.id)}
          >
            {entry.title}
          </button>
        ))}
      </div>

      <div style={{ ...listCardStyle(), display: "grid", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: "6px" }}>
            <SectionLabel detail={selectedTemplate.bestFor}>
              {selectedTemplate.title}
            </SectionLabel>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "72ch",
              }}
            >
              {selectedTemplate.objective}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="accent">Spec first</ShellBadge>
            <ShellBadge tone="muted">{selectedTemplate.primarySystemId}</ShellBadge>
            <ShellBadge tone="muted">{selectedTemplate.impactSeedFile}</ShellBadge>
          </div>
        </div>

        <details
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.42)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text2)",
            }}
          >
            Use outside Nexus
          </summary>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            <button type="button" onClick={() => void handleCopyBrief()} style={pillStyle()}>
              Copy starter
            </button>
            <button type="button" onClick={handleDownloadBrief} style={pillStyle()}>
              Download starter
            </button>
            {briefStatus === "copied" ? <ShellBadge tone="success">Starter copied</ShellBadge> : null}
            {briefStatus === "requested" ? (
              <ShellBadge tone="success">Download requested</ShellBadge>
            ) : null}
            {briefStatus === "failed" ? (
              <ShellBadge tone="default">Starter export failed</ShellBadge>
            ) : null}
          </div>
        </details>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedTemplate.specSections.length} sections`}>
              Spec starter
            </SectionLabel>
            {selectedTemplate.specSections.map((entry) => (
              <article key={entry.title} style={listCardStyle()}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                    {entry.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
                    {entry.prompt}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedTemplate.antiPatterns.length} traps`}>
              Anti-patterns
            </SectionLabel>
            {selectedTemplate.antiPatterns.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 0.38fr) minmax(0, 0.62fr)",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedTemplate.verification.length} checks`}>
              Verification
            </SectionLabel>
            {selectedTemplate.verification.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail="Open the exact subsystem and repair sessions after the spec is written">
              Jump-offs
            </SectionLabel>
            <ActionSessionCluster
              items={selectedTemplate.followOnActions}
              onOpen={(href) => router.push(href)}
              maxPrimaryItems={1}
              showPrimaryCards={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
