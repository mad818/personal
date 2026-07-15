"use client";

import type { CSSProperties } from "react";

type MissionRailTone = "steady" | "warning" | "critical";

interface MissionRailItem {
  id: "observe" | "investigate" | "automate" | "archive" | "launch";
  label: string;
  note: string;
  tone: MissionRailTone;
  actionLabel: string;
}

interface Props {
  investigateLabel: string;
  investigateNote: string;
  onObserve: () => void;
  onInvestigate: () => void;
  onAutomate: () => void;
  onArchive: () => void;
  onLaunch: () => void;
}

export default function HQMissionRailSection({
  investigateLabel,
  investigateNote,
  onObserve,
  onInvestigate,
  onAutomate,
  onArchive,
  onLaunch,
}: Props) {
  const items: Array<MissionRailItem & { onClick: () => void }> = [
    {
      id: "observe",
      label: "Watch",
      note: "COMMAND runtime and pressure.",
      tone: "steady",
      actionLabel: "Watch",
      onClick: onObserve,
    },
    {
      id: "investigate",
      label: investigateLabel,
      note: investigateNote,
      tone:
        investigateLabel.toLowerCase().includes("cyber") ||
        investigateLabel.toLowerCase().includes("intel")
          ? "warning"
          : "steady",
      actionLabel: "Investigate",
      onClick: onInvestigate,
    },
    {
      id: "automate",
      label: "Queue",
      note: "Stage repeatable orders in-line.",
      tone: "warning",
      actionLabel: "Queue",
      onClick: onAutomate,
    },
    {
      id: "archive",
      label: "Archive",
      note: "VAULT recall and dossiers.",
      tone: "steady",
      actionLabel: "Recall",
      onClick: onArchive,
    },
    {
      id: "launch",
      label: "Bridge",
      note: "VEHICLE readiness and bundles.",
      tone: "critical",
      actionLabel: "Launch",
      onClick: onLaunch,
    },
  ];

  return (
    <section
      className="nexus-hq-tacticalBoard nexus-motion-enter nexus-motion-enter--primary"
      aria-label="HQ tactical queue"
    >
      <div className="nexus-hq-tacticalBoard__header">
        <span className="nexus-shell-eyebrow">Queue</span>
        <p className="nexus-hq-tacticalBoard__copy">
          Watch, pivot, queue, recall, launch.
        </p>
      </div>

      <div className="nexus-hq-tacticalBoard__list">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className="nexus-hq-tacticalBoard__item"
            data-tone={item.tone}
            data-task={item.id}
            style={{ "--nexus-task-order": index } as CSSProperties}
          >
            <span className="nexus-hq-tacticalBoard__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="nexus-hq-tacticalBoard__body">
              <span className="nexus-hq-tacticalBoard__label">
                {item.label}
              </span>
              <span className="nexus-hq-tacticalBoard__note">{item.note}</span>
            </div>
            <span className="nexus-hq-tacticalBoard__action">
              {item.actionLabel}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
