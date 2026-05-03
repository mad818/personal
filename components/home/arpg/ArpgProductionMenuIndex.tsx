"use client";

import type { CSSProperties } from "react";
import type { ArpgProductionReadinessContent } from "@/lib/arpgProductionReadiness";

type ArpgProductionMenuPanel =
  ArpgProductionReadinessContent["menuSurface"]["requiredPanels"][number];

interface ArpgProductionMenuIndexProps {
  panels: ArpgProductionMenuPanel[];
  onLaunch: (panel: ArpgProductionMenuPanel) => void;
  buttonStyle: CSSProperties;
}

export function ArpgProductionMenuIndex({
  panels,
  onLaunch,
  buttonStyle,
}: ArpgProductionMenuIndexProps) {
  return (
    <div data-testid="arpg-menu-index" style={{ display: "grid", gap: 6 }}>
      {panels.map((panel) => (
        <button
          key={panel.id}
          data-testid={`arpg-menu-launch-${panel.id}`}
          type="button"
          onClick={() => onLaunch(panel)}
          style={{
            ...buttonStyle,
            alignItems: "stretch",
            borderRadius: 12,
            display: "grid",
            gap: 4,
            justifyItems: "start",
            padding: "7px 8px",
            textAlign: "left",
          }}
        >
          <span
            data-testid={panel.testId}
            style={{ color: "#fff3d6", fontSize: 9, fontWeight: 950 }}
          >
            {panel.label}
          </span>
          <span style={{ color: "rgba(255,240,214,.62)", fontSize: 8, lineHeight: 1.25 }}>
            {panel.surface} - {panel.coverage}
          </span>
          <span style={{ color: "rgba(255,240,214,.48)", fontSize: 7.5, lineHeight: 1.25 }}>
            {panel.emptyState}
          </span>
        </button>
      ))}
    </div>
  );
}
