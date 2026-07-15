"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellBadge } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import {
  AI_EXPOSURE_PACKS,
  AI_EXPOSURE_PACK_LOOKUP,
  buildAiExposureCitationSourceRefs,
  buildAiExposureEvidenceStrength,
  buildAiExposureReviewMarkdown,
  buildAiExposureReviewSummary,
  buildAiExposureReviewTags,
  buildAiExposureReviewTitle,
  extractAiExposurePackIdsFromTags,
  mergeAiExposureSourceRefs,
  parseAiExposureReviewMarkdown,
  rankAiExposureReviewPages,
  type AiExposureReviewDraft,
} from "@/lib/aiExposureReview";
import {
  buildCompiledPageHref,
  buildWorkflowSourceRefs,
  type XR1SourcePageLike,
} from "@/lib/xr1Workflows";

type VaultStatus = "idle" | "saving" | "saved" | "error";

interface AiExposureReviewPage extends XR1SourcePageLike {
  id: string;
  title: string;
  summary: string;
  route?: string;
  tags: string[];
  updatedAt: number;
  content?: string;
}

const EMPTY_DRAFT: AiExposureReviewDraft = {
  subject: "",
  exposureProfile: "",
  passiveEvidence: "",
  containmentGuidance: "",
  advisoryBoundaries: "",
  nextReviewedMove: "",
  packIds: [],
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

export default function AiExposureReviewCard({
  route,
}: {
  route: "/recon" | "/cyber";
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<AiExposureReviewDraft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<VaultStatus>("idle");
  const [pages, setPages] = useState<AiExposureReviewPage[]>([]);
  const [reusedPage, setReusedPage] = useState<AiExposureReviewPage | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const loadPages = async () => {
      try {
        const response = await apiFetch(
          "/api/memory/pages?limit=12&workflowId=ai-exposure-review",
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          pages?: AiExposureReviewPage[];
        };
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
      rankAiExposureReviewPages(
        scopedPages,
        draft.subject,
        reusedPage?.continuity?.continuityId,
        route,
      ),
    [draft.subject, reusedPage?.continuity?.continuityId, route, scopedPages],
  );

  const strongestPrior = rankedPages[0] ?? null;
  const savedMemoryQuery = useMemo(
    () =>
      [draft.subject, draft.exposureProfile, draft.nextReviewedMove]
        .filter(Boolean)
        .join(" · "),
    [draft.exposureProfile, draft.nextReviewedMove, draft.subject],
  );

  const selectedPackSpecs = useMemo(
    () =>
      draft.packIds
        .map((packId) => AI_EXPOSURE_PACK_LOOKUP[packId])
        .filter(Boolean),
    [draft.packIds],
  );

  const openExactReview = (page: AiExposureReviewPage | null) => {
    if (!page) return;
    router.push(buildCompiledPageHref(page));
  };

  const reuseStrongestPrior = () => {
    if (!strongestPrior) return;
    setDraft({
      ...parseAiExposureReviewMarkdown(strongestPrior.content ?? ""),
      packIds: extractAiExposurePackIdsFromTags(strongestPrior.tags),
    });
    setReusedPage(strongestPrior);
    setStatus("idle");
  };

  const saveReview = async () => {
    const hasRequiredInput =
      draft.subject.trim().length > 0 &&
      draft.exposureProfile.trim().length > 0 &&
      draft.passiveEvidence.trim().length > 0 &&
      draft.packIds.length > 0;
    if (!hasRequiredInput) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const sourceRefs = mergeAiExposureSourceRefs(
        buildAiExposureCitationSourceRefs([
          draft.exposureProfile,
          draft.passiveEvidence,
          draft.containmentGuidance,
          draft.advisoryBoundaries,
          draft.nextReviewedMove,
        ]),
        reusedPage ? buildWorkflowSourceRefs(reusedPage) : [],
      );
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildAiExposureReviewTitle(draft),
          summary: buildAiExposureReviewSummary(draft),
          content: buildAiExposureReviewMarkdown(draft),
          source: "manual",
          sourceLabel: "AI exposure review",
          sourceType: "vault-artifact",
          evidenceStrength: buildAiExposureEvidenceStrength(sourceRefs),
          sourceRefs,
          workflowId: "ai-exposure-review",
          workflowLabel: "AI exposure review",
          route,
          layer: "knowledge",
          domain: route === "/cyber" ? "cyber" : "intel",
          memoryCompartment: "research",
          requestedVisibility: "internal",
          workflowPackId:
            route === "/cyber" ? "cyber-triage" : "research-workflow",
          tags: buildAiExposureReviewTags(draft),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        page?: AiExposureReviewPage;
      };
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
        <ShellBadge tone="accent">AI exposure review</ShellBadge>
        <ShellBadge tone="muted">Passive-first</ShellBadge>
        <ShellBadge tone="muted">Advisory only</ShellBadge>
        <ShellBadge tone="muted">
          {route === "/cyber" ? "CYBER-originated" : "RECON-originated"}
        </ShellBadge>
      </div>

      <div className="nexus-shell-copy nexus-shell-copy--compact">
        Use a pack to frame exposed endpoints, leaked key posture, vector-store
        or MCP surface risk, and unsafe agent deployment without widening into
        scanning, prompting, or exploitation.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {AI_EXPOSURE_PACKS.map((pack) => {
          const active = draft.packIds.includes(pack.id);
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  packIds: active
                    ? current.packIds.filter((value) => value !== pack.id)
                    : [...current.packIds, pack.id],
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
              {active ? "Selected" : "Pack"} · {pack.shortLabel}
            </button>
          );
        })}
      </div>

      {selectedPackSpecs.length > 0 ? (
        <div style={{ display: "grid", gap: "8px" }}>
          {selectedPackSpecs.map((pack) => (
            <div
              key={pack.id}
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
                {pack.label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  lineHeight: 1.5,
                }}
              >
                {pack.summary}
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                {pack.checklist.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: "10px",
                      color: "var(--text3)",
                      lineHeight: 1.45,
                    }}
                  >
                    - {item}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                {pack.safeFollowThrough.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: "10px",
                      color: "#93c5fd",
                      lineHeight: 1.45,
                    }}
                  >
                    Next: {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#93c5fd",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Strongest prior review
          </div>
          <div
            style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
          >
            {strongestPrior.title}
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}
          >
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
              onClick={() => openExactReview(strongestPrior)}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Open strongest prior
            </button>
          </div>
          {reusedPage ? (
            <div
              style={{ fontSize: "10px", color: "#93c5fd", lineHeight: 1.45 }}
            >
              Draft seeded from {reusedPage.title}. Saving now keeps that prior
              advisory thread in the durable source trail.
            </div>
          ) : null}
        </div>
      ) : null}

      <input
        aria-label="Exposure review subject"
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
        aria-label="Exposure profile"
        value={draft.exposureProfile}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            exposureProfile: event.target.value,
          }));
          setStatus("idle");
        }}
        placeholder="Exposure profile"
        style={inputStyle(true)}
      />
      <textarea
        aria-label="Passive evidence"
        value={draft.passiveEvidence}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            passiveEvidence: event.target.value,
          }));
          setStatus("idle");
        }}
        placeholder="Passive evidence"
        style={inputStyle(true)}
      />
      <textarea
        aria-label="Containment guidance"
        value={draft.containmentGuidance}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            containmentGuidance: event.target.value,
          }));
          setStatus("idle");
        }}
        placeholder="Containment guidance"
        style={inputStyle(true)}
      />
      <textarea
        aria-label="Advisory boundaries"
        value={draft.advisoryBoundaries}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            advisoryBoundaries: event.target.value,
          }));
          setStatus("idle");
        }}
        placeholder="Advisory boundaries"
        style={inputStyle(true)}
      />
      <textarea
        aria-label="Next reviewed move"
        value={draft.nextReviewedMove}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            nextReviewedMove: event.target.value,
          }));
          setStatus("idle");
        }}
        placeholder="Next reviewed move"
        style={inputStyle(true)}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => void saveReview()}
          className="nexus-shell-button"
          style={{ minHeight: "34px", padding: "0 12px", fontSize: "11px" }}
        >
          {status === "saving"
            ? "Filing review..."
            : status === "saved"
              ? "Review filed"
              : status === "error"
                ? "Retry filing"
                : "File advisory review"}
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
          routeHint="/vault?focus=vault-compiled-pages&workflowId=ai-exposure-review"
          extraTargets={[
            {
              href:
                route === "/cyber"
                  ? "/cyber?view=triage&focus=cyber-triage"
                  : "/recon?view=osint&focus=recon-lookup",
              label: route === "/cyber" ? "Return to CYBER" : "Return to RECON",
              tab: route === "/cyber" ? "cyber" : "recon",
            },
          ]}
          showReturnToHQ
        />
      ) : null}

      {status === "error" ? (
        <div
          style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}
        >
          Subject, exposure profile, passive evidence, and at least one pack are
          required before the advisory review can be filed.
        </div>
      ) : null}
    </div>
  );
}
