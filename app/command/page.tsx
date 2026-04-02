// ── command/page ────────────────────────────────────────────
// COMMAND tab: mission-control dashboard — KPIs, AI briefing, event radar,
// threat heatmap, world events, business intelligence, job-risk analyser.

"use client";

import dynamic from "next/dynamic";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";
import {
  PricesLoader,
  FearGreedLoader,
  CVEsLoader,
  WorldRiskLoader,
} from "@/components/ui/DataLoader";

const LazyKPICards = dynamic(() => import("@/components/command/KPICards"), {
  ssr: false,
});
const LazyAIBriefing = dynamic(
  () => import("@/components/command/AIBriefing"),
  { ssr: false },
);
const LazyEventRadar = dynamic(
  () => import("@/components/command/EventRadar"),
  { ssr: false },
);
const LazyThreatHeatmap = dynamic(
  () => import("@/components/command/ThreatHeatmap"),
  { ssr: false },
);
const LazyWorldEventMap = dynamic(
  () => import("@/components/command/WorldEventMap"),
  { ssr: false },
);
const LazySystemStatusRing = dynamic(
  () => import("@/components/command/SystemStatusRing"),
  { ssr: false },
);
const LazyBusinessBuilder = dynamic(
  () => import("@/components/command/BusinessBuilder"),
  { ssr: false },
);
const LazyJobRiskAnalyzer = dynamic(
  () => import("@/components/command/JobRiskAnalyzer"),
  { ssr: false },
);
const LazyFocusPanel = dynamic(
  () => import("@/components/command/FocusPanel"),
  { ssr: false },
);
const LazyNetworkHealth = dynamic(
  () => import("@/components/command/NetworkHealth"),
  { ssr: false },
);

export default function CommandPage() {
  return (
    <>
      <PricesLoader />
      <FearGreedLoader />
      <CVEsLoader />
      <WorldRiskLoader />

      <ShellPage
        width="wide"
        eyebrow="Operational Surface"
        title="COMMAND"
        description="Mission control for live telemetry, AI briefings, world risk, and operator decision support."
        actions={
          <>
            <ShellBadge tone="accent">Live ops</ShellBadge>
            <ShellBadge tone="success">Free-first feeds</ShellBadge>
          </>
        }
      >
        <ShellStack>
          <ShellPanel tone="hero">
            <SectionLabel detail="KPI stack + readiness ring">Command snapshot</SectionLabel>
            <ShellGrid columns="minmax(0, 1.4fr) minmax(280px, 0.6fr)" align="start">
              <LazyKPICards />
              <LazySystemStatusRing />
            </ShellGrid>
          </ShellPanel>

          <ShellGrid columns="minmax(0, 1.05fr) minmax(320px, 0.95fr)">
            <ShellPanel>
              <SectionLabel>AI briefing</SectionLabel>
              <LazyAIBriefing />
            </ShellPanel>
            <ShellPanel>
              <SectionLabel>Event radar</SectionLabel>
              <LazyEventRadar />
            </ShellPanel>
          </ShellGrid>

          <ShellPanel>
            <SectionLabel detail="Conflict, cyber, and narrative clustering">Threat heatmap</SectionLabel>
            <LazyThreatHeatmap />
          </ShellPanel>

          <ShellPanel>
            <SectionLabel detail="Global live theater">World event map</SectionLabel>
            <LazyWorldEventMap />
          </ShellPanel>

          <ShellGrid columns="repeat(2, minmax(0, 1fr))">
            <ShellPanel>
              <SectionLabel>Business builder</SectionLabel>
              <LazyBusinessBuilder />
            </ShellPanel>
            <ShellPanel>
              <SectionLabel>Job risk analyzer</SectionLabel>
              <LazyJobRiskAnalyzer />
            </ShellPanel>
          </ShellGrid>

          <ShellGrid columns="repeat(2, minmax(0, 1fr))">
            <ShellPanel>
              <SectionLabel>Network health</SectionLabel>
              <LazyNetworkHealth />
            </ShellPanel>
            <ShellPanel>
              <SectionLabel>Focus panel</SectionLabel>
              <LazyFocusPanel />
            </ShellPanel>
          </ShellGrid>
        </ShellStack>
      </ShellPage>
    </>
  );
}
