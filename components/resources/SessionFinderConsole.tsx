"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import {
  getSessionTargetLabel,
  isExactSessionHref,
  normalizeSessionHref,
} from "@/lib/exactSessionLinks";
import { resolveAssistantSessionHref } from "@/lib/assistantSessionRecovery";
import {
  buildSessionFinderResults,
  readSessionFinderMemory,
  recordSessionFinderOpen,
  type SessionFinderMemoryEntry,
  type SessionFinderEntry,
} from "@/lib/sessionFinder";
import { useStore } from "@/store/useStore";

function cardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

function inputStyle() {
  return {
    width: "100%",
    minHeight: "40px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(8, 12, 24, 0.92)",
    color: "var(--text)",
    padding: "0 12px",
    fontSize: "12px",
    outline: "none",
  } as const;
}

function formatWorkingLabel(label: string) {
  return label.replace(/^Open\s+/i, "");
}

export default function SessionFinderConsole() {
  const router = useRouter();
  const preparedWorkspace = useStore((state) => state.preparedWorkspace);
  const unfinishedSessions = useStore((state) => state.unfinishedSessions);
  const [query, setQuery] = useState("");
  const [memory, setMemory] = useState<SessionFinderMemoryEntry[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setMemory(readSessionFinderMemory());
  }, []);

  const results = useMemo(
    () => buildSessionFinderResults(deferredQuery, memory),
    [deferredQuery, memory],
  );

  const handleOpen = (href: string) => {
    const normalizedHref = normalizeSessionHref(href);
    recordSessionFinderOpen(normalizedHref);
    setMemory(readSessionFinderMemory());
    router.push(normalizedHref);
  };

  const resolvePrimaryTarget = (entry: SessionFinderEntry) => {
    const overviewHref = normalizeSessionHref(entry.href);
    const preparedHref = entry.workingContext
      ? normalizeSessionHref(entry.workingContext.href)
      : resolveAssistantSessionHref({
          href: overviewHref,
          preparedWorkspace,
          unfinishedSessions,
          includeRouteDefault: true,
        });
    const exact = isExactSessionHref(preparedHref);
    return {
      href: preparedHref,
      label: entry.workingContext
        ? formatWorkingLabel(entry.workingContext.label)
        : exact && preparedHref !== overviewHref
          ? "Open strongest session"
          : "Open",
      detail: entry.workingContext?.detail ?? null,
      overviewHref,
      overviewLabel: entry.title,
      targetLabel: getSessionTargetLabel(preparedHref),
      exact,
    };
  };

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="⌕"
        title="Fast session finder"
        description="Search Nexus work sessions the way a good finder should work: compact, typo-tolerant enough for real use, and biased toward exact repair panels plus your recent paths."
      />

      <div style={{ display: "grid", gap: "8px" }}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a route, exact panel, playbook, spec, or system map"
          style={inputStyle()}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone="accent">{results.length} results</ShellBadge>
          <ShellBadge tone="muted">Exact panels ranked above broad routes</ShellBadge>
          <ShellBadge tone="muted">Overview + working context</ShellBadge>
          <ShellBadge tone="muted">Local memory only</ShellBadge>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "10px",
        }}
      >
        {results.map((entry) => (
          <article key={entry.id} style={cardStyle()}>
            {(() => {
              const primaryTarget = resolvePrimaryTarget(entry);
              const showOverviewOverflow =
                primaryTarget.href !== primaryTarget.overviewHref;
              return (
                <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "grid", gap: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                    {entry.title}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <ShellBadge tone={primaryTarget.exact ? "accent" : "muted"}>
                      {primaryTarget.targetLabel}
                    </ShellBadge>
                    <ShellBadge tone="muted">{entry.source}</ShellBadge>
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                  {entry.detail}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleOpen(primaryTarget.href)}
                  className="nexus-shell-button"
                  style={{ minHeight: "30px", padding: "0 12px", fontSize: "11px" }}
                >
                  {primaryTarget.label}
                </button>
                <ShellBadge tone="muted">{entry.kind}</ShellBadge>
                {primaryTarget.exact && primaryTarget.href !== primaryTarget.overviewHref ? (
                  <ShellBadge tone="accent">
                    Continuation-ready
                  </ShellBadge>
                ) : null}
                {entry.score >= 80 ? <ShellBadge tone="success">Strong match</ShellBadge> : null}
              </div>
              {primaryTarget.detail ? (
                <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.55 }}>
                  {primaryTarget.detail}
                </div>
              ) : null}
              {showOverviewOverflow ? (
                <details style={{ fontSize: "11px", color: "var(--text3)" }}>
                  <summary style={{ cursor: "pointer", userSelect: "none" }}>
                    View overview route
                  </summary>
                  <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                    <div style={{ lineHeight: 1.55 }}>
                      {primaryTarget.overviewLabel} stays available if you want the broader lane
                      instead of the strongest exact session.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpen(primaryTarget.overviewHref)}
                      className="nexus-shell-button"
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "11px" }}
                    >
                      Open overview
                    </button>
                  </div>
                </details>
              ) : null}
            </div>
              );
            })()}
          </article>
        ))}
      </div>
    </div>
  );
}
