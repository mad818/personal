// ── components/home/HomeAmbient ────────────────────────────
// Compact intelligence ribbon for HQ and home surfaces.

"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { resolveSurfaceSignalMotionSpec } from "@/lib/surfaceMotion";
import { useStore } from "@/store/useStore";
import { fmtPrice } from "@/lib/helpers";

type AmbientPill = {
  id: string;
  label: string;
  value: string;
  sub?: string;
  chg?: number;
};

export default function HomeAmbient() {
  const prices = useStore((state) => state.prices);
  const signals = useStore((state) => state.signals);
  const articles = useStore((state) => state.articles);

  const btc = prices["bitcoin"];
  const eth = prices["ethereum"];
  const fg = signals?.fg;

  const pills = useMemo<AmbientPill[]>(() => {
    const next: AmbientPill[] = [];

    if (btc) {
      next.push({
        id: "btc",
        label: "BTC",
        value: fmtPrice(btc.price),
        chg: btc.chg,
      });
    }

    if (eth) {
      next.push({
        id: "eth",
        label: "ETH",
        value: fmtPrice(eth.price),
        chg: eth.chg,
      });
    }

    if (fg?.value != null) {
      next.push({
        id: "fg",
        label: "F&G",
        value: String(fg.value),
        sub: fg.label,
        chg: fg.value >= 60 ? 1 : fg.value <= 35 ? -1 : 0,
      });
    }

    return next;
  }, [btc, eth, fg]);

  const headline = articles[0]?.title ?? "";
  const [livePulseIds, setLivePulseIds] = useState<string[]>([]);
  const [headlineLive, setHeadlineLive] = useState(false);
  const previousValuesRef = useRef<Record<string, string>>({});
  const previousHeadlineRef = useRef("");
  const signalSpec = resolveSurfaceSignalMotionSpec("hq");

  useEffect(() => {
    const nextValues = Object.fromEntries(
      pills.map((pill) => [
        pill.id,
        `${pill.value}|${pill.sub ?? ""}|${pill.chg ?? 0}`,
      ]),
    );
    const changed = pills
      .filter((pill) => {
        const previous = previousValuesRef.current[pill.id];
        return previous && previous !== nextValues[pill.id];
      })
      .map((pill) => pill.id);

    previousValuesRef.current = nextValues;

    if (changed.length === 0) return;
    setLivePulseIds(changed);
    const timeout = window.setTimeout(() => setLivePulseIds([]), 1400);
    return () => window.clearTimeout(timeout);
  }, [pills]);

  useEffect(() => {
    if (!headline) {
      previousHeadlineRef.current = "";
      return;
    }
    if (
      previousHeadlineRef.current &&
      previousHeadlineRef.current !== headline
    ) {
      setHeadlineLive(true);
      const timeout = window.setTimeout(
        () => setHeadlineLive(false),
        signalSpec.ribbonPulseMs,
      );
      previousHeadlineRef.current = headline;
      return () => window.clearTimeout(timeout);
    }
    previousHeadlineRef.current = headline;
  }, [headline, signalSpec.ribbonPulseMs]);

  if (pills.length === 0 && !headline) return null;

  return (
    <div
      className="nexus-home-ribbon"
      aria-label="Live intelligence ribbon"
      data-signal-state={livePulseIds.length > 0 || headlineLive ? "live" : "steady"}
      style={
        {
          "--nexus-signal-ribbon-pulse-duration": `${signalSpec.ribbonPulseMs}ms`,
        } as CSSProperties
      }
    >
      <div className="nexus-home-ribbon__track">
        <span className="nexus-home-ribbon__eyebrow">Live context</span>
        <div className="nexus-home-ribbon__pills">
          {pills.map((pill) => (
            <div
              key={pill.id}
              className={[
                "nexus-home-ribbon__pill",
                livePulseIds.includes(pill.id) ? "is-live" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="nexus-home-ribbon__pillLabel">{pill.label}</span>
              <span className="nexus-home-ribbon__pillValue">{pill.value}</span>
              {pill.chg !== undefined ? (
                <span
                  className={[
                    "nexus-home-ribbon__pillDelta",
                    pill.chg > 0
                      ? "is-up"
                      : pill.chg < 0
                        ? "is-down"
                        : "is-flat",
                  ].join(" ")}
                >
                  {pill.chg > 0 ? "▲" : pill.chg < 0 ? "▼" : "—"}
                </span>
              ) : null}
              {pill.sub ? (
                <span className="nexus-home-ribbon__pillSub">{pill.sub}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {headline ? (
        <p
          className={[
            "nexus-home-ribbon__headline",
            headlineLive ? "is-live" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="nexus-home-ribbon__headlineLabel">Newswire</span>
          <span>{headline.slice(0, 110)}{headline.length > 110 ? "…" : ""}</span>
        </p>
      ) : null}
    </div>
  );
}
