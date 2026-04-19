// ── intel/page ──────────────────────────────────────────────
// INTEL tab: narrative monitoring, geopolitical posture, prediction markets.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import { ArticlesLoader } from "@/components/ui/DataLoader";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  OpsField,
  OpsWorkplane,
  OpsRail,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
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
const LazySweepEnginePanel = dynamic(
  () => import("@/components/intel/SweepEnginePanel"),
  { ssr: false },
);

type Segment = "news" | "world" | "markets" | "sweeps";
const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "news", label: "📰 NEWS" },
  { id: "world", label: "🌍 GEOPOLITICAL" },
  { id: "markets", label: "📊 PREDICTION" },
  { id: "sweeps", label: "🛰 SWEEPS" },
];

export default function IntelPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");

  const seg = useStore((s) => s.intelView) ?? "news";
  const setSeg = useStore((s) => s.setIntelView);

  const urlSeg = useMemo(() => {
    const v = (normalizedParams.get("view") ?? "").toLowerCase();
    return (["news", "world", "markets", "sweeps"] as Segment[]).includes(v as Segment)
      ? (v as Segment)
      : null;
  }, [normalizedParams]);

  const focusSeg = useMemo(() => {
    if (focus === "intel-news") return "news";
    if (focus === "intel-world") return "world";
    if (focus === "intel-markets") return "markets";
    if (focus === "intel-sweeps") return "sweeps";
    return null;
  }, [focus]);

  useEffect(() => {
    const nextSeg = focusSeg ?? urlSeg;
    if (!nextSeg) return;
    setSeg(nextSeg);
  }, [focusSeg, setSeg, urlSeg]);

  const handleSegmentChange = (nextSeg: Segment) => {
    setSeg(nextSeg);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextSeg);
    router.replace(`/intel?${params.toString()}`);
  };

  const focusTargetId =
    focus === "intel-news"
      ? "intel-news"
      : focus === "intel-world"
        ? "intel-world"
        : focus === "intel-markets"
          ? "intel-markets"
          : focus === "intel-sweeps"
            ? "intel-sweeps"
            : null;

  useSurfaceFocusScroll(focusTargetId);

  const newsBriefSpec = getSurfaceModuleSpec("intel", "news-brief");
  const theaterPostureSpec = getSurfaceModuleSpec("intel", "theater-posture");
  const crossDomainImpactSpec = getSurfaceModuleSpec("intel", "cross-domain-impact");
  const forecastPostureSpec = getSurfaceModuleSpec("intel", "forecast-posture");
  const sweepWorkbenchSpec = getSurfaceModuleSpec("intel", "sweep-workbench");
  const intelLayout = getOpsLayoutDescriptor("intel");

  if (
    !newsBriefSpec ||
    !theaterPostureSpec ||
    !crossDomainImpactSpec ||
    !forecastPostureSpec ||
    !sweepWorkbenchSpec
  ) {
    return null;
  }

  const intelGuidance =
    seg === "sweeps"
      ? [
          {
            kind: "continuation" as const,
            tone: "info" as const,
            title: "Sweep workspace active",
            detail:
              "Sweep execution stays primary here, so supporting run posture should stay compact unless it changes the next investigative move.",
          },
        ]
      : [];

  return (
    <ShellPage
      surface="intel"
      eyebrow="World picture"
      title="World picture"
      description="Signals, geopolitics, and sweeps on one briefing plane."
      actions={
        <>
          <ShellBadge tone="accent">Narrative aware</ShellBadge>
          <ShellBadge tone="muted">Sweep-ready continuity</ShellBadge>
        </>
      }
    >
      <ArticlesLoader />

      <ShellStack>
        <MissionHandoffStrip
          surface="intel"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "intel-news" ? (
          <SurfaceFocusStrip
            title="Focused session: narrative monitoring"
            description="News posture opens first."
          />
        ) : null}

        {focus === "intel-world" ? (
          <SurfaceFocusStrip
            title="Focused session: world posture"
            description="World posture opens first."
          />
        ) : null}

        {focus === "intel-markets" ? (
          <SurfaceFocusStrip
            title="Focused session: prediction markets"
            description="Market odds open first."
          />
        ) : null}

        {focus === "intel-sweeps" ? (
          <SurfaceFocusStrip
            title="Focused session: sweep engine"
            description="Sweep execution opens first."
          />
        ) : null}

        <ShellSegmentedTabs items={SEGMENTS} active={seg} onChange={handleSegmentChange} />

        {intelGuidance.length ? <AssistantGuidanceStack items={intelGuidance} /> : null}

        {seg === "news" && (
          <div id="intel-news" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={intelLayout.workplaneClass}>
              <ShellGrid columns="minmax(0, 1.05fr) minmax(320px, 0.95fr)" align="start" gap="12px">
                <OpsField title="Topic heatmap" detail="What changed across the narrative field">
                  <LazyTopicHeatmap />
                </OpsField>
                <OpsRail className={intelLayout.railClass}>
                  <OpsField title="Conflict feed" detail="Why it matters in live reporting" tone="muted">
                  <LazyConflictFeed />
                  </OpsField>
                </OpsRail>
              </ShellGrid>
            </OpsWorkplane>
          </div>
        )}

        {seg === "world" && (
          <div id="intel-world" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <OpsWorkplane className={intelLayout.workplaneClass}>
                <ShellStack gap="12px">
                  <OpsField
                    title="World risk map"
                    detail="Why it matters across global posture and concentration"
                  >
                    <LazyWorldTopicHeatmap />
                  </OpsField>
                  <OpsField
                    title="Conflict impact assessment"
                    detail="What to monitor as posture shifts"
                    tone="muted"
                  >
                    <LazyGeoHeatmap />
                  </OpsField>
                </ShellStack>
              </OpsWorkplane>

              <OpsRail className={intelLayout.railClass}>
                <ShellStack gap="12px">
                  <ShellGrid columns="minmax(300px, 0.38fr) minmax(0, 0.62fr)" gap="12px" align="start">
                    <OpsField title="Market rates" detail="Cross-domain rate pressure" tone="muted">
                      <LazyMarketRates />
                    </OpsField>
                    <OpsField
                      title="Live operations map"
                      detail="Flights, fires, quakes, and theater context"
                    >
                      <LazyOpsMap />
                    </OpsField>
                  </ShellGrid>
                  <OpsField title="Alpha Earth" detail="Specialist world-state evidence" tone="muted">
                    <AlphaEarthCard />
                  </OpsField>
                </ShellStack>
              </OpsRail>
            </ShellStack>
          </div>
        )}

        {seg === "markets" && (
          <div id="intel-markets" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={intelLayout.workplaneClass}>
              <ShellGrid columns="minmax(0, 1.1fr) minmax(320px, 0.9fr)" gap="12px" align="start">
                <OpsField title="Prediction markets" detail="What changed in market consensus">
                  <LazyPolymarketFeed />
                </OpsField>
                <OpsRail className={intelLayout.railClass}>
                  <OpsField title="Macro rate context" detail="What to monitor next" tone="muted">
                  <LazyMarketRates />
                  </OpsField>
                </OpsRail>
              </ShellGrid>
            </OpsWorkplane>
          </div>
        )}

        {seg === "sweeps" && (
          <div id="intel-sweeps" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={intelLayout.workplaneClass}>
              <OpsField
                title="Sweep engine"
                detail="Crucix-style bundle runs plus before-and-after evidence"
              >
                <LazySweepEnginePanel />
              </OpsField>
            </OpsWorkplane>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
