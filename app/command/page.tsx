// ── command/page ────────────────────────────────────────────
// COMMAND tab: mission-control dashboard — KPIs, AI briefing, event radar,
// threat heatmap, world events, business intelligence, job-risk analyser.

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import {
  OpsField,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
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
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { mergeAssistantGuidance } from "@/lib/assistantGuidance";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
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
const LazyProviderHealthStrip = dynamic(
  () => import("@/components/ui/ProviderHealthStrip"),
  { ssr: false },
);
const LazyOperatorReadinessLane = dynamic(
  () => import("@/components/ui/OperatorReadinessLane"),
  { ssr: false },
);
const LazyOperatorStatusCard = dynamic(
  () => import("@/components/home/office/OperatorStatusCard"),
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
    focus === "provider-health"
      ? "command-provider-health"
      : focus === "runtime-efficiency"
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
  const commandLayout = getOpsLayoutDescriptor("command");

  if (
    !systemPostureSpec ||
    !operationalBriefSpec ||
    !programsWorkflowsSpec ||
    !contextMemorySpec
  ) {
    return null;
  }

  const commandGuidance = mergeAssistantGuidance(
    focus === "provider-health"
      ? {
          kind: "continuation" as const,
          tone: "info" as const,
          title: "Provider health in focus",
          detail:
            "The provider-health lane is centered, so local runtime reachability, cloud fallback posture, and operator readiness stay visible before wider dispatch work resumes.",
        }
      : null,
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
        eyebrow="Live operations grid"
        title="Operations grid"
        description="Dispatch, runtime, and pressure on one board."
        actions={
          <>
            <ShellBadge tone="accent">Live readiness</ShellBadge>
            <ShellBadge tone="success">Operator dispatch</ShellBadge>
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
              description="Efficiency posture opens first."
            />
          ) : null}

          {focus === "provider-health" ? (
            <SurfaceFocusStrip
              title="Focused session: provider health"
              description="Provider posture opens first."
            />
          ) : null}

          {focus === "agent-health" ? (
            <SurfaceFocusStrip
              title="Focused session: agent health"
              description="Agent posture opens first."
            />
          ) : null}

          {focus === "memory-spine" ? (
            <SurfaceFocusStrip
              title="Focused session: memory spine"
              description="Memory posture opens first."
            />
          ) : null}

          {commandGuidance.length ? <AssistantGuidanceStack items={commandGuidance} /> : null}

          <OpsStrip className="nexus-surface-route-strip">
            <div className="nexus-surface-route-strip__grid">
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Snapshot</span>
                <strong
                  className="nexus-surface-route-strip__cellValue"
                  data-tone="success"
                >
                  Command
                </strong>
                <span className="nexus-surface-route-strip__cellNote">
                  KPIs and readiness open in the brief chamber.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell" id="command-provider-health">
                <span className="nexus-surface-route-strip__cellLabel">Provider health</span>
                <strong className="nexus-surface-route-strip__cellValue">Switch operator</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Provider chain and local runtime stay one move away.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell" id="command-runtime-efficiency">
                <span className="nexus-surface-route-strip__cellLabel">Runtime pressure</span>
                <strong className="nexus-surface-route-strip__cellValue">Efficiency</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Prompt waste, tool packs, and cache pressure stay staged.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell" id="command-agent-health">
                <span className="nexus-surface-route-strip__cellLabel">Choir posture</span>
                <strong className="nexus-surface-route-strip__cellValue">Agents</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Agent health stays visible without taking the viewport.
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
                  Project stack and memory recall stay pinned in the rail.
                </span>
              </div>
            </div>
          </OpsStrip>

          <div className="nexus-surface-chamber-shell">
            <div className="nexus-surface-chamber-shell__body">
              <OpsWorkplane
                className={`nexus-surface-chamber-shell__lead ${commandLayout.workplaneClass}`}
              >
                <OpsField
                  title={operationalBriefSpec.title}
                  detail={operationalBriefSpec.detail}
                >
                  <div className="nexus-surface-subtabs">
                    <ShellSegmentedTabs
                      items={COMMAND_BRIEF_VIEWS}
                      active={briefView}
                      onChange={setBriefView}
                      minButtonWidth={118}
                    />

                    {briefView === "brief" ? (
                      <ShellStack gap="12px">
                        <OpsField
                          title="Operations snapshot"
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
                        </OpsField>
                        <OpsField
                          title="AI briefing"
                          detail="Cross-domain summary"
                        >
                          <LazyAIBriefing />
                        </OpsField>
                        <OpsField
                          title="Event radar"
                          detail="What just moved"
                          tone="muted"
                        >
                          <LazyEventRadar />
                        </OpsField>
                      </ShellStack>
                    ) : null}

                    {briefView === "pressure" ? (
                      <ShellStack gap="12px">
                        <OpsField
                          title="Threat heatmap"
                          detail="Conflict, cyber, and narrative clustering"
                        >
                          <LazyThreatHeatmap />
                        </OpsField>
                        <OpsField
                          title="World pressure"
                          detail="Where the hottest theater is concentrating"
                          tone="muted"
                        >
                          <LazyWorldEventMap />
                        </OpsField>
                      </ShellStack>
                    ) : null}

                    {briefView === "world" ? (
                      <ShellStack gap="12px">
                        <OpsField
                          title="World event map"
                          detail="Global live theater"
                        >
                          <LazyWorldEventMap />
                        </OpsField>
                        <OpsField
                          title="Event radar"
                          detail="Track the latest route-shaping change"
                          tone="muted"
                        >
                          <LazyEventRadar />
                        </OpsField>
                      </ShellStack>
                    ) : null}
                  </div>
                </OpsField>
              </OpsWorkplane>

              <OpsRail
                className={`nexus-surface-chamber-shell__support ${commandLayout.railClass}`}
              >
                <OpsField
                  title={programsWorkflowsSpec.title}
                  detail={programsWorkflowsSpec.detail}
                >
                  <div className="nexus-surface-subtabs">
                    <ShellSegmentedTabs
                      items={COMMAND_DISPATCH_VIEWS}
                      active={dispatchView}
                      onChange={setDispatchView}
                      minButtonWidth={120}
                    />

                    {dispatchView === "dispatch" ? (
                      <ShellStack gap="12px">
                        <OpsField
                          title="Focus panel"
                          detail="What should move next"
                        >
                          <LazyFocusPanel />
                        </OpsField>
                        <OpsField
                          title="Efficiency ops"
                          detail="Mission queue, cache and batch proof, and the next strongest recurring-mission repair"
                          tone="muted"
                        >
                          <LazyEfficiencyOpsCard />
                        </OpsField>
                      </ShellStack>
                    ) : null}

                    {dispatchView === "programs" ? (
                      <ShellStack gap="12px">
                        <OpsField
                          title="Business builder"
                          detail="Program design"
                        >
                          <LazyBusinessBuilder />
                        </OpsField>
                        <OpsField
                          title="Job risk analyzer"
                          detail="Automation exposure"
                          tone="muted"
                        >
                          <LazyJobRiskAnalyzer />
                        </OpsField>
                      </ShellStack>
                    ) : null}
                  </div>
                </OpsField>

                <OpsField
                  title={contextMemorySpec.title}
                  detail={contextMemorySpec.detail}
                  tone="muted"
                >
                  <ShellStack gap="12px">
                    <TrustOperationsRail
                      title={commandLayout.trustLabel}
                      detail="Protected settings, verification, and dangerous tool posture stays inline with dispatch."
                      compact
                    />
                    <OpsField
                      title="Operator readiness"
                      detail="Security posture, governance coverage, guarded browser ops, native queue strength, and memory lifecycle"
                      compact
                    >
                      <LazyOperatorReadinessLane
                        surfaceId="command"
                        workflowCatalog={HQ_WORKFLOW_CATALOG}
                      />
                    </OpsField>
                    <OpsField
                      id="command-provider-health"
                      title="Provider health"
                      detail="Server-scored chain posture plus true local runtime reachability"
                      compact
                    >
                      <LazyProviderHealthStrip surface="command" />
                    </OpsField>
                    <OpsField
                      title="Operator mode"
                      detail="One-shot switch-operator posture and the latest explicit run"
                      compact
                    >
                      <LazyOperatorStatusCard surface="command" />
                    </OpsField>
                    <OpsField
                      title="Project stack context"
                      detail="Static stack context injected into agent prompts"
                      compact
                    >
                      <LazyProjectStackCard />
                    </OpsField>
                    <OpsField
                      id="command-memory-spine"
                      title="Memory spine"
                      detail="Local-only operator memory with free-first posture"
                      compact
                    >
                      <LazyMemorySpineStatusCard />
                    </OpsField>
                    <OpsField
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
                    </OpsField>
                  </ShellStack>
                </OpsField>
              </OpsRail>
            </div>

            <OpsStrip className={commandLayout.continuityClass}>
              <div className="nexus-surface-continuity-strip">
                <OpsField
                  title="Offline readiness"
                  detail="Internet loss pauses feed churn while local runtime surfaces stay visible"
                  tone="muted"
                  compact
                >
                  <LazyOfflineReadinessCallout surface="command" />
                </OpsField>
                <OpsField
                  title="Network health"
                  detail="Connectivity and route reachability"
                  compact
                >
                  <LazyNetworkHealth />
                </OpsField>
                <OpsField
                  title="Agent health"
                  detail="Internal regression suite metrics"
                  compact
                >
                  <LazyAgentHealthCard />
                </OpsField>
                <OpsField
                  title="Runtime efficiency"
                  detail="Prompt waste, tool-pack posture, and read-cache pressure"
                  compact
                >
                  <LazyRuntimeEfficiencyCard />
                </OpsField>
              </div>
            </OpsStrip>
          </div>
        </ShellStack>
      </ShellPage>
    </>
  );
}
