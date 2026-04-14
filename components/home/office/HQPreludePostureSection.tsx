"use client";

import HomeAmbient from "@/components/home/HomeAmbient";
import OfflineReadinessCallout from "@/components/ui/OfflineReadinessCallout";
import { ShellBadge, ShellButton } from "@/components/ui/shell";
import type { AgentId } from "./types";
import { AGENTS } from "./constants";
import HQMissionRailSection from "./HQMissionRailSection";
import HQPreludePostureGrid from "./HQPreludePostureGrid";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  activeProfileLabel: string;
  activeProfileFocusTabs: string[];
  activeAgent: AgentId | null;
  evalGrade: "A" | "B" | "C" | "unknown";
  primaryFrontLabel: string;
  runtimeStatusLabel: string;
  runtimePhaseLabel: string;
  evalStale: boolean;
  primaryFrontNote: string;
  commandTempo: string;
  enabledScheduledJobsCount: number;
  warmedAgentStationsCount: number;
  sessionRecapSummary: string;
  investigateLabel: string;
  investigateNote: string;
  onOpenPrimaryFront: () => void;
  onOpenObserve: () => void;
  onOpenInvestigate: () => void;
  onOpenArchive: () => void;
  onOpenLaunch: () => void;
  onOpenScheduler: () => void;
  onOpenFieldManual: () => void;
}

export default function HQPreludePostureSection({
  eyebrow,
  title,
  description,
  activeProfileLabel,
  activeProfileFocusTabs,
  activeAgent,
  evalGrade,
  primaryFrontLabel,
  runtimeStatusLabel,
  runtimePhaseLabel,
  evalStale,
  primaryFrontNote,
  commandTempo,
  enabledScheduledJobsCount,
  warmedAgentStationsCount,
  sessionRecapSummary,
  investigateLabel,
  investigateNote,
  onOpenPrimaryFront,
  onOpenObserve,
  onOpenInvestigate,
  onOpenArchive,
  onOpenLaunch,
  onOpenScheduler,
  onOpenFieldManual,
}: Props) {
  const activeAgentLabel = activeAgent ? AGENTS[activeAgent].name : null;
  const cards = [
    {
      label: "Operational doctrine",
      value: activeProfileLabel,
      note: `Focus tabs: ${activeProfileFocusTabs.join(" • ").toUpperCase()}`,
    },
    {
      label: "Runtime sanction",
      value: `EVAL ${evalGrade.toUpperCase()}`,
      note: `${runtimeStatusLabel} • ${runtimePhaseLabel}${evalStale ? " • stale posture" : " • live posture"}`,
    },
    {
      label: "Priority theater",
      value: primaryFrontLabel,
      note: primaryFrontNote,
    },
    {
      label: "Command tempo",
      value: commandTempo,
      note: `${enabledScheduledJobsCount} auto orders armed · ${warmedAgentStationsCount} agent stations warmed`,
    },
    {
      label: "Last handoff",
      value: "Recall",
      note: sessionRecapSummary,
    },
  ];

  return (
    <section className="nexus-hq-prelude nexus-motion-enter nexus-motion-enter--hero">
      <div className="nexus-hq-prelude__main">
        <div className="nexus-hq-prelude__proclamation">
          <div className="nexus-hq-prelude__copy">
            <div className="nexus-shell-eyebrow">{eyebrow}</div>
            <h1 className="nexus-hq-prelude__title">{title}</h1>
            <p className="nexus-hq-prelude__description">{description}</p>
          </div>
          <div className="nexus-shell-actions nexus-shell-actions--badges nexus-hq-prelude__badges">
            <ShellBadge tone="success">{activeProfileLabel}</ShellBadge>
            <ShellBadge tone="accent">Strategium live</ShellBadge>
            <ShellBadge
              tone={evalGrade === "A" || evalGrade === "B" ? "success" : "muted"}
            >
              Eval {evalGrade.toUpperCase()}
            </ShellBadge>
            {activeAgentLabel ? (
              <ShellBadge tone="muted">{activeAgentLabel} station</ShellBadge>
            ) : null}
          </div>
          <div className="nexus-hq-prelude__intelRibbon">
            <HomeAmbient />
          </div>
          <HQMissionRailSection
            investigateLabel={investigateLabel}
            investigateNote={investigateNote}
            onObserve={onOpenObserve}
            onInvestigate={onOpenInvestigate}
            onAutomate={onOpenScheduler}
            onArchive={onOpenArchive}
            onLaunch={onOpenLaunch}
          />
          <div className="nexus-hq-prelude__utilityRail">
            <div className="nexus-hq-prelude__utilityCopy">
              <span className="nexus-shell-eyebrow">Utility rail</span>
              <p className="nexus-hq-prelude__utilityNote">
                Keep the primary theater, scheduler, and codex one move away without breaking the proclamation chamber.
              </p>
            </div>
            <div className="nexus-shell-actions nexus-shell-actions--controls nexus-hq-prelude__controls">
              <ShellButton onClick={onOpenPrimaryFront} active>
                Open {primaryFrontLabel}
              </ShellButton>
              <ShellButton onClick={onOpenScheduler}>Auto Orders</ShellButton>
              <ShellButton onClick={onOpenFieldManual}>Field Manual</ShellButton>
            </div>
          </div>
        </div>

        <HQPreludePostureGrid cards={cards} activeAgentLabel={activeAgentLabel} />
      </div>

      <div className="nexus-hq-prelude__continuity nexus-motion-enter nexus-motion-enter--continuity">
        <div className="nexus-hq-prelude__offline">
          <OfflineReadinessCallout surface="hq" />
        </div>
      </div>
    </section>
  );
}
