"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "@/store/useStore";
import * as THREE from "three";
import type { AgentId, OfficeObjectId, OfficeObjectPos } from "./types";
import {
  AGENTS,
  OFFICE_OBJECT_DEFAULTS,
  TOOL_POSE_MAP,
  AGENT_WORK_POSE,
} from "./constants";
import type { AgentPoseType } from "./constants";

type Vec3 = [number, number, number];
type DispatchState = { from: AgentId; to: AgentId } | null;
type OfficeCameraPreset = "cinematic" | "closeOps" | "wallReadability";
type OfficeVfxQuality = "off" | "low" | "high";
type WallFrontTone = "steady" | "warning" | "critical";

const CAMERA_PRESETS: Record<
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

// Stable radii map used by world position clamping/anchoring.
const RADIUS_BY_ID: Record<OfficeObjectId, number> = {
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

// Per-agent 3D appearance overrides (Stranger Things theming).
// Agent meshes are simple primitives; these tweaks give each character a distinct look.
const AGENT_3D_STYLES: Record<
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
  }, // MAX
  orbit: { suit: "#818cf8", shirt: "#dbeafe", hair: "#fbbf24", hood: true }, // EL
  nova: { suit: "#f59e0b", shirt: "#e4eaf2", hair: "#7a3c18", glasses: true }, // DUSTIN
  cipher: {
    suit: "#3b82f6",
    shirt: "#dbeafe",
    hair: "#0f172a",
    beard: true,
    hat: true,
    accessoryColor: "#4a3b2c",
  }, // HOPPER
  flux: {
    suit: "#10b981",
    shirt: "#e4eaf2",
    hair: "#8b5e3c",
    cap: true,
    accessoryColor: "#111827",
  }, // LUCAS
};

function toWorld(pos: OfficeObjectPos): Vec3 {
  // 100% → 10 world units (room is roughly 10x6)
  const roomW = 10;
  const roomD = 6;

  const px = pos.ax === "r" ? 100 - pos.x : pos.x;
  const py = pos.ay === "b" ? 100 - pos.y : pos.y;

  const x = (px / 100) * roomW - roomW / 2;
  const z = (py / 100) * roomD - roomD / 2;
  return [x, 0, z];
}

function fromWorld(p: Vec3, prev: OfficeObjectPos): OfficeObjectPos {
  const roomW = 10;
  const roomD = 6;

  const px = ((p[0] + roomW / 2) / roomW) * 100;
  const py = ((p[2] + roomD / 2) / roomD) * 100;

  // Preserve anchoring scheme used by 2D editor.
  const x = prev.ax === "r" ? 100 - px : px;
  const y = prev.ay === "b" ? 100 - py : py;

  return { ...prev, x, y };
}

function clampWorld(p: Vec3): Vec3 {
  // Room bounds with margins.
  const x = Math.max(-4.7, Math.min(4.7, p[0]));
  const z = Math.max(-2.7, Math.min(2.7, p[2]));
  return [x, p[1], z];
}

function clampWorldByRadius(p: Vec3, radius: number): Vec3 {
  const marginX = Math.min(4.6, Math.max(0.2, radius));
  const marginZ = Math.min(2.6, Math.max(0.2, radius));
  const x = Math.max(-5 + marginX, Math.min(5 - marginX, p[0]));
  const z = Math.max(-3 + marginZ, Math.min(3 - marginZ, p[2]));
  return [x, p[1], z];
}

function Furniture3D({
  nightFactor,
  tod,
  enabled,
  worldPos,
  radiusById,
  tryMove,
}: {
  nightFactor: number;
  tod: "morning" | "afternoon" | "night";
  enabled: boolean;
  worldPos: Record<OfficeObjectId, Vec3>;
  radiusById: Record<OfficeObjectId, number>;
  tryMove: (id: OfficeObjectId, world: Vec3) => void;
}) {
  // Phase 2: furniture is now draggable with collision guardrails.
  const pal = scenePalette(tod);

  const ScreenGlow = ({
    color,
    pos,
    live,
  }: {
    color: string;
    pos: Vec3;
    live?: boolean;
  }) => {
    const ref = useRef<THREE.Mesh | null>(null);
    useFrame((state) => {
      const m = ref.current;
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const t = state.clock.getElapsedTime();
      const base = 0.1 + nightFactor * 0.28;
      const pulse = live
        ? 0.45 + Math.sin(t * 6.0) * 0.18
        : 0.22 + Math.sin(t * 2.3) * 0.1;
      mat.emissiveIntensity = (base + pulse) * 1.0;
    });

    return (
      <mesh ref={ref} position={pos} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[0.35, 0.14, 0.02]} />
        <meshStandardMaterial
          color="#0b1220"
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.92}
          metalness={0}
        />
      </mesh>
    );
  };

  const deskIds: Array<{
    id: OfficeObjectId;
    agent: AgentId;
    width: number;
    depth: number;
  }> = [
    { id: "janskyDesk", agent: "jansky", width: 1.25, depth: 0.65 },
    { id: "cipherDesk", agent: "cipher", width: 0.95, depth: 0.55 },
    { id: "fluxDesk", agent: "flux", width: 0.95, depth: 0.55 },
    { id: "orbitDesk", agent: "orbit", width: 0.95, depth: 0.55 },
    { id: "novaDesk", agent: "nova", width: 0.95, depth: 0.55 },
  ];

  return (
    <>
      {/* Center rug to anchor the room composition */}
      <mesh
        position={[0, 0.011, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[4.9, 3.2]} />
        <meshStandardMaterial
          color={pal.rugOuter}
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>
      <mesh
        position={[0, 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[4.65, 2.95]} />
        <meshStandardMaterial
          color={pal.rugInner}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>
      {/* AO contact shadow discs — darkened circles under major furniture for depth */}
      {[
        { pos: worldPos.conferenceTable, r: 1.35 },
        { pos: worldPos.sofa, r: 1.05 },
        { pos: worldPos.serverRack, r: 0.4 },
        { pos: worldPos.waterCooler, r: 0.28 },
      ].map(({ pos, r }, i) => (
        <mesh
          key={`ao-${i}`}
          position={[pos[0], 0.009, pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow={false}
        >
          <circleGeometry args={[r, 24]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Circulation lane guides */}
      <mesh
        position={[0, 0.013, 1.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[8.8, 0.36]} />
        <meshStandardMaterial
          color="#5a6472"
          transparent
          opacity={0.22}
          roughness={1}
        />
      </mesh>
      <mesh
        position={[0, 0.013, -0.95]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[8.8, 0.2]} />
        <meshStandardMaterial
          color="#5a6472"
          transparent
          opacity={0.16}
          roughness={1}
        />
      </mesh>

      {/* Conference table (center) */}
      <DraggableProp
        id="conferenceTable"
        pos={{ x: 50, y: 50, ax: "l", ay: "t" }}
        color="#2a1c10"
        size={[1.9, 0.06, 1.2]}
        y={0.26}
        radius={radiusById.conferenceTable}
        enabled={enabled}
        worldPos={worldPos}
        radiusById={radiusById}
        onMoveWorld={tryMove}
      />
      <mesh
        position={[
          worldPos.conferenceTable[0],
          0.3,
          worldPos.conferenceTable[2],
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.7, 0.06, 1.0]} />
        <meshStandardMaterial color={pal.deskWood} roughness={0.9} />
      </mesh>
      {/* Faux wood grain lines */}
      {[-0.35, -0.17, 0, 0.17, 0.35].map((z, i) => (
        <mesh
          key={`table-grain-${i}`}
          position={[
            worldPos.conferenceTable[0],
            0.334,
            worldPos.conferenceTable[2] + z,
          ]}
          castShadow={false}
        >
          <boxGeometry args={[1.55, 0.004, 0.012]} />
          <meshStandardMaterial
            color={pal.deskWoodDark}
            roughness={0.75}
            metalness={0.02}
          />
        </mesh>
      ))}
      {/* Table accent strip + embedded terminal */}
      <mesh
        position={[
          worldPos.conferenceTable[0],
          0.34,
          worldPos.conferenceTable[2],
        ]}
        castShadow={false}
      >
        <boxGeometry args={[0.55, 0.03, 0.28]} />
        <meshStandardMaterial
          color="#1e2936"
          emissive="#000000"
          emissiveIntensity={0}
          roughness={0.55}
        />
      </mesh>
      {/* Conference chairs */}
      {[
        [-1.05, 0.18, 0],
        [1.05, 0.18, 0],
        [0, 0.18, -0.72],
        [0, 0.18, 0.72],
      ].map((c, i) => (
        <group
          key={`chair-${i}`}
          position={[
            worldPos.conferenceTable[0] + c[0],
            c[1],
            worldPos.conferenceTable[2] + c[2],
          ]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.14, 0.34]} />
            <meshStandardMaterial color="#20262e" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.17, -0.11]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.22, 0.08]} />
            <meshStandardMaterial color="#2a323d" roughness={0.78} />
          </mesh>
        </group>
      ))}

      {/* Sofa (bottom center) */}
      <DraggableProp
        id="sofa"
        pos={{ x: 50, y: 97, ax: "l", ay: "t" }}
        color="#16102c"
        size={[1.7, 0.18, 0.55]}
        y={0.22}
        radius={radiusById.sofa}
        enabled={enabled}
        worldPos={worldPos}
        radiusById={radiusById}
        onMoveWorld={tryMove}
      />
      <mesh
        position={[worldPos.sofa[0], 0.31, worldPos.sofa[2]]}
        castShadow={false}
      >
        <boxGeometry args={[1.7, 0.08, 0.52]} />
        <meshStandardMaterial color={pal.upholstery} roughness={0.95} />
      </mesh>
      <mesh
        position={[worldPos.sofa[0], 0.39, worldPos.sofa[2] - 0.15]}
        castShadow={false}
      >
        <boxGeometry args={[1.62, 0.14, 0.16]} />
        <meshStandardMaterial color={pal.upholstery} roughness={0.9} />
      </mesh>
      {/* Coffee table */}
      <mesh
        position={[worldPos.sofa[0], 0.18, worldPos.sofa[2] - 0.85]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.95, 0.06, 0.5]} />
        <meshStandardMaterial color="#3f3022" roughness={0.86} />
      </mesh>

      {/* Desks */}
      {deskIds.map(({ id, agent, width, depth }) => {
        const center = worldPos[id];
        const isJ = agent === "jansky";
        const monY = 0.3;
        const monOffsetX = isJ ? 0.28 : 0.22;

        return (
          <group key={id}>
            <DraggableProp
              id={id}
              pos={{ x: 50, y: 50, ax: "l", ay: "t" }}
              color="#12102a"
              size={[width, 0.12, depth]}
              y={0.14}
              radius={radiusById[id]}
              enabled={enabled}
              worldPos={worldPos}
              radiusById={radiusById}
              onMoveWorld={tryMove}
            />
            <ScreenGlow
              color={AGENTS[agent].color}
              pos={[center[0] - monOffsetX, monY, center[2] - 0.02]}
            />
            <ScreenGlow
              color={AGENTS[agent].color}
              pos={[center[0] + monOffsetX, monY, center[2] - 0.02]}
            />
            {/* Monitor glass overlays */}
            <mesh
              position={[center[0] - monOffsetX, monY, center[2] - 0.009]}
              castShadow={false}
            >
              <boxGeometry args={[0.31, 0.12, 0.004]} />
              <meshStandardMaterial
                color={pal.glass}
                transparent
                opacity={0.16}
                roughness={0.05}
                metalness={0.1}
              />
            </mesh>
            <mesh
              position={[center[0] + monOffsetX, monY, center[2] - 0.009]}
              castShadow={false}
            >
              <boxGeometry args={[0.31, 0.12, 0.004]} />
              <meshStandardMaterial
                color={pal.glass}
                transparent
                opacity={0.16}
                roughness={0.05}
                metalness={0.1}
              />
            </mesh>
            {/* Desk underglow for depth */}
            <mesh
              position={[center[0], 0.07, center[2]]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[Math.max(width, depth) * 0.56, 20]} />
              <meshBasicMaterial color="#6b7280" transparent opacity={0.03} />
            </mesh>
            {/* Workstation props: keyboard + notebook + mug */}
            <mesh
              position={[center[0], 0.23, center[2] + 0.08]}
              castShadow={false}
            >
              <boxGeometry args={[0.22, 0.015, 0.08]} />
              <meshStandardMaterial color="#1c2432" roughness={0.75} />
            </mesh>
            <mesh
              position={[center[0] - 0.18, 0.23, center[2] + 0.08]}
              castShadow={false}
            >
              <boxGeometry args={[0.11, 0.015, 0.08]} />
              <meshStandardMaterial color="#dbe6f6" roughness={0.65} />
            </mesh>
            <mesh
              position={[center[0] + 0.18, 0.245, center[2] + 0.08]}
              castShadow={false}
            >
              <cylinderGeometry args={[0.028, 0.03, 0.045, 10]} />
              <meshStandardMaterial color="#8b5e3c" roughness={0.6} />
            </mesh>
            {/* Cable drop */}
            <mesh
              position={[center[0], 0.16, center[2] - 0.18]}
              castShadow={false}
            >
              <cylinderGeometry args={[0.007, 0.007, 0.22, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function getTimeOfDay(): "morning" | "afternoon" | "night" {
  const h = new Date().getHours();
  if (h >= 7 && h < 9) return "morning";
  if (h >= 14 && h < 16) return "afternoon";
  return "night";
}

function scenePalette(tod: "morning" | "afternoon" | "night") {
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

function SceneAtmosphere({ bg }: { bg: string }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 9, 18);
  }, [scene, bg]);
  return null;
}

function commandTempoColor(commandTempo: string) {
  if (commandTempo === "Critical") return "#ef4444";
  if (commandTempo === "Compressed") return "#f59e0b";
  if (commandTempo === "Active") return "#00DDFF";
  return "#10b981";
}

function frontToneColor(tone: WallFrontTone) {
  if (tone === "critical") return "#ef4444";
  if (tone === "warning") return "#f59e0b";
  return "#10b981";
}

function agentToShadowWorld(xPct: number, yPct: number): Vec3 {
  const roomW = 10;
  const roomD = 6;
  const x = (xPct / 100) * roomW - roomW / 2;
  const z = (yPct / 100) * roomD - roomD / 2;
  return [x, 0.012, z];
}

function RoomShell({ tod }: { tod: "morning" | "afternoon" | "night" }) {
  const pal = scenePalette(tod);

  // Procedural floor tile canvas texture (G4C)
  const floorTex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const SIZE = 512;
    const TILE = 64; // pixels per tile cell
    const cvs = document.createElement("canvas");
    cvs.width = SIZE;
    cvs.height = SIZE;
    const ctx = cvs.getContext("2d")!;
    // Base fill
    ctx.fillStyle = pal.floor;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Tile grain noise — subtle random brightness per tile
    for (let ty = 0; ty < SIZE / TILE; ty++) {
      for (let tx = 0; tx < SIZE / TILE; tx++) {
        const brightness = 0.92 + Math.random() * 0.12;
        ctx.fillStyle = `rgba(${Math.round(brightness * 20)},${Math.round(brightness * 22)},${Math.round(brightness * 28)},0.18)`;
        ctx.fillRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);
      }
    }
    // Grout lines
    ctx.strokeStyle = pal.floorGrid;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    for (let x = 0; x <= SIZE; x += TILE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= SIZE; y += TILE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 3);
    tex.anisotropy = 4;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tod]);

  return (
    <>
      {/* Floor — canvas tile texture (G4C) replaces flat color + line-segment grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial
          map={floorTex ?? undefined}
          color={floorTex ? "#ffffff" : pal.floor}
          roughness={0.94}
          metalness={0.05}
        />
      </mesh>
      {/* Subtle floor sheen lane (polish wear pattern) */}
      <mesh
        position={[0, 0.004, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[8.6, 0.7]} />
        <meshStandardMaterial
          color="#cbd5e1"
          transparent
          opacity={0.04}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.25, -3]} receiveShadow>
        <boxGeometry args={[10, 2.5, 0.2]} />
        <meshStandardMaterial color={pal.wall} roughness={0.93} />
      </mesh>
      {/* Back wall panel band */}
      <mesh position={[0, 1.15, -2.89]} receiveShadow={false}>
        <boxGeometry args={[9.2, 0.85, 0.02]} />
        <meshStandardMaterial color={pal.wallPanel} roughness={0.95} />
      </mesh>
      {/* Wall horizontal trims */}
      <mesh position={[0, 0.78, -2.88]} receiveShadow={false}>
        <boxGeometry args={[9.2, 0.03, 0.02]} />
        <meshStandardMaterial color={pal.trim} roughness={0.85} />
      </mesh>
      {/* Removed upper trim band: it read like a "fixture" overlay across the window. */}

      {/* Left wall */}
      <mesh position={[-5, 1.25, 0]} receiveShadow>
        <boxGeometry args={[0.2, 2.5, 6]} />
        <meshStandardMaterial color={pal.sideWall} roughness={0.95} />
      </mesh>

      {/* Right wall */}
      <mesh position={[5, 1.25, 0]} receiveShadow>
        <boxGeometry args={[0.2, 2.5, 6]} />
        <meshStandardMaterial color={pal.sideWall} roughness={0.95} />
      </mesh>

      {/* Ceiling — closes the room so it doesn't look open-topped */}
      <mesh
        position={[0, 2.46, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial
          color={
            tod === "night"
              ? "#1a2230"
              : tod === "morning"
                ? "#d0c6ba"
                : "#c4b9aa"
          }
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {/* Ceiling trim band along all four walls */}
      <mesh position={[0, 2.44, -2.9]} rotation={[0, 0, 0]}>
        <boxGeometry args={[9.9, 0.06, 0.04]} />
        <meshStandardMaterial color={pal.trim} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.44, 2.9]} rotation={[0, 0, 0]}>
        <boxGeometry args={[9.9, 0.06, 0.04]} />
        <meshStandardMaterial color={pal.trim} roughness={0.85} />
      </mesh>
      <mesh position={[-4.9, 2.44, 0]}>
        <boxGeometry args={[0.04, 0.06, 5.8]} />
        <meshStandardMaterial color={pal.trim} roughness={0.85} />
      </mesh>
      <mesh position={[4.9, 2.44, 0]}>
        <boxGeometry args={[0.04, 0.06, 5.8]} />
        <meshStandardMaterial color={pal.trim} roughness={0.85} />
      </mesh>

      {/* Window visuals are provided by `CityWindow` (procedural LA skyline). */}
      {/* Baseboard around floor edge */}
      <mesh position={[0, 0.09, -2.89]}>
        <boxGeometry args={[9.8, 0.08, 0.08]} />
        <meshStandardMaterial color={pal.baseboard} roughness={0.88} />
      </mesh>
      <mesh position={[-4.89, 0.09, 0]}>
        <boxGeometry args={[0.08, 0.08, 5.8]} />
        <meshStandardMaterial color={pal.baseboard} roughness={0.88} />
      </mesh>
      <mesh position={[4.89, 0.09, 0]}>
        <boxGeometry args={[0.08, 0.08, 5.8]} />
        <meshStandardMaterial color={pal.baseboard} roughness={0.88} />
      </mesh>

      {/* Wall decor frames */}
      {[
        [-2.8, 1.2, -2.88],
        [2.8, 1.2, -2.88],
      ].map((p, i) => (
        <group key={`frame-${i}`} position={p as Vec3}>
          <mesh>
            <boxGeometry args={[0.9, 0.62, 0.03]} />
            <meshStandardMaterial color="#4a3726" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <boxGeometry args={[0.78, 0.5, 0.01]} />
            <meshStandardMaterial
              color={tod === "night" ? "#2a3342" : "#8aa9c8"}
              emissive={tod === "night" ? "#3b82f6" : "#94a3b8"}
              emissiveIntensity={0.08}
              roughness={0.7}
            />
          </mesh>
        </group>
      ))}

      {/* Whiteboard (briefing wall) */}
      {/* Moved left so it doesn't occlude the window view */}
      <group position={[-3.1, 1.25, -2.87]}>
        <mesh>
          <boxGeometry args={[1.8, 0.85, 0.025]} />
          <meshStandardMaterial color="#d8e3ef" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.34, 0.015]}>
          <boxGeometry args={[1.8, 0.04, 0.02]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} />
        </mesh>
      </group>

      {/* Storage cabinet on left wall */}
      <group position={[-4.62, 0.65, 1.95]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.42, 1.3, 0.62]} />
          <meshStandardMaterial color="#3a4350" roughness={0.8} />
        </mesh>
        {[0.38, 0, -0.38].map((y, i) => (
          <mesh key={`cab-shelf-${i}`} position={[0.13, y, 0.31]}>
            <boxGeometry args={[0.08, 0.08, 0.01]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Wall clock — animated hands (updates live) */}
      <LiveClock />
    </>
  );
}

// ── Live wall clock — hands rotate in real time ───────────────────────────────
function LiveClock() {
  const hourRef = useRef<THREE.Mesh | null>(null);
  const minRef = useRef<THREE.Mesh | null>(null);
  const secRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    // Rotate around Z — negative because clock face is front-facing (+Z)
    if (hourRef.current)
      hourRef.current.rotation.z = -((h + m / 60) / 12) * Math.PI * 2;
    if (minRef.current)
      minRef.current.rotation.z = -((m + s / 60) / 60) * Math.PI * 2;
    if (secRef.current) secRef.current.rotation.z = -(s / 60) * Math.PI * 2;
  });

  return (
    <group position={[4.55, 1.85, -1.6]}>
      {/* Clock face */}
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 24]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </mesh>
      {/* Clock face disc */}
      <mesh position={[0, 0.017, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {/* Hour hand */}
      <mesh
        ref={hourRef}
        position={[0, 0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <boxGeometry args={[0.012, 0.072, 0.005]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* Minute hand */}
      <mesh
        ref={minRef}
        position={[0, 0.022, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <boxGeometry args={[0.008, 0.098, 0.004]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Second hand */}
      <mesh
        ref={secRef}
        position={[0, 0.024, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <boxGeometry args={[0.004, 0.11, 0.003]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* Center dot */}
      <mesh position={[0, 0.026, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.012, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

function WallMountedPanels({
  activeAgent,
  articlesCount,
  pricesCount,
  worldRisk,
  modelLabel,
  agentStats,
  commandTempo,
  primaryFront,
  controls,
}: {
  activeAgent?: AgentId | null;
  articlesCount: number;
  pricesCount: number;
  worldRisk: number;
  modelLabel: string;
  agentStats: Record<string, { totalTasks: number; lastConfidence: number }>;
  commandTempo: string;
  primaryFront: {
    label: string;
    value: string;
    note: string;
    tone: WallFrontTone;
  };
  controls?: {
    officeEditMode: boolean;
    onToggleEditMode: () => void;
    onResetLayout: () => void;
    onOpenMemory: () => void;
    onOpenScheduler: () => void;
    onOpenPrimaryFront: () => void;
    onOpenSweep: () => void;
    onOpenForge: () => void;
    onOpenDoctrine: () => void;
    cameraPreset: OfficeCameraPreset;
    onSetCameraPreset: (p: OfficeCameraPreset) => void;
    vfxQuality: OfficeVfxQuality;
    onSetVfxQuality: (q: OfficeVfxQuality) => void;
  };
}) {
  const ids = Object.keys(AGENTS) as AgentId[];
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);
  const [hoverCtl, setHoverCtl] = useState(false);
  const [hoverCmd, setHoverCmd] = useState(false);
  const { prices, fg, cves } = useStore((s) => ({
    prices: s.prices,
    fg: s.signals?.fg,
    cves: s.cves,
  }));
  const btc = prices["bitcoin"];
  const totalTasks = Object.values(agentStats).reduce(
    (sum, a) => sum + a.totalTasks,
    0,
  );
  const ready = pricesCount > 0 && articlesCount > 0;
  const tempoColor =
    commandTempo === "Critical"
      ? "#ef4444"
      : commandTempo === "Compressed"
        ? "#f59e0b"
        : commandTempo === "Active"
          ? "#00DDFF"
          : "#10b981";
  const frontColor =
    primaryFront.tone === "critical"
      ? "#ef4444"
      : primaryFront.tone === "warning"
        ? "#f59e0b"
        : "#10b981";
  return (
    <>
      {/* Left wall roster board (closer to camera/agents) */}
      <group position={[-4.86, 1.54, -0.38]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.2, 1.55, 0.03]} />
          <meshStandardMaterial
            color={hoverLeft ? "#172033" : "#111827"}
            roughness={0.78}
            metalness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.74, 0.012]}>
          <boxGeometry args={[2.2, 0.07, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.65} />
        </mesh>
        <Html transform position={[0, 0.08, 0.02]} distanceFactor={2.2}>
          <div
            onMouseEnter={() => setHoverLeft(true)}
            onMouseLeave={() => setHoverLeft(false)}
            style={{
              width: 290,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#9fb3d7",
              cursor: "pointer",
              filter: hoverLeft ? "brightness(1.07)" : "none",
              transition: "filter 120ms ease",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: ".11em",
                marginBottom: 8,
              }}
            >
              WALL ROSTER
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {ids.map((id) => {
                const cfg = AGENTS[id];
                const st = agentStats[id];
                const conf = Math.max(
                  0,
                  Math.min(100, Number(st?.lastConfidence ?? 0)),
                );
                const confColor =
                  conf >= 80 ? "#00FF66" : conf >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div
                    key={id}
                    style={{
                      border: `1px solid ${cfg.color}30`,
                      borderRadius: 6,
                      padding: "4px 6px",
                      background: "rgba(8,12,22,0.78)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: cfg.color,
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          color: cfg.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {cfg.name}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          color: "#7e8fab",
                          maxWidth: 130,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cfg.role}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          height: 5,
                          borderRadius: 999,
                          overflow: "hidden",
                          border: "1px solid #2b364d",
                          background: "#111827",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${conf}%`,
                            background: confColor,
                          }}
                        />
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#8fa2c4",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {st
                          ? `${st.totalTasks}T ${Math.round(conf)}%`
                          : "IDLE"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Html>
      </group>

      {/* Right wall system board (closer to camera/agents) */}
      <group position={[4.86, 1.28, 0.55]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.95, 1.2, 0.03]} />
          <meshStandardMaterial
            color={hoverRight ? "#172033" : "#111827"}
            roughness={0.78}
            metalness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.56, 0.012]}>
          <boxGeometry args={[1.95, 0.07, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.65} />
        </mesh>
        <Html transform position={[0, 0.14, 0.02]} distanceFactor={2.35}>
          <div
            onMouseEnter={() => setHoverRight(true)}
            onMouseLeave={() => setHoverRight(false)}
            style={{
              width: 290,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#9fb3d7",
              cursor: "pointer",
              filter: hoverRight ? "brightness(1.1)" : "none",
              transition: "filter 120ms ease",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: ".12em",
                marginBottom: 10,
              }}
            >
              SYS
            </div>
            {[
              [
                "Signals",
                String(articlesCount),
                articlesCount > 0 ? "#10b981" : "#ef4444",
              ],
              [
                "Tickers",
                String(pricesCount),
                pricesCount > 0 ? "#10b981" : "#6875a0",
              ],
              [
                "Risk",
                String(worldRisk),
                worldRisk > 4
                  ? "#ef4444"
                  : worldRisk > 1
                    ? "#f59e0b"
                    : "#10b981",
              ],
              ["Model", modelLabel, "#f59e0b"],
              [
                "Active",
                activeAgent ? AGENTS[activeAgent].name : "—",
                activeAgent ? AGENTS[activeAgent].color : "#6875a0",
              ],
              ["Tempo", commandTempo, tempoColor],
              ["Theater", primaryFront.label, frontColor],
            ].map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#7e8fab", fontWeight: 600 }}>
                  {label}
                </span>
                <span style={{ color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(126,143,171,0.18)",
                fontSize: 11,
                lineHeight: 1.55,
                color: "#90a4c5",
              }}
            >
              {primaryFront.value} · {primaryFront.note}
            </div>
          </div>
        </Html>
      </group>

      {/* Back wall command center KPI board (moves WelcomeHUD off the chat pane) */}
      {/* Align with window centerline */}
      <group position={[-3.1, 1.55, -2.875]} rotation={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.85, 1.05, 0.03]} />
          <meshStandardMaterial
            color={hoverCmd ? "#172033" : "#111827"}
            roughness={0.78}
            metalness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.49, 0.012]}>
          <boxGeometry args={[1.85, 0.07, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.65} />
        </mesh>
        <Html transform position={[0, -0.02, 0.02]} distanceFactor={2.25}>
          <div
            onMouseEnter={() => setHoverCmd(true)}
            onMouseLeave={() => setHoverCmd(false)}
            style={{
              width: 260,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#9fb3d7",
              cursor: "default",
              userSelect: "none",
              filter: hoverCmd ? "brightness(1.08)" : "none",
              transition: "filter 120ms ease",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: ".12em",
                marginBottom: 10,
              }}
            >
              COMMAND CENTER
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 10,
                fontSize: 11,
                color: "#8ea4c7",
              }}
            >
              <span>{primaryFront.label}</span>
              <span style={{ color: tempoColor, fontWeight: 800 }}>
                {commandTempo.toUpperCase()}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              <KpiCard
                label="PRICE"
                value={btc?.price ? `$${(btc.price / 1000).toFixed(1)}K` : "—"}
                sub={
                  btc?.chg !== undefined
                    ? `${btc.chg >= 0 ? "+" : ""}${btc.chg.toFixed(2)}%`
                    : undefined
                }
                color={
                  btc?.chg !== undefined
                    ? btc.chg >= 0
                      ? "#00FF66"
                      : "#ef4444"
                    : "#6875a0"
                }
              />
              <KpiCard
                label="CVE TODAY"
                value={cves.length > 0 ? String(cves.length) : "—"}
                sub={
                  cves.length > 10
                    ? "ELEVATED"
                    : cves.length > 0
                      ? "NORMAL"
                      : undefined
                }
                color={
                  cves.length > 20
                    ? "#ef4444"
                    : cves.length > 5
                      ? "#f59e0b"
                      : "#00DDFF"
                }
              />
              <KpiCard
                label="TASKS RUN"
                value={String(totalTasks)}
                sub={`${Object.keys(agentStats).length} AGENTS`}
                color="#00DDFF"
              />
              <KpiCard
                label="TEMPO"
                value={commandTempo.toUpperCase()}
                sub={ready ? primaryFront.label.toUpperCase() : "CHECK FEEDS"}
                color={tempoColor}
              />
              <KpiCard
                label="WORLD RISK"
                value={worldRisk > 0 ? String(worldRisk) : "—"}
                sub={
                  worldRisk > 70
                    ? "HIGH"
                    : worldRisk > 40
                      ? "MED"
                      : worldRisk > 0
                        ? "LOW"
                        : undefined
                }
                color={
                  worldRisk > 70
                    ? "#ef4444"
                    : worldRisk > 40
                      ? "#f59e0b"
                      : "#00FF66"
                }
              />
              <KpiCard
                label="FEAR & GREED"
                value={fg ? String(fg.value) : "—"}
                sub={fg ? String(fg.label ?? "").toUpperCase() : undefined}
                color={
                  fg
                    ? Number(fg.value) >= 60
                      ? "#00FF66"
                      : Number(fg.value) >= 40
                        ? "#f59e0b"
                        : "#ef4444"
                    : "#6875a0"
                }
              />
            </div>
          </div>
        </Html>
      </group>

      {/* Back wall control board (keeps screen-space overlays off chat) */}
      {controls && (
        <group position={[3.1, 1.55, -2.875]} rotation={[0, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.85, 1.05, 0.03]} />
            <meshStandardMaterial
              color={hoverCtl ? "#172033" : "#111827"}
              roughness={0.78}
              metalness={0.15}
            />
          </mesh>
          <mesh position={[0, 0.49, 0.012]}>
            <boxGeometry args={[1.85, 0.07, 0.02]} />
            <meshStandardMaterial color="#1f2937" roughness={0.65} />
          </mesh>
          <Html transform position={[0, -0.02, 0.02]} distanceFactor={2.25}>
            <div
              onMouseEnter={() => setHoverCtl(true)}
              onMouseLeave={() => setHoverCtl(false)}
              style={{
                width: 260,
                fontFamily: "Inter, system-ui, sans-serif",
                color: "#9fb3d7",
                cursor: "default",
                userSelect: "none",
                filter: hoverCtl ? "brightness(1.08)" : "none",
                transition: "filter 120ms ease",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: ".12em",
                  marginBottom: 10,
                }}
              >
                WALL CONTROL
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={controls.onOpenPrimaryFront}
                    style={ctlBtn(frontColor)}
                  >
                    BRIEF
                  </button>
                  <button
                    type="button"
                    onClick={controls.onOpenSweep}
                    style={ctlBtn("#00DDFF")}
                  >
                    SWEEP
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={controls.onOpenMemory}
                    style={ctlBtn("#4f6ef7")}
                  >
                    MEMORY
                  </button>
                  <button
                    type="button"
                    onClick={controls.onOpenScheduler}
                    style={ctlBtn("#10b981")}
                  >
                    SCHED
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={controls.onOpenForge}
                    style={ctlBtn("#7c3aed")}
                  >
                    FORGE
                  </button>
                  <button
                    type="button"
                    onClick={controls.onOpenDoctrine}
                    style={ctlBtn("#f59e0b")}
                  >
                    DOCTRINE
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={controls.onToggleEditMode}
                    style={ctlBtn(
                      controls.officeEditMode ? "#00FF66" : "#00DDFF",
                    )}
                    title="Toggle layout edit mode"
                  >
                    {controls.officeEditMode ? "EDIT: ON" : "EDIT"}
                  </button>
                  <button
                    type="button"
                    onClick={controls.onResetLayout}
                    style={ctlBtn("#ef4444")}
                    title="Reset office layout"
                  >
                    RESET
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".1em",
                      color: "#7e8fab",
                    }}
                  >
                    CAM
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(
                      ["cinematic", "closeOps", "wallReadability"] as const
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => controls.onSetCameraPreset(p)}
                        style={{
                          ...ctlMiniBtn(
                            controls.cameraPreset === p ? "#00DDFF" : "#7ba7d4",
                          ),
                          borderColor:
                            controls.cameraPreset === p
                              ? "#00DDFF88"
                              : "#24314a",
                          background:
                            controls.cameraPreset === p
                              ? "rgba(0,221,255,0.12)"
                              : "rgba(13,18,32,0.96)",
                        }}
                        title={p}
                      >
                        {p === "cinematic"
                          ? "CIN"
                          : p === "closeOps"
                            ? "OPS"
                            : "WALL"}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".1em",
                      color: "#7e8fab",
                    }}
                  >
                    VFX
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["off", "low", "high"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => controls.onSetVfxQuality(q)}
                        style={{
                          ...ctlMiniBtn(
                            controls.vfxQuality === q ? "#f59e0b" : "#7ba7d4",
                          ),
                          borderColor:
                            controls.vfxQuality === q ? "#f59e0b88" : "#24314a",
                          background:
                            controls.vfxQuality === q
                              ? "rgba(245,158,11,0.14)"
                              : "rgba(13,18,32,0.96)",
                        }}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Html>
        </group>
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${color}22`,
        background: "rgba(8,12,22,0.82)",
        padding: "8px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: ".12em",
          color: "#304060",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: ".06em",
          color,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: `${color}99`,
          }}
        >
          {sub}
        </div>
      ) : (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "transparent",
          }}
        >
          —
        </div>
      )}
    </div>
  );
}

function ctlBtn(color: string): CSSProperties {
  return {
    flex: 1,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: ".12em",
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${color}66`,
    background: "rgba(8,12,22,0.82)",
    color,
    cursor: "pointer",
  };
}

function ctlMiniBtn(color: string): CSSProperties {
  return {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: ".12em",
    padding: "6px 8px",
    borderRadius: 999,
    border: "1px solid #24314a",
    background: "rgba(13,18,32,0.96)",
    color,
    cursor: "pointer",
    minWidth: 44,
  };
}

function CeilingLights({
  nightFactor,
  accentColor,
  commandTempo,
}: {
  nightFactor: number;
  accentColor: string;
  commandTempo: string;
}) {
  const barRefs = useRef<Array<THREE.Mesh | null>>([]);
  const flickerSeed = useMemo(
    () => [Math.random(), Math.random(), Math.random()],
    [],
  );
  const tempoBoost =
    commandTempo === "Critical"
      ? 0.28
      : commandTempo === "Compressed"
        ? 0.18
        : commandTempo === "Active"
          ? 0.12
          : 0.05;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < barRefs.current.length; i++) {
      const m = barRefs.current[i];
      if (!m) continue;
      // Flicker is stronger at night (more dramatic).
      const base = 0.45 + nightFactor * 0.35;
      // Avoid per-frame Math.random() (can cause jank). Use a deterministic wobble instead.
      const s = flickerSeed[i] ?? 0.5;
      const wobble = Math.sin(t * (6.4 + s * 2.2) + i * 3.1) * 0.06;
      const flicker =
        0.78 + Math.sin(t * (2.2 + i * 0.6) + i * 2.1) * 0.1 + wobble;
      const intensity = base * flicker + tempoBoost;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && "emissiveIntensity" in mat) {
        mat.emissive.set(accentColor);
        mat.emissiveIntensity = intensity;
      }
    }
  });
  return (
    <>
      {([-2.8, 0, 2.8] as const).map((x, i) => (
        <mesh
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          position={[x, 2.35, -1.2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.2, 0.05, 0.1]} />
          <meshStandardMaterial
            color="#15120f"
            emissive={accentColor}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </>
  );
}

function StrategiumPulse({
  commandTempo,
  primaryFront,
  accentColor,
}: {
  commandTempo: string;
  primaryFront: {
    label: string;
    value: string;
    note: string;
    tone: WallFrontTone;
  };
  accentColor: string;
}) {
  const outerRef = useRef<THREE.Mesh | null>(null);
  const innerRef = useRef<THREE.Mesh | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const tempoColor = commandTempoColor(commandTempo);
  const frontColor = frontToneColor(primaryFront.tone);
  const pulseRate =
    commandTempo === "Critical"
      ? 2.5
      : commandTempo === "Compressed"
        ? 1.9
        : commandTempo === "Active"
          ? 1.4
          : 0.9;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const wave = 0.62 + (Math.sin(t * pulseRate) + 1) * 0.19;
    const sweep = 0.4 + (Math.sin(t * (pulseRate * 0.55) + 1.3) + 1) * 0.16;
    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshStandardMaterial;
      outerRef.current.scale.setScalar(0.98 + wave * 0.035);
      mat.emissiveIntensity = 0.24 + wave * 0.42;
    }
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      innerRef.current.scale.setScalar(0.99 + sweep * 0.03);
      mat.emissiveIntensity = 0.26 + sweep * 0.5;
    }
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.55 + wave * 0.35;
    }
  });

  return (
    <group position={[0, 0.024, 0]}>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.08, 1.42, 64]} />
        <meshStandardMaterial
          color="#08111a"
          emissive={tempoColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.76, 64]} />
        <meshStandardMaterial
          color="#071019"
          emissive={frontColor}
          emissiveIntensity={0.32}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.19, 0.26, 0.05, 24]} />
        <meshStandardMaterial
          color="#08111a"
          emissive={accentColor}
          emissiveIntensity={0.62}
          metalness={0.18}
          roughness={0.42}
        />
      </mesh>
      <Html transform position={[0, 0.18, 0]} distanceFactor={6.5}>
        <div
          style={{
            minWidth: 180,
            padding: "8px 10px",
            borderRadius: 14,
            border: `1px solid ${tempoColor}33`,
            background: "rgba(7,11,19,0.86)",
            boxShadow: `0 0 28px ${tempoColor}14`,
            color: "#d9e7ff",
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: ".18em",
              color: "#88a1c6",
            }}
          >
            STRATEGIUM FLOOR
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: ".08em",
              color: tempoColor,
            }}
          >
            {primaryFront.label.toUpperCase()} · {commandTempo.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              lineHeight: 1.5,
              color: "#a7bad7",
            }}
          >
            {primaryFront.value}
          </div>
        </div>
      </Html>
    </group>
  );
}

function CityWindow({ nightFactor }: { nightFactor: number }) {
  // Must render *in front* of the back-wall panel band (z ~ -2.89).
  const Z_VIEW = -2.872;
  const Z_GLASS = -2.862;
  const Z_FRAME = -2.858;

  const { gl } = useThree();

  const viewTex = useMemo(() => {
    const t = new THREE.TextureLoader().load("/office/la-skyline.jpg");
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    // Reduce blurriness at oblique angles (window plane).
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [gl]);

  const skyRef = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const sky = skyRef.current;
    if (sky) {
      const mat = sky.material as THREE.MeshStandardMaterial;
      // Night: city glows bright (0.55), morning: gentle (0.14), afternoon: neutral (0.08)
      const targetEmissive = 0.08 + nightFactor * 0.47;
      // Subtle shimmer — city lights twinkle
      const shimmer = nightFactor > 0.5 ? Math.sin(t * 0.8) * 0.04 : 0;
      mat.emissiveIntensity +=
        (targetEmissive + shimmer - mat.emissiveIntensity) * 0.06;
    }
  });

  const frameColor = "#4b5563";
  return (
    <>
      {/* City spill light — cool blue wash from window at night */}
      <pointLight
        position={[0, 1.55, -2.5]}
        intensity={nightFactor * 0.32}
        color="#4870c8"
        distance={4.5}
        decay={2}
      />
      {/* LA skyline photo view */}
      <mesh ref={skyRef} position={[0, 1.55, Z_VIEW]} renderOrder={10}>
        <planeGeometry args={[3.55, 1.25]} />
        <meshStandardMaterial
          map={viewTex}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.08}
          roughness={0.72}
          metalness={0}
          fog={false}
          depthWrite
        />
      </mesh>

      {/* Removed glass tint overlay (was reading as a light-blue wash). */}

      {/* Window frame (border strips so we don't cover the view) */}
      <group position={[0, 1.55, Z_FRAME]} renderOrder={16}>
        {/* top / bottom */}
        <mesh position={[0, 0.64, 0]}>
          <boxGeometry args={[3.64, 0.06, 0.03]} />
          <meshStandardMaterial color={frameColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.64, 0]}>
          <boxGeometry args={[3.64, 0.06, 0.03]} />
          <meshStandardMaterial color={frameColor} roughness={0.85} />
        </mesh>
        {/* left / right */}
        <mesh position={[-1.82, 0, 0]}>
          <boxGeometry args={[0.06, 1.34, 0.03]} />
          <meshStandardMaterial color={frameColor} roughness={0.85} />
        </mesh>
        <mesh position={[1.82, 0, 0]}>
          <boxGeometry args={[0.06, 1.34, 0.03]} />
          <meshStandardMaterial color={frameColor} roughness={0.85} />
        </mesh>
        {/* center mullion */}
        <mesh position={[0, 0, 0.002]}>
          <boxGeometry args={[0.04, 1.28, 0.02]} />
          <meshStandardMaterial color="#2b364d" roughness={0.9} />
        </mesh>
      </group>
    </>
  );
}

function DustParticles({ nightFactor }: { nightFactor: number }) {
  const count = Math.max(60, Math.min(180, Math.round(80 + nightFactor * 70)));
  const points = useMemo(() => {
    const arr: Float32Array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = Math.random() * 2.2 + 0.2;
      // Keep particles in the room volume, but avoid the back-wall window plane
      // so they don't read as a "speckle overlay" on the city view.
      const z = Math.random() * 5.1 - 2.25; // [-2.25 .. 2.85]
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count]);

  const ref = useRef<THREE.Points | null>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pts = ref.current;
    if (!pts) return;
    const m = pts.material as THREE.PointsMaterial;
    // Slightly increase particle visibility at night.
    m.opacity = (0.08 + nightFactor * 0.12) * (0.6 + Math.sin(t * 0.6) * 0.4);
    pts.rotation.y = t * 0.05;
    pts.rotation.x = Math.sin(t * 0.2) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#93c5fd"
        size={0.03}
        opacity={0.12}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

function AgentFloorShadows({
  agentPos,
  activeAgent,
  obstacles = [],
  vfxQuality = "low",
}: {
  agentPos?: Record<AgentId, { x: number; y: number }>;
  activeAgent?: AgentId | null;
  obstacles?: Array<{ x: number; z: number; r: number }>;
  vfxQuality?: OfficeVfxQuality;
}) {
  const pal = useMemo(() => scenePalette("afternoon"), []);
  const agentStats = useStore((s) => s.agentStats);
  const groups = useRef<Array<THREE.Group | null>>([]);
  const glows = useRef<Array<THREE.Mesh | null>>([]);
  const rimRefs = useRef<Array<THREE.Mesh | null>>([]);
  const bodyRefs = useRef<Array<THREE.Group | null>>([]);
  const headRefs = useRef<Array<THREE.Mesh | null>>([]);
  const armLRefs = useRef<Array<THREE.Mesh | null>>([]);
  const armRRefs = useRef<Array<THREE.Mesh | null>>([]);
  const legLRefs = useRef<Array<THREE.Mesh | null>>([]);
  const legRRefs = useRef<Array<THREE.Mesh | null>>([]);
  const elAuraRefs = useRef<Array<THREE.Mesh | null>>([]);
  const elOuterAuraRefs = useRef<Array<THREE.Mesh | null>>([]); // Beyond Tier: second ring (hi only)
  const elOrbRefs = useRef<Array<Array<THREE.Mesh | null>>>([]); // Beyond Tier: 3 floating orbs
  const hopperBeamRefs = useRef<Array<THREE.Mesh | null>>([]);
  const targetRefs = useRef<Record<AgentId, Vec3>>({} as Record<AgentId, Vec3>);
  const initRefs = useRef<Record<AgentId, boolean>>(
    {} as Record<AgentId, boolean>,
  );

  const quality = vfxQuality;
  const vfxOn = quality !== "off";
  const vfxHi = quality === "high";

  const STATURE: Record<AgentId, number> = {
    cipher: 1.12, // Hopper
    nova: 0.92, // Dustin
    orbit: 0.95, // El
    flux: 1.02, // Lucas
    jansky: 1.0, // Max
  };
  const GAIT: Record<AgentId, { amp: number; freq: number }> = {
    cipher: { amp: 0.9, freq: 0.85 },
    nova: { amp: 1.1, freq: 1.1 },
    orbit: { amp: 1.0, freq: 1.0 },
    flux: { amp: 1.05, freq: 1.05 },
    jansky: { amp: 1.0, freq: 1.0 },
  };
  const REST: Record<AgentId, { arm: number; leg: number }> = {
    cipher: { arm: 0.18, leg: 0.04 }, // heavier stance
    nova: { arm: 0.05, leg: 0.02 },
    orbit: { arm: -0.05, leg: 0.03 }, // tucked posture
    flux: { arm: 0.07, leg: 0.03 },
    jansky: { arm: 0.09, leg: 0.02 },
  };

  const resolveObstacles = (target: Vec3): Vec3 => {
    let x = target[0];
    let z = target[2];
    for (let iter = 0; iter < 3; iter++) {
      for (const o of obstacles) {
        const dx = x - o.x;
        const dz = z - o.z;
        const d2 = dx * dx + dz * dz;
        const minR = o.r + 0.28;
        if (d2 < minR * minR) {
          const d = Math.max(0.0001, Math.sqrt(d2));
          const nx = dx / d;
          const nz = dz / d;
          const push = minR - d;
          x += nx * push;
          z += nz * push;
        }
      }
      x = Math.max(-4.55, Math.min(4.55, x));
      z = Math.max(-2.55, Math.min(2.55, z));
    }
    return [x, target[1], z];
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const ids = Object.keys(AGENTS) as AgentId[];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = agentPos?.[id];
      const group = groups.current[i];
      if (group && p) {
        const s = STATURE[id] ?? 1;
        group.scale.set(s, s, s);
        const rawTarget = agentToShadowWorld(p.x, p.y);
        const target = resolveObstacles(rawTarget);
        targetRefs.current[id] = target;
        if (!initRefs.current[id]) {
          group.position.set(target[0], 0, target[2]);
          initRefs.current[id] = true;
        }

        const dx = target[0] - group.position.x;
        const dz = target[2] - group.position.z;
        const dist = Math.hypot(dx, dz);
        const speed = activeAgent === id ? 2.25 : 1.35; // world units / sec
        const step = speed * Math.max(0.001, delta);
        if (dist > 0.001) {
          if (dist <= step) {
            group.position.x = target[0];
            group.position.z = target[2];
          } else {
            group.position.x += (dx / dist) * step;
            group.position.z += (dz / dist) * step;
          }
          // Face travel direction.
          group.rotation.y = Math.atan2(dx, dz);
        }
      }

      const mesh = glows.current[i];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const live = activeAgent === id;
      const breathe =
        0.45 + Math.sin(t * (live ? 4.4 : 2.4) + i) * (live ? 0.28 : 0.16);
      const targetOpacity = live ? 0.28 + breathe * 0.45 : 0.1 + breathe * 0.18;
      mat.opacity += (targetOpacity - mat.opacity) * 0.2;

      // Subtle bobbing on each marker to suggest movement/idle activity.
      const body = bodyRefs.current[i];
      const head = headRefs.current[i];
      const armL = armLRefs.current[i];
      const armR = armRRefs.current[i];
      const legL = legLRefs.current[i];
      const legR = legRRefs.current[i];
      const bob =
        Math.sin(t * (live ? 5.0 : 2.5) + i * 0.7) * (live ? 0.018 : 0.01);
      if (body) body.position.y = 0.24 + bob;
      if (head) head.position.y = 0.5 + bob * 1.2;
      const target = targetRefs.current[id];
      const vel =
        group && p && target
          ? Math.hypot(
              target[0] - group.position.x,
              target[2] - group.position.z,
            )
          : 0;
      const walking = vel > 0.02;
      const gaitCfg = GAIT[id] ?? { amp: 1, freq: 1 };
      const rest = REST[id] ?? { arm: 0, leg: 0 };
      const gait =
        Math.sin(t * (live || walking ? 6.2 : 2.4) * gaitCfg.freq + i * 0.5) *
        (live || walking ? 0.34 : 0.09) *
        gaitCfg.amp;

      // ── Per-agent work pose (G2B) ───────────────────────────────────────────
      // When agent is active and not walking, apply their characteristic work pose.
      const lastTool = agentStats[id]?.lastTask ?? "";
      const mappedPose: AgentPoseType =
        live && !walking
          ? (TOOL_POSE_MAP[lastTool] ?? AGENT_WORK_POSE[id] ?? "idle")
          : "idle";

      let armLRot = rest.arm + gait * 0.9;
      let armRRot = rest.arm + -gait * 0.9;
      let legLRot = rest.leg + -gait * 0.7;
      let legRRot = rest.leg + gait * 0.7;

      if (mappedPose === "type") {
        // Both arms angled forward, rapid micro-vibration
        const vib = Math.sin(t * 14 + i) * 0.06;
        armLRot = -0.45 + vib;
        armRRot = -0.45 - vib;
        legLRot = rest.leg;
        legRRot = rest.leg;
        if (body) body.rotation.x = Math.sin(t * 0.9 + i) * 0.04;
      } else if (mappedPose === "read") {
        // Arms lowered, head tilted toward document
        armLRot = 0.55;
        armRRot = 0.55;
        legLRot = rest.leg;
        legRRot = rest.leg;
        if (head) head.rotation.x = 0.22 + Math.sin(t * 0.5 + i) * 0.04;
      } else if (mappedPose === "search") {
        // Body sways left-right like a scanning motion
        if (body) body.rotation.y = Math.sin(t * 1.6 + i) * 0.25;
        armLRot = -0.2 + Math.sin(t * 1.6 + i) * 0.15;
        armRRot = -0.2 - Math.sin(t * 1.6 + i) * 0.15;
      } else if (mappedPose === "wait") {
        // One arm raised, slight backward lean
        armLRot = -0.85 + Math.sin(t * 1.2 + i) * 0.1;
        armRRot = rest.arm + gait * 0.9;
        if (body) body.rotation.x = -0.06 + Math.sin(t * 0.7 + i) * 0.03;
      } else if (mappedPose === "compute") {
        // Arms crossed (both pulled to center), subtle bob
        armLRot = 0.3;
        armRRot = 0.3;
        if (body) {
          body.rotation.x = 0;
          body.rotation.y = Math.sin(t * 0.6 + i) * 0.08;
        }
      } else {
        // idle — reset rotations that pose states may have modified
        if (body) {
          body.rotation.x = 0;
          body.rotation.y = 0;
        }
        if (head) head.rotation.x = 0;
      }

      if (armL) armL.rotation.x = armLRot;
      if (armR) armR.rotation.x = armRRot;
      if (legL) legL.rotation.x = legLRot;
      if (legR) legR.rotation.x = legRRot;

      // ── Rim highlight (G2C) — animate opacity on the outline mesh ──────────
      const rim = rimRefs.current[i];
      if (rim) {
        const mat = rim.material as THREE.MeshStandardMaterial;
        const targetOpacity = live ? 0.55 + Math.sin(t * 3 + i) * 0.1 : 0;
        mat.opacity += (targetOpacity - mat.opacity) * 0.12;
        rim.visible = mat.opacity > 0.01;
      }

      // VFX: EL aura + Hopper beam (quality gated)
      if (vfxOn) {
        const aura = elAuraRefs.current[i];
        if (aura && id === "orbit") {
          const power = activeAgent === "orbit" ? 1 : walking ? 0.55 : 0.25;
          const base = vfxHi ? 0.55 : 0.28;
          aura.scale.setScalar(0.9 + Math.sin(t * 3.2) * 0.08);
          aura.rotation.y = t * 1.8;
          const mat = aura.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity =
            base * power * (0.7 + Math.sin(t * 4.2) * 0.3);
          mat.opacity = (vfxHi ? 0.28 : 0.18) * power;
        }

        // Beyond Tier: outer aura ring + floating orbs (hi quality only)
        if (vfxHi && id === "orbit") {
          const power = activeAgent === "orbit" ? 1 : walking ? 0.55 : 0.25;
          const outerAura = elOuterAuraRefs.current[i];
          if (outerAura) {
            outerAura.rotation.y = -t * 0.9;
            outerAura.rotation.z = t * 0.4;
            const mat = outerAura.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity =
              0.35 * power * (0.6 + Math.sin(t * 2.8 + 1.2) * 0.4);
            mat.opacity = 0.14 * power;
          }
          const orbRow = elOrbRefs.current[i];
          if (orbRow) {
            for (let o = 0; o < 3; o++) {
              const orb = orbRow[o];
              if (!orb) continue;
              const phase = (o / 3) * Math.PI * 2;
              const radius = 0.17;
              const speed2 = activeAgent === "orbit" ? 2.2 : 1.1;
              orb.position.x = Math.cos(t * speed2 + phase) * radius;
              orb.position.z = Math.sin(t * speed2 + phase) * radius;
              orb.position.y = 0.505 + Math.sin(t * 3.1 + phase) * 0.025;
              const mat = orb.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity =
                0.8 * power * (0.7 + Math.sin(t * 3.8 + phase) * 0.3);
              mat.opacity = 0.55 * power;
            }
          }
        }

        const beam = hopperBeamRefs.current[i];
        if (beam && id === "cipher") {
          const power = activeAgent === "cipher" ? 1 : walking ? 0.5 : 0.2;
          const mat = beam.material as THREE.MeshStandardMaterial;
          mat.opacity = (vfxHi ? 0.22 : 0.14) * power;
          mat.emissiveIntensity = (vfxHi ? 0.65 : 0.35) * power;
          beam.visible = power > 0.12;
          // Beyond Tier: sweep beam arc when cipher is active
          if (vfxHi && activeAgent === "cipher") {
            beam.rotation.y = Math.sin(t * 1.4) * 0.35;
          }
        }
      }
    }
  });

  if (!agentPos) return null;

  const ids = Object.keys(AGENTS) as AgentId[];
  return (
    <>
      {ids.map((id, i) => {
        const p = agentPos[id];
        if (!p) return null;
        const w = agentToShadowWorld(p.x, p.y);
        const live = activeAgent === id;
        const c = AGENTS[id].color;
        const showVfx = vfxQuality !== "off";
        return (
          <group
            key={id}
            ref={(el) => {
              groups.current[i] = el;
            }}
            position={[0, 0, 0]}
          >
            <mesh
              ref={(el) => {
                glows.current[i] = el;
              }}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.012, 0]}
            >
              <circleGeometry args={[0.38, 20]} />
              <meshBasicMaterial
                color="#7b8794"
                transparent
                opacity={live ? 0.22 : 0.1}
              />
            </mesh>

            {/* ── Rim highlight — back-face outline scales slightly larger (G2C) ── */}
            <mesh
              ref={(el) => {
                rimRefs.current[i] = el;
              }}
              position={[0, 0.38, 0]}
              visible={false}
            >
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={1.2}
                side={THREE.BackSide}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>

            {/* ── Speech bubble (G2D) — shown while agent is active ── */}
            {live && (
              <Html
                position={[0, 0.82, 0]}
                center
                distanceFactor={4.5}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    background: "rgba(8,12,24,0.92)",
                    border: `1px solid ${c}55`,
                    borderRadius: 8,
                    padding: "3px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    color: c,
                    whiteSpace: "nowrap",
                    boxShadow: `0 0 8px ${c}44`,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {agentStats[id]?.lastTask
                    ? `⚡ ${agentStats[id].lastTask.replace(/_/g, " ").toUpperCase()}`
                    : "● ACTIVE"}
                </div>
              </Html>
            )}

            <group
              ref={(el) => {
                bodyRefs.current[i] = el;
              }}
              position={[0, 0.24, 0]}
            >
              {/* Torso */}
              <mesh castShadow>
                <boxGeometry args={[0.14, 0.2, 0.08]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].suit}
                  emissive="#000000"
                  emissiveIntensity={0}
                  roughness={0.45}
                />
              </mesh>
              {/* Suit / shirt center strip */}
              <mesh position={[0, -0.01, 0.042]} castShadow={false}>
                <boxGeometry args={[0.04, 0.15, 0.01]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].shirt}
                  roughness={0.5}
                />
              </mesh>
              {/* MAX tie accent */}
              {AGENT_3D_STYLES[id].tie && (
                <mesh position={[0, -0.045, 0.042]} castShadow={false}>
                  <boxGeometry args={[0.013, 0.09, 0.008]} />
                  <meshStandardMaterial
                    color={AGENT_3D_STYLES[id].tie as string}
                    roughness={0.55}
                  />
                </mesh>
              )}
              {/* Arms */}
              <mesh
                ref={(el) => {
                  armLRefs.current[i] = el;
                }}
                position={[-0.1, 0.03, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.02, 0.14, 10]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].suit}
                  roughness={0.55}
                />
              </mesh>
              <mesh
                ref={(el) => {
                  armRRefs.current[i] = el;
                }}
                position={[0.1, 0.03, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.02, 0.14, 10]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].suit}
                  roughness={0.55}
                />
              </mesh>
              {/* Legs */}
              <mesh
                ref={(el) => {
                  legLRefs.current[i] = el;
                }}
                position={[-0.04, -0.16, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.022, 0.022, 0.16, 10]} />
                <meshStandardMaterial color="#111827" roughness={0.7} />
              </mesh>
              <mesh
                ref={(el) => {
                  legRRefs.current[i] = el;
                }}
                position={[0.04, -0.16, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.022, 0.022, 0.16, 10]} />
                <meshStandardMaterial color="#111827" roughness={0.7} />
              </mesh>
              {/* Jacket bulk / shoulders to break the box silhouette */}
              <mesh position={[0, 0.06, 0]} castShadow={false}>
                <boxGeometry args={[0.18, 0.08, 0.1]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].suit}
                  roughness={0.65}
                />
              </mesh>
              {/* MAX Walkman prop */}
              {id === "jansky" && (
                <mesh position={[0.065, -0.035, 0.06]} castShadow={false}>
                  <boxGeometry args={[0.05, 0.06, 0.018]} />
                  <meshStandardMaterial
                    color="#9ca3af"
                    roughness={0.55}
                    metalness={0.25}
                  />
                </mesh>
              )}
              {/* DUSTIN radio prop */}
              {id === "nova" && (
                <mesh position={[-0.07, -0.07, 0.055]} castShadow={false}>
                  <boxGeometry args={[0.055, 0.05, 0.02]} />
                  <meshStandardMaterial
                    color="#6b7280"
                    roughness={0.6}
                    metalness={0.15}
                  />
                </mesh>
              )}
            </group>

            <mesh
              ref={(el) => {
                headRefs.current[i] = el;
              }}
              position={[0, 0.5, 0]}
              castShadow
            >
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshStandardMaterial color={pal.skin} roughness={0.4} />
            </mesh>
            {/* Hair cap */}
            <mesh position={[0, 0.545, 0]} castShadow={false}>
              <sphereGeometry args={[0.052, 10, 10]} />
              <meshStandardMaterial
                color={AGENT_3D_STYLES[id].hair}
                roughness={0.6}
              />
            </mesh>
            {/* EL hood (high-level silhouette distinction) */}
            {AGENT_3D_STYLES[id].hood && (
              <mesh position={[0, 0.5, 0.03]} castShadow={false}>
                <boxGeometry args={[0.16, 0.12, 0.05]} />
                <meshStandardMaterial
                  color={AGENT_3D_STYLES[id].suit}
                  roughness={0.7}
                  metalness={0.05}
                />
              </mesh>
            )}
            {/* Eyes strip */}
            <mesh position={[0, 0.505, 0.062]} castShadow={false}>
              <boxGeometry args={[0.045, 0.012, 0.01]} />
              <meshStandardMaterial color="#111827" roughness={0.3} />
            </mesh>
            {/* EL telekinesis aura ring (quality gated) */}
            {showVfx && id === "orbit" && (
              <mesh
                ref={(el) => {
                  elAuraRefs.current[i] = el;
                }}
                position={[0, 0.505, 0.02]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow={false}
              >
                <torusGeometry args={[0.11, 0.012, 10, 22]} />
                <meshStandardMaterial
                  color="#60a5fa"
                  emissive="#60a5fa"
                  emissiveIntensity={0.25}
                  transparent
                  opacity={0.16}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Beyond Tier: EL outer aura ring (hi quality only) */}
            {vfxQuality === "high" && id === "orbit" && (
              <mesh
                ref={(el) => {
                  elOuterAuraRefs.current[i] = el;
                }}
                position={[0, 0.505, 0.02]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow={false}
              >
                <torusGeometry args={[0.18, 0.008, 8, 24]} />
                <meshStandardMaterial
                  color="#818cf8"
                  emissive="#818cf8"
                  emissiveIntensity={0.2}
                  transparent
                  opacity={0.1}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Beyond Tier: EL floating orbs (hi quality only) */}
            {vfxQuality === "high" &&
              id === "orbit" &&
              ([0, 1, 2] as const).map((o) => (
                <mesh
                  key={o}
                  ref={(el) => {
                    if (!elOrbRefs.current[i]) elOrbRefs.current[i] = [];
                    elOrbRefs.current[i][o] = el;
                  }}
                  position={[0, 0.505, 0]}
                  castShadow={false}
                >
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <meshStandardMaterial
                    color="#60a5fa"
                    emissive="#60a5fa"
                    emissiveIntensity={0.7}
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                  />
                </mesh>
              ))}
            {/* EL nosebleed cue */}
            {id === "orbit" && (
              <mesh position={[0.006, 0.49, 0.072]} castShadow={false}>
                <boxGeometry args={[0.008, 0.012, 0.004]} />
                <meshStandardMaterial color="#ef4444" roughness={0.35} />
              </mesh>
            )}
            {/* EL headphones */}
            {AGENT_3D_STYLES[id].headphones && (
              <>
                <mesh position={[-0.065, 0.525, 0.02]} castShadow={false}>
                  <boxGeometry args={[0.03, 0.03, 0.02]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.55} />
                </mesh>
                <mesh position={[0.065, 0.525, 0.02]} castShadow={false}>
                  <boxGeometry args={[0.03, 0.03, 0.02]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.55} />
                </mesh>
                <mesh position={[0, 0.53, 0.02]} castShadow={false}>
                  <boxGeometry args={[0.16, 0.01, 0.02]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.55} />
                </mesh>
              </>
            )}
            {/* HOPPER hat (simple brim + crown) */}
            {AGENT_3D_STYLES[id].hat && (
              <>
                <mesh position={[0, 0.58, 0.04]} castShadow={false}>
                  <boxGeometry args={[0.16, 0.03, 0.06]} />
                  <meshStandardMaterial
                    color={AGENT_3D_STYLES[id].accessoryColor ?? "#4a3b2c"}
                    roughness={0.7}
                    metalness={0.05}
                  />
                </mesh>
                <mesh position={[0, 0.615, 0.04]} castShadow={false}>
                  <boxGeometry args={[0.07, 0.04, 0.06]} />
                  <meshStandardMaterial
                    color={AGENT_3D_STYLES[id].accessoryColor ?? "#4a3b2c"}
                    roughness={0.7}
                    metalness={0.05}
                  />
                </mesh>
              </>
            )}
            {/* LUCAS cap */}
            {AGENT_3D_STYLES[id].cap && (
              <>
                <mesh position={[0, 0.57, 0.04]} castShadow={false}>
                  <boxGeometry args={[0.16, 0.02, 0.06]} />
                  <meshStandardMaterial
                    color={AGENT_3D_STYLES[id].accessoryColor ?? "#111827"}
                    roughness={0.75}
                  />
                </mesh>
              </>
            )}
            {/* LUCAS headband stripe */}
            {id === "flux" && (
              <mesh position={[0, 0.555, 0.055]} castShadow={false}>
                <boxGeometry args={[0.12, 0.012, 0.004]} />
                <meshStandardMaterial color="#f0c060" roughness={0.5} />
              </mesh>
            )}
            {/* DUSTIN glasses */}
            {AGENT_3D_STYLES[id].glasses && (
              <>
                <mesh position={[-0.03, 0.505, 0.068]} castShadow={false}>
                  <boxGeometry args={[0.03, 0.02, 0.004]} />
                  <meshStandardMaterial color="#111827" roughness={0.3} />
                </mesh>
                <mesh position={[0.03, 0.505, 0.068]} castShadow={false}>
                  <boxGeometry args={[0.03, 0.02, 0.004]} />
                  <meshStandardMaterial color="#111827" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.505, 0.068]} castShadow={false}>
                  <boxGeometry args={[0.02, 0.006, 0.004]} />
                  <meshStandardMaterial color="#111827" roughness={0.3} />
                </mesh>
              </>
            )}
            {/* HOPPER beard shadow */}
            {AGENT_3D_STYLES[id].beard && (
              <mesh position={[0, 0.475, 0.062]} castShadow={false}>
                <boxGeometry args={[0.05, 0.03, 0.01]} />
                <meshStandardMaterial color="#5a3a28" roughness={0.45} />
              </mesh>
            )}
            {/* HOPPER flashlight prop (right hand) */}
            {id === "cipher" && (
              <mesh position={[0.125, 0.34, 0.03]} castShadow={false}>
                <cylinderGeometry args={[0.008, 0.008, 0.07, 10]} />
                <meshStandardMaterial
                  color="#9ca3af"
                  roughness={0.5}
                  metalness={0.35}
                />
              </mesh>
            )}
            {/* HOPPER flashlight beam (cheap volumetric cone) */}
            {showVfx && id === "cipher" && (
              <mesh
                ref={(el) => {
                  hopperBeamRefs.current[i] = el;
                }}
                position={[0.16, 0.34, 0.18]}
                rotation={[0.35, 0, 0]}
                castShadow={false}
              >
                <cylinderGeometry args={[0.01, 0.14, 0.38, 10, 1, true]} />
                <meshStandardMaterial
                  color="#fde68a"
                  emissive="#fde68a"
                  emissiveIntensity={0.35}
                  transparent
                  opacity={0.12}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Role-color chest badge */}
            <mesh position={[0, 0.235, 0.055]} castShadow={false}>
              <boxGeometry args={[0.03, 0.03, 0.01]} />
              <meshStandardMaterial
                color={pal.metalDark}
                roughness={0.55}
                metalness={0.35}
              />
            </mesh>

            {/* ── Matrix spawn overlay (G3) — green column-cascade when agent activates ── */}
            {showVfx && <MatrixOverlay active={live} color={c} />}
          </group>
        );
      })}
    </>
  );
}

// ── MatrixOverlay — column-cascade green rain effect (pixel-agents inspired) ───
// Renders a canvas-texture plane in front of the agent body when they spawn
// or become active. Each pixel column starts at a staggered time, sweeping
// a bright head + fading green trail top-to-bottom.
function MatrixOverlay({ active, color }: { active: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const progressRef = useRef(0);
  const seedsRef = useRef<Float32Array | null>(null);

  // Build a small off-screen canvas once
  const W = 32;
  const H = 64;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cvs = document.createElement("canvas");
    cvs.width = W;
    cvs.height = H;
    canvasRef.current = cvs;
    const tex = new THREE.CanvasTexture(cvs);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    texRef.current = tex;
    // Per-column stagger seeds (0..1)
    seedsRef.current = new Float32Array(W).map(() => Math.random());
    progressRef.current = 0;
  }, []);

  useFrame((state, delta) => {
    if (!active) {
      progressRef.current = 0;
      const mesh = meshRef.current;
      if (mesh) mesh.visible = false;
      return;
    }
    progressRef.current = Math.min(1, progressRef.current + delta * 0.85);
    const progress = progressRef.current;
    const cvs = canvasRef.current;
    const tex = texRef.current;
    const mesh = meshRef.current;
    const seeds = seedsRef.current;
    if (!cvs || !tex || !mesh || !seeds) return;
    mesh.visible = true;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const t = state.clock.getElapsedTime();

    for (let col = 0; col < W; col++) {
      const seed = seeds[col];
      // Each column starts offset by its seed — creates cascading waterfall
      const colProgress = Math.max(
        0,
        Math.min(1, (progress - seed * 0.4) / 0.6),
      );
      if (colProgress <= 0) continue;
      const headY = Math.floor(colProgress * H);

      for (let row = 0; row <= headY; row++) {
        const dist = headY - row;
        if (dist === 0) {
          // Bright white-green head pixel
          ctx.fillStyle = `rgba(200, 255, 180, ${0.9 + Math.sin(t * 12 + col) * 0.08})`;
        } else if (dist < 3) {
          ctx.fillStyle = `rgba(80, 255, 80, ${0.7 - dist * 0.15})`;
        } else if (dist < 8) {
          ctx.fillStyle = `rgba(30, 200, 50, ${0.4 - dist * 0.04})`;
        } else {
          ctx.fillStyle = `rgba(10, 100, 20, ${Math.max(0, 0.15 - dist * 0.01)})`;
        }
        // Hash-based flicker ~70% visibility
        const flicker = ((col * 7 + row * 13 + Math.floor(t * 8)) & 0xff) < 178;
        if (flicker) ctx.fillRect(col, row, 1, 1);
      }
    }

    tex.needsUpdate = true;
    // Fade out as progress nears 1
    const mesh3 = mesh.material as THREE.MeshBasicMaterial;
    mesh3.opacity = progress < 0.85 ? 0.82 : 1 - (progress - 0.85) / 0.15;
  });

  if (typeof document === "undefined") return null;

  return (
    <mesh ref={meshRef} position={[0, 0.38, 0.15]} visible={false}>
      <planeGeometry args={[0.28, 0.72]} />
      <meshBasicMaterial
        map={texRef.current}
        transparent
        opacity={0.82}
        depthWrite={false}
        color={color}
      />
    </mesh>
  );
}

function DispatchBeam({
  dispatchBar,
  agentPos,
}: {
  dispatchBar: DispatchState;
  agentPos?: Record<AgentId, { x: number; y: number }>;
}) {
  const tRef = useRef(0);
  useFrame((_, delta) => {
    tRef.current += delta;
  });

  if (!dispatchBar) return null;
  const from = dispatchBar.from;
  const to = dispatchBar.to;
  const fromPos = agentPos?.[from];
  const toPos = agentPos?.[to];
  if (!fromPos || !toPos) return null;

  const fromWorld = agentToShadowWorld(fromPos.x, fromPos.y);
  const toWorld = agentToShadowWorld(toPos.x, toPos.y);
  const dx = toWorld[0] - fromWorld[0];
  const dz = toWorld[2] - fromWorld[2];
  const dist = Math.max(0.0001, Math.hypot(dx, dz));
  const angle = Math.atan2(dx, dz);
  const progress = Math.min(1, (tRef.current * 1.8) % 1);
  const dotX = fromWorld[0] + dx * progress;
  const dotZ = fromWorld[2] + dz * progress;

  return (
    <group>
      <mesh
        position={[
          (fromWorld[0] + toWorld[0]) / 2,
          0.04,
          (fromWorld[2] + toWorld[2]) / 2,
        ]}
        rotation={[-Math.PI / 2, 0, angle]}
      >
        <planeGeometry args={[0.06, dist]} />
        <meshBasicMaterial
          color={AGENTS[to].color}
          transparent
          opacity={0.45}
        />
      </mesh>
      <mesh position={[dotX, 0.06, dotZ]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial
          color={AGENTS[to].color}
          emissive={AGENTS[to].color}
          emissiveIntensity={0.8}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function DraggableProp({
  id,
  pos,
  color,
  size,
  y = 0,
  radius,
  enabled,
  worldPos,
  radiusById,
  onMoveWorld,
  hideProxyWhenNotEnabled = false,
}: {
  id: OfficeObjectId;
  pos: OfficeObjectPos;
  color: string;
  size: Vec3;
  y?: number;
  radius: number;
  enabled: boolean;
  worldPos: Record<OfficeObjectId, Vec3>;
  radiusById: Record<OfficeObjectId, number>;
  onMoveWorld: (id: OfficeObjectId, world: Vec3) => void;
  hideProxyWhenNotEnabled?: boolean;
}) {
  const world = useMemo(
    () => worldPos[id] ?? toWorld(pos),
    [worldPos, id, pos],
  );
  const ref = useRef<THREE.Mesh | null>(null);
  const blockedUntilRef = useRef(0);
  const [sx, sy, sz] = size;
  const baseY = y ?? sy / 2;

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const now = performance.now();
    const blocked = now < blockedUntilRef.current;
    mat.emissive = new THREE.Color(blocked ? "#ef4444" : "#000000");
    mat.emissiveIntensity = blocked ? 0.7 : 0;
  });

  return (
    <mesh
      ref={ref}
      position={[world[0], baseY, world[2]]}
      castShadow
      visible={enabled || !hideProxyWhenNotEnabled}
      onPointerDown={(e) => {
        if (!enabled) return;
        e.stopPropagation();
        (e.target as any).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!enabled) return;
        if ((e.buttons ?? 0) !== 1) return;
        e.stopPropagation();
        // Move on ground plane using local delta in screen-space projected.
        // R3F gives us a ray; intersect y=0 plane.
        const ray = e.ray;
        const t = ray.direction.y === 0 ? 0 : -ray.origin.y / ray.direction.y;
        const hit: Vec3 = [
          ray.origin.x + ray.direction.x * t,
          0,
          ray.origin.z + ray.direction.z * t,
        ];
        const clamped = clampWorldByRadius(hit, radius);
        // No-overlap guardrails: reject move if footprint intersects another object.
        for (const [otherId, otherPos] of Object.entries(worldPos) as Array<
          [OfficeObjectId, Vec3]
        >) {
          if (otherId === id) continue;
          const r = radius + (radiusById[otherId] ?? 0.25);
          const dx = clamped[0] - otherPos[0];
          const dz = clamped[2] - otherPos[2];
          if (dx * dx + dz * dz < r * r) {
            blockedUntilRef.current = performance.now() + 220;
            return;
          }
        }
        onMoveWorld(id, clamped);
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
      {enabled && (
        <>
          <lineSegments>
            <edgesGeometry
              args={[new THREE.BoxGeometry(sx * 1.02, sy * 1.02, sz * 1.02)]}
            />
            <lineBasicMaterial color="#00DDFF" transparent opacity={0.7} />
          </lineSegments>
          {[
            [-sx / 2, sy / 2, -sz / 2],
            [sx / 2, sy / 2, -sz / 2],
            [-sx / 2, sy / 2, sz / 2],
            [sx / 2, sy / 2, sz / 2],
          ].map((p, i) => (
            <mesh key={i} position={p as Vec3}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#00DDFF" />
            </mesh>
          ))}
        </>
      )}
    </mesh>
  );
}

function OfficeRoom3DInner({
  officeEditMode,
  officeLayout,
  agentPos,
  activeAgent,
  commandTempo = "Calm",
  primaryFront = {
    label: "Vector",
    value: "Steady",
    note: "Balanced command posture.",
    tone: "steady" as WallFrontTone,
  },
  sceneMode = "auto",
  motionIntensity = 1,
  cameraPreset = "cinematic",
  vfxQuality = "low",
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
  dispatchBar = null,
}: {
  officeEditMode: boolean;
  officeLayout: Record<OfficeObjectId, OfficeObjectPos>;
  agentPos?: Record<AgentId, { x: number; y: number }>;
  activeAgent?: AgentId | null;
  commandTempo?: string;
  primaryFront?: {
    label: string;
    value: string;
    note: string;
    tone: WallFrontTone;
  };
  sceneMode?: "auto" | "morning" | "afternoon" | "night";
  motionIntensity?: number;
  cameraPreset?: OfficeCameraPreset;
  vfxQuality?: OfficeVfxQuality;
  onOpenMemory?: () => void;
  onOpenScheduler?: () => void;
  onOpenPrimaryFront?: () => void;
  onOpenSweep?: () => void;
  onOpenForge?: () => void;
  onOpenDoctrine?: () => void;
  onToggleEditMode?: () => void;
  onResetLayout?: () => void;
  onSetCameraPreset?: (p: OfficeCameraPreset) => void;
  onSetVfxQuality?: (q: OfficeVfxQuality) => void;
  dispatchBar?: DispatchState;
}) {
  const [autoTod, setAutoTod] = useState<"morning" | "afternoon" | "night">(
    () => getTimeOfDay(),
  );
  useEffect(() => {
    const id = window.setInterval(() => setAutoTod(getTimeOfDay()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const tod = sceneMode === "auto" ? autoTod : sceneMode;
  const pal = scenePalette(tod);
  const nightFactor = tod === "night" ? 1 : tod === "afternoon" ? 0.55 : 0.75;
  const motion = Math.max(0.25, Math.min(2.5, motionIntensity));
  const setOfficeObjectPos = useStore((s) => s.setOfficeObjectPos);
  const officeMessages = useStore((s) => s.officeMessages);
  const articlesCount = useStore((s) => s.articles.length);
  const pricesCount = useStore((s) => Object.keys(s.prices).length);
  const worldRisk = useStore((s) => s.worldRisk);
  const modelLabel = useStore(
    (s) => s.settings.localModel?.split(":")[0] ?? "auto",
  );
  const agentStats = useStore((s) => s.agentStats);
  const shadowSize = motion >= 1.15 ? 1024 : motion >= 0.85 ? 768 : 512;
  const dprMax = motion >= 1.2 ? 1.75 : motion >= 0.9 ? 1.5 : 1.25;
  const msgCount = officeMessages.length;
  const tempoColor = commandTempoColor(commandTempo);
  const frontColor = frontToneColor(primaryFront.tone);
  const commandAccent = activeAgent ? AGENTS[activeAgent].color : frontColor;
  const tokenEstimate = useMemo(() => {
    return officeMessages.reduce(
      (acc, m) => acc + Math.ceil(m.text.length / 4),
      0,
    );
  }, [officeMessages]);
  const fuelPct = Math.min(1, tokenEstimate / 200_000);
  const trashPct = Math.min(1, msgCount / 40);

  // Persisted layouts may be missing newly-added objects; always fall back to defaults.
  const layout = useMemo(() => {
    return { ...OFFICE_OBJECT_DEFAULTS, ...officeLayout };
  }, [officeLayout]);

  const radiusById = RADIUS_BY_ID;

  const worldPos = useMemo(() => {
    const next: Record<OfficeObjectId, Vec3> = {} as Record<
      OfficeObjectId,
      Vec3
    >;
    (Object.keys(OFFICE_OBJECT_DEFAULTS) as OfficeObjectId[]).forEach((id) => {
      next[id] = clampWorldByRadius(
        toWorld(layout[id]),
        radiusById[id] ?? 0.35,
      );
    });
    return next;
  }, [layout, radiusById]);

  const agentObstacles = useMemo(() => {
    const ids: OfficeObjectId[] = [
      "janskyDesk",
      "cipherDesk",
      "fluxDesk",
      "orbitDesk",
      "novaDesk",
      "conferenceTable",
      "sofa",
      "serverRack",
      "waterCooler",
      "plantBackLeft",
      "plantBottomLeft",
    ];
    return ids.map((id) => ({
      x: worldPos[id][0],
      z: worldPos[id][2],
      r: radiusById[id] ?? 0.35,
    }));
  }, [worldPos, radiusById]);

  const rackVitals = useMemo(() => {
    const cpu = Math.min(95, 20 + msgCount * 1.8 + (activeAgent ? 20 : 0));
    const mem = Math.min(96, 35 + fuelPct * 55);
    const disk = Math.min(99, 42 + msgCount * 0.7);
    return { cpu, mem, disk };
  }, [msgCount, activeAgent, fuelPct]);

  const tryMove = (id: OfficeObjectId, world: Vec3) => {
    const prev = layout[id];
    if (!prev) return;
    setOfficeObjectPos(id, fromWorld(world, prev));
  };

  // NOTE: Phase 1.5: environment is 3D and animated; agent avatars stay 2D/HTML for now.
  const selectedPreset =
    CAMERA_PRESETS[cameraPreset] ?? CAMERA_PRESETS.cinematic;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        shadows
        camera={{
          position: selectedPreset.position,
          fov: selectedPreset.fov,
          near: 0.1,
          far: 50,
        }}
        dpr={[1, dprMax]}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ camera }) => {
          camera.lookAt(
            selectedPreset.lookAt[0],
            selectedPreset.lookAt[1],
            selectedPreset.lookAt[2],
          );
        }}
      >
        <SceneAtmosphere bg={pal.bg} />
        <ambientLight
          intensity={0.34 + nightFactor * 0.18}
          color={pal.ambient}
        />
        <hemisphereLight
          color={tod === "night" ? "#90b9ff" : "#fff6ea"}
          groundColor={tod === "night" ? "#1a2432" : "#3b2f24"}
          intensity={0.3}
        />
        <directionalLight
          position={[4, 7, 5]}
          intensity={0.62 + nightFactor * 0.22}
          color={pal.dir}
          castShadow
          shadow-mapSize-width={shadowSize}
          shadow-mapSize-height={shadowSize}
          shadow-camera-near={0.5}
          shadow-camera-far={22}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        {/* Practical warm desk lamp fill */}
        <pointLight
          position={[0, 1.25, 1.2]}
          intensity={tod === "night" ? 0.26 : 0.18}
          color="#ffd7a8"
          distance={8}
        />
        {/* Cool monitor bounce light */}
        <pointLight
          position={[0, 0.9, -1.5]}
          intensity={tod === "night" ? 0.18 : 0.12}
          color="#9fb7da"
          distance={7}
        />
        {/* Extra practical fixtures for richer office ambience */}
        <pointLight
          position={[-2.7, 2.2, -1.2]}
          intensity={tod === "night" ? 0.14 : 0.11}
          color="#ffe7bf"
          distance={4.8}
        />
        <pointLight
          position={[2.7, 2.2, -1.2]}
          intensity={tod === "night" ? 0.14 : 0.11}
          color="#ffe7bf"
          distance={4.8}
        />
        <pointLight
          position={[0, 2.15, 1.9]}
          intensity={tod === "night" ? 0.11 : 0.08}
          color="#ffd9b0"
          distance={5.2}
        />
        <pointLight
          position={[0, 1.1, 0.2]}
          intensity={tod === "night" ? 0.18 : 0.12}
          color={tempoColor}
          distance={4.2}
        />
        <CeilingLights
          nightFactor={nightFactor * motion}
          accentColor={tempoColor}
          commandTempo={commandTempo}
        />

        {/* ── Per-desk agent colored accent lights ──────────────────────────────
            One small pointLight per agent, positioned 0.9 units above their desk.
            Color matches the agent brand color at low intensity to tint the work area.
            Night raises intensity for dramatic effect. */}
        {(Object.keys(AGENTS) as (keyof typeof AGENTS)[]).map((id) => {
          const deskId = `${id}Desk` as OfficeObjectId;
          const deskPos = worldPos[deskId];
          if (!deskPos) return null;
          const agentColor = AGENTS[id].color;
          const baseIntensity = tod === "night" ? 0.32 : 0.16;
          const activeBoost = activeAgent === id ? 0.22 : 0;
          return (
            <pointLight
              key={`desk-light-${id}`}
              position={[deskPos[0], deskPos[1] + 0.9, deskPos[2]]}
              intensity={baseIntensity + activeBoost}
              color={agentColor}
              distance={1.8}
              decay={2}
            />
          );
        })}

        <RoomShell tod={tod} />
        <StrategiumPulse
          commandTempo={commandTempo}
          primaryFront={primaryFront}
          accentColor={commandAccent}
        />
        <WallMountedPanels
          activeAgent={activeAgent}
          articlesCount={articlesCount}
          pricesCount={pricesCount}
          worldRisk={worldRisk}
          modelLabel={modelLabel}
          agentStats={agentStats}
          commandTempo={commandTempo}
          primaryFront={primaryFront}
          controls={
            onOpenMemory &&
            onOpenScheduler &&
            onOpenPrimaryFront &&
            onOpenSweep &&
            onOpenForge &&
            onOpenDoctrine &&
            onToggleEditMode &&
            onResetLayout &&
            onSetCameraPreset &&
            onSetVfxQuality
              ? {
                  officeEditMode,
                  onToggleEditMode,
                  onResetLayout,
                  onOpenMemory,
                  onOpenScheduler,
                  onOpenPrimaryFront,
                  onOpenSweep,
                  onOpenForge,
                  onOpenDoctrine,
                  cameraPreset,
                  onSetCameraPreset,
                  vfxQuality,
                  onSetVfxQuality,
                }
              : undefined
          }
        />
        <Furniture3D
          nightFactor={nightFactor * motion}
          tod={tod}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          tryMove={tryMove}
        />
        <CityWindow nightFactor={nightFactor * motion} />
        <DustParticles nightFactor={nightFactor * motion} />
        <AgentFloorShadows
          agentPos={agentPos}
          activeAgent={activeAgent}
          obstacles={agentObstacles}
          vfxQuality={vfxQuality}
        />
        <DispatchBeam dispatchBar={dispatchBar} agentPos={agentPos} />

        <DraggableProp
          id="serverRack"
          pos={layout.serverRack}
          color="#223040"
          size={[0.55, 1.2, 0.35]}
          y={0.62}
          radius={radiusById.serverRack}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
        />
        {/* Server rack bay lights */}
        {[0.35, 0.62, 0.88].map((h, i) => (
          <mesh
            key={`rack-led-${i}`}
            position={[
              worldPos.serverRack[0] + 0.2,
              h,
              worldPos.serverRack[2] + 0.16,
            ]}
            castShadow={false}
          >
            <boxGeometry args={[0.06, 0.02, 0.02]} />
            <meshStandardMaterial
              color="#0b1220"
              emissive={i === 1 ? "#22c55e" : "#38bdf8"}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        {/* Server rack detail: front bays + side vents */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`rack-bay-${i}`}
            position={[
              worldPos.serverRack[0] + 0.19,
              0.18 + i * 0.16,
              worldPos.serverRack[2] + 0.165,
            ]}
            castShadow={false}
          >
            <boxGeometry args={[0.18, 0.1, 0.01]} />
            <meshStandardMaterial
              color="#0b1220"
              emissive="#1e293b"
              emissiveIntensity={0.22}
              roughness={0.8}
            />
          </mesh>
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh
            key={`rack-vent-${i}`}
            position={[
              worldPos.serverRack[0] - 0.24,
              0.2 + i * 0.1,
              worldPos.serverRack[2] + 0.14,
            ]}
            castShadow={false}
          >
            <boxGeometry args={[0.02, 0.05, 0.01]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
        ))}
        {/* Rack frame rails */}
        {[-0.23, 0.23].map((x, i) => (
          <mesh
            key={`rack-rail-${i}`}
            position={[
              worldPos.serverRack[0] + x,
              0.62,
              worldPos.serverRack[2] + 0.16,
            ]}
            castShadow={false}
          >
            <boxGeometry args={[0.02, 1.02, 0.02]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.7}
              metalness={0.35}
            />
          </mesh>
        ))}
        {/* Cable bundle from rack */}
        <mesh
          position={[
            worldPos.serverRack[0] - 0.1,
            0.12,
            worldPos.serverRack[2] - 0.24,
          ]}
          rotation={[0.25, 0, 0.35]}
          castShadow={false}
        >
          <cylinderGeometry args={[0.03, 0.035, 0.42, 10]} />
          <meshStandardMaterial color="#111827" roughness={0.95} />
        </mesh>
        {/* Server rack parity meters (CPU/MEM/DSK) */}
        {(["cpu", "mem", "disk"] as const).map((k, i) => {
          const v = rackVitals[k];
          const pct = Math.max(0.05, Math.min(1, v / 100));
          const c = v > 85 ? "#ef4444" : v > 65 ? "#f59e0b" : "#22c55e";
          return (
            <group
              key={`rack-meter-${k}`}
              position={[
                worldPos.serverRack[0] + 0.205,
                1.04 - i * 0.17,
                worldPos.serverRack[2] + 0.17,
              ]}
            >
              <mesh castShadow={false}>
                <boxGeometry args={[0.14, 0.06, 0.008]} />
                <meshStandardMaterial color="#0b1220" roughness={0.9} />
              </mesh>
              <mesh
                position={[-0.07 + pct * 0.07, 0, 0.006]}
                castShadow={false}
              >
                <boxGeometry args={[0.14 * pct, 0.034, 0.006]} />
                <meshStandardMaterial
                  color={c}
                  emissive={c}
                  emissiveIntensity={0.45}
                />
              </mesh>
            </group>
          );
        })}
        <DraggableProp
          id="waterCooler"
          pos={layout.waterCooler}
          color="#0d1826"
          size={[0.35, 1.1, 0.35]}
          y={0.57}
          radius={radiusById.waterCooler}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
          hideProxyWhenNotEnabled
        />
        {/* Water cooler detail model (used when edit-mode proxy is hidden). */}
        <group
          position={[worldPos.waterCooler[0], 0.57, worldPos.waterCooler[2]]}
          castShadow={false}
        >
          <mesh castShadow={false}>
            <cylinderGeometry args={[0.16, 0.18, 1.05, 16]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.85}
              metalness={0.06}
            />
          </mesh>
          <mesh position={[0, 0.525, 0]} castShadow={false}>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 14]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.525, 0]} castShadow={false}>
            <cylinderGeometry args={[0.21, 0.21, 0.04, 16]} />
            <meshStandardMaterial color="#0b1220" roughness={0.9} />
          </mesh>
          {/* Spout / nozzle */}
          <mesh position={[0.06, 0.05, 0.17]} castShadow={false}>
            <boxGeometry args={[0.05, 0.08, 0.04]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
        </group>
        <DraggableProp
          id="trashCan"
          pos={layout.trashCan}
          color="#222222"
          size={[0.35, 0.45, 0.35]}
          y={0.245}
          radius={radiusById.trashCan}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
          hideProxyWhenNotEnabled
        />
        {/* Trash can detail model + fill indicator */}
        <group
          position={[worldPos.trashCan[0], 0.245, worldPos.trashCan[2]]}
          castShadow={false}
        >
          <mesh castShadow={false}>
            <cylinderGeometry args={[0.16, 0.16, 0.45, 16]} />
            <meshStandardMaterial
              color="#1f2937"
              roughness={0.85}
              metalness={0.03}
            />
          </mesh>
          {/* Lid */}
          <mesh position={[0, 0.215, 0]} castShadow={false}>
            <cylinderGeometry args={[0.165, 0.165, 0.04, 14]} />
            <meshStandardMaterial color="#111827" roughness={0.8} />
          </mesh>
          {/* Fill indicator cylinder (state-driven) */}
          <mesh
            position={[
              0,
              0.02 - 0.245 + Math.max(0.04, trashPct * 0.32) / 2,
              0,
            ]}
            castShadow={false}
          >
            <cylinderGeometry
              args={[0.14, 0.14, Math.max(0.04, trashPct * 0.32), 16]}
            />
            <meshStandardMaterial
              color={
                trashPct > 0.85
                  ? "#ef4444"
                  : trashPct > 0.6
                    ? "#f59e0b"
                    : "#4f6ef7"
              }
              transparent
              opacity={0.48}
              emissive={trashPct >= 1 ? "#ef4444" : "#000000"}
              emissiveIntensity={trashPct >= 1 ? 0.4 : 0}
            />
          </mesh>
          {/* Small inner rim */}
          <mesh position={[0, 0.18, 0]} castShadow={false}>
            <cylinderGeometry args={[0.13, 0.13, 0.02, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
        </group>
        <DraggableProp
          id="fuelGauge"
          pos={layout.fuelGauge}
          color="#0a0f1e"
          size={[0.25, 0.8, 0.25]}
          y={0.42}
          radius={radiusById.fuelGauge}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
          hideProxyWhenNotEnabled
        />
        <DraggableProp
          id="plantBackLeft"
          pos={layout.plantBackLeft}
          color="#4a3423"
          size={[0.3, 0.24, 0.3]}
          y={0.34}
          radius={radiusById.plantBackLeft}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
          hideProxyWhenNotEnabled
        />
        <group
          position={[
            worldPos.plantBackLeft[0],
            0.34,
            worldPos.plantBackLeft[2],
          ]}
        >
          <mesh castShadow={false}>
            <cylinderGeometry args={[0.022, 0.03, 0.26, 8]} />
            <meshStandardMaterial color="#2e5b2f" roughness={0.85} />
          </mesh>
          {[
            [0.0, 0.18, 0.0, 0.17],
            [-0.11, 0.15, 0.05, 0.11],
            [0.11, 0.14, -0.03, 0.1],
            [0.0, 0.26, -0.08, 0.09],
            [-0.06, 0.23, -0.12, 0.08],
          ].map((l, i) => (
            <mesh
              key={`leaf-a-${i}`}
              position={[l[0], l[1], l[2]] as Vec3}
              castShadow={false}
            >
              <sphereGeometry args={[l[3], 10, 10]} />
              <meshStandardMaterial
                color={i % 2 ? "#2f8f45" : "#3ba854"}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
        <DraggableProp
          id="plantBottomLeft"
          pos={layout.plantBottomLeft}
          color="#4a3423"
          size={[0.26, 0.2, 0.26]}
          y={0.3}
          radius={radiusById.plantBottomLeft}
          enabled={officeEditMode}
          worldPos={worldPos}
          radiusById={radiusById}
          onMoveWorld={tryMove}
          hideProxyWhenNotEnabled
        />
        <group
          position={[
            worldPos.plantBottomLeft[0],
            0.3,
            worldPos.plantBottomLeft[2],
          ]}
        >
          <mesh castShadow={false}>
            <cylinderGeometry args={[0.018, 0.025, 0.2, 8]} />
            <meshStandardMaterial color="#2e5b2f" roughness={0.85} />
          </mesh>
          {[
            [0.0, 0.14, 0.0, 0.12],
            [-0.08, 0.12, 0.03, 0.08],
            [0.08, 0.11, -0.02, 0.08],
            [0.0, 0.2, -0.06, 0.06],
          ].map((l, i) => (
            <mesh
              key={`leaf-b-${i}`}
              position={[l[0], l[1], l[2]] as Vec3}
              castShadow={false}
            >
              <sphereGeometry args={[l[3], 10, 10]} />
              <meshStandardMaterial
                color={i % 2 ? "#319a4c" : "#40b65e"}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>

        {/* 3D parity gauge (replaces 2D LLMFuelGauge) */}
        <group position={[worldPos.fuelGauge[0], 0.48, worldPos.fuelGauge[2]]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.11, 0.56, 0.11]} />
            <meshStandardMaterial color="#0a0f1e" roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.25 + fuelPct * 0.25, 0.06]} castShadow={false}>
            <boxGeometry args={[0.07, Math.max(0.02, fuelPct * 0.5), 0.02]} />
            <meshStandardMaterial
              color={
                fuelPct > 0.85
                  ? "#ef4444"
                  : fuelPct > 0.6
                    ? "#f59e0b"
                    : "#22c55e"
              }
              emissive={
                fuelPct > 0.85
                  ? "#ef4444"
                  : fuelPct > 0.6
                    ? "#f59e0b"
                    : "#22c55e"
              }
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>

        {/* Trash fill indicator is rendered inside the trash-can detail group above. */}
      </Canvas>
    </div>
  );
}

export const OfficeRoom3D = memo(OfficeRoom3DInner);
