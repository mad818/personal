// ── intel/page ──────────────────────────────────────────────
// INTEL tab: narrative monitoring, geopolitical posture, prediction markets.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import { ArticlesLoader } from "@/components/ui/DataLoader";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import SurfaceModuleSection from "@/components/ui/SurfaceModuleSection";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
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
      eyebrow="Signal interference field"
      title="SPECTRA"
      description="Narrative monitoring, geopolitical posture, and prediction markets with one coherent Aegis Vector signal lens."
      actions={
        <>
          <ShellBadge tone="accent">Narrative aware</ShellBadge>
          <ShellBadge tone="muted">Deep-linkable state</ShellBadge>
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
            description="You landed on INTEL with the news lane in focus so topic clustering and conflict-source posture are visible before broader world or market context."
          />
        ) : null}

        {focus === "intel-world" ? (
          <SurfaceFocusStrip
            title="Focused session: world posture"
            description="You landed on INTEL with the geopolitical lane in focus so global posture, conflict impact, and operations overlays lead the session."
          />
        ) : null}

        {focus === "intel-markets" ? (
          <SurfaceFocusStrip
            title="Focused session: prediction markets"
            description="You landed on INTEL with prediction markets in focus so odds, consensus shifts, and macro rate context are visible immediately."
          />
        ) : null}

        {focus === "intel-sweeps" ? (
          <SurfaceFocusStrip
            title="Focused session: sweep engine"
            description="You landed on INTEL with sweep execution in focus so evidence-oriented bundle runs start at the right panel instead of the top of the route."
          />
        ) : null}

        <ShellSegmentedTabs items={SEGMENTS} active={seg} onChange={handleSegmentChange} />

        {intelGuidance.length ? <AssistantGuidanceStack items={intelGuidance} /> : null}

        {seg === "news" && (
          <div id="intel-news" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={newsBriefSpec} tone="hero">
              <ShellGrid columns="minmax(0, 1.05fr) minmax(320px, 0.95fr)" align="start" gap="12px">
                <SurfaceModuleSection title="Topic heatmap" detail="What changed across the narrative field">
                  <LazyTopicHeatmap />
                </SurfaceModuleSection>
                <SurfaceModuleSection title="Conflict feed" detail="Why it matters in live reporting" tone="muted">
                  <LazyConflictFeed />
                </SurfaceModuleSection>
              </ShellGrid>
            </SurfaceModuleCard>
          </div>
        )}

        {seg === "world" && (
          <div id="intel-world" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <SurfaceModuleCard spec={theaterPostureSpec} tone="hero">
                <ShellStack gap="12px">
                  <SurfaceModuleSection
                    title="World risk map"
                    detail="Why it matters across global posture and concentration"
                  >
                    <LazyWorldTopicHeatmap />
                  </SurfaceModuleSection>
                  <SurfaceModuleSection
                    title="Conflict impact assessment"
                    detail="What to monitor as posture shifts"
                    tone="muted"
                  >
                    <LazyGeoHeatmap />
                  </SurfaceModuleSection>
                </ShellStack>
              </SurfaceModuleCard>

              <SurfaceModuleCard spec={crossDomainImpactSpec}>
                <ShellStack gap="12px">
                  <ShellGrid columns="minmax(300px, 0.38fr) minmax(0, 0.62fr)" gap="12px" align="start">
                    <SurfaceModuleSection title="Market rates" detail="Cross-domain rate pressure" tone="muted">
                      <LazyMarketRates />
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      title="Live operations map"
                      detail="Flights, fires, quakes, and theater context"
                    >
                      <LazyOpsMap />
                    </SurfaceModuleSection>
                  </ShellGrid>
                  <SurfaceModuleSection title="Alpha Earth" detail="Specialist world-state evidence" tone="muted">
                    <AlphaEarthCard />
                  </SurfaceModuleSection>
                </ShellStack>
              </SurfaceModuleCard>
            </ShellStack>
          </div>
        )}

        {seg === "markets" && (
          <div id="intel-markets" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={forecastPostureSpec} tone="hero">
              <ShellGrid columns="minmax(0, 1.1fr) minmax(320px, 0.9fr)" gap="12px" align="start">
                <SurfaceModuleSection title="Prediction markets" detail="What changed in market consensus">
                  <LazyPolymarketFeed />
                </SurfaceModuleSection>
                <SurfaceModuleSection title="Macro rate context" detail="What to monitor next" tone="muted">
                  <LazyMarketRates />
                </SurfaceModuleSection>
              </ShellGrid>
            </SurfaceModuleCard>
          </div>
        )}

        {seg === "sweeps" && (
          <div id="intel-sweeps" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={sweepWorkbenchSpec} tone="hero">
              <SurfaceModuleSection
                title="Sweep engine"
                detail="Crucix-style bundle runs plus before-and-after evidence"
              >
                <LazySweepEnginePanel />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
