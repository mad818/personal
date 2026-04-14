"use client";

import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import { ShellBadge } from "@/components/ui/shell";
import { buildVaultStewardshipSnapshot } from "@/lib/vaultStewardship";
import { useStore } from "@/store/useStore";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";

export default function VaultStewardshipPanel({
  compiledPages,
}: {
  compiledPages: CompiledMemoryPageSummary[];
}) {
  const router = useRouter();
  const savedArticles = useStore((s) => s.savedArticles);
  const graph = useStore((s) => s.vaultGraph);
  const lint = useStore((s) => s.vaultLint);

  const snapshot = buildVaultStewardshipSnapshot({
    savedArticles,
    compiledPages,
    graph,
    lint,
  });
  const repairActions = [
    snapshot.reverseEngineeringPrepCount > 0
      ? {
          href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
          label: "Open RE prep notes",
          detail: "Review durable reverse-engineering prep notes as their own archive-maintenance lane.",
        }
      : null,
    snapshot.orphanCount > 0
      ? {
          href: "/vault?focus=vault-graph-focus&graphAudit=orphans",
          label: "Open orphan graph",
          detail: "Jump straight into the focused graph recovery session instead of a broad archive view.",
        }
      : null,
    snapshot.routeLessCompiledCount > 0
      ? {
          href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
          label: "Open route-less pages",
          detail: "Use the exact compiled-page repair session for missing route continuity.",
        }
      : null,
    snapshot.untaggedCount > 0
      ? {
          href: "/vault?focus=vault-compiled-pages&compiledFilter=untagged",
          label: "Open untagged pages",
          detail: "Use the exact compiled-page repair session for missing tag coverage.",
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; detail: string }>;

  const recommendedAction =
    snapshot.reverseEngineeringRouteLessCount > 0 ||
    snapshot.reverseEngineeringUntaggedCount > 0
      ? {
          href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
          label: "Recommended next session",
          detail:
            "Reverse-engineering prep notes need route or tag upkeep, so this exact repair lane is the highest-yield next move.",
        }
      : snapshot.orphanCount > 0
        ? {
            href: "/vault?focus=vault-graph-focus&graphAudit=orphans",
            label: "Recommended next session",
            detail:
              "Disconnected archive artifacts are currently the strongest repair target.",
          }
        : repairActions[0] ?? null;
  const sessionActions = [
    recommendedAction,
    ...repairActions.filter((action) => action.href !== recommendedAction?.href),
  ].filter(Boolean) as Array<{ href: string; label: string; detail: string }>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <CompactOperatorNote
        label="VAULT STEWARDSHIP"
        tone={snapshot.orphanCount > 0 || snapshot.staleCount > 0 ? "caution" : "info"}
        summary={snapshot.summary}
        detail={snapshot.detail}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">Linked {snapshot.linkedCoverage}%</ShellBadge>
          <ShellBadge tone="muted">Tagged {snapshot.taggedCoverage}%</ShellBadge>
          <ShellBadge tone="muted">Routed {snapshot.routeCoverage}%</ShellBadge>
          <ShellBadge tone={snapshot.reverseEngineeringPrepCount > 0 ? "accent" : "muted"}>
            RE prep {snapshot.reverseEngineeringPrepCount}
          </ShellBadge>
          <ShellBadge tone={snapshot.reverseEngineeringBriefCount > 0 ? "accent" : "muted"}>
            RE briefs {snapshot.reverseEngineeringBriefCount}
          </ShellBadge>
          <ShellBadge tone={snapshot.orphanCount > 0 ? "accent" : "success"}>
            Orphans {snapshot.orphanCount}
          </ShellBadge>
          <ShellBadge tone={snapshot.staleCount > 0 ? "accent" : "muted"}>
            Stale {snapshot.staleCount}
          </ShellBadge>
        </div>
      </CompactOperatorNote>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        <StewardshipStatCard
          label="Artifacts"
          value={`${snapshot.totalArtifacts}`}
          detail={`${snapshot.articleCount} clips · ${snapshot.compiledPageCount} compiled`}
        />
        <StewardshipStatCard
          label="Thin topics"
          value={`${snapshot.gapTopicCount}`}
          detail={snapshot.topGapTopics.length > 0 ? snapshot.topGapTopics.join(" · ") : "Topic coverage looks balanced"}
        />
        <StewardshipStatCard
          label="RE prep"
          value={`${snapshot.reverseEngineeringPrepCount}`}
          detail={
            snapshot.reverseEngineeringPrepCount > 0
              ? `${snapshot.reverseEngineeringRouteLessCount} route-less · ${snapshot.reverseEngineeringUntaggedCount} untagged · ${snapshot.reverseEngineeringBriefCount} brief${snapshot.reverseEngineeringBriefCount === 1 ? "" : "s"}`
              : "No reverse-engineering prep notes yet."
          }
        />
        <StewardshipStatCard
          label="Needs tags"
          value={`${snapshot.untaggedCount}`}
          detail={
            snapshot.untaggedCount > 0
              ? "Add tags so retrieval and graph edges stay strong."
              : "Tag coverage is healthy."
          }
        />
        <StewardshipStatCard
          label="Route-less pages"
          value={`${snapshot.routeLessCompiledCount}`}
          detail={
            snapshot.routeLessCompiledCount > 0
              ? "Compiled pages should reopen the right route."
              : "Compiled pages carry route context."
          }
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {snapshot.priorities.slice(0, 3).map((priority) => (
          <div
            key={priority}
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(123, 167, 212, 0.14)",
              background:
                "linear-gradient(180deg, rgba(11, 17, 32, 0.88), rgba(11, 17, 32, 0.62))",
              fontSize: "11px",
              lineHeight: 1.5,
              color: "var(--text2)",
            }}
          >
            {priority}
          </div>
        ))}
      </div>

      {repairActions.length > 0 ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(123, 167, 212, 0.12)",
            background: "rgba(9, 14, 28, 0.46)",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text3)",
            }}
          >
            Repair actions
          </div>
          <ActionSessionCluster
            items={sessionActions}
            onOpen={(href) => router.push(href)}
            buttonClassName="nexus-shell-button"
            buttonStyle={{ minHeight: "30px", padding: "0 12px", fontSize: "11px" }}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        </div>
      ) : null}

      {snapshot.topOrphanTitles.length > 0 ? (
        <StewardshipList
          label="Reconnect first"
          items={snapshot.topOrphanTitles}
          hint="These artifacts currently sit outside the visible archive graph."
        />
      ) : null}

      {snapshot.topRouteLessTitles.length > 0 ? (
        <StewardshipList
          label="Add route context"
          items={snapshot.topRouteLessTitles}
          hint="These compiled pages cannot reopen the most relevant working lane yet."
        />
      ) : null}

      {snapshot.topReverseEngineeringTitles.length > 0 ? (
        <StewardshipList
          label="Reverse-engineering upkeep"
          items={snapshot.topReverseEngineeringTitles}
          hint="These durable triage notes should stay routed and tagged so later analysis can reopen them quickly."
        />
      ) : null}
    </div>
  );
}

function StewardshipStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid rgba(123, 167, 212, 0.12)",
        background: "rgba(9, 14, 28, 0.46)",
        display: "grid",
        gap: "4px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", lineHeight: 1.45, color: "var(--text2)" }}>
        {detail}
      </div>
    </div>
  );
}

function StewardshipList({
  label,
  items,
  hint,
}: {
  label: string;
  items: string[];
  hint: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid rgba(123, 167, 212, 0.12)",
        background: "rgba(9, 14, 28, 0.46)",
        display: "grid",
        gap: "6px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "11px", lineHeight: 1.45, color: "var(--text2)" }}>
        {hint}
      </div>
      {items.map((item) => (
        <div key={item} style={{ fontSize: "11px", lineHeight: 1.45, color: "var(--text)" }}>
          {item}
        </div>
      ))}
    </div>
  );
}
