"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellBadge } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import type {
  EvidenceStrength,
  ResearchSourceRef,
} from "@/lib/researchSources";
import {
  buildMarketReviewCoachSuggestions,
  buildCompiledPageHref,
  buildMarketReviewMarkdown,
  buildMarketReviewSummary,
  buildMarketReviewTags,
  buildMarketReviewTitle,
  buildWorkflowSourceRefs,
  parseMarketReviewMarkdown,
  rankMarketReviewPages,
  seedMarketReviewCoachFields,
  type MarketReviewDraft,
  type XR1SourcePageLike,
} from "@/lib/xr1Workflows";

type VaultStatus = "idle" | "saving" | "saved" | "error";

interface MarketReviewPage extends XR1SourcePageLike {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: number;
  content?: string;
  continuity: {
    continuityId?: string | null;
    sourceRefs?: ResearchSourceRef[];
    evidenceStrength?: EvidenceStrength | null;
  };
}

const EMPTY_DRAFT: MarketReviewDraft = {
  asset: "",
  thesis: "",
  setup: "",
  invalidation: "",
  result: "",
  emotionalPosture: "",
  operatorNotes: "",
  whatToRepeat: "",
  whatToAvoid: "",
  nextRule: "",
};

function inputStyle(multiline = false) {
  return {
    minHeight: multiline ? "76px" : "38px",
    borderRadius: "10px",
    border: "1px solid rgba(125, 211, 252, 0.18)",
    background: "rgba(9, 14, 28, 0.42)",
    color: "var(--text)",
    padding: multiline ? "10px" : "0 10px",
    resize: multiline ? ("vertical" as const) : undefined,
    width: "100%",
    fontSize: "12px",
  };
}

export default function MarketReviewCard() {
  const router = useRouter();
  const [draft, setDraft] = useState<MarketReviewDraft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<VaultStatus>("idle");
  const [pages, setPages] = useState<MarketReviewPage[]>([]);
  const [reusedPage, setReusedPage] = useState<MarketReviewPage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPages = async () => {
      try {
        const response = await apiFetch(
          "/api/memory/pages?limit=12&workflowId=market-review",
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          pages?: MarketReviewPage[];
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

  const rankedPages = useMemo(
    () => rankMarketReviewPages(pages, draft.asset),
    [draft.asset, pages],
  );
  const strongestPrior = rankedPages[0] ?? null;
  const newestReview = useMemo(
    () =>
      [...pages].sort((left, right) => right.updatedAt - left.updatedAt)[0] ??
      null,
    [pages],
  );
  const coachSuggestions = useMemo(
    () => buildMarketReviewCoachSuggestions(draft, strongestPrior),
    [draft, strongestPrior],
  );
  const hasCoachSeedGap = useMemo(
    () =>
      [draft.whatToRepeat, draft.whatToAvoid, draft.nextRule].some(
        (value) => value.trim().length === 0,
      ),
    [draft.nextRule, draft.whatToAvoid, draft.whatToRepeat],
  );
  const savedMemoryQuery = useMemo(
    () =>
      [draft.asset, draft.thesis, draft.result, draft.nextRule]
        .filter(Boolean)
        .join(" · "),
    [draft.asset, draft.nextRule, draft.result, draft.thesis],
  );

  const openExactReview = (page: MarketReviewPage | null) => {
    if (!page) return;
    router.push(buildCompiledPageHref(page));
  };

  const reuseStrongestPrior = () => {
    if (!strongestPrior) return;
    setDraft(parseMarketReviewMarkdown(strongestPrior.content ?? ""));
    setReusedPage(strongestPrior);
    setStatus("idle");
  };

  const seedCoachFields = () => {
    setDraft((current) =>
      seedMarketReviewCoachFields(current, coachSuggestions),
    );
    setStatus("idle");
  };

  const saveReview = async () => {
    const hasRequiredInput =
      draft.asset.trim().length > 0 &&
      draft.thesis.trim().length > 0 &&
      draft.setup.trim().length > 0;
    if (!hasRequiredInput) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildMarketReviewTitle(draft),
          summary: buildMarketReviewSummary(draft),
          content: buildMarketReviewMarkdown(draft),
          source: "manual",
          sourceLabel: "Market review",
          sourceType: "vault-artifact",
          evidenceStrength: "contextual",
          sourceRefs: reusedPage ? buildWorkflowSourceRefs(reusedPage) : [],
          workflowId: "market-review",
          workflowLabel: "Market review",
          route: "/alpha",
          layer: "output",
          domain: "markets",
          memoryCompartment: "research",
          requestedVisibility: "internal",
          workflowPackId: "market-review",
          tags: buildMarketReviewTags(draft),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { page?: MarketReviewPage };
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
        <ShellBadge tone="accent">Market review</ShellBadge>
        <ShellBadge tone="muted">Decision support only</ShellBadge>
        <ShellBadge tone="muted">Vault durable</ShellBadge>
      </div>

      <div className="nexus-shell-copy nexus-shell-copy--compact">
        Capture one thesis-led review at a time. Prior setups stay reopenable in
        VAULT so Alpha can support reflection and continuity without drifting
        into autonomous execution.
      </div>

      {strongestPrior || newestReview ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(250, 204, 21, 0.18)",
            background: "rgba(36, 26, 8, 0.46)",
            padding: "10px 12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#fde68a",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Archive continuity
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {strongestPrior ? (
              <button
                type="button"
                onClick={reuseStrongestPrior}
                className="nexus-shell-button"
                style={{
                  minHeight: "32px",
                  padding: "0 12px",
                  fontSize: "11px",
                }}
                title={strongestPrior.summary}
              >
                Reuse strongest prior
              </button>
            ) : null}
            {newestReview ? (
              <button
                type="button"
                onClick={() => openExactReview(newestReview)}
                className="nexus-shell-button"
                style={{
                  minHeight: "32px",
                  padding: "0 12px",
                  fontSize: "11px",
                }}
                title={newestReview.title}
              >
                Newest review
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                router.push("/alpha?view=watchlist&focus=alpha-market-review")
              }
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Reopen in ALPHA
            </button>
          </div>
          {reusedPage ? (
            <div
              style={{ fontSize: "10px", color: "#fde68a", lineHeight: 1.45 }}
            >
              Draft seeded from {reusedPage.title}. Saving this review will keep
              a Vault artifact reference to that prior note.
            </div>
          ) : null}
        </div>
      ) : null}

      {strongestPrior ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(110, 231, 183, 0.18)",
            background: "rgba(8, 26, 22, 0.52)",
            padding: "10px 12px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#a7f3d0",
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {strongestPrior.tags.slice(0, 3).map((tag) => (
              <ShellBadge key={tag} tone="muted">
                {tag.replace(/^asset:/, "").replace(/^emotion:/, "")}
              </ShellBadge>
            ))}
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
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "8px" }}>
        <input
          aria-label="Market review asset"
          type="text"
          value={draft.asset}
          onChange={(event) => {
            setDraft((current) => ({ ...current, asset: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Asset / market"
          style={inputStyle()}
        />
        <textarea
          aria-label="Market review thesis"
          value={draft.thesis}
          onChange={(event) => {
            setDraft((current) => ({ ...current, thesis: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Thesis"
          style={inputStyle(true)}
        />
        <textarea
          aria-label="Market review setup"
          value={draft.setup}
          onChange={(event) => {
            setDraft((current) => ({ ...current, setup: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Setup"
          style={inputStyle(true)}
        />
        <textarea
          aria-label="Market review invalidation"
          value={draft.invalidation}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              invalidation: event.target.value,
            }));
            setStatus("idle");
          }}
          placeholder="Invalidation"
          style={inputStyle(true)}
        />
        <textarea
          aria-label="Market review result"
          value={draft.result}
          onChange={(event) => {
            setDraft((current) => ({ ...current, result: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Result"
          style={inputStyle(true)}
        />
        <input
          aria-label="Market review emotional posture"
          type="text"
          value={draft.emotionalPosture}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              emotionalPosture: event.target.value,
            }));
            setStatus("idle");
          }}
          placeholder="Emotional posture"
          style={inputStyle()}
        />
        <textarea
          aria-label="Market review operator notes"
          value={draft.operatorNotes}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              operatorNotes: event.target.value,
            }));
            setStatus("idle");
          }}
          placeholder="Operator notes"
          style={inputStyle(true)}
        />
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(125, 211, 252, 0.14)",
            background: "rgba(9, 14, 28, 0.48)",
            padding: "10px 12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#bfdbfe",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Postmortem coach
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}
          >
            Capture what to repeat, what to avoid, and the next rule so the next
            thesis reopens a lesson, not only a setup.
          </div>
          {hasCoachSeedGap ? (
            <div
              style={{
                borderRadius: "10px",
                border: "1px solid rgba(250, 204, 21, 0.18)",
                background: "rgba(36, 26, 8, 0.38)",
                padding: "9px 10px",
                display: "grid",
                gap: "6px",
              }}
            >
              <div
                style={{ fontSize: "10px", fontWeight: 700, color: "#fde68a" }}
              >
                Deterministic coach suggestions
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: "var(--text)" }}>Repeat:</strong>{" "}
                {coachSuggestions.whatToRepeat}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: "var(--text)" }}>Avoid:</strong>{" "}
                {coachSuggestions.whatToAvoid}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: "var(--text)" }}>Next rule:</strong>{" "}
                {coachSuggestions.nextRule}
              </div>
              <div>
                <button
                  type="button"
                  onClick={seedCoachFields}
                  className="nexus-shell-button"
                  style={{
                    minHeight: "30px",
                    padding: "0 10px",
                    fontSize: "10px",
                  }}
                >
                  Seed coach fields
                </button>
              </div>
            </div>
          ) : null}
          <textarea
            aria-label="Market review repeat lesson"
            value={draft.whatToRepeat}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                whatToRepeat: event.target.value,
              }));
              setStatus("idle");
            }}
            placeholder="What to repeat"
            style={inputStyle(true)}
          />
          <textarea
            aria-label="Market review avoid lesson"
            value={draft.whatToAvoid}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                whatToAvoid: event.target.value,
              }));
              setStatus("idle");
            }}
            placeholder="What to avoid"
            style={inputStyle(true)}
          />
          <textarea
            aria-label="Market review next rule"
            value={draft.nextRule}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                nextRule: event.target.value,
              }));
              setStatus("idle");
            }}
            placeholder="Next rule"
            style={inputStyle(true)}
          />
        </div>
      </div>

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
                : "File review to Vault"}
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
          routeHint="/vault?focus=vault-compiled-pages&workflowId=market-review"
          extraTargets={[
            {
              href: "/alpha?view=watchlist&focus=alpha-market-review",
              label: "Stay in ALPHA",
              tab: "alpha",
            },
          ]}
          showReturnToHQ
        />
      ) : null}

      {status === "error" ? (
        <div
          style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}
        >
          Asset, thesis, and setup are required before the review can be filed.
        </div>
      ) : null}
    </div>
  );
}
