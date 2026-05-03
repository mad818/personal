"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ARPG_GAME_TITLE } from "@/lib/arpgGameContent";
import PhaseStrip from "@/components/ui/PhaseStrip";
import TaskPlanPanel from "@/components/ui/TaskPlanPanel";
import ClientStyleMount from "@/components/ui/ClientStyleMount";
import { evalGradeColor, evalIndicatorIcon } from "@/lib/helpers";
import {
  useStore,
  type ArpgViewportSize,
  type HqConsoleFocusMode,
} from "@/store/useStore";
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

const ArpgRoom3D = dynamic(
  () => import("@/components/home/arpg/ArpgRoom3D").then((module) => module.ArpgRoom3D),
  {
    ssr: false,
    loading: () => null,
  },
);

const ARPG_STAGE_SIZE_OPTIONS: Array<{
  id: ArpgViewportSize;
  label: string;
  title: string;
  ratio: number;
  minHeight: number;
}> = [
  {
    id: "compact",
    label: "S",
    title: "Small game window for cramped browser panes",
    ratio: 0.34,
    minHeight: 300,
  },
  {
    id: "standard",
    label: "M",
    title: "Balanced game and command split",
    ratio: 0.46,
    minHeight: 360,
  },
  {
    id: "large",
    label: "L",
    title: "Larger game window",
    ratio: 0.6,
    minHeight: 460,
  },
  {
    id: "focus",
    label: "XL",
    title: "Maximum game focus for cramped browser panes",
    ratio: 0.92,
    minHeight: 620,
  },
];

const ARPG_PLAYFIELD_FRAME_STYLES: Record<ArpgViewportSize, CSSProperties> = {
  compact: {
    inset: "58px 34px 50px",
    borderRadius: 20,
  },
  standard: {
    inset: "42px 22px 34px",
    borderRadius: 18,
  },
  large: {
    inset: "18px 10px 12px",
    borderRadius: 16,
  },
  focus: {
    inset: 0,
    borderRadius: 0,
  },
};

const ARPG_STAGE_KEYBOARD_STEP_PX = 28;
const ARPG_STAGE_KEYBOARD_LARGE_STEP_PX = 72;
const ARPG_STAGE_CUSTOM_MAX_PX = 1280;

function resolveArpgStageHeight(size: ArpgViewportSize, viewportHeight: number) {
  const option =
    ARPG_STAGE_SIZE_OPTIONS.find((entry) => entry.id === size) ??
    ARPG_STAGE_SIZE_OPTIONS[1];
  const baseHeight =
    viewportHeight > 0
      ? viewportHeight
      : typeof window !== "undefined"
        ? window.innerHeight
        : 820;
  const maxByViewport = Math.round(baseHeight * 0.93);
  const maxAllowed = Math.min(
    OFFICE_HEIGHT_MAX_PX,
    Math.max(option.minHeight, maxByViewport),
  );
  const target = Math.max(option.minHeight, Math.round(baseHeight * option.ratio));
  return Math.max(OFFICE_HEIGHT_MIN_PX, Math.min(maxAllowed, target));
}

function resolveArpgStageHeightMax(viewportHeight: number) {
  const baseHeight =
    viewportHeight > 0
      ? viewportHeight
      : typeof window !== "undefined"
        ? window.innerHeight
        : 820;
  const viewportCap = Math.round(baseHeight * 1.85);
  return Math.max(
    OFFICE_HEIGHT_MIN_PX,
    Math.min(ARPG_STAGE_CUSTOM_MAX_PX, Math.max(620, viewportCap)),
  );
}

function clampArpgStageHeight(heightPx: number, viewportHeight: number) {
  const maxAllowed = resolveArpgStageHeightMax(viewportHeight);
  return Math.max(
    OFFICE_HEIGHT_MIN_PX,
    Math.min(maxAllowed, Math.round(heightPx)),
  );
}

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
  viewportHeight,
  splitDragLocked,
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
  onSetConsoleFocusMode,
  onApplyStageHeight,
  onToggleSplitLock,
}: HQConsoleShellSectionProps) {
  const hqRoomMode = useStore((s) => s.hqRoomMode);
  const setHqRoomMode = useStore((s) => s.setHqRoomMode);
  const arpgViewportSize = useStore((s) => s.settings.arpgViewportSize);
  const savedArpgStageHeightPx = useStore(
    (s) => s.settings.officeSplitHeightPx,
  );
  const updateSettings = useStore((s) => s.updateSettings);
  const arpgPointerResizeActiveRef = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [arpgStageHeightOverridePx, setArpgStageHeightOverridePx] = useState<
    number | null
  >(() => {
    const savedHeight = Number(savedArpgStageHeightPx || 0);
    return savedHeight > 0
      ? clampArpgStageHeight(savedHeight, viewportHeight)
      : null;
  });
  useEffect(() => {
    setHasMounted(true);
  }, []);
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
  const isGameFocus = consoleFocusMode === "game";
  const presetStageHeightPx = resolveArpgStageHeight(
    arpgViewportSize,
    viewportHeight,
  );
  const effectiveStageHeightPx =
    hqRoomMode === "arpg" && isGameFocus
      ? arpgStageHeightOverridePx ?? presetStageHeightPx
      : officeHeightPx ?? OFFICE_HEIGHT_MIN_PX;
  const displayedStageHeightPx = hasMounted
    ? Math.round(effectiveStageHeightPx)
    : null;
  const stageHeightControlValue =
    displayedStageHeightPx ?? OFFICE_HEIGHT_MIN_PX;
  const stageHeightReadout = displayedStageHeightPx
    ? `${displayedStageHeightPx}PX`
    : "--PX";
  const isCustomArpgStageHeight =
    hqRoomMode === "arpg" &&
    isGameFocus &&
    Math.abs(effectiveStageHeightPx - presetStageHeightPx) > 4;
  const applyCustomArpgStageHeight = useCallback(
    (nextHeight: number) => {
      const clampedHeight = clampArpgStageHeight(nextHeight, viewportHeight);
      setArpgStageHeightOverridePx(clampedHeight);
      updateSettings({ officeSplitHeightPx: clampedHeight });
      return clampedHeight;
    },
    [updateSettings, viewportHeight],
  );
  const applyArpgViewportSize = useCallback(
    (nextSize: ArpgViewportSize) => {
      const nextHeight = resolveArpgStageHeight(nextSize, viewportHeight);
      setArpgStageHeightOverridePx(nextHeight);
      onApplyStageHeight(nextHeight, `Game window ${nextSize}`);
      updateSettings({
        arpgViewportSize: nextSize,
        officeSplitHeightPx: nextHeight,
      });
    },
    [onApplyStageHeight, updateSettings, viewportHeight],
  );
  const resetArpgStageSize = useCallback(() => {
    applyArpgViewportSize("focus");
  }, [applyArpgViewportSize]);
  const resizeArpgStageBy = useCallback(
    (deltaPx: number) => {
      if (splitDragLocked) {
        onToggleSplitLock();
      }
      applyCustomArpgStageHeight(effectiveStageHeightPx + deltaPx);
    },
    [
      applyCustomArpgStageHeight,
      effectiveStageHeightPx,
      onToggleSplitLock,
      splitDragLocked,
    ],
  );
  const startArpgStageResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (hqRoomMode !== "arpg" || !isGameFocus) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      arpgPointerResizeActiveRef.current = true;
      if (splitDragLocked) {
        onToggleSplitLock();
      }

      const startY = event.clientY;
      const startHeight = effectiveStageHeightPx;
      const originalCursor = document.body.style.cursor;
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      const handleMove = (moveEvent: PointerEvent) => {
        applyCustomArpgStageHeight(startHeight + moveEvent.clientY - startY);
      };
      const cleanup = () => {
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;
        arpgPointerResizeActiveRef.current = false;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", cleanup);
      window.addEventListener("pointercancel", cleanup);
    },
    [
      applyCustomArpgStageHeight,
      effectiveStageHeightPx,
      hqRoomMode,
      isGameFocus,
      onToggleSplitLock,
      splitDragLocked,
    ],
  );
  const startArpgStageMouseResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (arpgPointerResizeActiveRef.current) return;
      if (hqRoomMode !== "arpg" || !isGameFocus || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (splitDragLocked) {
        onToggleSplitLock();
      }

      const startY = event.clientY;
      const startHeight = effectiveStageHeightPx;
      const originalCursor = document.body.style.cursor;
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      const handleMove = (moveEvent: MouseEvent) => {
        applyCustomArpgStageHeight(startHeight + moveEvent.clientY - startY);
      };
      const cleanup = () => {
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", cleanup);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", cleanup);
    },
    [
      applyCustomArpgStageHeight,
      effectiveStageHeightPx,
      hqRoomMode,
      isGameFocus,
      onToggleSplitLock,
      splitDragLocked,
    ],
  );
  const handleArpgStageResizeKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey
        ? ARPG_STAGE_KEYBOARD_LARGE_STEP_PX
        : ARPG_STAGE_KEYBOARD_STEP_PX;
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        resizeArpgStageBy(-step);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        resizeArpgStageBy(step);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        if (splitDragLocked) {
          onToggleSplitLock();
        }
        applyCustomArpgStageHeight(OFFICE_HEIGHT_MIN_PX);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        if (splitDragLocked) {
          onToggleSplitLock();
        }
        applyCustomArpgStageHeight(resolveArpgStageHeightMax(viewportHeight));
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetArpgStageSize();
      }
    },
    [
      applyCustomArpgStageHeight,
      onToggleSplitLock,
      resizeArpgStageBy,
      resetArpgStageSize,
      splitDragLocked,
      viewportHeight,
    ],
  );

  useEffect(() => {
    if (arpgStageHeightOverridePx !== null) return;
    const savedHeight = Number(savedArpgStageHeightPx || 0);
    if (savedHeight <= 0) return;
    setArpgStageHeightOverridePx(
      clampArpgStageHeight(savedHeight, viewportHeight),
    );
  }, [arpgStageHeightOverridePx, savedArpgStageHeightPx, viewportHeight]);

  useEffect(() => {
    setArpgStageHeightOverridePx((currentHeight) => {
      if (currentHeight === null) return currentHeight;
      const clampedHeight = clampArpgStageHeight(currentHeight, viewportHeight);
      return clampedHeight === currentHeight ? currentHeight : clampedHeight;
    });
  }, [viewportHeight]);
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
          data-testid="hq-focus-switch"
          aria-label="HQ primary view"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: 3,
            border: "1px solid rgba(178,193,205,0.14)",
            borderRadius: 999,
            background: "rgba(255,255,255,.025)",
          }}
        >
          {[
            { id: "game" as const, label: "Game" },
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
                  border: `1px solid ${
                    active ? "rgba(255,214,150,.42)" : "rgba(255,255,255,.06)"
                  }`,
                  borderRadius: 999,
                  background: active
                    ? "rgba(255, 195, 105, 0.16)"
                    : "rgba(255,255,255,.02)",
                  color: active ? "#ffe1a6" : "rgba(255,255,255,.58)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: ".09em",
                  lineHeight: 1,
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

      {hqRoomMode === "command-room" ? (
        <>
          <PhaseStrip />
          <TaskPlanPanel />
        </>
      ) : null}

      <div
        className="nexus-hq-consoleShell__stage"
        data-testid="hq-arpg-stage"
        data-game-size={hqRoomMode === "arpg" ? arpgViewportSize : undefined}
        data-focus-mode={consoleFocusMode}
        style={{
          position: "relative",
          flex: `0 0 ${isGameFocus ? effectiveStageHeightPx : 92}px`,
          height: isGameFocus ? effectiveStageHeightPx : 92,
          background:
            "linear-gradient(180deg, rgba(10,13,16,0.92), rgba(7,9,11,0.98))",
          border: "1px solid rgba(162,180,193,0.14)",
          borderTop: "none",
          overflow: "hidden",
          minHeight: isGameFocus ? OFFICE_HEIGHT_MIN_PX : 92,
        }}
      >
        <ClientStyleMount
          id="office-command-center-animations"
          cssText={OFFICE_ANIMATIONS_CSS}
        />

        <div className="nexus-hq-consoleShell__grid" aria-hidden="true" />

        {isGameFocus ? (
          <>
        <div
          aria-label="HQ room mode"
          data-testid="hq-game-layout-tools"
          role="group"
          style={{
            position: "absolute",
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            zIndex: 72,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            justifyContent: "center",
            maxWidth: "calc(100% - 24px)",
            padding: 4,
            border: "1px solid rgba(255,214,150,.18)",
            borderRadius: 999,
            background: "rgba(10, 12, 14, 0.72)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 12px 30px rgba(0,0,0,.26)",
          }}
        >
          {[
            { id: "arpg" as const, label: ARPG_GAME_TITLE },
            { id: "command-room" as const, label: "Command room" },
          ].map((mode) => {
            const active = hqRoomMode === mode.id;
            return (
              <button
                key={mode.id}
                data-testid={`hq-room-mode-${mode.id}`}
                type="button"
                onClick={() => setHqRoomMode(mode.id)}
                style={{
                  border: `1px solid ${
                    active ? "rgba(255,214,150,.42)" : "rgba(255,255,255,.08)"
                  }`,
                  borderRadius: 999,
                  background: active
                    ? "rgba(255, 195, 105, 0.16)"
                    : "rgba(255,255,255,.035)",
                  color: active ? "#ffe1a6" : "rgba(255,255,255,.68)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  padding: "4px 8px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {mode.label}
              </button>
            );
          })}
          {hqRoomMode === "arpg" ? (
            <>
              <span
                aria-hidden="true"
                style={{
                  alignSelf: "stretch",
                  borderLeft: "1px solid rgba(255,214,150,.16)",
                  margin: "2px 1px",
                }}
              />
              <span
                data-testid="arpg-stage-size-controls"
                aria-label="Game window size"
                style={{ display: "flex", gap: 3 }}
              >
                {ARPG_STAGE_SIZE_OPTIONS.map((option) => {
                  const active = arpgViewportSize === option.id;
                  return (
                    <button
                      key={option.id}
                      data-testid={`arpg-size-${option.id}`}
                      type="button"
                      aria-pressed={active}
                      title={option.title}
                      onClick={() => applyArpgViewportSize(option.id)}
                      style={{
                        border: `1px solid ${
                          active
                            ? "rgba(255,214,150,.46)"
                            : "rgba(255,255,255,.08)"
                        }`,
                        borderRadius: 999,
                        background: active
                          ? "rgba(255, 195, 105, 0.18)"
                          : "rgba(255,255,255,.03)",
                        color: active ? "#ffe1a6" : "rgba(255,255,255,.64)",
                        cursor: "pointer",
                        fontSize: 8,
                        fontWeight: 950,
                        letterSpacing: ".05em",
                        lineHeight: 1,
                        minWidth: option.id === "focus" ? 25 : 20,
                        padding: "5px 5px",
                      }}
                    >
                      {option.label}
                    </button>
                    );
                  })}
                <button
                  data-testid="hq-reset-layout"
                  type="button"
                  title="Reset to the largest game-first layout"
                  onClick={() => applyArpgViewportSize("focus")}
                  style={{
                    border: "1px solid rgba(255,214,150,.32)",
                    borderRadius: 999,
                    background: "rgba(255,195,105,.1)",
                    color: "#ffe1a6",
                    cursor: "pointer",
                    fontSize: 8,
                    fontWeight: 950,
                    letterSpacing: ".08em",
                    lineHeight: 1,
                    padding: "5px 7px",
                    textTransform: "uppercase",
                  }}
                >
                  Reset
                </button>
                <button
                  data-testid="hq-lock-split"
                  type="button"
                  title="Prevent accidental game resize changes"
                  onClick={onToggleSplitLock}
                  style={{
                    border: `1px solid ${
                      splitDragLocked
                        ? "rgba(16,185,129,.56)"
                        : "rgba(255,214,150,.22)"
                    }`,
                    borderRadius: 999,
                    background: splitDragLocked
                      ? "rgba(16,185,129,.16)"
                      : "rgba(255,255,255,.025)",
                    color: splitDragLocked ? "#34d399" : "rgba(255,240,214,.72)",
                    cursor: "pointer",
                    fontSize: 8,
                    fontWeight: 950,
                    letterSpacing: ".08em",
                    lineHeight: 1,
                    padding: "5px 7px",
                    textTransform: "uppercase",
                  }}
                >
                  {splitDragLocked ? "UNLOCK SIZE" : "LOCK SIZE"}
                </button>
                <span
                  data-testid="hq-game-resize-top-handle"
                  role="separator"
                  aria-label={
                    splitDragLocked
                      ? "Drag to unlock and resize the game window"
                      : "Drag to resize the game window"
                  }
                  aria-orientation="horizontal"
                  aria-valuemin={OFFICE_HEIGHT_MIN_PX}
                  aria-valuemax={resolveArpgStageHeightMax(viewportHeight)}
                  aria-valuenow={stageHeightControlValue}
                  tabIndex={0}
                  onPointerDown={startArpgStageResize}
                  onMouseDown={startArpgStageMouseResize}
                  onDoubleClick={resetArpgStageSize}
                  onKeyDown={handleArpgStageResizeKey}
                  title={
                    splitDragLocked
                      ? "Drag here to unlock and resize"
                      : "Drag this chip up or down. Arrow keys resize. R resets."
                  }
                  style={{
                    alignItems: "center",
                    border: "1px solid rgba(255,214,150,.26)",
                    borderRadius: 999,
                    color: splitDragLocked ? "#34d399" : "#ffe1a6",
                    cursor: "ns-resize",
                    display: "inline-flex",
                    fontSize: 8,
                    fontWeight: 950,
                    gap: 5,
                    letterSpacing: ".07em",
                    lineHeight: 1,
                    padding: "5px 7px",
                    textTransform: "uppercase",
                    touchAction: "none",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 7,
                      borderTop: "2px solid currentColor",
                      borderBottom: "2px solid currentColor",
                      opacity: 0.75,
                    }}
                  />
                  {splitDragLocked ? "Drag unlock" : "Drag"}
                  <span
                    suppressHydrationWarning
                    style={{ color: "rgba(255,255,255,.7)" }}
                  >
                    {stageHeightReadout}
                  </span>
                </span>
                <label
                  data-testid="hq-game-size-slider-shell"
                  style={{
                    alignItems: "center",
                    border: "1px solid rgba(255,214,150,.18)",
                    borderRadius: 999,
                    color: "rgba(255,240,214,.74)",
                    display: "inline-flex",
                    fontSize: 8,
                    fontWeight: 950,
                    gap: 6,
                    letterSpacing: ".08em",
                    lineHeight: 1,
                    padding: "4px 8px",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Size
                  <input
                    data-testid="hq-game-size-slider"
                    type="range"
                    aria-label="Game window height"
                    min={OFFICE_HEIGHT_MIN_PX}
                    max={resolveArpgStageHeightMax(viewportHeight)}
                    step={ARPG_STAGE_KEYBOARD_STEP_PX}
                    value={stageHeightControlValue}
                    onPointerDown={() => {
                      if (splitDragLocked) onToggleSplitLock();
                    }}
                    onInput={(event) => {
                      applyCustomArpgStageHeight(
                        Number(event.currentTarget.value),
                      );
                    }}
                    onChange={(event) => {
                      applyCustomArpgStageHeight(
                        Number(event.currentTarget.value),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowRight" ||
                        event.key === "ArrowUp" ||
                        event.key === "PageUp"
                      ) {
                        event.preventDefault();
                        resizeArpgStageBy(
                          event.key === "PageUp"
                            ? ARPG_STAGE_KEYBOARD_LARGE_STEP_PX
                            : ARPG_STAGE_KEYBOARD_STEP_PX,
                        );
                        return;
                      }
                      if (
                        event.key === "ArrowLeft" ||
                        event.key === "ArrowDown" ||
                        event.key === "PageDown"
                      ) {
                        event.preventDefault();
                        resizeArpgStageBy(
                          event.key === "PageDown"
                            ? -ARPG_STAGE_KEYBOARD_LARGE_STEP_PX
                            : -ARPG_STAGE_KEYBOARD_STEP_PX,
                        );
                        return;
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        applyCustomArpgStageHeight(OFFICE_HEIGHT_MIN_PX);
                        return;
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        applyCustomArpgStageHeight(
                          resolveArpgStageHeightMax(viewportHeight),
                        );
                      }
                    }}
                    style={{
                      accentColor: "#ffc46f",
                      cursor: "ew-resize",
                      height: 12,
                      width: 112,
                    }}
                  />
                </label>
              </span>
            </>
          ) : null}
        </div>

        <div style={{ position: "absolute", inset: 0 }}>
          {hqRoomMode === "arpg" ? (
            <div
              data-testid="arpg-playfield-frame"
              data-game-size={arpgViewportSize}
              style={{
                ...ARPG_PLAYFIELD_FRAME_STYLES[arpgViewportSize],
                position: "absolute",
                overflow: "hidden",
                border: "1px solid rgba(255, 214, 150, 0.18)",
                background:
                  "linear-gradient(180deg, rgba(16, 10, 5, 0.72), rgba(4, 8, 10, 0.82))",
                boxShadow:
                  arpgViewportSize === "focus"
                    ? "none"
                    : "0 20px 48px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.05)",
                transition:
                  "inset 180ms ease, border-radius 180ms ease, box-shadow 180ms ease",
              }}
            >
              <ArpgRoom3D
                activeAgent={activeAgent}
                dispatchBar={dispatchBar}
                motionProfile={effectiveProfile}
                motionIntensity={effectiveOfficeMotion}
                vfxQuality={effectiveOfficeVfxQuality}
                runtimeStatusLabel={runtimeStatusLabel}
                onSwitchToCommandRoom={() => setHqRoomMode("command-room")}
              />
            </div>
          ) : (
            <div
              data-testid="hq-command-room-fallback"
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
          )}
        </div>

        {hqRoomMode === "arpg" ? (
          <div
            data-testid="hq-game-resize-handle"
            role="separator"
            aria-label={
              splitDragLocked
                ? "Game window resize locked"
                : "Drag to resize the game window"
            }
            aria-orientation="horizontal"
            aria-valuemin={OFFICE_HEIGHT_MIN_PX}
            aria-valuemax={resolveArpgStageHeightMax(viewportHeight)}
            aria-valuenow={stageHeightControlValue}
            aria-disabled={splitDragLocked}
            data-locked={splitDragLocked ? "true" : "false"}
            data-custom-size={isCustomArpgStageHeight ? "true" : "false"}
            tabIndex={0}
            onPointerDown={startArpgStageResize}
            onMouseDown={startArpgStageMouseResize}
            onDoubleClick={resetArpgStageSize}
            onKeyDown={handleArpgStageResizeKey}
            title={
              splitDragLocked
                ? "Drag here to unlock and resize the game window"
                : "Drag up or down. Arrow keys resize. R resets."
            }
            style={{
              position: "absolute",
              left: "50%",
              bottom: 8,
              transform: "translateX(-50%)",
              zIndex: 88,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              maxWidth: "calc(100% - 28px)",
              padding: "5px 8px",
              border: `1px solid ${
                splitDragLocked
                  ? "rgba(16,185,129,.34)"
                  : "rgba(255,214,150,.3)"
              }`,
              borderRadius: 999,
              background: "rgba(8, 10, 12, 0.78)",
              boxShadow:
                "0 14px 34px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.05)",
              color: splitDragLocked ? "#34d399" : "#ffe1a6",
              cursor: "ns-resize",
              fontSize: 8,
              fontWeight: 950,
              letterSpacing: ".08em",
              lineHeight: 1,
              textTransform: "uppercase",
              touchAction: "none",
              userSelect: "none",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 38,
                height: 8,
                borderTop: "2px solid currentColor",
                borderBottom: "2px solid currentColor",
                opacity: splitDragLocked ? 0.58 : 0.86,
              }}
            />
            <span>{splitDragLocked ? "Drag to unlock" : "Drag size"}</span>
            <button
              data-testid="hq-game-resize-shrink"
              type="button"
              aria-label="Make game window smaller"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                resizeArpgStageBy(-ARPG_STAGE_KEYBOARD_LARGE_STEP_PX);
              }}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 999,
                background: "rgba(255,255,255,.04)",
                color: "rgba(255,255,255,.78)",
                cursor: "pointer",
                fontSize: 8,
                fontWeight: 950,
                lineHeight: 1,
                padding: "3px 6px",
                textTransform: "uppercase",
              }}
            >
              Less
            </button>
            <span
              data-testid="hq-game-resize-readout"
              suppressHydrationWarning
              style={{
                color: "rgba(255,255,255,.72)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stageHeightReadout}
            </span>
            <button
              data-testid="hq-game-resize-grow"
              type="button"
              aria-label="Make game window larger"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                resizeArpgStageBy(ARPG_STAGE_KEYBOARD_LARGE_STEP_PX);
              }}
              style={{
                border: "1px solid rgba(255,214,150,.24)",
                borderRadius: 999,
                background: "rgba(255,195,105,.1)",
                color: "#ffe1a6",
                cursor: "pointer",
                fontSize: 8,
                fontWeight: 950,
                lineHeight: 1,
                padding: "3px 6px",
                textTransform: "uppercase",
              }}
            >
              More
            </button>
            {isCustomArpgStageHeight ? (
              <span
                data-testid="hq-game-custom-size-chip"
                style={{
                  border: "1px solid rgba(255,214,150,.22)",
                  borderRadius: 999,
                  color: "#ffc46f",
                  padding: "2px 5px",
                }}
              >
                Custom
              </span>
            ) : null}
          </div>
        ) : null}

        {hqRoomMode === "command-room" ? (
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
        ) : null}

        {hqRoomMode === "command-room" ? (
          <div
            className="nexus-hq-consoleShell__briefings"
            style={{ position: "absolute", right: 12, top: 52, zIndex: 55 }}
          >
            <ModeBriefingPanel onOpenTab={onOpenBriefingTab} />
          </div>
        ) : null}
          </>
        ) : (
          <div
            data-testid="hq-chat-focus-panel"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 18px",
              background:
                "linear-gradient(90deg, rgba(12,16,20,.94), rgba(8,10,12,.84)), radial-gradient(circle at 12% 50%, rgba(255,214,150,.12), transparent 32%)",
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
                Chat owns the page right now. Switch to Game when you want the
                playfield back.
              </span>
            </div>
            <button
              data-testid="hq-chat-focus-game-return"
              type="button"
              onClick={() => onSetConsoleFocusMode("game")}
              style={{
                border: "1px solid rgba(255,214,150,.32)",
                borderRadius: 999,
                background: "rgba(255,195,105,.12)",
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
              Show game
            </button>
          </div>
        )}
      </div>

    </>
  );
}
