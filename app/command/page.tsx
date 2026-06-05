// ── command/page ────────────────────────────────────────────
// COMMAND tab: mission-control dashboard — KPIs, AI briefing, event radar,
// threat heatmap, world events, business intelligence, job-risk analyser.

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import {
  OpsField,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellGrid,
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
const LazyFreeLocalReadinessPanel = dynamic(
  () => import("@/components/ui/FreeLocalReadinessPanel"),
  { ssr: false },
);
const LazyProviderHealthStrip = dynamic(
  () => import("@/components/ui/ProviderHealthStrip"),
  { ssr: false },
);
const LazyPrivacyShieldPreviewPanel = dynamic(
  () => import("@/components/command/PrivacyShieldPreviewPanel"),
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
  const [dispatchEfficiencyExpanded, setDispatchEfficiencyExpanded] = useState(
    () => focus === "runtime-efficiency",
  );
  const [programRiskExpanded, setProgramRiskExpanded] = useState(false);
  const [providerExpanded, setProviderExpanded] = useState(
    () => focus === "provider-health",
  );
  const [readinessExpanded, setReadinessExpanded] = useState(
    () => focus === "provider-health",
  );
  const [agentHealthExpanded, setAgentHealthExpanded] = useState(
    () => focus === "agent-health",
  );
  const [projectStackExpanded, setProjectStackExpanded] = useState(false);
  const [runtimeExpanded, setRuntimeExpanded] = useState(
    () => focus === "runtime-efficiency",
  );
  const [memorySpineExpanded, setMemorySpineExpanded] = useState(
    () => focus === "memory-spine",
  );
  const [memoryExpanded, setMemoryExpanded] = useState(
    () => Boolean(initialMemoryAsk.trim()) || focus === "memory-spine",
  );

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

  useEffect(() => {
    if (focus === "provider-health") {
      setProviderExpanded(true);
      setReadinessExpanded(true);
    }
    if (focus === "agent-health") {
      setAgentHealthExpanded(true);
    }
    if (focus === "runtime-efficiency") {
      setDispatchView("dispatch");
      setDispatchEfficiencyExpanded(true);
      setRuntimeExpanded(true);
    }
  }, [focus]);

  useEffect(() => {
    if (focus === "memory-spine" || initialMemoryAsk.trim()) {
      setMemorySpineExpanded(true);
      setMemoryExpanded(true);
    }
  }, [focus, initialMemoryAsk]);

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
        description="Dispatch, runtime, pressure."
        actions={
          <>
            <ShellBadge tone="accent">Live readiness</ShellBadge>
            <ShellBadge tone="success">Operator dispatch</ShellBadge>
          </>
        }
      >
        <ShellStack>
          {mission || from || source ? (
            <MissionHandoffStrip
              surface="command"
              mission={mission}
              from={from}
              source={source}
            />
          ) : null}

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

          <OpsStrip className="nexus-surface-route-strip nexus-command-mission-strip">
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
                  KPIs and readiness in front.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Provider health</span>
                <strong className="nexus-surface-route-strip__cellValue">Switch operator</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Provider chain one move away.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Runtime pressure</span>
                <strong className="nexus-surface-route-strip__cellValue">Efficiency</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Waste and cache pressure staged.
                </span>
              </div>
              <div className="nexus-surface-route-strip__cell">
                <span className="nexus-surface-route-strip__cellLabel">Choir posture</span>
                <strong className="nexus-surface-route-strip__cellValue">Agents</strong>
                <span className="nexus-surface-route-strip__cellNote">
                  Agent posture stays visible.
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
                  Memory and stack stay pinned.
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
                      <ShellGrid
                        columns="repeat(2, minmax(0, 1fr))"
                        gap="12px"
                        className="nexus-command-briefGrid"
                      >
                        <OpsField
                          title="Operations snapshot"
                          detail="KPI stack plus command status ring"
                          className="nexus-command-gridSpan"
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
                      </ShellGrid>
                    ) : null}

                    {briefView === "pressure" ? (
                      <ShellGrid
                        columns="minmax(0, 1.18fr) minmax(280px, 0.82fr)"
                        gap="12px"
                        className="nexus-command-pressureGrid"
                      >
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
                      </ShellGrid>
                    ) : null}

                    {briefView === "world" ? (
                      <ShellGrid
                        columns="minmax(280px, 0.82fr) minmax(0, 1.18fr)"
                        gap="12px"
                        className="nexus-command-worldGrid"
                      >
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
                      </ShellGrid>
                    ) : null}
                  </div>
                </OpsField>
              </OpsWorkplane>

              <OpsRail
                className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${commandLayout.railClass}`}
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
                      <OpsField
                        title="Action brief"
                        detail="What should move next"
                      >
                        <ShellStack gap="10px">
                          <LazyFocusPanel />
                          <details
                            className="nexus-surface-disclosure"
                            open={dispatchEfficiencyExpanded}
                            onToggle={(event) =>
                              setDispatchEfficiencyExpanded(
                                event.currentTarget.open,
                              )
                            }
                          >
                            <summary>Open efficiency ops</summary>
                            <div className="nexus-surface-disclosure__body">
                              <LazyEfficiencyOpsCard />
                            </div>
                          </details>
                        </ShellStack>
                      </OpsField>
                    ) : null}

                    {dispatchView === "programs" ? (
                      <OpsField
                        title="Business builder"
                        detail="Program design"
                      >
                        <ShellStack gap="10px">
                          <LazyBusinessBuilder />
                          <details
                            className="nexus-surface-disclosure"
                            open={programRiskExpanded}
                            onToggle={(event) =>
                              setProgramRiskExpanded(event.currentTarget.open)
                            }
                          >
                            <summary>Open risk scan</summary>
                            <div className="nexus-surface-disclosure__body">
                              <LazyJobRiskAnalyzer />
                            </div>
                          </details>
                        </ShellStack>
                      </OpsField>
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
                    <ShellGrid
                      columns="repeat(2, minmax(0, 1fr))"
                      gap="12px"
                      className="nexus-command-supportGrid"
                    >
                      <OpsField
                        title="Operator readiness"
                        detail="Security posture, governance coverage, guarded browser ops, native queue strength, and memory lifecycle"
                        compact
                        className="nexus-command-gridSpan"
                      >
                        <div className="nexus-command-rail-preview" aria-label="Operator readiness preview">
                          <span>
                            <strong>Guarded</strong>
                            <em>Policies inline</em>
                          </span>
                          <span>
                            <strong>Native</strong>
                            <em>Queue visible</em>
                          </span>
                        </div>
                        <details
                          className="nexus-surface-disclosure"
                          open={readinessExpanded}
                          onToggle={(event) =>
                            setReadinessExpanded(event.currentTarget.open)
                          }
                        >
                          <summary>Open readiness detail</summary>
                          <div className="nexus-surface-disclosure__body">
                            <LazyOperatorReadinessLane
                              surfaceId="command"
                              workflowCatalog={HQ_WORKFLOW_CATALOG}
                            />
                          </div>
                        </details>
                      </OpsField>
                      <OpsField
                        id="command-provider-health"
                        title="Provider health"
                        detail="Server-scored chain posture plus true local runtime reachability"
                        compact
                      >
                        <div className="nexus-command-rail-preview" aria-label="Provider health preview">
                          <span>
                            <strong>Chain</strong>
                            <em>Server scored</em>
                          </span>
                          <span>
                            <strong>Local</strong>
                            <em>Runtime reach</em>
                          </span>
                        </div>
                        <details
                          className="nexus-surface-disclosure"
                          open={providerExpanded}
                          onToggle={(event) =>
                            setProviderExpanded(event.currentTarget.open)
                          }
                        >
                          <summary>Open provider chain</summary>
                          <div className="nexus-surface-disclosure__body">
                            <LazyProviderHealthStrip surface="command" />
                            <div id="command-privacy-shield-preview">
                              <LazyPrivacyShieldPreviewPanel />
                            </div>
                          </div>
                        </details>
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
                        <div className="nexus-command-rail-preview" aria-label="Project stack preview">
                          <span>
                            <strong>Stack</strong>
                            <em>Prompt ready</em>
                          </span>
                          <span>
                            <strong>Scope</strong>
                            <em>Local first</em>
                          </span>
                        </div>
                        <details
                          className="nexus-surface-disclosure"
                          open={projectStackExpanded}
                          onToggle={(event) =>
                            setProjectStackExpanded(event.currentTarget.open)
                          }
                        >
                          <summary>Open stack context</summary>
                          <div className="nexus-surface-disclosure__body">
                            <LazyProjectStackCard />
                          </div>
                        </details>
                      </OpsField>
                      <OpsField
                        id="command-memory-spine"
                        title="Memory spine"
                        detail="Local-only operator memory with free-first posture"
                        compact
                      >
                        <div className="nexus-command-rail-preview" aria-label="Memory spine preview">
                          <span>
                            <strong>Local</strong>
                            <em>Operator memory</em>
                          </span>
                          <span>
                            <strong>Recall</strong>
                            <em>Citation first</em>
                          </span>
                        </div>
                        <details
                          className="nexus-surface-disclosure"
                          open={memorySpineExpanded}
                          onToggle={(event) =>
                            setMemorySpineExpanded(event.currentTarget.open)
                          }
                        >
                          <summary>Open memory spine</summary>
                          <div className="nexus-surface-disclosure__body">
                            <LazyMemorySpineStatusCard />
                          </div>
                        </details>
                      </OpsField>
                      <OpsField
                        title="Ask memory"
                        detail="Native citation-first recall inside the mission lane"
                        tone="muted"
                        compact
                        className="nexus-command-gridSpan"
                      >
                        <div className="nexus-command-rail-preview nexus-command-rail-preview--wide" aria-label="Memory ask preview">
                          <span>
                            <strong>Ask</strong>
                            <em>Native recall</em>
                          </span>
                          <span>
                            <strong>Compare</strong>
                            <em>Prior work</em>
                          </span>
                          <span>
                            <strong>Evidence</strong>
                            <em>Citations kept</em>
                          </span>
                        </div>
                        <details
                          className="nexus-surface-disclosure"
                          open={memoryExpanded}
                          onToggle={(event) =>
                            setMemoryExpanded(event.currentTarget.open)
                          }
                        >
                          <summary>Open memory ask</summary>
                          <div className="nexus-surface-disclosure__body">
                            <LazyMemoryAskPanel
                              surface="command"
                              initialQuery={initialMemoryAsk}
                              initialCompare={initialMemoryCompare}
                              autoRunOnInitialQuery={Boolean(initialMemoryAsk.trim())}
                            />
                          </div>
                        </details>
                      </OpsField>
                    </ShellGrid>
                  </ShellStack>
                </OpsField>
              </OpsRail>
            </div>

            <OpsStrip className={commandLayout.continuityClass}>
              <div className="nexus-surface-continuity-strip">
                <OpsField
                  title="Connectivity posture"
                  detail="Offline fallback, route reachability, and agent readiness on one telemetry lane"
                  tone="muted"
                  compact
                >
                  <ShellStack gap="12px">
                    <LazyFreeLocalReadinessPanel surface="command" />
                    <LazyOfflineReadinessCallout surface="command" />
                    <LazyNetworkHealth />
                    <details
                      id="command-agent-health"
                      className="nexus-surface-disclosure"
                      open={agentHealthExpanded}
                      onToggle={(event) =>
                        setAgentHealthExpanded(event.currentTarget.open)
                      }
                    >
                      <summary>Open agent health</summary>
                      <div className="nexus-surface-disclosure__body">
                        <LazyAgentHealthCard />
                      </div>
                    </details>
                  </ShellStack>
                </OpsField>
                <OpsField
                  id="command-runtime-efficiency"
                  title="Runtime efficiency"
                  detail="Waste, tool-pack posture, and cache pressure without another tall continuity desk"
                  compact
                >
                  <div className="nexus-command-rail-preview nexus-command-rail-preview--wide" aria-label="Runtime efficiency preview">
                    <span>
                      <strong>Waste</strong>
                      <em>Prompt pressure</em>
                    </span>
                    <span>
                      <strong>Tools</strong>
                      <em>Pack posture</em>
                    </span>
                    <span>
                      <strong>Cache</strong>
                      <em>Reuse signal</em>
                    </span>
                  </div>
                  <details
                    className="nexus-surface-disclosure"
                    open={runtimeExpanded}
                    onToggle={(event) =>
                      setRuntimeExpanded(event.currentTarget.open)
                    }
                  >
                    <summary>Open runtime efficiency</summary>
                    <div className="nexus-surface-disclosure__body">
                      <LazyRuntimeEfficiencyCard
                        initialExpanded={focus === "runtime-efficiency"}
                      />
                    </div>
                  </details>
                </OpsField>
              </div>
            </OpsStrip>
          </div>
        </ShellStack>
      </ShellPage>
    </>
  );
}
