"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import ClientStyleMount from "@/components/ui/ClientStyleMount";
import PhaseStrip from "@/components/ui/PhaseStrip";
import TaskPlanPanel from "@/components/ui/TaskPlanPanel";
import { evalGradeColor, evalIndicatorIcon } from "@/lib/helpers";
import {
  resolveEffectiveOfficeMotion,
  resolveEffectiveOfficeVfxQuality,
  resolveEffectiveSurfaceMotionProfile,
  resolveOfficeSceneCue,
  type SurfaceMotionProfile,
} from "@/lib/surfaceMotion";
import type { HqConsoleFocusMode } from "@/store/useStore";
import { AGENTS } from "./constants";
import { ModeBriefingPanel } from "./ModeBriefingPanel";
import type { OfficeRoomControls } from "./OfficeRoom3D";
import {
  OFFICE_ANIMATIONS_CSS,
  OFFICE_HEIGHT_MIN_PX,
  type DispatchBar,
  type OfficeCameraPreset,
} from "./officeCommandCenterConfig";
import type {
  OfficeMissionState,
  OfficeVfxQuality,
  WallFrontTone,
} from "./officeRoom3DScene";
import type {
  AgentId,
  Emotion,
  OfficeObjectId,
  OfficeObjectPos,
} from "./types";

const OfficeRoom3D = dynamic(
  () => import("./OfficeRoom3D").then((module) => module.OfficeRoom3D),
  {
    ssr: false,
    loading: () => null,
  },
);

interface HQConsoleShellSectionProps {
  activeAgent: AgentId | null;
  evalGrade: "A" | "B" | "C" | "unknown";
  evalTrail: string;
  evalStale: boolean;
  evalFailureCount: number;
  evalUpdatedAt: number | null;
  runtimeStatusLabel: string;
  runtimePhaseLabel: string;
  clockLabel: string;
  consoleFocusMode: HqConsoleFocusMode;
  officeHeightPx: number | null;
  compactSplitControls: boolean;
  viewportHeight: number;
  splitDragLocked: boolean;
  showSplitMore: boolean;
  splitNotice: string | null;
  officeEditMode: boolean;
  officeLayout: Record<OfficeObjectId, OfficeObjectPos>;
  agentPos?: Record<AgentId, { x: number; y: number }>;
  roomMissionState: OfficeMissionState;
  roomMissionLabel: string;
  roomMissionNote: string;
  commandTempo: string;
  primaryFront: {
    label: string;
    value: string;
    note: string;
    tone: WallFrontTone;
  };
  officeSceneMode: "auto" | "morning" | "afternoon" | "night";
  surfaceMotionProfile: SurfaceMotionProfile;
  officeMotion: number;
  officeCameraPreset: OfficeCameraPreset;
  officeVfxQuality: OfficeVfxQuality;
  dispatchBar: DispatchBar | null;
  emotion: Emotion;
  onOpenMemory: () => void;
  onOpenScheduler: () => void;
  onOpenPrimaryFront: () => void;
  onOpenSweep: () => void;
  onOpenForge: () => void;
  onOpenDoctrine: () => void;
  onToggleEditMode: () => void;
  onResetLayout: () => void;
  onSetCameraPreset: (preset: OfficeCameraPreset) => void;
  onSetVfxQuality: (quality: OfficeVfxQuality) => void;
  onOpenBriefingTab: (tab: string) => void;
  onSetConsoleFocusMode: (mode: HqConsoleFocusMode) => void;
  onApplyStageHeight: (heightPx: number, announce?: string) => void;
  onToggleSplitLock: () => void;
  onSetShowSplitMore: (open: boolean) => void;
}

export default function HQConsoleShellSection({
  activeAgent,
  evalGrade,
  evalTrail,
  evalStale,
  evalFailureCount,
  evalUpdatedAt,
  runtimeStatusLabel,
  runtimePhaseLabel,
  clockLabel,
  consoleFocusMode,
  officeHeightPx,
  officeEditMode,
  officeLayout,
  agentPos,
  roomMissionState,
  roomMissionLabel,
  roomMissionNote,
  commandTempo,
  primaryFront,
  officeSceneMode,
  surfaceMotionProfile,
  officeMotion,
  officeCameraPreset,
  officeVfxQuality,
  dispatchBar,
  onOpenMemory,
  onOpenScheduler,
  onOpenPrimaryFront,
  onOpenSweep,
  onOpenForge,
  onOpenDoctrine,
  onToggleEditMode,
  onResetLayout,
  onSetCameraPreset,
  onSetVfxQuality,
  onOpenBriefingTab,
  onSetConsoleFocusMode,
}: HQConsoleShellSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveProfile = resolveEffectiveSurfaceMotionProfile(
    surfaceMotionProfile,
    Boolean(prefersReducedMotion),
  );
  const effectiveOfficeMotion = resolveEffectiveOfficeMotion(
    effectiveProfile,
    officeMotion,
  );
  const effectiveOfficeVfxQuality = resolveEffectiveOfficeVfxQuality(
    effectiveProfile,
    officeVfxQuality,
  );
  const telemetryCue = resolveOfficeSceneCue({
    profile: effectiveProfile,
    missionState: roomMissionState,
    commandTempo,
    frontTone: primaryFront.tone,
    activeAgentColor: activeAgent ? AGENTS[activeAgent].color : undefined,
    dispatchActive: Boolean(dispatchBar),
  });
  const officeControls: OfficeRoomControls = {
    officeEditMode,
    onToggleEditMode,
    onResetLayout,
    onOpenMemory,
    onOpenScheduler,
    onOpenPrimaryFront,
    onOpenSweep,
    onOpenForge,
    onOpenDoctrine,
    cameraPreset: officeCameraPreset,
    onSetCameraPreset,
    vfxQuality: effectiveOfficeVfxQuality,
    onSetVfxQuality,
  };
  const isCommandFocus = consoleFocusMode === "command";
  const stageHeight = officeHeightPx ?? OFFICE_HEIGHT_MIN_PX;

  return (
    <>
      <div
        className="nexus-hq-consoleShell__statusBar"
        style={{
          alignItems: "center",
          background: `linear-gradient(180deg, rgba(11,14,17,0.94), rgba(7,9,12,0.98)), radial-gradient(circle at 14% 24%, ${telemetryCue.accentColor}14, transparent 30%)`,
          borderBottom: `1px solid rgba(162,180,193,${0.12 + telemetryCue.alertWash * 0.16})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 12px 28px rgba(0,0,0,0.14), 0 0 0 1px ${telemetryCue.accentColor}${telemetryCue.dispatchEmphasis > 0.2 ? "14" : "08"}`,
          display: "flex",
          flexShrink: 0,
          gap: 8,
          padding: "6px 16px",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            background: activeAgent ? telemetryCue.accentColor : "#84d98d",
            borderRadius: "50%",
            boxShadow: activeAgent
              ? `0 0 ${8 + telemetryCue.dispatchEmphasis * 6}px ${telemetryCue.accentColor}`
              : "0 0 8px rgba(132,217,141,.68)",
            display: "inline-block",
            height: 6,
            width: 6,
          }}
        />
        <span
          style={{
            color: activeAgent ? telemetryCue.accentColor : "#b7ffce",
            fontFamily: "'VT323', monospace",
            fontSize: 12,
            letterSpacing: 2,
          }}
        >
          SATELLITE OPS // COMMAND TABLE
        </span>
        <span
          title="Active front and command tempo"
          style={{
            background: "rgba(255,255,255,.02)",
            border: "1px solid rgba(178,193,205,0.16)",
            borderRadius: 999,
            color: "#dce6ee",
            fontFamily: "'VT323', monospace",
            fontSize: 11,
            padding: "2px 8px",
          }}
        >
          {primaryFront.label.toUpperCase()} · {commandTempo.toUpperCase()}
        </span>
        <span
          data-testid="hq-focus-switch"
          aria-label="HQ primary view"
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(178,193,205,0.14)",
            borderRadius: 999,
            display: "inline-flex",
            gap: 3,
            padding: 3,
          }}
        >
          {[
            { id: "command" as const, label: "Command" },
            { id: "chat" as const, label: "Chat" },
          ].map((mode) => {
            const active = consoleFocusMode === mode.id;
            return (
              <button
                key={mode.id}
                data-testid={`hq-focus-${mode.id}`}
                type="button"
                aria-pressed={active}
                onClick={() => onSetConsoleFocusMode(mode.id)}
                style={{
                  background: active
                    ? "rgba(255, 195, 105, 0.16)"
                    : "rgba(255,255,255,.02)",
                  border: `1px solid ${
                    active ? "rgba(255,214,150,.42)" : "rgba(255,255,255,.06)"
                  }`,
                  borderRadius: 999,
                  color: active ? "#ffe1a6" : "rgba(255,255,255,.58)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: ".09em",
                  padding: "4px 8px",
                  textTransform: "uppercase",
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </span>
        <span
          title={[
            evalTrail
              ? `Recent grades: ${evalTrail}`
              : "No recent grade history",
            evalUpdatedAt
              ? `Updated: ${new Date(evalUpdatedAt).toLocaleTimeString()}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          style={{
            border: `1px solid ${telemetryCue.accentColor}24`,
            borderRadius: 999,
            color: evalGradeColor(evalGrade),
            fontFamily: "'VT323', monospace",
            fontSize: 11,
            marginLeft: "auto",
            padding: "2px 8px",
          }}
        >
          {evalIndicatorIcon({
            stale: evalStale,
            failures: evalFailureCount,
          })}{" "}
          EVAL {evalGrade}
        </span>
        <span
          title="Current runtime state"
          style={{
            border: "1px solid rgba(178,193,205,0.16)",
            borderRadius: 999,
            color: "#dce6ee",
            fontFamily: "'VT323', monospace",
            fontSize: 11,
            padding: "2px 8px",
          }}
        >
          {runtimeStatusLabel.toUpperCase()} · {runtimePhaseLabel.toUpperCase()}
        </span>
        <span
          style={{
            color: "rgba(255,236,238,.76)",
            fontFamily: "'VT323', monospace",
            fontSize: 11,
          }}
        >
          {clockLabel}
        </span>
      </div>

      {isCommandFocus ? (
        <>
          <PhaseStrip />
          <TaskPlanPanel />
        </>
      ) : null}

      <div
        className="nexus-hq-consoleShell__stage"
        data-testid="hq-command-stage"
        data-focus-mode={consoleFocusMode}
        style={{
          background:
            "linear-gradient(180deg, rgba(10,13,16,0.92), rgba(7,9,11,0.98))",
          border: "1px solid rgba(162,180,193,0.14)",
          borderTop: "none",
          flex: `0 0 ${isCommandFocus ? stageHeight : 92}px`,
          height: isCommandFocus ? stageHeight : 92,
          minHeight: isCommandFocus ? OFFICE_HEIGHT_MIN_PX : 92,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <ClientStyleMount
          id="office-command-center-animations"
          cssText={OFFICE_ANIMATIONS_CSS}
        />
        <div className="nexus-hq-consoleShell__grid" aria-hidden="true" />

        {isCommandFocus ? (
          <>
            <div
              data-testid="hq-command-room"
              style={{ position: "absolute", inset: 0 }}
            >
              <OfficeRoom3D
                officeLayout={officeLayout}
                agentPos={agentPos}
                activeAgent={activeAgent}
                missionState={roomMissionState}
                missionLabel={roomMissionLabel}
                missionNote={roomMissionNote}
                commandTempo={commandTempo}
                primaryFront={primaryFront}
                sceneMode={officeSceneMode}
                motionProfile={effectiveProfile}
                motionIntensity={effectiveOfficeMotion}
                cameraPreset={officeCameraPreset}
                vfxQuality={effectiveOfficeVfxQuality}
                controls={officeControls}
                dispatchBar={dispatchBar}
              />
            </div>
            <div className="nexus-hq-consoleShell__missionRail">
              {[
                ["State", roomMissionState, roomMissionLabel],
                ["Front", primaryFront.label, primaryFront.note],
                ["Runtime", runtimeStatusLabel, runtimePhaseLabel],
                ["Command note", commandTempo, roomMissionNote],
              ].map(([label, value, note]) => (
                <div key={label} className="nexus-hq-consoleShell__missionCell">
                  <span className="nexus-hq-consoleShell__missionLabel">
                    {label}
                  </span>
                  <strong className="nexus-hq-consoleShell__missionValue">
                    {value}
                  </strong>
                  <span className="nexus-hq-consoleShell__missionNote">
                    {note}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="nexus-hq-consoleShell__briefings"
              style={{ position: "absolute", right: 12, top: 52, zIndex: 55 }}
            >
              <ModeBriefingPanel onOpenTab={onOpenBriefingTab} />
            </div>
          </>
        ) : (
          <div
            data-testid="hq-chat-focus-panel"
            style={{
              alignItems: "center",
              background:
                "linear-gradient(90deg, rgba(12,16,20,.94), rgba(8,10,12,.84)), radial-gradient(circle at 12% 50%, rgba(255,214,150,.12), transparent 32%)",
              display: "flex",
              gap: 12,
              inset: 0,
              justifyContent: "space-between",
              padding: "14px 18px",
              position: "absolute",
              zIndex: 32,
            }}
          >
            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
              <span
                style={{
                  color: "#ffe1a6",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                }}
              >
                Chronicle focus
              </span>
              <span
                style={{
                  color: "rgba(228,236,242,.7)",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.35,
                }}
              >
                Chat owns the page right now. Switch to Command when you want
                the operational workspace back.
              </span>
            </div>
            <button
              data-testid="hq-chat-focus-command-return"
              type="button"
              onClick={() => onSetConsoleFocusMode("command")}
              style={{
                background: "rgba(255,195,105,.12)",
                border: "1px solid rgba(255,214,150,.32)",
                borderRadius: 999,
                color: "#ffe1a6",
                cursor: "pointer",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: ".1em",
                padding: "8px 12px",
                textTransform: "uppercase",
              }}
            >
              Show command
            </button>
          </div>
        )}
      </div>
    </>
  );
}
