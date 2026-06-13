"use client";

import dynamic from "next/dynamic";
import { AlphaEarthCard } from "@/components/ops/AlphaEarthCard";
import {
  OpsField,
  OpsRail,
  OpsWorkplane,
  ShellGrid,
  ShellStack,
} from "@/components/ui/shell";

const LazyWorldTopicHeatmap = dynamic(
  () => import("@/components/ops/WorldTopicHeatmap"),
  { ssr: false },
);
const LazyGeoHeatmap = dynamic(() => import("@/components/ops/GeoHeatmap"), {
  ssr: false,
});
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

export type IntelDeferredSegmentId = "world" | "markets" | "sweeps";

interface IntelDeferredSegmentProps {
  segment: IntelDeferredSegmentId;
  workplaneClass: string;
  railClass: string;
}

export default function IntelDeferredSegment({
  segment,
  workplaneClass,
  railClass,
}: IntelDeferredSegmentProps) {
  if (segment === "world") {
    return (
      <div id="intel-world" style={{ scrollMarginTop: "120px" }}>
        <ShellStack>
          <OpsWorkplane className={workplaneClass}>
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

          <OpsRail className={railClass}>
            <ShellStack gap="12px">
              <ShellGrid
                columns="minmax(300px, 0.38fr) minmax(0, 0.62fr)"
                gap="12px"
                align="start"
              >
                <OpsField
                  title="Market rates"
                  detail="Cross-domain rate pressure"
                  tone="muted"
                >
                  <LazyMarketRates />
                </OpsField>
                <OpsField
                  title="Live operations map"
                  detail="Flights, fires, quakes, and theater context"
                >
                  <LazyOpsMap />
                </OpsField>
              </ShellGrid>
              <OpsField
                title="Alpha Earth"
                detail="Specialist world-state evidence"
                tone="muted"
              >
                <AlphaEarthCard />
              </OpsField>
            </ShellStack>
          </OpsRail>
        </ShellStack>
      </div>
    );
  }

  if (segment === "markets") {
    return (
      <div id="intel-markets" style={{ scrollMarginTop: "120px" }}>
        <OpsWorkplane className={workplaneClass}>
          <ShellGrid
            columns="minmax(0, 1.1fr) minmax(320px, 0.9fr)"
            gap="12px"
            align="start"
          >
            <OpsField
              title="Prediction markets"
              detail="What changed in market consensus"
            >
              <LazyPolymarketFeed />
            </OpsField>
            <OpsRail className={railClass}>
              <OpsField
                title="Macro rate context"
                detail="What to monitor next"
                tone="muted"
              >
                <LazyMarketRates />
              </OpsField>
            </OpsRail>
          </ShellGrid>
        </OpsWorkplane>
      </div>
    );
  }

  return (
    <div id="intel-sweeps" style={{ scrollMarginTop: "120px" }}>
      <OpsWorkplane className={workplaneClass}>
        <OpsField
          title="Sweep engine"
          detail="Crucix-style bundle runs plus before-and-after evidence"
        >
          <LazySweepEnginePanel />
        </OpsField>
      </OpsWorkplane>
    </div>
  );
}
