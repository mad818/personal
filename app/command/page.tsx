// ── command/page ────────────────────────────────────────────
// COMMAND tab: mission-control dashboard — KPIs, AI briefing, event radar,
// threat heatmap, world events, business intelligence, job-risk analyser.

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import {
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import {
  ArticlesLoader,
  PricesLoader,
  FearGreedLoader,
  CVEsLoader,
  WorldRiskLoader,
} from "@/components/ui/DataLoader";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import SurfaceModuleSection from "@/components/ui/SurfaceModuleSection";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { mergeAssistantGuidance } from "@/lib/assistantGuidance";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";

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
const LazyProjectStackCard = dynamic(
  () => import("@/components/command/ProjectStackCard").then((m) => ({ default: m.ProjectStackCard })),
  { ssr: false },
);
const LazyAgentHealthCard = dynamic(
  () => import("@/components/command/AgentHealthCard").then((m) => ({ default: m.AgentHealthCard })),
  { ssr: false },
);
const LazyRuntimeEfficiencyCard = dynamic(
  () => import("@/components/command/RuntimeEfficiencyCard"),
  { ssr: false },
);
const LazyEfficiencyOpsCard = dynamic(
  () => import("@/components/command/EfficiencyOpsCard"),
  { ssr: false },
);
const LazyMemorySpineStatusCard = dynamic(
  () => import("@/components/command/MemorySpineStatusCard"),
  { ssr: false },
);
const LazyMemoryAskPanel = dynamic(
  () => import("@/components/vault/MemoryAskPanel"),
  { ssr: false },
);
const LazyOfflineReadinessCallout = dynamic(
  () => import("@/components/ui/OfflineReadinessCallout"),
  { ssr: false },
);
const LazyOperatorReadinessLane = dynamic(
  () => import("@/components/ui/OperatorReadinessLane"),
  { ssr: false },
);

type CommandBriefView = "brief" | "pressure" | "world";
type CommandDispatchView = "dispatch" | "programs";

const COMMAND_BRIEF_VIEWS: Array<{ id: CommandBriefView; label: string }> = [
  { id: "brief", label: "Brief" },
  { id: "pressure", label: "Pressure" },
  { id: "world", label: "World" },
];

const COMMAND_DISPATCH_VIEWS: Array<{ id: CommandDispatchView; label: string }> =
  [
    { id: "dispatch", label: "Dispatch" },
    { id: "programs", label: "Programs" },
  ];

export default function CommandPage() {
  const { normalizedParams } = useSessionHrefAutoHeal();
  const initialMemoryAsk = normalizedParams.get("memoryAsk") ?? "";
  const initialMemoryCompare = normalizedParams.get("memoryCompare") === "1";
  const mission = normalizedParams.get("mission");
  const from = normalizedParams.get("from");
  const source = normalizedParams.get("source");
  const focus = normalizedParams.get("focus");
  const [briefView, setBriefView] = useState<CommandBriefView>("brief");
  const [dispatchView, setDispatchView] = useState<CommandDispatchView>("dispatch");

  const focusTargetId =
    focus === "runtime-efficiency"
      ? "command-runtime-efficiency"
      : focus === "agent-health"
        ? "command-agent-health"
        : focus === "memory-spine"
          ? "command-memory-spine"
          : null;

  useSurfaceFocusScroll(focusTargetId);

  const systemPostureSpec = getSurfaceModuleSpec("command", "system-posture");
  const operationalBriefSpec = getSurfaceModuleSpec("command", "operational-brief");
  const programsWorkflowsSpec = getSurfaceModuleSpec("command", "programs-workflows");
  const contextMemorySpec = getSurfaceModuleSpec("command", "context-memory");

  if (
    !systemPostureSpec ||
    !operationalBriefSpec ||
    !programsWorkflowsSpec ||
    !contextMemorySpec
  ) {
    return null;
  }

  const commandGuidance = mergeAssistantGuidance(
    focus === "runtime-efficiency"
      ? {
          kind: "continuation" as const,
          tone: "info" as const,
          title: "Runtime review active",
          detail:
            "The runtime-pressure lane is already centered, so verify prompt waste and tool-pack posture before widening into other command modules.",
        }
      : null,
    focus === "agent-health"
      ? {
          kind: "continuation" as const,
          tone: "caution" as const,
          title: "Agent health in focus",
          detail:
            "Keep regressions and verification failures contained here first, then widen back into operational brief or program work.",
        }
      : null,
    focus === "memory-spine"
      ? {
          kind: "continuation" as const,
          tone: "positive" as const,
          title: "Context memory restored",
          detail:
            "The local memory lane is already staged, so citations and prior work can anchor the next decision without leaving COMMAND.",
        }
      : null,
  );

  return (
    <>
      <PricesLoader />
      <ArticlesLoader />
      <FearGreedLoader />
      <CVEsLoader />
      <WorldRiskLoader />

      <ShellPage
        width="wide"
        surface="command"
        eyebrow="Mission lane"
        title="VECTOR"
        description="Mission control for live telemetry, world risk, and operator decision support inside the Aegis Vector command lane."
        actions={
          <>
            <ShellBadge tone="accent">Tactical routing</ShellBadge>
            <ShellBadge tone="success">Free-first feeds</ShellBadge>
          </>
        }
      >
        <ShellStack>
          <MissionHandoffStrip
            surface="command"
            mission={mission}
            from={from}
            source={source}
          />

          {focus === "runtime-efficiency" ? (
            <SurfaceFocusStrip
              title="Focused session: runtime efficiency"
              description="You landed on COMMAND with the runtime-efficiency panel in focus so prompt waste, tool-pack posture, and verification drift are easier to inspect first."
            />
          ) : null}

          {focus === "agent-health" ? (
            <SurfaceFocusStrip
              title="Focused session: agent health"
              description="You landed on COMMAND with the agent-health panel in focus so runtime regressions, verification posture, and failure signals are visible before wider changes."
            />
          ) : null}

          {focus === "memory-spine" ? (
            <SurfaceFocusStrip
              title="Focused session: memory spine"
              description="You landed on COMMAND with the local memory posture panel in focus so citations, sync posture, and native-memory readiness are visible immediately."
            />
          ) : null}

          {commandGuidance.length ? <AssistantGuidanceStack items={commandGuidance} /> : null}

          <SurfaceModuleCard
            spec={systemPostureSpec}
            tone="muted"
            compact
            className="nexus-surface-route-strip"
          >
            <div className="nexus-surface-route-strip__grid">
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Snapshot</span>
                <strong
                  className="nexus-surface-route-strip__cellValue"
                  data-tone="success"
                >
                  Vector
                </strong>
                <span className="nexus-surface-route-strip__cellNote">
                  KPI stack and readiness ring are staged inside the brief chamber.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell" id="command-runtime-efficiency">
                <span className="nexus-surface-route-strip__cellLabel">Runtime pressure</span>
                <strong className="nexus-surface-route-strip__cellValue">Efficiency</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Prompt waste, tool-pack posture, and read-cache pressure stay one move away.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell" id="command-agent-health">
                <span className="nexus-surface-route-strip__cellLabel">Choir posture</span>
                <strong className="nexus-surface-route-strip__cellValue">Agents</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Agent health and verification drift stay visible without taking over the viewport.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Continuity</span>
                <strong
                  className="nexus-surface-route-strip__cellValue"
                  data-tone="critical"
                >
                  Memory
                </strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Project stack, memory spine, and ask-memory recall live in the doctrine rail.
                </span>
              </div>
            </div>
          </SurfaceModuleCard>

          <div className="nexus-surface-chamber-shell">
            <div className="nexus-surface-chamber-shell__body">
              <div className="nexus-surface-chamber-shell__lead">
                <SurfaceModuleCard spec={operationalBriefSpec} tone="hero">
                  <div className="nexus-surface-subtabs">
                    <ShellSegmentedTabs
                      items={COMMAND_BRIEF_VIEWS}
                      active={briefView}
                      onChange={setBriefView}
                      minButtonWidth={118}
                    />

                    {briefView === "brief" ? (
                      <ShellStack gap="12px">
                        <SurfaceModuleSection
                          title="Vector snapshot"
                          detail="KPI stack plus command status ring"
                        >
                          <div className="nexus-surface-chamber-shell__body">
                            <div className="nexus-surface-chamber-shell__lead">
                              <LazyKPICards />
                            </div>
                            <div className="nexus-surface-chamber-shell__support">
                              <LazySystemStatusRing />
                            </div>
                          </div>
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="AI briefing"
                          detail="Cross-domain summary"
                        >
                          <LazyAIBriefing />
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="Event radar"
                          detail="What just moved"
                          tone="muted"
                        >
                          <LazyEventRadar />
                        </SurfaceModuleSection>
                      </ShellStack>
                    ) : null}

                    {briefView === "pressure" ? (
                      <ShellStack gap="12px">
                        <SurfaceModuleSection
                          title="Threat heatmap"
                          detail="Conflict, cyber, and narrative clustering"
                        >
                          <LazyThreatHeatmap />
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="World pressure"
                          detail="Where the hottest theater is concentrating"
                          tone="muted"
                        >
                          <LazyWorldEventMap />
                        </SurfaceModuleSection>
                      </ShellStack>
                    ) : null}

                    {briefView === "world" ? (
                      <ShellStack gap="12px">
                        <SurfaceModuleSection
                          title="World event map"
                          detail="Global live theater"
                        >
                          <LazyWorldEventMap />
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="Event radar"
                          detail="Track the latest route-shaping change"
                          tone="muted"
                        >
                          <LazyEventRadar />
                        </SurfaceModuleSection>
                      </ShellStack>
                    ) : null}
                  </div>
                </SurfaceModuleCard>
              </div>

              <div className="nexus-surface-chamber-shell__support">
                <SurfaceModuleCard spec={programsWorkflowsSpec}>
                  <div className="nexus-surface-subtabs">
                    <ShellSegmentedTabs
                      items={COMMAND_DISPATCH_VIEWS}
                      active={dispatchView}
                      onChange={setDispatchView}
                      minButtonWidth={120}
                    />

                    {dispatchView === "dispatch" ? (
                      <ShellStack gap="12px">
                        <SurfaceModuleSection
                          title="Focus panel"
                          detail="What should move next"
                        >
                          <LazyFocusPanel />
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="Efficiency ops"
                          detail="Mission queue, cache and batch proof, and the next strongest recurring-mission repair"
                          tone="muted"
                        >
                          <LazyEfficiencyOpsCard />
                        </SurfaceModuleSection>
                      </ShellStack>
                    ) : null}

                    {dispatchView === "programs" ? (
                      <ShellStack gap="12px">
                        <SurfaceModuleSection
                          title="Business builder"
                          detail="Program design"
                        >
                          <LazyBusinessBuilder />
                        </SurfaceModuleSection>
                        <SurfaceModuleSection
                          title="Job risk analyzer"
                          detail="Automation exposure"
                          tone="muted"
                        >
                          <LazyJobRiskAnalyzer />
                        </SurfaceModuleSection>
                      </ShellStack>
                    ) : null}
                  </div>
                </SurfaceModuleCard>

                <SurfaceModuleCard spec={contextMemorySpec} tone="muted">
                  <ShellStack gap="12px">
                    <SurfaceModuleSection
                      title="Operator readiness"
                      detail="Security posture, governance coverage, guarded browser ops, native queue strength, and memory lifecycle"
                      compact
                    >
                      <LazyOperatorReadinessLane
                        surfaceId="command"
                        workflowCatalog={HQ_WORKFLOW_CATALOG}
                      />
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      title="Project stack context"
                      detail="Static doctrine injected into agent prompts"
                      compact
                    >
                      <LazyProjectStackCard />
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      id="command-memory-spine"
                      title="Memory spine"
                      detail="Local-only operator memory with free-first posture"
                      compact
                    >
                      <LazyMemorySpineStatusCard />
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      title="Ask memory"
                      detail="Native citation-first recall inside the mission lane"
                      tone="muted"
                      compact
                    >
                      <LazyMemoryAskPanel
                        surface="command"
                        initialQuery={initialMemoryAsk}
                        initialCompare={initialMemoryCompare}
                        autoRunOnInitialQuery={Boolean(initialMemoryAsk.trim())}
                      />
                    </SurfaceModuleSection>
                  </ShellStack>
                </SurfaceModuleCard>
              </div>
            </div>

            <SurfaceModuleCard spec={systemPostureSpec} tone="muted">
              <div className="nexus-surface-continuity-strip">
                <SurfaceModuleSection
                  title="Offline readiness"
                  detail="Internet loss pauses feed churn while local runtime surfaces stay visible"
                  tone="muted"
                  compact
                >
                  <LazyOfflineReadinessCallout surface="command" />
                </SurfaceModuleSection>
                <SurfaceModuleSection
                  title="Network health"
                  detail="Connectivity and route reachability"
                  compact
                >
                  <LazyNetworkHealth />
                </SurfaceModuleSection>
                <SurfaceModuleSection
                  title="Agent health"
                  detail="Internal regression suite metrics"
                  compact
                >
                  <LazyAgentHealthCard />
                </SurfaceModuleSection>
                <SurfaceModuleSection
                  title="Runtime efficiency"
                  detail="Prompt waste, tool-pack posture, and read-cache pressure"
                  compact
                >
                  <LazyRuntimeEfficiencyCard />
                </SurfaceModuleSection>
              </div>
            </SurfaceModuleCard>
          </div>
        </ShellStack>
      </ShellPage>
    </>
  );
}
