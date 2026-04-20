import type { AgentId, OfficeObjectId, OfficeObjectPos } from "./types";

export type Vec3 = [number, number, number];
export type DispatchState = { from: AgentId; to: AgentId } | null;
export type OfficeCameraPreset = "cinematic" | "closeOps" | "wallReadability";
export type OfficeVfxQuality = "off" | "low" | "high";
export type WallFrontTone = "steady" | "warning" | "critical";
export type OfficeMissionState = "standby" | "routing" | "handoff" | "executing";
export type OfficeTimeOfDay = "morning" | "afternoon" | "night";

export const CAMERA_PRESETS: Record<
  OfficeCameraPreset,
  { position: Vec3; fov: number; lookAt: Vec3 }
> = {
  cinematic: {
    position: [0, 5.02, 8.1],
    fov: 39,
    lookAt: [0, 1.08, -0.22],
  },
  closeOps: {
    position: [0, 4.76, 7.18],
    fov: 36,
    lookAt: [0, 1.14, -0.28],
  },
  wallReadability: {
    position: [0, 4.86, 7.5],
    fov: 34,
    lookAt: [0, 1.34, -0.12],
  },
};

export const RADIUS_BY_ID: Record<OfficeObjectId, number> = {
  serverRack: 0.48,
  plantBackLeft: 0.35,
  plantBottomLeft: 0.3,
  waterCooler: 0.34,
  trashCan: 0.26,
  fuelGauge: 0.24,
  conferenceTable: 1.18,
  sofa: 0.95,
  janskyDesk: 0.78,
  cipherDesk: 0.62,
  fluxDesk: 0.62,
  orbitDesk: 0.62,
  novaDesk: 0.62,
};

export const AGENT_3D_STYLES: Record<
  AgentId,
  {
    suit: string;
    shirt: string;
    hair: string;
    tie?: string;
    headphones?: boolean;
    glasses?: boolean;
    beard?: boolean;
    hood?: boolean;
    hat?: boolean;
    cap?: boolean;
    accessoryColor?: string;
  }
> = {
  jansky: {
    suit: "#ef4444",
    shirt: "#e7edf5",
    hair: "#b45309",
    tie: "#c0392b",
  },
  orbit: { suit: "#818cf8", shirt: "#dbeafe", hair: "#fbbf24", hood: true },
  nova: { suit: "#f59e0b", shirt: "#e4eaf2", hair: "#7a3c18", glasses: true },
  cipher: {
    suit: "#3b82f6",
    shirt: "#dbeafe",
    hair: "#0f172a",
    beard: true,
    hat: true,
    accessoryColor: "#4a3b2c",
  },
  flux: {
    suit: "#10b981",
    shirt: "#e4eaf2",
    hair: "#8b5e3c",
    cap: true,
    accessoryColor: "#111827",
  },
};

export function toWorld(pos: OfficeObjectPos): Vec3 {
  const roomW = 10;
  const roomD = 6;
  const px = pos.ax === "r" ? 100 - pos.x : pos.x;
  const py = pos.ay === "b" ? 100 - pos.y : pos.y;
  const x = (px / 100) * roomW - roomW / 2;
  const z = (py / 100) * roomD - roomD / 2;
  return [x, 0, z];
}

export function fromWorld(p: Vec3, prev: OfficeObjectPos): OfficeObjectPos {
  const roomW = 10;
  const roomD = 6;
  const px = ((p[0] + roomW / 2) / roomW) * 100;
  const py = ((p[2] + roomD / 2) / roomD) * 100;
  const x = prev.ax === "r" ? 100 - px : px;
  const y = prev.ay === "b" ? 100 - py : py;
  return { ...prev, x, y };
}

export function clampWorld(p: Vec3): Vec3 {
  const x = Math.max(-4.7, Math.min(4.7, p[0]));
  const z = Math.max(-2.7, Math.min(2.7, p[2]));
  return [x, p[1], z];
}

export function clampWorldByRadius(p: Vec3, radius: number): Vec3 {
  const marginX = Math.min(4.6, Math.max(0.2, radius));
  const marginZ = Math.min(2.6, Math.max(0.2, radius));
  const x = Math.max(-5 + marginX, Math.min(5 - marginX, p[0]));
  const z = Math.max(-3 + marginZ, Math.min(3 - marginZ, p[2]));
  return [x, p[1], z];
}

export function getTimeOfDay(): OfficeTimeOfDay {
  const h = new Date().getHours();
  if (h >= 7 && h < 9) return "morning";
  if (h >= 14 && h < 16) return "afternoon";
  return "night";
}

export function scenePalette(tod: OfficeTimeOfDay) {
  if (tod === "morning") {
    return {
      floor: "#09111a",
      floorGrid: "#1a3047",
      wall: "#0f1a26",
      wallPanel: "#0b141f",
      trim: "#31516f",
      sideWall: "#0d1722",
      baseboard: "#1d3146",
      ambient: "#82b2ff",
      dir: "#d8ecff",
      bg: "#050d16",
      rugOuter: "#07121c",
      rugInner: "#102131",
      deskWood: "#18344c",
      deskWoodDark: "#102536",
      glass: "#c6dcff",
      upholstery: "#183145",
      metalDark: "#20384a",
      skin: "#f1c27d",
      suit: "#415667",
      shirt: "#e7edf5",
    };
  }
  if (tod === "afternoon") {
    return {
      floor: "#070d15",
      floorGrid: "#183048",
      wall: "#0c1621",
      wallPanel: "#08111a",
      trim: "#294862",
      sideWall: "#0b141d",
      baseboard: "#1a2e43",
      ambient: "#78acff",
      dir: "#cfe7ff",
      bg: "#040913",
      rugOuter: "#07111a",
      rugInner: "#10202f",
      deskWood: "#173047",
      deskWoodDark: "#0d2031",
      glass: "#bfd6fb",
      upholstery: "#163043",
      metalDark: "#203648",
      skin: "#efbe79",
      suit: "#3f5365",
      shirt: "#e4eaf2",
    };
  }
  return {
    floor: "#040910",
    floorGrid: "#14304b",
    wall: "#09111a",
    wallPanel: "#050c14",
    trim: "#1f4060",
    sideWall: "#071019",
    baseboard: "#14283a",
    ambient: "#5b96e8",
    dir: "#b5d4ff",
    bg: "#01050a",
    rugOuter: "#040a12",
    rugInner: "#0a1825",
    deskWood: "#143049",
    deskWoodDark: "#0c1d2d",
    glass: "#8fb6e9",
    upholstery: "#132231",
    metalDark: "#1d3547",
    skin: "#e7b772",
    suit: "#364859",
    shirt: "#dfe7f1",
  };
}

export function commandTempoColor(commandTempo: string) {
  if (commandTempo === "Critical") return "#ef4444";
  if (commandTempo === "Compressed") return "#f59e0b";
  if (commandTempo === "Active") return "#00DDFF";
  return "#10b981";
}

export function frontToneColor(tone: WallFrontTone) {
  if (tone === "critical") return "#ef4444";
  if (tone === "warning") return "#f59e0b";
  return "#10b981";
}

export function missionStateColor(state: OfficeMissionState) {
  if (state === "executing") return "#00DDFF";
  if (state === "handoff") return "#f59e0b";
  if (state === "routing") return "#a78bfa";
  return "#10b981";
}

export function agentToShadowWorld(xPct: number, yPct: number): Vec3 {
  const roomW = 10;
  const roomD = 6;
  const x = (xPct / 100) * roomW - roomW / 2;
  const z = (yPct / 100) * roomD - roomD / 2;
  return [x, 0.012, z];
}
