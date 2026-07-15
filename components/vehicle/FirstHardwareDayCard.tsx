"use client";

import { useEffect, useMemo, useState } from "react";
import { copyTextWithFeedback } from "@/components/ui/clipboardFeedback";
import {
  areVehicleChecklistStatesEqual,
  getVehicleFirstHardwareDayProgress,
  normalizeVehicleChecklistState,
  VEHICLE_FIRST_HARDWARE_DAY_CATEGORY_LABELS,
  VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST,
  VEHICLE_FIRST_HARDWARE_DAY_RECOVERY_FLOWS,
} from "@/lib/vehicle/hardwareReadiness";
import { useStore } from "@/store/useStore";

function buildHardwareDayRunbook(checklistState: Record<string, boolean>) {
  const lines = [
    `# First Hardware Day — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "",
    "## Checklist",
  ];

  Object.entries(VEHICLE_FIRST_HARDWARE_DAY_CATEGORY_LABELS).forEach(
    ([category, label]) => {
      const items = VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST.filter(
        (item) => item.category === category,
      );
      if (!items.length) return;
      lines.push(`### ${label}`);
      items.forEach((item) => {
        lines.push(
          `- [${checklistState[item.id] ? "x" : " "}] ${item.label} — ${item.detail}`,
        );
      });
      lines.push("");
    },
  );

  lines.push("## Recovery flows");
  VEHICLE_FIRST_HARDWARE_DAY_RECOVERY_FLOWS.forEach((flow) => {
    lines.push(`### ${flow.label}`);
    lines.push(`Trigger: ${flow.trigger}`);
    flow.steps.forEach((step) => lines.push(`- ${step}`));
    lines.push("");
  });

  return lines.join("\n");
}

export default function FirstHardwareDayCard() {
  const checklistState = useStore(
    (state) => state.settings.vehicleFirstHardwareChecklist ?? {},
  );
  const toggleItem = useStore(
    (state) => state.toggleVehicleFirstHardwareChecklistItem,
  );
  const resetChecklist = useStore(
    (state) => state.resetVehicleFirstHardwareChecklist,
  );
  const updateSettings = useStore((state) => state.updateSettings);
  const [healedState, setHealedState] = useState(false);

  const normalizedChecklistState = useMemo(
    () =>
      normalizeVehicleChecklistState(
        checklistState,
        VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST.map((item) => item.id),
      ),
    [checklistState],
  );

  useEffect(() => {
    if (
      areVehicleChecklistStatesEqual(
        checklistState,
        normalizedChecklistState,
        VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST.map((item) => item.id),
      )
    )
      return;
    updateSettings({ vehicleFirstHardwareChecklist: normalizedChecklistState });
    setHealedState(true);
  }, [checklistState, normalizedChecklistState, updateSettings]);

  const progress = getVehicleFirstHardwareDayProgress(normalizedChecklistState);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
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
          First hardware day
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
          }}
        >
          Arrival-day only
        </span>
        {healedState ? (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
            }}
          >
            State repaired
          </span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          {progress.completedCount}/{progress.totalCount} complete
        </span>
      </div>

      <div
        style={{
          height: "4px",
          borderRadius: "999px",
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress.percent}%`,
            height: "100%",
            background:
              progress.remainingCount === 0 ? "#10b981" : "var(--accent)",
            transition: "width var(--t)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text2)" }}>
          Treat the first hardware day as a calm bring-up and evidence-capture
          day, not a performance day.
        </span>
        <button
          type="button"
          onClick={() =>
            void copyTextWithFeedback(
              buildHardwareDayRunbook(normalizedChecklistState),
              "Hardware-day runbook",
            )
          }
          className="nexus-shell-button"
          style={{ marginLeft: "auto" }}
        >
          Copy runbook
        </button>
        <button
          type="button"
          onClick={resetChecklist}
          className="nexus-shell-button"
        >
          Reset
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.entries(VEHICLE_FIRST_HARDWARE_DAY_CATEGORY_LABELS).map(
          ([category, label]) => {
            const items = VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST.filter(
              (item) => item.category === category,
            );
            if (!items.length) return null;
            const checked = items.filter(
              (item) => normalizedChecklistState[item.id],
            ).length;

            return (
              <div
                key={category}
                style={{
                  background: "var(--surf2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--rs)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text3)",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {label}
                  <span
                    style={{
                      fontSize: "9px",
                      color:
                        checked === items.length ? "#10b981" : "var(--text3)",
                    }}
                  >
                    {checked}/{items.length}
                  </span>
                </div>
                {items.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginBottom: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(normalizedChecklistState[item.id])}
                      onChange={() => toggleItem(item.id)}
                      style={{
                        marginTop: "2px",
                        accentColor: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          lineHeight: 1.4,
                          color: normalizedChecklistState[item.id]
                            ? "var(--text3)"
                            : "var(--text2)",
                          textDecoration: normalizedChecklistState[item.id]
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {item.label}
                      </span>
                      <span style={{ fontSize: "9px", color: "var(--text3)" }}>
                        {item.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            );
          },
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {VEHICLE_FIRST_HARDWARE_DAY_RECOVERY_FLOWS.map((flow) => (
          <div
            key={flow.id}
            style={{
              background: "rgba(9,14,28,0.45)",
              border: "1px solid var(--border)",
              borderRadius: "var(--rs)",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {flow.label}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                lineHeight: 1.55,
              }}
            >
              {flow.trigger}
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                color: "var(--text2)",
                fontSize: "10px",
                lineHeight: 1.55,
              }}
            >
              {flow.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                void copyTextWithFeedback(
                  [flow.label, `Trigger: ${flow.trigger}`, ...flow.steps].join(
                    "\n",
                  ),
                  `${flow.label} recovery flow`,
                )
              }
              className="nexus-shell-button"
              style={{ alignSelf: "flex-start" }}
            >
              Copy recovery flow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
