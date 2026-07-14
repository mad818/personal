"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import {
  ENGINEERING_PLAYBOOKS,
  buildEngineeringPlaybookBrief,
  getEngineeringPlaybook,
} from "@/lib/engineeringPlaybooks";
import { DEFAULT_ENGINEERING_PLAYBOOK_ID } from "@/lib/resourceSessionRegistry";

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

export default function PlaybooksConsole() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const [briefStatus, setBriefStatus] = useState<"" | "copied" | "requested" | "failed">("");

  const selectedId = useMemo(() => {
    return normalizedParams.get("playbook") ?? DEFAULT_ENGINEERING_PLAYBOOK_ID;
  }, [normalizedParams]);

  const selectedPlaybook = useMemo(
    () => getEngineeringPlaybook(selectedId),
    [selectedId],
  );
  const briefText = useMemo(
    () => buildEngineeringPlaybookBrief(selectedPlaybook),
    [selectedPlaybook],
  );

  useEffect(() => {
    setBriefStatus("");
  }, [selectedPlaybook.id]);

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
      filename: `playbook-${selectedPlaybook.id}.txt`,
      content: briefText,
      label: "Playbook brief",
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
        icon="≡"
        title="Reusable engineering playbooks"
        description="These are Nexus-native workflow cards inspired by structured agent guides: start route, subsystem context, blast radius anchor, and verification all in one place."
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {ENGINEERING_PLAYBOOKS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(normalizedParams.toString());
              params.set("view", "playbooks");
              params.set("playbook", entry.id);
              router.replace(`/resources?${params.toString()}`);
            }}
            style={pillStyle(entry.id === selectedPlaybook.id)}
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
            <SectionLabel detail={selectedPlaybook.whenToUse}>
              {selectedPlaybook.title}
            </SectionLabel>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "72ch",
              }}
            >
              {selectedPlaybook.objective}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="accent">Start in Resources</ShellBadge>
            <ShellBadge tone="muted">{selectedPlaybook.startSurface}</ShellBadge>
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
              Copy brief
            </button>
            <button type="button" onClick={handleDownloadBrief} style={pillStyle()}>
              Download brief
            </button>
            {briefStatus === "copied" ? <ShellBadge tone="success">Brief copied</ShellBadge> : null}
            {briefStatus === "requested" ? (
              <ShellBadge tone="success">Download requested</ShellBadge>
            ) : null}
            {briefStatus === "failed" ? (
              <ShellBadge tone="default">Brief export failed</ShellBadge>
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
            <SectionLabel detail={`${selectedPlaybook.steps.length} steps`}>
              Core steps
            </SectionLabel>
            {selectedPlaybook.steps.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedPlaybook.verification.length} checks`}>
              Verification
            </SectionLabel>
            {selectedPlaybook.verification.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail="Start the real work from the right Nexus surface">
            Jump-offs
          </SectionLabel>
          <ActionSessionCluster
            items={selectedPlaybook.followOnActions}
            onOpen={(href) => router.push(href)}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>
      </div>
    </div>
  );
}
