"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellBadge } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import {
  buildMarketReviewMarkdown,
  buildMarketReviewSummary,
  buildMarketReviewTags,
  buildMarketReviewTitle,
  rankMarketReviewPages,
  type MarketReviewDraft,
} from "@/lib/xr1Workflows";

type VaultStatus = "idle" | "saving" | "saved" | "error";

interface MarketReviewPage {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: number;
  continuity: {
    continuityId?: string | null;
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

  useEffect(() => {
    let cancelled = false;

    const loadPages = async () => {
      try {
        const response = await apiFetch("/api/memory/pages?limit=12&workflowId=market-review");
        if (!response.ok) return;
        const payload = (await response.json()) as { pages?: MarketReviewPage[] };
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
  const savedMemoryQuery = useMemo(
    () => [draft.asset, draft.thesis, draft.result].filter(Boolean).join(" · "),
    [draft.asset, draft.result, draft.thesis],
  );

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
        Capture one thesis-led review at a time. Prior setups stay reopenable in VAULT so Alpha can support
        reflection and continuity without drifting into autonomous execution.
      </div>

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
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#a7f3d0", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Strongest prior review
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
            {strongestPrior.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
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
              onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=market-review")}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Open market review archive
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "8px" }}>
        <input
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
          value={draft.thesis}
          onChange={(event) => {
            setDraft((current) => ({ ...current, thesis: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Thesis"
          style={inputStyle(true)}
        />
        <textarea
          value={draft.setup}
          onChange={(event) => {
            setDraft((current) => ({ ...current, setup: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Setup"
          style={inputStyle(true)}
        />
        <textarea
          value={draft.invalidation}
          onChange={(event) => {
            setDraft((current) => ({ ...current, invalidation: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Invalidation"
          style={inputStyle(true)}
        />
        <textarea
          value={draft.result}
          onChange={(event) => {
            setDraft((current) => ({ ...current, result: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Result"
          style={inputStyle(true)}
        />
        <input
          type="text"
          value={draft.emotionalPosture}
          onChange={(event) => {
            setDraft((current) => ({ ...current, emotionalPosture: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Emotional posture"
          style={inputStyle()}
        />
        <textarea
          value={draft.operatorNotes}
          onChange={(event) => {
            setDraft((current) => ({ ...current, operatorNotes: event.target.value }));
            setStatus("idle");
          }}
          placeholder="Operator notes"
          style={inputStyle(true)}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
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
        <div style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}>
          Asset, thesis, and setup are required before the review can be filed.
        </div>
      ) : null}
    </div>
  );
}
