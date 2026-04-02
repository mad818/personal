// ── intel/page ──────────────────────────────────────────────
// INTEL tab: narrative monitoring, geopolitical posture, prediction markets.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArticlesLoader } from "@/components/ui/DataLoader";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useStore } from "@/store/useStore";
import { AlphaEarthCard } from "@/components/ops/AlphaEarthCard";

const LazyTopicHeatmap = dynamic(
  () => import("@/components/signals/TopicHeatmap"),
  { ssr: false },
);
const LazyWorldTopicHeatmap = dynamic(
  () => import("@/components/ops/WorldTopicHeatmap"),
  { ssr: false },
);
const LazyGeoHeatmap = dynamic(() => import("@/components/ops/GeoHeatmap"), {
  ssr: false,
});
const LazyConflictFeed = dynamic(
  () => import("@/components/ops/ConflictFeed"),
  { ssr: false },
);
const LazyMarketRates = dynamic(() => import("@/components/ops/MarketRates"), {
  ssr: false,
});
const LazyPolymarketFeed = dynamic(
  () => import("@/components/intel/PolymarketFeed"),
  { ssr: false },
);
const LazyOpsMap = dynamic(() => import("@/components/ops/OpsMap"), {
  ssr: false,
});

type Segment = "news" | "world" | "markets";
const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "news", label: "📰 NEWS" },
  { id: "world", label: "🌍 GEOPOLITICAL" },
  { id: "markets", label: "📊 PREDICTION" },
];

export default function IntelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const seg = useStore((s) => s.intelView) ?? "news";
  const setSeg = useStore((s) => s.setIntelView);

  const urlSeg = useMemo(() => {
    const v = (searchParams?.get("view") ?? "").toLowerCase();
    return (["news", "world", "markets"] as Segment[]).includes(v as Segment)
      ? (v as Segment)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlSeg) return;
    setSeg(urlSeg);
  }, [urlSeg, setSeg]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === seg) return;
    params.set("view", seg);
    router.replace(`/intel?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg]);

  return (
    <ShellPage
      eyebrow="Signals and strategy"
      title="INTEL"
      description="Narrative monitoring, geopolitical posture, and prediction markets with one consistent command-center lens."
      actions={
        <>
          <ShellBadge tone="accent">Narrative aware</ShellBadge>
          <ShellBadge tone="muted">Shareable view state</ShellBadge>
        </>
      }
    >
      <ArticlesLoader />

      <ShellStack>
        <ShellSegmentedTabs items={SEGMENTS} active={seg} onChange={setSeg} />

        {seg === "news" && (
          <ShellGrid columns="minmax(0, 1.05fr) minmax(320px, 0.95fr)" align="start">
            <ShellPanel>
              <SectionLabel detail="Topic clustering and narrative density">
                Topic heatmap
              </SectionLabel>
              <LazyTopicHeatmap />
            </ShellPanel>
            <ShellPanel>
              <SectionLabel detail="Live source stream">Conflict feed</SectionLabel>
              <LazyConflictFeed />
            </ShellPanel>
          </ShellGrid>
        )}

        {seg === "world" && (
          <ShellStack>
            <ShellPanel>
              <SectionLabel detail="Global posture and concentration">
                World risk map
              </SectionLabel>
              <LazyWorldTopicHeatmap />
            </ShellPanel>

            <ShellGrid columns="minmax(0, 1fr) minmax(320px, 0.95fr)" align="start">
              <ShellPanel>
                <SectionLabel>Conflict impact assessment</SectionLabel>
                <LazyGeoHeatmap />
              </ShellPanel>
              <ShellPanel tone="muted">
                <SectionLabel>Market rates</SectionLabel>
                <LazyMarketRates />
              </ShellPanel>
            </ShellGrid>

            <ShellPanel>
              <SectionLabel detail="Flights, fires, quakes, and theater context">
                Live operations map
              </SectionLabel>
              <LazyOpsMap />
            </ShellPanel>

            <ShellPanel tone="muted">
              <SectionLabel>Alpha Earth</SectionLabel>
              <AlphaEarthCard />
            </ShellPanel>
          </ShellStack>
        )}

        {seg === "markets" && (
          <ShellGrid columns="minmax(0, 1.1fr) minmax(320px, 0.9fr)">
            <ShellPanel>
              <SectionLabel detail="Market consensus and changing odds">
                Prediction markets
              </SectionLabel>
              <LazyPolymarketFeed />
            </ShellPanel>
            <ShellPanel tone="muted">
              <SectionLabel>Macro rate context</SectionLabel>
              <LazyMarketRates />
            </ShellPanel>
          </ShellGrid>
        )}
      </ShellStack>
    </ShellPage>
  );
}
