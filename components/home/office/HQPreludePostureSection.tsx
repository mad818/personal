"use client";

import Image from "next/image";
import OfflineReadinessCallout from "@/components/ui/OfflineReadinessCallout";
import OperatorStatusCard from "@/components/home/office/OperatorStatusCard";
import ProviderResilienceCallout from "@/components/home/office/ProviderResilienceCallout";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import { OpsField, OpsRail, OpsStrip, ShellButton } from "@/components/ui/shell";
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
  const activeAgentLabel = activeAgent ? AGENTS[activeAgent].name : "JANSKY";
  const cards = [
    {
      label: "Mode",
      value: activeProfileLabel,
      note: activeProfileFocusTabs.slice(0, 3).join(" / ").toUpperCase(),
    },
    {
      label: "Runtime",
      value: `EVAL ${evalGrade.toUpperCase()}`,
      note: `${runtimeStatusLabel} • ${runtimePhaseLabel}${evalStale ? " • stale" : " • live"}`,
    },
    {
      label: "Priority",
      value: primaryFrontLabel,
      note: primaryFrontNote,
    },
    {
      label: "Tempo",
      value: commandTempo,
      note: `${enabledScheduledJobsCount} queued · ${warmedAgentStationsCount} stations warm`,
    },
    {
      label: "Recall",
      value: "Last handoff",
      note: sessionRecapSummary,
    },
  ];

  const visualStats = [
    { label: "Station", value: activeAgentLabel },
    { label: "Front", value: primaryFrontLabel },
    { label: "Phase", value: runtimePhaseLabel },
    { label: "Tempo", value: commandTempo },
  ];

  return (
    <OpsRail className="nexus-hq-tacticalRail nexus-motion-enter nexus-motion-enter--support">
      <OpsField
        title={
          <div className="nexus-hq-tacticalRail__heading">
            <span className="nexus-shell-eyebrow">{eyebrow}</span>
            <div className="nexus-hq-tacticalRail__headingCopy">
              <h1 className="nexus-hq-tacticalRail__title">{title}</h1>
              <p className="nexus-hq-tacticalRail__description">{description}</p>
            </div>
          </div>
        }
        detail="Scene-linked tactical rail"
        className="nexus-hq-tacticalRail__field"
      >
        <div className="nexus-hq-tacticalRail__picture">
          <div className="nexus-hq-tacticalRail__mapFrame" aria-hidden="true">
            <Image
              src="/theme/satops-hq-plate.svg"
              alt=""
              fill
              sizes="(max-width: 1320px) 100vw, 420px"
              className="nexus-hq-tacticalRail__mapImage"
            />
            <div className="nexus-hq-tacticalRail__mapGrid" />
            <div className="nexus-hq-tacticalRail__mapSweep" />
            <div className="nexus-hq-tacticalRail__mapTarget" />
            <div className="nexus-hq-tacticalRail__mapTag">Command plate</div>
          </div>

          <div className="nexus-hq-tacticalRail__pictureRail">
            {visualStats.map((stat) => (
              <div key={stat.label} className="nexus-hq-tacticalRail__pictureReadout">
                <span className="nexus-hq-tacticalRail__pictureLabel">{stat.label}</span>
                <span className="nexus-hq-tacticalRail__pictureValue">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="nexus-hq-tacticalRail__tokens" aria-hidden="true">
          <span className="nexus-hq-tacticalRail__token">{activeProfileLabel}</span>
          <span className="nexus-hq-tacticalRail__token">
            Eval {evalGrade.toUpperCase()}
          </span>
          <span className="nexus-hq-tacticalRail__token">{activeAgentLabel} station</span>
        </div>

        <HQPreludePostureGrid cards={cards} activeAgentLabel={activeAgentLabel} />
      </OpsField>

      <HQMissionRailSection
        investigateLabel={investigateLabel}
        investigateNote={investigateNote}
        onObserve={onOpenObserve}
        onInvestigate={onOpenInvestigate}
        onAutomate={onOpenScheduler}
        onArchive={onOpenArchive}
        onLaunch={onOpenLaunch}
      />

      <TrustOperationsRail
        title="Trust posture"
        detail="Protected actions, connector posture, and step-up stay fused to the sector."
        compact
      />

      <OpsStrip className="nexus-hq-tacticalRail__actionStrip">
        <div className="nexus-hq-tacticalRail__actionCopy">
          <span className="nexus-shell-eyebrow">Immediate control</span>
          <p className="nexus-hq-tacticalRail__actionNote">
            Keep the hot front, protected actions, and field references one move from the chronicle.
          </p>
        </div>
        <div className="nexus-shell-actions nexus-shell-actions--controls nexus-hq-tacticalRail__actions">
          <ShellButton onClick={onOpenPrimaryFront} active>
            Open {primaryFrontLabel}
          </ShellButton>
          <ShellButton onClick={onOpenScheduler}>Queue</ShellButton>
          <ShellButton onClick={onOpenFieldManual}>Manual</ShellButton>
        </div>
      </OpsStrip>

      <section className="nexus-hq-tacticalRail__continuity nexus-motion-enter nexus-motion-enter--continuity">
        <ProviderResilienceCallout />
        <OperatorStatusCard surface="hq" />
        <OfflineReadinessCallout surface="hq" />
      </section>
    </OpsRail>
  );
}
