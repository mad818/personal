"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import PhaseStrip from "@/components/ui/PhaseStrip";
import TaskPlanPanel from "@/components/ui/TaskPlanPanel";
import ClientStyleMount from "@/components/ui/ClientStyleMount";
import { evalGradeColor, evalIndicatorIcon } from "@/lib/helpers";
import {
  resolveEffectiveOfficeMotion,
  resolveEffectiveOfficeVfxQuality,
  resolveOfficeSceneCue,
  resolveEffectiveSurfaceMotionProfile,
  type SurfaceMotionProfile,
} from "@/lib/surfaceMotion";
import { AGENTS } from "./constants";
import { ModeBriefingPanel } from "./ModeBriefingPanel";
import type { OfficeRoomControls } from "./OfficeRoom3D";
import {
  OFFICE_ANIMATIONS_CSS,
  OFFICE_HEIGHT_DEFAULT_VH,
  OFFICE_HEIGHT_MAX_PX,
  OFFICE_HEIGHT_MIN_PX,
  type DispatchBar,
  type OfficeCameraPreset,
} from "./officeCommandCenterConfig";
import type {
  AgentId,
  Emotion,
  OfficeObjectId,
  OfficeObjectPos,
} from "./types";
import type { OfficeMissionState, OfficeVfxQuality, WallFrontTone } from "./officeRoom3DScene";

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
  onStartResize: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onResetSplit: () => void;
  onHandleSplitterKey: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
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
  officeHeightPx,
  compactSplitControls,
  viewportHeight,
  splitDragLocked,
  showSplitMore,
  splitNotice,
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
  emotion,
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
  onStartResize,
  onResetSplit,
  onHandleSplitterKey,
  onToggleSplitLock,
  onSetShowSplitMore,
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

  return (
    <>
      <div
        className="nexus-hq-consoleShell__statusBar"
        style={{
          padding: "6px 16px",
          background:
            `linear-gradient(180deg, rgba(11,14,17,0.94), rgba(7,9,12,0.98)), radial-gradient(circle at 14% 24%, ${telemetryCue.accentColor}14, transparent 30%)`,
          borderBottom: `1px solid rgba(162,180,193,${0.12 + telemetryCue.alertWash * 0.16})`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 12px 28px rgba(0,0,0,0.14), 0 0 0 1px ${telemetryCue.accentColor}${telemetryCue.dispatchEmphasis > 0.2 ? "14" : "08"}`,
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: activeAgent ? telemetryCue.accentColor : "#84d98d",
            boxShadow: activeAgent
              ? `0 0 ${8 + telemetryCue.dispatchEmphasis * 6}px ${telemetryCue.accentColor}`
              : "0 0 8px rgba(132,217,141,.68)",
            display: "inline-block",
            animation: activeAgent ? "pulse-dot 2s ease-in-out infinite" : "none",
          }}
        />
        <span
          style={{
            fontSize: "12px",
            fontFamily: "'VT323', monospace",
            color: activeAgent ? telemetryCue.accentColor : "#b7ffce",
            letterSpacing: "2px",
          }}
        >
          SATELLITE OPS // COMMAND TABLE
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'VT323', monospace",
            color: "rgba(255,255,255,.12)",
            marginLeft: "4px",
          }}
        >
          {"//"}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'VT323', monospace",
            color: "#dce6ee",
            border: "1px solid rgba(178,193,205,0.16)",
            borderRadius: 999,
            padding: "2px 8px",
            opacity: 0.88,
            background: "rgba(255,255,255,.02)",
          }}
          title="Active front and command tempo"
        >
          {primaryFront.label.toUpperCase()} · {commandTempo.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'VT323', monospace",
            color: evalGradeColor(evalGrade),
            border: `1px solid ${telemetryCue.accentColor}24`,
            borderRadius: 999,
            padding: "2px 8px",
            marginLeft: "auto",
            opacity: 0.92,
            background: `linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)), radial-gradient(circle at 100% 0%, ${telemetryCue.accentColor}12, transparent 36%)`,
          }}
          title={[
            evalTrail ? `Recent grades: ${evalTrail}` : "No recent grade history",
            evalUpdatedAt
              ? `Updated: ${new Date(evalUpdatedAt).toLocaleTimeString()}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {evalIndicatorIcon({
            stale: evalStale,
            failures: evalFailureCount,
          })}{" "}
          EVAL {evalGrade}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'VT323', monospace",
            color: "#dce6ee",
            border: "1px solid rgba(178,193,205,0.16)",
            borderRadius: 999,
            padding: "2px 8px",
            opacity: 0.88,
            background: "rgba(255,255,255,.02)",
          }}
          title="Current runtime state"
        >
          {runtimeStatusLabel.toUpperCase()} · {runtimePhaseLabel.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'VT323', monospace",
            color: "rgba(255,236,238,.76)",
            opacity: 0.9,
          }}
        >
          {clockLabel}
        </span>
      </div>

      <PhaseStrip />
      <TaskPlanPanel />

      <div
        className="nexus-hq-consoleShell__stage"
        style={{
          position: "relative",
          flex: `0 0 ${officeHeightPx ?? OFFICE_HEIGHT_MIN_PX}px`,
          background:
            "linear-gradient(180deg, rgba(10,13,16,0.92), rgba(7,9,11,0.98))",
          border: "1px solid rgba(162,180,193,0.14)",
          borderTop: "none",
          overflow: "hidden",
          minHeight: OFFICE_HEIGHT_MIN_PX,
        }}
      >
        <ClientStyleMount
          id="office-command-center-animations"
          cssText={OFFICE_ANIMATIONS_CSS}
        />

        <div className="nexus-hq-consoleShell__grid" aria-hidden="true" />

        <div style={{ position: "absolute", inset: 0 }}>
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
          <div className="nexus-hq-consoleShell__missionCell">
            <span className="nexus-hq-consoleShell__missionLabel">State</span>
            <strong className="nexus-hq-consoleShell__missionValue">{roomMissionState}</strong>
            <span className="nexus-hq-consoleShell__missionNote">{roomMissionLabel}</span>
          </div>
          <div className="nexus-hq-consoleShell__missionCell">
            <span className="nexus-hq-consoleShell__missionLabel">Front</span>
            <strong className="nexus-hq-consoleShell__missionValue">{primaryFront.label}</strong>
            <span className="nexus-hq-consoleShell__missionNote">{primaryFront.note}</span>
          </div>
          <div className="nexus-hq-consoleShell__missionCell">
            <span className="nexus-hq-consoleShell__missionLabel">Runtime</span>
            <strong className="nexus-hq-consoleShell__missionValue">
              {runtimeStatusLabel}
            </strong>
            <span className="nexus-hq-consoleShell__missionNote">{runtimePhaseLabel}</span>
          </div>
          <div className="nexus-hq-consoleShell__missionCell">
            <span className="nexus-hq-consoleShell__missionLabel">Command note</span>
            <strong className="nexus-hq-consoleShell__missionValue">{commandTempo}</strong>
            <span className="nexus-hq-consoleShell__missionNote">{roomMissionNote}</span>
          </div>
        </div>

        <div
          className="nexus-hq-consoleShell__briefings"
          style={{ position: "absolute", right: 12, top: 52, zIndex: 55 }}
        >
          <ModeBriefingPanel onOpenTab={onOpenBriefingTab} />
        </div>
      </div>

      <div
        onMouseDown={onStartResize}
        onDoubleClick={onResetSplit}
        onKeyDown={onHandleSplitterKey}
        title="Drag to resize office/chat. Double-click to reset."
        role="separator"
        tabIndex={0}
        aria-label="Resize office and chat panels"
        aria-orientation="horizontal"
        aria-valuemin={OFFICE_HEIGHT_MIN_PX}
        aria-valuemax={OFFICE_HEIGHT_MAX_PX}
        aria-valuenow={officeHeightPx ?? OFFICE_HEIGHT_MIN_PX}
        style={{
          flexShrink: 0,
          height: compactSplitControls ? 34 : 30,
          borderLeft: "1px solid rgba(162,180,193,0.14)",
          borderRight: "1px solid rgba(162,180,193,0.14)",
          borderBottom: "1px solid rgba(162,180,193,0.14)",
          background: "rgba(10,13,16,0.94)",
          cursor: splitDragLocked ? "not-allowed" : "row-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          outline: "none",
          padding: "0 10px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: 74,
            height: 6,
            borderRadius: 999,
            border: "1px solid rgba(162,180,193,0.18)",
            background: "rgba(255,255,255,0.04)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            flexShrink: 0,
          }}
        />
        {!!officeHeightPx && !compactSplitControls && viewportHeight > 0 ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: ".05em",
              color: "var(--text3)",
              userSelect: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {Math.round((officeHeightPx / viewportHeight) * 100)}%
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onResetSplit();
          }}
          title="Reset office/chat split"
          style={{
            borderRadius: 999,
            border: "1px solid rgba(162,180,193,0.18)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text2)",
            padding: "2px 8px",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".05em",
            cursor: "pointer",
            lineHeight: 1.5,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          RESET LAYOUT
        </button>
        {!compactSplitControls ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSplitLock();
            }}
            title="Prevent accidental drag resizing"
            style={{
              borderRadius: 999,
              border: `1px solid ${
                splitDragLocked ? "rgba(132,217,141,.46)" : "rgba(162,180,193,0.18)"
              }`,
              background: splitDragLocked
                ? "rgba(16,185,129,0.14)"
                : "rgba(255,255,255,0.03)",
              color: splitDragLocked ? "#10b981" : "var(--text2)",
              padding: "2px 8px",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: ".05em",
              cursor: "pointer",
              lineHeight: 1.5,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {splitDragLocked ? "UNLOCK SPLIT" : "LOCK SPLIT"}
          </button>
        ) : (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSetShowSplitMore(!showSplitMore);
              }}
              title="More layout controls"
              style={{
                borderRadius: 999,
                border: "1px solid #2a3a6b",
                background: "rgba(13,18,32,0.96)",
                color: "#7ba7d4",
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: ".05em",
                cursor: "pointer",
                lineHeight: 1.5,
                whiteSpace: "nowrap",
              }}
            >
              MORE ▾
            </button>
            {showSplitMore ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  minWidth: 130,
                  borderRadius: 10,
                  border: "1px solid #1f315e",
                  background: "rgba(8,14,28,0.98)",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
                  padding: 6,
                  display: "grid",
                  gap: 6,
                  zIndex: 120,
                  cursor: "default",
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSplitLock();
                    onSetShowSplitMore(false);
                  }}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${
                      splitDragLocked ? "#10b98166" : "#2a3a6b"
                    }`,
                    background: splitDragLocked
                      ? "rgba(16,185,129,0.14)"
                      : "rgba(13,18,32,0.96)",
                    color: splitDragLocked ? "#10b981" : "#7ba7d4",
                    padding: "4px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".04em",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {splitDragLocked ? "Unlock split" : "Lock split"}
                </button>
              </div>
            ) : null}
          </div>
        )}
        {splitNotice ? (
          <span
            style={{
              borderRadius: 999,
              border: "1px solid #1f315e",
              background: "rgba(8,14,28,0.96)",
              color: "#8db3e2",
              padding: "2px 8px",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: ".04em",
              userSelect: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              maxWidth: compactSplitControls ? 120 : undefined,
              overflow: compactSplitControls ? "hidden" : undefined,
              textOverflow: compactSplitControls ? "ellipsis" : undefined,
            }}
          >
            {splitNotice}
          </span>
        ) : null}
      </div>
    </>
  );
}
