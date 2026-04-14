"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellBadge } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import type { EvidenceStrength, ResearchSourceRef } from "@/lib/researchSources";
import {
  OSINT_CASEFLOW_PHASES,
  OSINT_PIVOT_OPTIONS,
  buildCitationSourceRefs,
  buildOsintCasefileEvidenceStrength,
  buildOsintCasefileMarkdown,
  buildOsintCasefileSummary,
  buildOsintCasefileTags,
  buildOsintCasefileTitle,
  buildWorkflowSourceRefs,
  extractOsintPivotsFromTags,
  mergeSourceRefs,
  parseOsintCasefileMarkdown,
  rankOsintCasefilePages,
  type OsintCasefileDraft,
  type XR1SourcePageLike,
} from "@/lib/xr1Workflows";

type VaultStatus = "idle" | "saving" | "saved" | "error";

interface OsintCasefilePage extends XR1SourcePageLike {
  id: string;
  title: string;
  summary: string;
  route?: string;
  tags: string[];
  updatedAt: number;
  content?: string;
  continuity: {
    continuityId?: string | null;
    sourceRefs?: ResearchSourceRef[];
    evidenceStrength?: EvidenceStrength | null;
  };
}

const EMPTY_DRAFT: OsintCasefileDraft = {
  subject: "",
  goal: "",
  passiveFindings: "",
  pivotOpportunities: "",
  evidenceGaps: "",
  nextReviewedMove: "",
  pivots: [],
};

function inputStyle(multiline = false) {
  return {
    minHeight: multiline ? "72px" : "38px",
    borderRadius: "10px",
    border: "1px solid rgba(96, 165, 250, 0.18)",
    background: "rgba(9, 14, 28, 0.42)",
    color: "var(--text)",
    padding: multiline ? "10px" : "0 10px",
    resize: multiline ? ("vertical" as const) : undefined,
    width: "100%",
    fontSize: "12px",
  };
}

export default function OsintCasefileCard({
  route,
}: {
  route: "/recon" | "/cyber";
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<OsintCasefileDraft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<VaultStatus>("idle");
  const [pages, setPages] = useState<OsintCasefilePage[]>([]);
  const [reusedPage, setReusedPage] = useState<OsintCasefilePage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPages = async () => {
      try {
        const response = await apiFetch("/api/memory/pages?limit=12&workflowId=osint-casefile");
        if (!response.ok) return;
        const payload = (await response.json()) as { pages?: OsintCasefilePage[] };
        if (!cancelled && Array.isArray(payload.pages)) {
          setPages(payload.pages);
        }
      } catch {
        // silent
      }
    };

    void loadPages();
    const handleRefresh = () => {
      void loadPages();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, []);

  const scopedPages = useMemo(() => {
    const byRoute = pages.filter((page) => page.route === route);
    return byRoute.length > 0 ? byRoute : pages;
  }, [pages, route]);
  const rankedPages = useMemo(
    () =>
      rankOsintCasefilePages(
        scopedPages,
        draft.subject,
        reusedPage?.continuity?.continuityId,
        route,
      ),
    [draft.subject, reusedPage?.continuity?.continuityId, route, scopedPages],
  );
  const strongestPrior = rankedPages[0] ?? null;
  const savedMemoryQuery = useMemo(
    () => [draft.subject, draft.goal, draft.nextReviewedMove].filter(Boolean).join(" · "),
    [draft.goal, draft.nextReviewedMove, draft.subject],
  );

  const reuseStrongestPrior = () => {
    if (!strongestPrior) return;
    setDraft({
      ...parseOsintCasefileMarkdown(strongestPrior.content ?? ""),
      pivots: extractOsintPivotsFromTags(strongestPrior.tags),
    });
    setReusedPage(strongestPrior);
    setStatus("idle");
  };

  const saveCasefile = async () => {
    const hasRequiredInput =
      draft.subject.trim().length > 0 &&
      draft.goal.trim().length > 0 &&
      draft.passiveFindings.trim().length > 0;
    if (!hasRequiredInput) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const sourceRefs = mergeSourceRefs(
        buildCitationSourceRefs([
          draft.goal,
          draft.passiveFindings,
          draft.pivotOpportunities,
          draft.evidenceGaps,
          draft.nextReviewedMove,
        ]),
        reusedPage ? buildWorkflowSourceRefs(reusedPage) : [],
      );
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildOsintCasefileTitle(draft),
          summary: buildOsintCasefileSummary(draft),
          content: buildOsintCasefileMarkdown(draft),
          source: "manual",
          sourceLabel: "OSINT casefile",
          sourceType: "vault-artifact",
          evidenceStrength: buildOsintCasefileEvidenceStrength(sourceRefs),
          sourceRefs,
          workflowId: "osint-casefile",
          workflowLabel: "OSINT casefile",
          route,
          layer: "knowledge",
          domain: route === "/cyber" ? "cyber" : "intel",
          memoryCompartment: "research",
          requestedVisibility: "internal",
          workflowPackId: route === "/cyber" ? "cyber-triage" : "research-workflow",
          tags: buildOsintCasefileTags(draft),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { page?: OsintCasefilePage };
      if (payload.page) {
        setPages((current) => [
          payload.page!,
          ...current.filter((page) => page.id !== payload.page?.id),
        ]);
      }
      setStatus("saved");
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="accent">OSINT casefile</ShellBadge>
        <ShellBadge tone="muted">Passive-first</ShellBadge>
        <ShellBadge tone="muted">{route === "/cyber" ? "CYBER-originated" : "RECON-originated"}</ShellBadge>
      </div>

      <div className="nexus-shell-copy nexus-shell-copy--compact">
        Keep case progression compact: {OSINT_CASEFLOW_PHASES.join(" → ")}. Save the durable subject,
        passive findings, pivots, and next reviewed move before widening collection.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {OSINT_PIVOT_OPTIONS.map((pivot) => {
          const active = draft.pivots.includes(pivot);
          return (
            <button
              key={pivot}
              type="button"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  pivots: active
                    ? current.pivots.filter((value) => value !== pivot)
                    : [...current.pivots, pivot],
                }));
                setStatus("idle");
              }}
              className="nexus-shell-button"
              style={{
                minHeight: "30px",
                padding: "0 10px",
                fontSize: "10px",
                opacity: active ? 1 : 0.78,
              }}
            >
              {active ? "Selected" : "Pivot"} · {pivot}
            </button>
          );
        })}
      </div>

      {strongestPrior ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(96, 165, 250, 0.16)",
            background: "rgba(8, 18, 31, 0.46)",
            padding: "10px 12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#93c5fd",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Casefile continuity
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reuseStrongestPrior}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Reuse strongest prior
            </button>
            <button
              type="button"
              onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=osint-casefile")}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Open OSINT archive
            </button>
          </div>
          {reusedPage ? (
            <div style={{ fontSize: "10px", color: "#93c5fd", lineHeight: 1.45 }}>
              Draft seeded from {reusedPage.title}. Saving now will keep that prior casefile in the durable source trail.
            </div>
          ) : null}
        </div>
      ) : null}

      {strongestPrior ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(96, 165, 250, 0.18)",
            background: "rgba(8, 18, 31, 0.52)",
            padding: "10px 12px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Strongest prior casefile
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
            {strongestPrior.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
            {strongestPrior.summary}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reuseStrongestPrior}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Reuse strongest prior
            </button>
            <button
              type="button"
              onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=osint-casefile")}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Open OSINT archive
            </button>
          </div>
        </div>
      ) : null}

      <input
        type="text"
        value={draft.subject}
        onChange={(event) => {
          setDraft((current) => ({ ...current, subject: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Subject"
        style={inputStyle()}
      />
      <textarea
        value={draft.goal}
        onChange={(event) => {
          setDraft((current) => ({ ...current, goal: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Goal"
        style={inputStyle(true)}
      />
      <textarea
        value={draft.passiveFindings}
        onChange={(event) => {
          setDraft((current) => ({ ...current, passiveFindings: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Passive findings"
        style={inputStyle(true)}
      />
      <textarea
        value={draft.pivotOpportunities}
        onChange={(event) => {
          setDraft((current) => ({ ...current, pivotOpportunities: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Pivot opportunities"
        style={inputStyle(true)}
      />
      <textarea
        value={draft.evidenceGaps}
        onChange={(event) => {
          setDraft((current) => ({ ...current, evidenceGaps: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Evidence gaps"
        style={inputStyle(true)}
      />
      <textarea
        value={draft.nextReviewedMove}
        onChange={(event) => {
          setDraft((current) => ({ ...current, nextReviewedMove: event.target.value }));
          setStatus("idle");
        }}
        placeholder="Next reviewed move"
        style={inputStyle(true)}
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void saveCasefile()}
          className="nexus-shell-button"
          style={{ minHeight: "34px", padding: "0 12px", fontSize: "11px" }}
        >
          {status === "saving"
            ? "Filing casefile..."
            : status === "saved"
              ? "Casefile filed"
              : status === "error"
                ? "Retry filing"
                : "File casefile to Vault"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setReusedPage(null);
            setStatus("idle");
          }}
          className="nexus-shell-button"
          style={{ minHeight: "34px", padding: "0 12px", fontSize: "11px" }}
        >
          Reset draft
        </button>
      </div>

      {status === "saved" ? (
        <MissionContinuationActions
          memoryQuery={savedMemoryQuery}
          routeHint="/vault?focus=vault-compiled-pages&workflowId=osint-casefile"
          extraTargets={[
            {
              href: route === "/cyber" ? "/cyber?view=triage&focus=cyber-triage" : "/recon?view=osint&focus=recon-lookup",
              label: route === "/cyber" ? "Return to CYBER" : "Return to RECON",
              tab: route === "/cyber" ? "cyber" : "recon",
            },
          ]}
          showReturnToHQ
        />
      ) : null}

      {status === "error" ? (
        <div style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}>
          Subject, goal, and passive findings are required before the casefile can be filed.
        </div>
      ) : null}
    </div>
  );
}
