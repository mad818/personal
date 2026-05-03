"use client";

import { memo, useMemo } from "react";
import type { AgentId } from "@/components/home/office/types";
import type { DispatchBar } from "@/components/home/office/officeCommandCenterConfig";
import type { OfficeVfxQuality } from "@/components/home/office/officeRoom3DScene";
import type { SurfaceMotionProfile } from "@/lib/surfaceMotion";
import { ARPG_GAME_TITLE } from "@/lib/arpgGameContent";
import { deriveArpgVfxSnapshot } from "@/lib/arpgVfx";
import { useStore } from "@/store/useStore";
import ArpgHud from "./ArpgHud";
import ArpgPhaserGame from "./phaser/ArpgPhaserGame";
import ArpgPixiStage from "./pixi/ArpgPixiStage";

interface ArpgRoom3DProps {
  activeAgent: AgentId | null;
  dispatchBar: DispatchBar | null;
  motionProfile: SurfaceMotionProfile;
  motionIntensity: number;
  vfxQuality: OfficeVfxQuality;
  runtimeStatusLabel: string;
  onSwitchToCommandRoom: () => void;
}

function ArpgRoom3DInner({
  activeAgent,
  dispatchBar,
  motionProfile,
  motionIntensity,
  vfxQuality,
  runtimeStatusLabel,
  onSwitchToCommandRoom,
}: ArpgRoom3DProps) {
  const save = useStore((s) => s.arpgSave);
  const reducedMotion =
    motionProfile === "reduced" || motionIntensity <= 0.2 || vfxQuality === "off";
  const vfxSnapshot = useMemo(
    () =>
      deriveArpgVfxSnapshot({
        save,
        activeAgent,
        runtimeStatusLabel,
        reducedMotion,
      }),
    [activeAgent, reducedMotion, runtimeStatusLabel, save],
  );

  return (
    <div
      data-testid="arpg-room"
      data-renderer="phaser"
      aria-label={`${ARPG_GAME_TITLE} Phaser RPG room`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 42%, rgba(255, 209, 102, 0.16), transparent 26%), linear-gradient(135deg, #1d120a 0%, #120d0a 48%, #071012 100%)",
      }}
    >
      <ArpgPhaserGame
        activeAgent={activeAgent}
        dispatchBar={dispatchBar}
        reducedMotion={reducedMotion}
        motionIntensity={motionIntensity}
        runtimeStatusLabel={runtimeStatusLabel}
      />
      <ArpgPixiStage {...vfxSnapshot} motionIntensity={motionIntensity} />
      <ArpgHud
        activeAgent={activeAgent}
        runtimeStatusLabel={runtimeStatusLabel}
        onSwitchToCommandRoom={onSwitchToCommandRoom}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

export const ArpgRoom3D = memo(ArpgRoom3DInner);
