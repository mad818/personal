"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";

type PersistApiShape = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (callback: () => void) => () => void;
};

const storePersist = (
  useStore as typeof useStore & {
    persist?: PersistApiShape;
  }
).persist;

export default function MemorySpineSync() {
  const savedArticles = useStore((s) => s.savedArticles);
  const agentRunHistory = useStore((s) => s.agentRunHistory);
  const modeBriefings = useStore((s) => s.modeBriefings);
  const [hydrated, setHydrated] = useState(
    () => storePersist?.hasHydrated?.() ?? true,
  );
  const lastSnapshotKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydrated || !storePersist?.onFinishHydration) return;
    return storePersist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const payload = useMemo(
    () => ({
      savedArticles,
      agentRunHistory,
      modeBriefings,
    }),
    [savedArticles, agentRunHistory, modeBriefings],
  );

  const snapshotKey = useMemo(
    () =>
      [
        `articles:${savedArticles.length}:${savedArticles
          .map(
            (article) =>
              `${article.id}:${article.date}:${article.title.length}:${article.desc.length}:${article.tags?.length ?? 0}`,
          )
          .join("|")}`,
        `runs:${agentRunHistory.length}:${agentRunHistory
          .map((artifact) => `${artifact.runId}:${artifact.finishedAt}`)
          .join("|")}`,
        `briefings:${modeBriefings.length}:${modeBriefings
          .map(
            (briefing) =>
              `${briefing.id}:${briefing.createdAt}:${briefing.status}`,
          )
          .join("|")}`,
      ].join("||"),
    [agentRunHistory, modeBriefings, savedArticles],
  );

  useEffect(() => {
    if (!hydrated) return;

    const hasAnyMemory =
      payload.savedArticles.length > 0 ||
      payload.agentRunHistory.length > 0 ||
      payload.modeBriefings.length > 0;

    if (!hasAnyMemory && lastSnapshotKeyRef.current === null) {
      return;
    }

    if (lastSnapshotKeyRef.current === snapshotKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch("/api/memory/snapshot", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            lastSnapshotKeyRef.current = snapshotKey;
          }
        } catch {
          // silent — this is a best-effort local durability sync
        }
      })();
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [hydrated, payload, snapshotKey]);

  return null;
}
