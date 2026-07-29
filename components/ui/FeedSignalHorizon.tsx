"use client";

import { useMemo } from "react";
import { timeAgo } from "@/lib/helpers";
import {
  summarizeFeedSignals,
  type FeedSignalState,
} from "@/lib/liveFeedReliability";
import { useStore, type FeedStatusKey } from "@/store/useStore";

const FEED_LABELS: Record<FeedStatusKey, string> = {
  prices: "Prices",
  articles: "News",
  cves: "CVEs",
  otx: "OTX",
  threatIntel: "ThreatFox",
  conflict: "Conflict",
  earthquakes: "Earthquakes",
  gdelt: "GDELT",
  defi: "DeFi",
  hackerNews: "Hacker News",
  polymarket: "Prediction markets",
  marketRates: "Market rates",
  fearGreed: "Sentiment",
  cisaKev: "CISA KEV",
  weather: "Weather",
  flights: "Flights",
  secFilings: "SEC",
};

const STATE_LABELS: Record<FeedSignalState, string> = {
  live: "Live",
  retained: "Retained",
  unavailable: "Unavailable",
  awaiting: "Awaiting",
};

const STATE_ORDER: Record<FeedSignalState, number> = {
  unavailable: 0,
  retained: 1,
  live: 2,
  awaiting: 3,
};

function formatAge(timestamp: number | null) {
  if (timestamp == null) return "not yet";
  return timeAgo(new Date(timestamp).toISOString());
}

export default function FeedSignalHorizon() {
  const feedStatus = useStore((state) => state.feedStatus);
  const summary = useMemo(() => summarizeFeedSignals(feedStatus), [feedStatus]);
  const evaluated = summary.items
    .filter((item) => item.status.lastAttemptAt != null)
    .sort(
      (left, right) =>
        STATE_ORDER[left.state] - STATE_ORDER[right.state] ||
        FEED_LABELS[left.key as FeedStatusKey].localeCompare(
          FEED_LABELS[right.key as FeedStatusKey],
        ),
    );
  const posture =
    summary.counts.unavailable > 0
      ? "unavailable"
      : summary.counts.retained > 0
        ? "retained"
        : evaluated.length > 0
          ? "live"
          : "awaiting";
  const summaryCopy =
    evaluated.length === 0
      ? "Awaiting first data sweep"
      : [
          summary.counts.live > 0 ? `${summary.counts.live} live` : null,
          summary.counts.retained > 0
            ? `${summary.counts.retained} retained`
            : null,
          summary.counts.unavailable > 0
            ? `${summary.counts.unavailable} unavailable`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <details
      className="nexus-feed-horizon"
      data-feed-posture={posture}
      data-testid="feed-signal-horizon"
    >
      <summary>
        <span className="nexus-feed-horizon__identity">
          <span className="nexus-feed-horizon__pulse" aria-hidden="true" />
          <span className="nexus-feed-horizon__spark" aria-hidden="true">
            ✦
          </span>
          Signal horizon
          <span className="nexus-feed-horizon__spark" aria-hidden="true">
            ✦
          </span>
        </span>
        <span
          className="nexus-feed-horizon__summary"
          aria-live="polite"
          aria-atomic="true"
        >
          {summaryCopy}
        </span>
        <span className="nexus-feed-horizon__hint">
          Inspect feeds
          <span className="nexus-feed-horizon__chevron" aria-hidden="true">
            ↓
          </span>
        </span>
      </summary>
      <div
        className="nexus-feed-horizon__matrix"
        aria-label="Evaluated feed freshness"
      >
        {evaluated.map((item) => {
          const timestamp =
            item.state === "live"
              ? item.status.lastSuccessAt
              : (item.status.lastFailureAt ?? item.status.lastAttemptAt);
          return (
            <span
              key={item.key}
              className="nexus-feed-horizon__feed"
              data-feed-state={item.state}
              title={item.status.lastError ?? undefined}
            >
              <span className="nexus-feed-horizon__feedLabel">
                {FEED_LABELS[item.key as FeedStatusKey]}
              </span>
              <strong>{STATE_LABELS[item.state]}</strong>
              <span>{formatAge(timestamp)}</span>
            </span>
          );
        })}
        {evaluated.length === 0 ? (
          <span className="nexus-feed-horizon__empty" role="status">
            Feed checks begin when the active workspace requests them.
          </span>
        ) : null}
      </div>
    </details>
  );
}
