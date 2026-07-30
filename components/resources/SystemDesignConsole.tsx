"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import {
  SYSTEM_DESIGN_MAPS,
  getSystemDesignMap,
  type SystemDesignBoundary,
  type SystemDesignRisk,
} from "@/lib/systemDesignMaps";
import { DEFAULT_SYSTEM_DESIGN_ID } from "@/lib/resourceSessionRegistry";

const BOUNDARY_LABELS: Record<SystemDesignBoundary, string> = {
  local_only: "Local only",
  external_proxied: "External via protected route",
  hybrid: "Local-first hybrid",
};

const RISK_LABELS: Record<SystemDesignRisk, string> = {
  moderate: "Moderate change risk",
  high: "High change risk",
};

function pillStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: "999px",
    border: active
      ? "1px solid rgba(120, 196, 255, 0.55)"
      : "1px solid var(--border)",
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

export default function SystemDesignConsole() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();

  const selectedId = useMemo(() => {
    return normalizedParams.get("system") ?? DEFAULT_SYSTEM_DESIGN_ID;
  }, [normalizedParams]);

  const selectedSystem = useMemo(
    () => getSystemDesignMap(selectedId),
    [selectedId],
  );
  const impactSeedActions = useMemo(
    () =>
      selectedSystem.impactSeedFiles.map((file) => ({
        href: `/resources?view=impact&file=${encodeURIComponent(file)}`,
        label: `Impact · ${file.split("/").slice(-2).join("/")}`,
        detail: `Inspect the local blast radius around ${file} before widening changes inside ${selectedSystem.title}.`,
      })),
    [selectedSystem.impactSeedFiles, selectedSystem.title],
  );
  const readFirstActions = useMemo(
    () =>
      selectedSystem.readFirst.map((file) => ({
        href: `/resources?view=impact&file=${encodeURIComponent(file)}`,
        label: `Read first · ${file.split("/").slice(-2).join("/")}`,
        detail: `Open local blast radius analysis for ${file} while orienting on ${selectedSystem.title}.`,
      })),
    [selectedSystem.readFirst, selectedSystem.title],
  );

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="⌘"
        title="Architecture maps for the real app"
        description="This lane explains subsystem ownership, boundaries, failure modes, and what to read first. Use it before broad refactors or when you need fast orientation."
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {SYSTEM_DESIGN_MAPS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(normalizedParams.toString());
              params.set("view", "system");
              params.set("system", entry.id);
              router.replace(`/resources?${params.toString()}`);
            }}
            style={pillStyle(entry.id === selectedSystem.id)}
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
            <SectionLabel detail={selectedSystem.ownership}>
              {selectedSystem.title}
            </SectionLabel>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "72ch",
              }}
            >
              {selectedSystem.summary}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="accent">
              {BOUNDARY_LABELS[selectedSystem.boundary]}
            </ShellBadge>
            <ShellBadge
              tone={selectedSystem.changeRisk === "high" ? "default" : "muted"}
            >
              {RISK_LABELS[selectedSystem.changeRisk]}
            </ShellBadge>
            <ShellBadge tone="muted">{selectedSystem.primaryRoute}</ShellBadge>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {selectedSystem.surfaces.map((surface) => (
            <ShellBadge key={surface} tone="muted">
              {surface}
            </ShellBadge>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.entryPoints.length} anchors`}
            >
              Entry points
            </SectionLabel>
            {selectedSystem.entryPoints.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedSystem.readFirst.length} files`}>
              Read first
            </SectionLabel>
            {selectedSystem.readFirst.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.dependencies.length} constraints`}
            >
              Dependencies
            </SectionLabel>
            {selectedSystem.dependencies.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel
            detail={`${selectedSystem.readFirst.length} file starts`}
          >
            Open read-first analysis
          </SectionLabel>
          <ActionSessionCluster
            items={readFirstActions}
            onOpen={(href) => router.push(href)}
            buttonStyle={pillStyle()}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.failureModes.length} watchpoints`}
            >
              Failure modes
            </SectionLabel>
            {selectedSystem.failureModes.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedSystem.guardrails.length} rules`}>
              Guardrails
            </SectionLabel>
            {selectedSystem.guardrails.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.performanceHotspots.length} hotspots`}
            >
              Performance
            </SectionLabel>
            {selectedSystem.performanceHotspots.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.microOptimizations.length} small wins`}
            >
              Micro-optimizations
            </SectionLabel>
            {selectedSystem.microOptimizations.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel
              detail={`${selectedSystem.securityAuditChecks.length} checks`}
            >
              Security audit
            </SectionLabel>
            {selectedSystem.securityAuditChecks.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel
            detail={`${selectedSystem.nextActions.length} fix sessions`}
          >
            Open the right repair next
          </SectionLabel>
          <ActionSessionCluster
            items={selectedSystem.nextActions}
            onOpen={(href) => router.push(href)}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel
            detail={`${selectedSystem.impactSeedFiles.length} file starts`}
          >
            Send to Impact
          </SectionLabel>
          <ActionSessionCluster
            items={impactSeedActions}
            onOpen={(href) => router.push(href)}
            buttonStyle={pillStyle()}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>
      </div>
    </div>
  );
}
