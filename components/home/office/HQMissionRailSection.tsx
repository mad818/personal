"use client";

import type { CSSProperties } from "react";

type MissionRailTone = "steady" | "warning" | "critical";
type MissionRailRole = "lead" | "primary" | "support" | "critical";

interface MissionRailItem {
  id: "observe" | "investigate" | "automate" | "archive" | "launch";
  label: string;
  note: string;
  tone: MissionRailTone;
  role: MissionRailRole;
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

function toneClass(tone: MissionRailTone) {
  if (tone === "critical") return "is-critical";
  if (tone === "warning") return "is-warning";
  return "is-steady";
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
      label: "Observe",
      note: "Open COMMAND and scan posture, runtime, and current pressure first.",
      tone: "steady",
      role: "lead",
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
      role: "primary",
      onClick: onInvestigate,
    },
    {
      id: "automate",
      label: "Automate",
      note: "Open auto orders and stage repeatable workflows without leaving HQ.",
      tone: "warning",
      role: "support",
      onClick: onAutomate,
    },
    {
      id: "archive",
      label: "Archive",
      note: "Jump into VAULT for memory, compiled pages, graph context, and export.",
      tone: "steady",
      role: "support",
      onClick: onArchive,
    },
    {
      id: "launch",
      label: "Launch",
      note: "Open VEHICLE readiness for future hardware, bridge posture, and mission prep.",
      tone: "critical",
      role: "critical",
      onClick: onLaunch,
    },
  ];
  const leadItems = items.filter(
    (item) => item.role === "lead" || item.role === "primary",
  );
  const queueItems = items.filter(
    (item) => item.role !== "lead" && item.role !== "primary",
  );

  return (
    <div
      className="nexus-hq-mission-rail nexus-motion-enter nexus-motion-enter--primary"
      aria-label="HQ mission rail"
    >
      <div className="nexus-hq-mission-rail__header">
        <span className="nexus-hq-mission-rail__eyebrow">Start the operation</span>
        <p className="nexus-hq-mission-rail__copy">
          Dispatch from intent, keep the sanctum in view, and let the current route system open the right theater without breaking continuity.
        </p>
      </div>
      <div className="nexus-hq-mission-rail__lead">
        {leadItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`nexus-hq-mission-rail__leadItem ${toneClass(item.tone)}`}
            data-mission-role={item.role}
            style={{ "--nexus-mission-order": index } as CSSProperties}
          >
            <span className="nexus-hq-mission-rail__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="nexus-hq-mission-rail__leadBody">
              <span className="nexus-hq-mission-rail__label">{item.label}</span>
              <span className="nexus-hq-mission-rail__note">{item.note}</span>
            </div>
            <span className="nexus-hq-mission-rail__leadAction">Engage</span>
          </button>
        ))}
      </div>
      <div className="nexus-hq-mission-rail__queue">
        {queueItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`nexus-hq-mission-rail__queueItem ${toneClass(item.tone)}`}
            data-mission-role={item.role}
            style={
              {
                "--nexus-mission-order": index + leadItems.length,
              } as CSSProperties
            }
          >
            <span className="nexus-hq-mission-rail__queueOrder">
              {String(index + leadItems.length + 1).padStart(2, "0")}
            </span>
            <div className="nexus-hq-mission-rail__queueBody">
              <span className="nexus-hq-mission-rail__label">{item.label}</span>
              <span className="nexus-hq-mission-rail__note">{item.note}</span>
            </div>
            <span className="nexus-hq-mission-rail__queueAction">
              {item.id === "launch" ? "Launch" : "Open"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
