"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { assimilationDecisionColor } from "@/lib/designTokens";
import {
  buildAssimilationCompareHint,
  buildRepoCompareHandoffHref,
  extractRepoIdsFromBrief,
} from "@/lib/repoAssimilationBridge";
import {
  buildRepoAssimilationQueueItem,
  summarizeRepoAssimilationQueue,
} from "@/lib/repoAssimilationQueue";

interface MemoryPageRow {
  id: string;
  title: string;
  summary: string;
  content?: string;
  updatedAt: number;
}

function decisionColor(decision: string): string {
  return assimilationDecisionColor(decision);
}

export default function RepoAssimilationQueueCard() {
  const [pages, setPages] = useState<MemoryPageRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch(
          "/api/memory/pages?workflowId=repo-assimilation&limit=5",
          { signal: AbortSignal.timeout(12_000) },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { pages?: MemoryPageRow[] };
        setPages(payload.pages ?? []);
      } catch {
        setPages([]);
      }
    })();
  }, []);

  const items = useMemo(
    () =>
      pages
        .map((page) =>
          buildRepoAssimilationQueueItem({
            id: page.id,
            title: page.title,
            brief: page.content ?? page.summary,
            capturedAt: page.updatedAt,
          }),
        )
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [pages],
  );

  const summary = summarizeRepoAssimilationQueue(items);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
          Assimilation queue
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          {summary.headline}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          Run a repo assimilation brief from Repo intel to populate adopt/adapt/reject
          evidence here.
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
                {item.title}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: decisionColor(item.decision),
                  textTransform: "uppercase",
                }}
              >
                {item.decision}
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "4px" }}>
              {item.smallestSlice}
            </div>
            {(() => {
              const repoIds = extractRepoIdsFromBrief(
                pages.find((page) => page.id === item.id)?.content ??
                  pages.find((page) => page.id === item.id)?.summary ??
                  "",
              );
              if (repoIds.length < 2) return null;
              return (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {buildAssimilationCompareHint(repoIds)}
                  </div>
                  <a
                    href={buildRepoCompareHandoffHref(repoIds)}
                    style={{
                      fontSize: "10px",
                      color: "var(--accent)",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Open repo compare handoff →
                  </a>
                </div>
              );
            })()}
          </div>
        ))
      )}
    </div>
  );
}
