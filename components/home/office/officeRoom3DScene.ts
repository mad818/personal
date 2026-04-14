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
    position: [0, 5.35, 8.55],
    fov: 42,
    lookAt: [0, 1.0, -0.45],
  },
  closeOps: {
    position: [0, 4.95, 7.65],
    fov: 39,
    lookAt: [0, 1.05, -0.55],
  },
  wallReadability: {
    position: [0, 5.05, 7.95],
    fov: 37,
    lookAt: [0, 1.38, -0.32],
  },
};

export const RADIUS_BY_ID: Record<OfficeObjectId, number> = {
  serverRack: 0.48,
  plantBackLeft: 0.35,
  plantBottomLeft: 0.3,
  waterCooler: 0.34,
  trashCan: 0.26,
  fuelGauge: 0.24,
  conferenceTable: 1.05,
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
      floor: "#2a2520",
      floorGrid: "#4b4036",
      wall: "#d6c9b6",
      wallPanel: "#c8baa6",
      trim: "#8b6b4b",
      sideWall: "#cfc2af",
      baseboard: "#6f533b",
      ambient: "#ffe5bf",
      dir: "#ffd49a",
      bg: "#f1e6d9",
      rugOuter: "#37424f",
      rugInner: "#4b5a69",
      deskWood: "#7b5a40",
      deskWoodDark: "#60442f",
      glass: "#d7e7ff",
      upholstery: "#5f6a78",
      metalDark: "#5a6877",
      skin: "#f1c27d",
      suit: "#4b5a69",
      shirt: "#e7edf5",
    };
  }
  if (tod === "afternoon") {
    return {
      floor: "#29241f",
      floorGrid: "#47403a",
      wall: "#c9beb0",
      wallPanel: "#b8ac9d",
      trim: "#7b6247",
      sideWall: "#c0b4a6",
      baseboard: "#694f39",
      ambient: "#f8dcc0",
      dir: "#ffd3ad",
      bg: "#e8ddd0",
      rugOuter: "#343f4c",
      rugInner: "#465462",
      deskWood: "#74543b",
      deskWoodDark: "#5a412e",
      glass: "#cfe0fb",
      upholstery: "#586273",
      metalDark: "#556474",
      skin: "#efbe79",
      suit: "#465361",
      shirt: "#e4eaf2",
    };
  }
  return {
    floor: "#1a1514",
    floorGrid: "#382b29",
    wall: "#272120",
    wallPanel: "#1d1818",
    trim: "#7a5d41",
    sideWall: "#221c1d",
    baseboard: "#46352b",
    ambient: "#cfaa77",
    dir: "#f1d2a4",
    bg: "#090709",
    rugOuter: "#2b1f21",
    rugInner: "#4a3638",
    deskWood: "#5a4031",
    deskWoodDark: "#422d24",
    glass: "#98b7d9",
    upholstery: "#47393b",
    metalDark: "#5b4a47",
    skin: "#e7b772",
    suit: "#3d4652",
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
