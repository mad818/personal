"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import NativeCapabilityAuditCard from "@/components/ui/NativeCapabilityAuditCard";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { getSessionTargetLabel, isExactSessionHref } from "@/lib/exactSessionLinks";
import {
  getSurfaceCapability,
  SURFACE_CAPABILITIES,
  SURFACE_CAPABILITY_CATEGORY_LABELS,
} from "@/lib/surfaceCapabilities";
import { DEFAULT_SURFACE_CAPABILITY_ID } from "@/lib/resourceSessionRegistry";

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

export default function SurfaceCapabilitiesConsole() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();

  const selectedId = useMemo(() => {
    return normalizedParams.get("surface") ?? DEFAULT_SURFACE_CAPABILITY_ID;
  }, [normalizedParams]);

  const selectedSurface = useMemo(
    () => getSurfaceCapability(selectedId),
    [selectedId],
  );
  const subsectionActions = useMemo(
    () =>
      selectedSurface.subsections
        .filter((entry) => Boolean(entry.href))
        .map((entry) => ({
          href: entry.href!,
          label: entry.label,
          detail: entry.detail,
        })),
    [selectedSurface.subsections],
  );

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="◎"
        title="Cross-tab capability audit"
        description="Use this lane to decide which surface to open, what its strongest subsections are, how it behaves under free-first and offline constraints, and what should be strengthened next."
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {SURFACE_CAPABILITIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(normalizedParams.toString());
              params.set("view", "surfaces");
              params.set("surface", entry.id);
              router.replace(`/resources?${params.toString()}`);
            }}
            style={pillStyle(entry.id === selectedSurface.id)}
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
            <SectionLabel detail={selectedSurface.tagline}>
              {selectedSurface.title}
            </SectionLabel>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "72ch",
              }}
            >
              {selectedSurface.mission}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="accent">
              {SURFACE_CAPABILITY_CATEGORY_LABELS[selectedSurface.category]}
            </ShellBadge>
            <ShellBadge tone="muted">{selectedSurface.route}</ShellBadge>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <NativeCapabilityAuditCard
              surfaceId={selectedSurface.id}
              title={`${selectedSurface.title} native audit`}
              detail="Read the current route’s workflow, memory, context, and browser posture before opening a new exact session or companion stack."
              workflowCatalogCount={HQ_WORKFLOW_CATALOG.length}
            />
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedSurface.strongestAbilities.length} strengths`}>
              Strongest abilities
            </SectionLabel>
            {selectedSurface.strongestAbilities.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <SectionLabel detail={`${selectedSurface.bestFor.length} best-fit uses`}>
              Best for
            </SectionLabel>
            {selectedSurface.bestFor.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
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
          <article style={listCardStyle()}>
            <div style={{ display: "grid", gap: "6px" }}>
              <SectionLabel detail="Default economics">Free-first posture</SectionLabel>
              <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
                {selectedSurface.costPosture}
              </div>
            </div>
          </article>
          <article style={listCardStyle()}>
            <div style={{ display: "grid", gap: "6px" }}>
              <SectionLabel detail="How to read the surface when connectivity degrades">
                Offline posture
              </SectionLabel>
              <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
                {selectedSurface.offlinePosture}
              </div>
            </div>
          </article>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${selectedSurface.subsections.length} lanes`}>
            Key subsections
          </SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            {selectedSurface.subsections.map((entry) => (
              <article key={`${entry.label}-${entry.href ?? "local"}`} style={listCardStyle()}>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry.label}</div>
                    {entry.href ? (
                      <ShellBadge tone={isExactSessionHref(entry.href) ? "accent" : "muted"}>
                        {getSessionTargetLabel(entry.href)}
                      </ShellBadge>
                    ) : null}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                    {entry.detail}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {subsectionActions.length > 0 ? (
            <ActionSessionCluster
              items={subsectionActions}
              onOpen={(href) => router.push(href)}
              buttonStyle={pillStyle()}
              maxPrimaryItems={1}
              showPrimaryCards={false}
            />
          ) : null}
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${selectedSurface.jumpActions.length} jump-offs`}>
            Open the right thing next
          </SectionLabel>
          <ActionSessionCluster
            items={selectedSurface.jumpActions}
            onOpen={(href) => router.push(href)}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${selectedSurface.upgradeActions.length} launch points`}>
            Improve from here
          </SectionLabel>
          <ActionSessionCluster
            items={selectedSurface.upgradeActions}
            onOpen={(href) => router.push(href)}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${selectedSurface.upgradePriorities.length} next moves`}>
            Strengthen next
          </SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            {selectedSurface.upgradePriorities.map((entry) => (
              <article key={entry} style={listCardStyle()}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
