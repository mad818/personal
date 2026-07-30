"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FeynmanResearchWatchRecord } from "@/lib/feynmanResearchWatch";

type WatchListResponse = {
  watches: FeynmanResearchWatchRecord[];
};

function formatWatchTime(value: number | null) {
  return value
    ? new Date(value).toLocaleString()
    : "No successful public check yet";
}

function watchStatusLabel(watch: FeynmanResearchWatchRecord) {
  if (watch.lastStatus === "baseline") return "Baseline saved";
  if (watch.lastStatus === "changed") return "Material change";
  if (watch.lastStatus === "unchanged") return "No material change";
  if (watch.lastStatus === "cached") return "Daily cache reused";
  return "Check failed";
}

export default function FeynmanResearchWatchPanel() {
  const [watches, setWatches] = useState<FeynmanResearchWatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feynman/watch", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (WatchListResponse & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(
          payload?.error || `Research watches failed (${response.status}).`,
        );
      }
      setWatches(payload.watches);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Research watches are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWatches();
  }, [loadWatches]);

  return (
    <section
      className="grid gap-3 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surf2)] p-4"
      aria-label="Feynman recurring research watches"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text3)]">
            Daily-cached research watches
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
            Material changes without a chat call
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text2)]">
            Approved `/watch` schedules compare bounded public arXiv IDs and
            update timestamps. They run only while Nexus is open and never call
            ChatGPT, Ollama, or another model.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadWatches()}
            disabled={loading}
            className="rounded-[var(--rs)] border border-[var(--border2)] px-3 py-2 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
          >
            Refresh
          </button>
          <Link
            href="/hq?focus=hq-scheduler-composer"
            className="rounded-[var(--rs)] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
          >
            Stage in HQ
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-[var(--flo)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-[var(--text2)]">Reading local watches…</p>
      ) : watches.length === 0 ? (
        <div className="rounded-[var(--rs)] border border-dashed border-[var(--border2)] p-4">
          <p className="text-sm font-semibold text-[var(--text)]">
            No approved watch has run yet
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Enter `/watch &lt;topic&gt;` in HQ, review the proposed weekday
            schedule, then explicitly add it. The first successful run creates
            the local baseline.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {watches.map((watch) => {
            const latest = watch.history[0];
            return (
              <article
                key={watch.id}
                className="rounded-[var(--rs)] border border-[var(--border2)] bg-[var(--surf3)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">
                      {watch.topic}
                    </h4>
                    <p className="mt-1 text-[10px] text-[var(--text3)]">
                      Checked {formatWatchTime(watch.lastCheckedAt)} · public
                      fetch {formatWatchTime(watch.lastFetchedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border2)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--text2)]">
                    {watchStatusLabel(watch)}
                  </span>
                </div>
                {watch.lastError ? (
                  <p className="mt-2 text-xs text-[var(--flo)]" role="alert">
                    {watch.lastError} The prior baseline was preserved.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--text2)]">
                    {latest?.entryCount ?? watch.current.length} paper(s) ·{" "}
                    {latest?.newCount ?? 0} new · {latest?.updatedCount ?? 0}
                    updated
                  </p>
                )}
                {latest?.changes.length ? (
                  <ul className="mt-2 grid gap-1">
                    {latest.changes.slice(0, 4).map((change) => (
                      <li key={`${change.kind}:${change.entry.id}`}>
                        <a
                          href={change.entry.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          {change.kind === "new" ? "New" : "Updated"}:{" "}
                          {change.entry.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
