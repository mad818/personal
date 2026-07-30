"use client";

import Link from "next/link";
import { useMemo } from "react";
import { copyTextWithFeedback } from "@/components/ui/clipboardFeedback";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import {
  buildVehicleOpsBrief,
  getVehicleBenchChecklistProgress,
} from "@/lib/vehicle/readiness";
import { useStore } from "@/store/useStore";

type LaunchpadAction = {
  href: string;
  label: string;
  note: string;
  accent?: boolean;
};

function buildCommandMemoryHref() {
  const params = new URLSearchParams({
    memoryAsk:
      "What does local memory already say about F450 bench readiness, passive telemetry bridge posture, and future flight-log packaging?",
  });
  return `/command?${params.toString()}`;
}

export default function DroneOpsLaunchpad() {
  const { activeFrame, bridgeStatus, history, sourceMode } =
    useVehicleTelemetry();
  const checklistState = useStore(
    (state) => state.settings.vehicleBenchChecklist ?? {},
  );

  const checklist = useMemo(
    () => getVehicleBenchChecklistProgress(checklistState),
    [checklistState],
  );

  const nextAction = useMemo(() => {
    if (checklist.remainingCount > 0) {
      return {
        label: "Finish the props-off bench pass",
        note: checklist.nextIncompleteLabel
          ? `Next incomplete item: ${checklist.nextIncompleteLabel}.`
          : "Complete the remaining checklist items before field work.",
        href: "#vehicle-bench-checklist",
      };
    }

    if (!bridgeStatus.available && sourceMode === "simulation") {
      return {
        label: "Prepare the future connector profile and bridge stub",
        note: "Because the aircraft is not here yet, the right next move is saving the expected Pixhawk / ArduPilot profile and the passive bridge command, not pretending the bridge should already be live.",
        href: "#vehicle-connector-onboarding",
      };
    }

    if (!bridgeStatus.fresh) {
      return {
        label: "Recover passive bridge freshness",
        note: bridgeStatus.available
          ? "The bridge exists but is not currently fresh, so the sim fallback is still carrying the operator view."
          : "No fresh bridge frame has been ingested yet, so the airframe lane is still simulation-first.",
        href: "#vehicle-first-hardware-day",
      };
    }

    return {
      label: "Run sortie compliance before field use",
      note: "Bench and bridge posture are healthy enough to move into FAA, airspace, and local-law review for the actual mission location.",
      href: "/cyber?view=drone&operationType=inspection&altitude=400&additionalContext=F450%20bench%20and%20telemetry%20validation",
    };
  }, [
    bridgeStatus.available,
    bridgeStatus.fresh,
    checklist.nextIncompleteLabel,
    checklist.remainingCount,
    sourceMode,
  ]);

  const quickActions = useMemo<LaunchpadAction[]>(
    () => [
      {
        href: nextAction.href,
        label: "Next action",
        note: nextAction.note,
        accent: true,
      },
      {
        href: "/internal/vehicle#vehicle-connector-onboarding",
        label: "Connector onboarding",
        note: "Save the future Pixhawk / ArduPilot profile and copy the passive bridge stub command before the hardware arrives.",
      },
      {
        href: "/internal/vehicle#vehicle-first-hardware-day",
        label: "First hardware day",
        note: "Use the dedicated arrival-day checklist and recovery flows instead of winging the first bridge session.",
      },
      {
        href: "/cyber?view=drone&operationType=inspection&altitude=400&additionalContext=F450%20telemetry%20and%20route%20review",
        label: "Compliance lane",
        note: "Open the protected FAA / state / local / airspace drone review lane.",
      },
      {
        href: buildCommandMemoryHref(),
        label: "Ask command memory",
        note: "Pull a citation-first local memory answer for drone readiness and future sorties.",
      },
      {
        href: "/internal/vehicle#vehicle-flight-session-bundles",
        label: "Session bundles",
        note: "Export a future flight session JSON bundle, import one back later, and file the summary into Vault.",
      },
    ],
    [nextAction.href, nextAction.note],
  );

  const summary = useMemo(
    () =>
      buildVehicleOpsBrief({
        activeFrame,
        historyFrames: history.length,
        checklistState,
        bridgeStatus,
      }),
    [activeFrame, bridgeStatus, checklistState, history.length],
  );

  const readinessItems = [
    {
      label: "Bench readiness",
      value: `${checklist.completedCount}/${checklist.totalCount}`,
      note:
        checklist.remainingCount > 0
          ? `${checklist.remainingCount} items remain before the first real sortie.`
          : "Props-off bring-up is complete for this pass.",
    },
    {
      label: "Bridge posture",
      value: bridgeStatus.fresh
        ? "Fresh"
        : bridgeStatus.available
          ? "Standby"
          : "Sim only",
      note: bridgeStatus.fresh
        ? `${bridgeStatus.ingestedFrames} passive frames are available and the live bridge is currently driving the view.`
        : "The Vehicle Lab stays useful even when the external bridge is unavailable.",
    },
    {
      label: "Current source",
      value:
        sourceMode === "live_bridge"
          ? "Bridge"
          : sourceMode === "replay"
            ? "Replay"
            : "Simulation",
      note: "Replay stays authoritative when you scrub history; fresh bridge frames only override the live view.",
    },
    {
      label: "Archive runway",
      value: `${history.length} frames`,
      note: "Flight logs should end as Vault-ready packages, not just one-off telemetry widgets.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            maxWidth: "72ch",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Drone Ops Launchpad
          </div>
          <div
            style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}
          >
            One operator path from benching to compliance to archive
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text2)",
              lineHeight: 1.65,
            }}
          >
            Vehicle Lab now has a clear handoff path: finish props-off
            validation, confirm the passive bridge, run the legal/compliance
            check for the real mission, and leave the session as a reusable
            Vault package.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copyTextWithFeedback(summary, "Drone ops brief")}
          className="nexus-shell-button"
        >
          Copy ops brief
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
        }}
      >
        {readinessItems.map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--rs)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--text)",
              }}
            >
              {item.value}
            </span>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text2)",
                lineHeight: 1.55,
              }}
            >
              {item.note}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "rgba(103,232,249,0.08)",
          border: "1px solid rgba(103,232,249,0.18)",
          borderRadius: "16px",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 800,
          }}
        >
          Next operator move
        </span>
        <span
          style={{ fontSize: "14px", color: "var(--text)", fontWeight: 800 }}
        >
          {nextAction.label}
        </span>
        <span
          style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}
        >
          {nextAction.note}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
        }}
      >
        {quickActions.map((action) => (
          <Link
            key={`${action.label}-${action.href}`}
            href={action.href}
            className={
              action.accent
                ? "nexus-shell-button is-active"
                : "nexus-shell-button"
            }
            style={{
              minHeight: "unset",
              padding: "14px 16px",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              flexDirection: "column",
              borderRadius: "16px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 800 }}>
              {action.label}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text2)",
                lineHeight: 1.55,
              }}
            >
              {action.note}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
