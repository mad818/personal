"use client";

import { SectionLabel, ShellBadge, ShellButton, ShellSegmentedTabs } from "@/components/ui/shell";
import { AGENTS, OFFICE_OPERATIONAL_PROFILES, type OfficeOperationalMode } from "./constants";
import type { AgentId } from "./types";

type FrontTone = "steady" | "warning" | "critical";
type AgentRowStatus = "active" | "hot" | "ready" | "standby";

export interface StrategiumPrompt {
  label: string;
  prompt: string;
}

export interface StrategiumFront {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: FrontTone;
  tab: string;
  href: string;
}

export interface StrategiumAgentRow {
  id: AgentId;
  status: AgentRowStatus;
  confidence: number;
  lastTask: string;
  lastSeen: string;
}

export interface StrategiumSystemAction {
  id: string;
  label: string;
  note: string;
  href: string;
  status: string;
  tone: FrontTone;
}

export interface StrategiumMissionCodex {
  title: string;
  objective: string;
  urgency: string;
  evidence: string;
  nextAction: string;
  handoff: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
}

export interface StrategiumSessionRecap {
  title: string;
  summary: string;
  note: string;
}

export interface StrategiumShortcut {
  key: string;
  label: string;
  note: string;
}

export interface StrategiumCommandVerb {
  id: string;
  label: string;
  note: string;
  href: string;
  tone: FrontTone;
}

interface Props {
  operationalMode: OfficeOperationalMode;
  activeAgent: AgentId | null;
  evalGrade: "A" | "B" | "C" | "unknown";
  evalStale: boolean;
  runtimeStatus: string;
  runtimePhase: string;
  latestChronicle: string;
  pendingLessonAgent?: string | null;
  pendingLessonSummary?: string | null;
  modeBriefingCount: number;
  postureSummary: string;
  threatLabel: string;
  tempoLabel: string;
  fronts: StrategiumFront[];
  agents: StrategiumAgentRow[];
  systems: StrategiumSystemAction[];
  missionCodex: StrategiumMissionCodex;
  sessionRecap: StrategiumSessionRecap;
  shortcuts: StrategiumShortcut[];
  verbs: StrategiumCommandVerb[];
  prompts: StrategiumPrompt[];
  onSetOperationalMode: (mode: OfficeOperationalMode) => void;
  onPrimePrompt: (prompt: string) => void;
  onOpenTab: (tab: string) => void;
  onOpenMemory: () => void;
  onOpenScheduler: () => void;
}

const MODE_ITEMS: Array<{ id: OfficeOperationalMode; label: string }> = [
  { id: "normal", label: "Focus" },
  { id: "war", label: "War Room" },
  { id: "nightOps", label: "Night Ops" },
];

function frontToneClass(tone: FrontTone) {
  if (tone === "critical") return "is-critical";
  if (tone === "warning") return "is-warning";
  return "is-steady";
}

function agentStatusClass(status: AgentRowStatus) {
  if (status === "active") return "is-active";
  if (status === "hot") return "is-hot";
  if (status === "ready") return "is-ready";
  return "is-standby";
}

function statusCopy(status: AgentRowStatus) {
  if (status === "active") return "Active";
  if (status === "hot") return "Hot";
  if (status === "ready") return "Ready";
  return "Standby";
}

function confidenceLabel(confidence: number) {
  if (!Number.isFinite(confidence) || confidence <= 0) return "Awaiting signal";
  if (confidence >= 85) return "High confidence";
  if (confidence >= 65) return "Guarded confidence";
  if (confidence >= 40) return "Needs operator review";
  return "Low confidence";
}

export function HQStrategiumDeck({
  operationalMode,
  activeAgent,
  evalGrade,
  evalStale,
  runtimeStatus,
  runtimePhase,
  latestChronicle,
  pendingLessonAgent,
  pendingLessonSummary,
  modeBriefingCount,
  postureSummary,
  threatLabel,
  tempoLabel,
  fronts,
  agents,
  systems,
  missionCodex,
  sessionRecap,
  shortcuts,
  verbs,
  prompts,
  onSetOperationalMode,
  onPrimePrompt,
  onOpenTab,
  onOpenMemory,
  onOpenScheduler,
}: Props) {
  const mode = OFFICE_OPERATIONAL_PROFILES[operationalMode];

  return (
    <section className="nexus-hq-strategium" aria-label="Strategium command deck">
      <div className="nexus-hq-strategium__hero">
        <div className="nexus-hq-strategium__eyebrow">Strategium doctrine</div>
        <h2 className="nexus-hq-strategium__title">
          Reinforce HQ into a live command sanctum instead of a loose dashboard.
        </h2>
        <p className="nexus-hq-strategium__description">
          The room now frames signal synthesis, agent dispatch, sanction, and
          return-to-tab routing as one operator ritual. Warhammer influence is
          used for weight and hierarchy, while the actions stay plain and fast.
        </p>
        <div className="nexus-hq-strategium__badges">
          <ShellBadge tone="accent">{mode.label}</ShellBadge>
          <ShellBadge tone="muted">{tempoLabel}</ShellBadge>
          <ShellBadge tone={activeAgent ? "success" : "muted"}>
            {activeAgent ? `${AGENTS[activeAgent].name} executing` : "Choir on standby"}
          </ShellBadge>
          <ShellBadge tone={evalGrade === "A" || evalGrade === "B" ? "success" : "muted"}>
            Runtime {evalGrade.toUpperCase()}
            {evalStale ? " · stale" : ""}
          </ShellBadge>
        </div>
        <div className="nexus-hq-strategium__promptRow">
          {prompts.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              className="nexus-hq-strategium__prompt"
              onClick={() => onPrimePrompt(prompt.prompt)}
            >
              {prompt.label}
            </button>
          ))}
        </div>
        <div className="nexus-hq-strategium__recap">
          <div className="nexus-hq-strategium__recapTitle">{sessionRecap.title}</div>
          <p className="nexus-hq-strategium__recapSummary">{sessionRecap.summary}</p>
          <p className="nexus-hq-strategium__recapNote">{sessionRecap.note}</p>
        </div>
      </div>

      <div className="nexus-hq-strategium__mode">
        <SectionLabel detail="Doctrine shifts layout, scene posture, and operator emphasis">
          Operational Litany
        </SectionLabel>
        <ShellSegmentedTabs
          items={MODE_ITEMS}
          active={operationalMode}
          onChange={onSetOperationalMode}
          minButtonWidth={112}
        />
        <p className="nexus-hq-strategium__modeCopy">
          {postureSummary}
        </p>
        <div className="nexus-hq-strategium__modeActions">
          <ShellButton onClick={() => onOpenTab(missionCodex.primaryActionHref)}>
            {missionCodex.primaryActionLabel}
          </ShellButton>
          <ShellButton onClick={() => onOpenTab("/skills?view=forge")}>
            Dispatch Workflow
          </ShellButton>
          <ShellButton onClick={onOpenMemory}>Open Archive</ShellButton>
          <ShellButton onClick={onOpenScheduler}>Auto Orders</ShellButton>
        </div>
      </div>

      <div className="nexus-hq-strategium__grid">
        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail={threatLabel}>Posture</SectionLabel>
          <div className="nexus-hq-strategium__statGrid">
            <div className="nexus-hq-strategium__stat">
              <span className="nexus-hq-strategium__statLabel">Eval sanction</span>
              <strong className="nexus-hq-strategium__statValue">{evalGrade.toUpperCase()}</strong>
              <span className="nexus-hq-strategium__statNote">
                {evalStale ? "Signals stale" : "Fresh posture"}
              </span>
            </div>
            <div className="nexus-hq-strategium__stat">
              <span className="nexus-hq-strategium__statLabel">Runtime</span>
              <strong className="nexus-hq-strategium__statValue">{runtimeStatus}</strong>
              <span className="nexus-hq-strategium__statNote">{runtimePhase}</span>
            </div>
            <div className="nexus-hq-strategium__stat">
              <span className="nexus-hq-strategium__statLabel">Doctrine</span>
              <strong className="nexus-hq-strategium__statValue">{mode.label}</strong>
              <span className="nexus-hq-strategium__statNote">
                {mode.focusTabs.join(" · ").toUpperCase()}
              </span>
            </div>
            <div className="nexus-hq-strategium__stat">
              <span className="nexus-hq-strategium__statLabel">Command tempo</span>
              <strong className="nexus-hq-strategium__statValue">{tempoLabel}</strong>
              <span className="nexus-hq-strategium__statNote">
                Pressure and room cadence combined
              </span>
            </div>
            <div className="nexus-hq-strategium__stat">
              <span className="nexus-hq-strategium__statLabel">Mode briefings</span>
              <strong className="nexus-hq-strategium__statValue">{modeBriefingCount}</strong>
              <span className="nexus-hq-strategium__statNote">
                Recent strategic summaries
              </span>
            </div>
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Objective, urgency, evidence, and next move">
            Mission codex
          </SectionLabel>
          <div className="nexus-hq-strategium__codex">
            <div className="nexus-hq-strategium__codexTitle">{missionCodex.title}</div>
            <div className="nexus-hq-strategium__codexGrid">
              <div className="nexus-hq-strategium__codexCell">
                <span className="nexus-hq-strategium__codexLabel">Objective</span>
                <span className="nexus-hq-strategium__codexValue">{missionCodex.objective}</span>
              </div>
              <div className="nexus-hq-strategium__codexCell">
                <span className="nexus-hq-strategium__codexLabel">Urgency</span>
                <span className="nexus-hq-strategium__codexValue">{missionCodex.urgency}</span>
              </div>
              <div className="nexus-hq-strategium__codexCell">
                <span className="nexus-hq-strategium__codexLabel">Evidence basis</span>
                <span className="nexus-hq-strategium__codexValue">{missionCodex.evidence}</span>
              </div>
              <div className="nexus-hq-strategium__codexCell">
                <span className="nexus-hq-strategium__codexLabel">Next action</span>
                <span className="nexus-hq-strategium__codexValue">{missionCodex.nextAction}</span>
              </div>
            </div>
            <div className="nexus-hq-strategium__lesson">
              <div className="nexus-hq-strategium__lessonLabel">Handoff</div>
              <p className="nexus-hq-strategium__lessonText">{missionCodex.handoff}</p>
            </div>
            <div className="nexus-hq-strategium__modeActions">
              <ShellButton onClick={() => onOpenTab(missionCodex.primaryActionHref)}>
                {missionCodex.primaryActionLabel}
              </ShellButton>
              <ShellButton onClick={() => onOpenTab(missionCodex.secondaryActionHref)}>
                {missionCodex.secondaryActionLabel}
              </ShellButton>
            </div>
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Click a front to jump with intent">Active fronts</SectionLabel>
          <div className="nexus-hq-strategium__fronts">
            {fronts.map((front) => (
              <button
                key={front.id}
                type="button"
                className={`nexus-hq-strategium__front ${frontToneClass(front.tone)}`}
                onClick={() => onOpenTab(front.href)}
              >
                <div className="nexus-hq-strategium__frontMeta">
                  <span className="nexus-hq-strategium__frontLabel">{front.label}</span>
                  <span className="nexus-hq-strategium__frontValue">{front.value}</span>
                </div>
                <span className="nexus-hq-strategium__frontNote">{front.note}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="The four verbs that should dominate HQ operation">
            Command verbs
          </SectionLabel>
          <div className="nexus-hq-strategium__fronts">
            {verbs.map((verb) => (
              <button
                key={verb.id}
                type="button"
                className={`nexus-hq-strategium__front ${frontToneClass(verb.tone)}`}
                onClick={() => onOpenTab(verb.href)}
              >
                <div className="nexus-hq-strategium__frontMeta">
                  <span className="nexus-hq-strategium__frontLabel">{verb.label}</span>
                  <span className="nexus-hq-strategium__frontValue">Act</span>
                </div>
                <span className="nexus-hq-strategium__frontNote">{verb.note}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Keyboard-first command rituals">
            Operator shortcuts
          </SectionLabel>
          <div className="nexus-hq-strategium__shortcuts">
            {shortcuts.map((shortcut) => (
              <div key={`${shortcut.key}-${shortcut.label}`} className="nexus-hq-strategium__shortcut">
                <span className="nexus-hq-strategium__shortcutKey">{shortcut.key}</span>
                <div className="nexus-hq-strategium__shortcutCopy">
                  <div className="nexus-hq-strategium__shortcutLabel">{shortcut.label}</div>
                  <div className="nexus-hq-strategium__shortcutNote">{shortcut.note}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Agent stations and readiness">Command choir</SectionLabel>
          <div className="nexus-hq-strategium__agents">
            {agents.map((agent) => (
              <div key={agent.id} className="nexus-hq-strategium__agent">
                <div className="nexus-hq-strategium__agentTop">
                  <div>
                    <div className="nexus-hq-strategium__agentName">
                      {AGENTS[agent.id].name}
                    </div>
                    <div className="nexus-hq-strategium__agentRole">
                      {AGENTS[agent.id].role}
                    </div>
                  </div>
                  <span
                    className={`nexus-hq-strategium__agentStatus ${agentStatusClass(agent.status)}`}
                  >
                    {statusCopy(agent.status)}
                  </span>
                </div>
                <div className="nexus-hq-strategium__agentBar">
                  <span
                    className="nexus-hq-strategium__agentBarFill"
                    style={{
                      width: `${Math.max(8, Math.min(100, Math.round(agent.confidence || 0)))}%`,
                      background: AGENTS[agent.id].color,
                    }}
                  />
                </div>
                <div className="nexus-hq-strategium__agentFoot">
                  <span>{confidenceLabel(agent.confidence)}</span>
                  <span>{agent.lastSeen}</span>
                </div>
                <p className="nexus-hq-strategium__agentTask">
                  {agent.lastTask || "No confirmed field action yet."}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Assimilated systems surfaced as command actions">
            Command systems
          </SectionLabel>
          <div className="nexus-hq-strategium__fronts">
            {systems.map((system) => (
              <button
                key={system.id}
                type="button"
                className={`nexus-hq-strategium__front ${frontToneClass(system.tone)}`}
                onClick={() => onOpenTab(system.href)}
              >
                <div className="nexus-hq-strategium__frontMeta">
                  <span className="nexus-hq-strategium__frontLabel">{system.label}</span>
                  <span className="nexus-hq-strategium__frontValue">{system.status}</span>
                </div>
                <span className="nexus-hq-strategium__frontNote">{system.note}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="nexus-hq-strategium__panel">
          <SectionLabel detail="Evidence, lesson queue, and command memory">Sanction rail</SectionLabel>
          <div className="nexus-hq-strategium__chronicle">
            <div className="nexus-hq-strategium__chronicleLabel">Latest chronicle</div>
            <p className="nexus-hq-strategium__chronicleText">{latestChronicle}</p>
          </div>
          <div className="nexus-hq-strategium__lesson">
            <div className="nexus-hq-strategium__lessonLabel">
              {pendingLessonAgent ? `${pendingLessonAgent.toUpperCase()} lesson proposal` : "Doctrine queue"}
            </div>
            <p className="nexus-hq-strategium__lessonText">
              {pendingLessonSummary ?? "No pending lesson sanction. The strategium is clear for the next operation."}
            </p>
          </div>
          <div className="nexus-hq-strategium__modeActions">
            <ShellButton onClick={onOpenMemory}>Review memory</ShellButton>
            <ShellButton onClick={onOpenScheduler}>Open scheduler</ShellButton>
            <ShellButton onClick={() => onOpenTab("resources")}>Field manual</ShellButton>
          </div>
        </article>
      </div>
    </section>
  );
}
