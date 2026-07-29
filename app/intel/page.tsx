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
import { formatIntelRegionLabel } from "@/lib/intelRegionFilter";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { useStore } from "@/store/useStore";

const LazyTopicHeatmap = dynamic(
  () => import("@/components/signals/TopicHeatmap"),
  { ssr: false },
);
const LazyConflictFeed = dynamic(
  () => import("@/components/ops/ConflictFeed"),
  { ssr: false },
);
const LazyIntelDeferredSegment = dynamic(
  () => import("@/components/intel/IntelDeferredSegment"),
  { ssr: false },
);
const LazyLiveEventFusionStrip = dynamic(
  () => import("@/components/intel/LiveEventFusionStrip"),
  { ssr: false },
);
const LazyPapersResearchPanel = dynamic(
  () => import("@/components/intel/PapersResearchPanel"),
  { ssr: false },
);
const LazyForecastLabReadinessPanel = dynamic(
  () => import("@/components/intel/ForecastLabReadinessPanel"),
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
    return (["news", "world", "markets", "sweeps"] as Segment[]).includes(
      v as Segment,
    )
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

  const regionFilter = useMemo(() => {
    const raw = normalizedParams.get("region")?.trim();
    return raw ? raw : null;
  }, [normalizedParams]);

  useEffect(() => {
    const nextSeg = focusSeg ?? urlSeg ?? (regionFilter ? "world" : null);
    if (!nextSeg) return;
    setSeg(nextSeg);
  }, [focusSeg, regionFilter, setSeg, urlSeg]);

  const clearRegionFilter = () => {
    const params = new URLSearchParams(normalizedParams.toString());
    params.delete("region");
    router.replace(`/intel?${params.toString()}`);
  };

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
  const crossDomainImpactSpec = getSurfaceModuleSpec(
    "intel",
    "cross-domain-impact",
  );
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
      width="wide"
      surface="intel"
      eyebrow="World picture"
      title="World picture"
      description="Signals and sweeps."
      actions={
        <>
          <ShellBadge tone="accent">Signals</ShellBadge>
          <ShellBadge tone="muted">Sweeps</ShellBadge>
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

        {regionFilter ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(96, 165, 250, 0.2)",
              background: "rgba(8, 18, 31, 0.5)",
              fontSize: "11px",
              color: "var(--text2)",
            }}
          >
            <span>
              Theater filter:{" "}
              <strong style={{ color: "var(--text)" }}>
                {formatIntelRegionLabel(regionFilter)}
              </strong>
            </span>
            <button
              type="button"
              onClick={clearRegionFilter}
              style={{
                marginLeft: "auto",
                height: "24px",
                padding: "0 10px",
                borderRadius: "6px",
                fontSize: "10.5px",
                fontWeight: 700,
                border: "1px solid var(--border2)",
                background: "transparent",
                color: "var(--text2)",
                cursor: "pointer",
              }}
            >
              Show all theaters
            </button>
          </div>
        ) : null}

        <ShellSegmentedTabs
          items={SEGMENTS}
          active={seg}
          onChange={handleSegmentChange}
        />

        {intelGuidance.length ? (
          <AssistantGuidanceStack items={intelGuidance} />
        ) : null}

        {seg === "news" && (
          <div id="intel-news" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={intelLayout.workplaneClass}>
              <ShellGrid recipe="primary-secondary" align="start" gap="16px">
                <OpsField
                  title="Topic heatmap"
                  detail="What changed across the narrative field"
                >
                  <LazyTopicHeatmap />
                </OpsField>
                <OpsRail className={intelLayout.railClass}>
                  <OpsField
                    title="Conflict feed"
                    detail="Why it matters in live reporting"
                    tone="muted"
                  >
                    <LazyConflictFeed regionFilter={regionFilter} />
                  </OpsField>
                </OpsRail>
              </ShellGrid>
              <details className="nexus-surface-disclosure">
                <summary>Open research sources</summary>
                <div className="nexus-surface-disclosure__body">
                  <ShellGrid
                    recipe="primary-secondary"
                    align="start"
                    gap="16px"
                  >
                    <OpsField
                      title="Daily papers"
                      detail="Bounded HuggingFace research discovery"
                    >
                      <LazyPapersResearchPanel />
                    </OpsField>
                    <OpsField
                      title="Forecast lab readiness"
                      detail="Optional research and forecasting lanes"
                      tone="muted"
                    >
                      <LazyForecastLabReadinessPanel />
                    </OpsField>
                  </ShellGrid>
                </div>
              </details>
            </OpsWorkplane>
          </div>
        )}

        {(seg === "news" || seg === "world") && <LazyLiveEventFusionStrip />}

        {seg !== "news" ? (
          <LazyIntelDeferredSegment
            segment={seg}
            workplaneClass={intelLayout.workplaneClass}
            railClass={intelLayout.railClass}
            regionFilter={regionFilter}
          />
        ) : null}
      </ShellStack>
    </ShellPage>
  );
}
