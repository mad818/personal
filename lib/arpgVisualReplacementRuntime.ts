import { ARPG_ASSET_MANIFEST } from "@/lib/arpgAssetManifest";
import {
  ARPG_VISUAL_REPLACEMENT_CONTENT,
  type ArpgVisualReplacementKind,
  type ArpgVisualReplacementTarget,
} from "@/lib/arpgVisualReplacementContent";

export const PROLOGUE_HIFI_BATCH_ID = "prologue-hifi-story-pack";
export const PROLOGUE_HIFI_RUNTIME_PATH =
  "/arpg/illustrated/prologue-hifi-story-pack.png";

const PROLOGUE_HIFI_FRAME_ORDER = [
  "bellroot-vestibule",
  "wardens-antechamber",
  "ilo-oracle",
  "keeper-elian",
  "descent-ledger",
  "oath-lamp",
  "oracle-cradle",
  "gate-monolith",
  "loom-shard",
  "quiet-forge",
] as const;

const PROLOGUE_STEP_TO_TARGET_ID: Record<string, string> = {
  "descent-ledger": "descent-ledger",
  "oath-lamp-arcade": "oath-lamp",
  "oracle-cradle": "ilo-oracle",
  "gate-monolith": "gate-monolith",
  "loomshard-pedestal": "loom-shard",
  "quiet-forge": "quiet-forge",
  "warden-antechamber": "wardens-antechamber",
};

const COMPANION_VISUAL_TARGET_BY_ID: Record<string, string> = {
  "oracle-guide": "ilo-oracle",
};

const NPC_VISUAL_TARGET_BY_ID: Record<string, string> = {
  "ilo-little-oracle": "ilo-oracle",
  "keeper-elian": "keeper-elian",
};

const REGION_VISUAL_TARGET_BY_ID: Record<string, string> = {
  "first-reliquary": "bellroot-vestibule",
};

const FALLBACK_SHEET_BY_ASSET_ID: Record<
  string,
  {
    sheetPath: string;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
  }
> = {
  "illustrated-location-card-seeds": {
    sheetPath: "/arpg/illustrated/location-cards.png",
    frameCount: 3,
    frameWidth: 320,
    frameHeight: 192,
  },
  "hero-kit-character-portraits": {
    sheetPath: "/arpg/illustrated/hero-kit-character-portraits.png",
    frameCount: 3,
    frameWidth: 256,
    frameHeight: 256,
  },
  "hero-kit-weapons-items": {
    sheetPath: "/arpg/illustrated/hero-kit-weapons-items.png",
    frameCount: 12,
    frameWidth: 96,
    frameHeight: 96,
  },
  "hero-kit-armor-equipment": {
    sheetPath: "/arpg/illustrated/hero-kit-armor-equipment.png",
    frameCount: 8,
    frameWidth: 96,
    frameHeight: 96,
  },
  "enemy-boss-hifi-cards": {
    sheetPath: "/arpg/illustrated/enemy-boss-hifi-cards.png",
    frameCount: 8,
    frameWidth: 320,
    frameHeight: 448,
  },
  "arsenal-vfx-drops": {
    sheetPath: "/arpg/illustrated/arsenal-vfx-drops.png",
    frameCount: 12,
    frameWidth: 128,
    frameHeight: 128,
  },
};

export interface ArpgVisualReplacementFrame {
  targetId: string;
  label: string;
  kind: ArpgVisualReplacementKind;
  source: "prologue-hifi" | "fallback";
  sheetPath: string;
  frame: number;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

function stableFrameFromId(id: string, frameCount: number): number {
  return (
    Array.from(id).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % frameCount
  );
}

function targetById(targetId: string): ArpgVisualReplacementTarget | undefined {
  return ARPG_VISUAL_REPLACEMENT_CONTENT.targets.find(
    (target) => target.id === targetId,
  );
}

function isPrologueHifiRuntimeReady() {
  const asset = ARPG_ASSET_MANIFEST.find(
    (entry) => entry.id === PROLOGUE_HIFI_BATCH_ID,
  );
  if (!asset) return false;
  if (
    asset.tags?.includes("style-rejected") ||
    asset.tags?.includes("reference-only")
  ) {
    return false;
  }
  if (asset.generation?.operatorApproved !== true) return false;
  return (
    asset.localPath === "public/arpg/illustrated/prologue-hifi-story-pack.png"
  );
}

function prologueHifiFrameIndex(targetId: string): number {
  const index = PROLOGUE_HIFI_FRAME_ORDER.indexOf(
    targetId as (typeof PROLOGUE_HIFI_FRAME_ORDER)[number],
  );
  return index >= 0 ? index : 0;
}

function resolveFallbackFrame(
  target: ArpgVisualReplacementTarget,
): ArpgVisualReplacementFrame | null {
  const fallbackAssetId = target.fallbackAssetIds.find(
    (assetId) => FALLBACK_SHEET_BY_ASSET_ID[assetId],
  );
  if (!fallbackAssetId) return null;
  const sheet = FALLBACK_SHEET_BY_ASSET_ID[fallbackAssetId];
  return {
    targetId: target.id,
    label: target.label,
    kind: target.kind,
    source: "fallback",
    sheetPath: sheet.sheetPath,
    frame: stableFrameFromId(target.id, sheet.frameCount),
    frameCount: sheet.frameCount,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
  };
}

export function prologueStepToVisualTargetId(stepId: string): string | null {
  return PROLOGUE_STEP_TO_TARGET_ID[stepId] ?? null;
}

export function entityVisualTargetId(
  entityKind: "companion" | "npc",
  entityId: string,
): string | null {
  if (entityKind === "companion") {
    return COMPANION_VISUAL_TARGET_BY_ID[entityId] ?? null;
  }
  return NPC_VISUAL_TARGET_BY_ID[entityId] ?? null;
}

export function regionVisualTargetId(regionId: string): string | null {
  return REGION_VISUAL_TARGET_BY_ID[regionId] ?? null;
}

export function listArpgVisualReplacementTargetIds(): string[] {
  return ARPG_VISUAL_REPLACEMENT_CONTENT.targets.map((target) => target.id);
}

export function resolveArpgVisualReplacementFrame(
  targetId: string,
): ArpgVisualReplacementFrame | null {
  const target = targetById(targetId);
  if (!target) return null;

  if (isPrologueHifiRuntimeReady()) {
    return {
      targetId: target.id,
      label: target.label,
      kind: target.kind,
      source: "prologue-hifi",
      sheetPath: PROLOGUE_HIFI_RUNTIME_PATH,
      frame: prologueHifiFrameIndex(target.id),
      frameCount: PROLOGUE_HIFI_FRAME_ORDER.length,
      frameWidth: 320,
      frameHeight: 320,
    };
  }

  return resolveFallbackFrame(target);
}

export function getArpgVisualReplacementRuntimeSummary() {
  const ready = isPrologueHifiRuntimeReady();
  return {
    replacementBatchId: PROLOGUE_HIFI_BATCH_ID,
    runtimePath: PROLOGUE_HIFI_RUNTIME_PATH,
    frameCount: PROLOGUE_HIFI_FRAME_ORDER.length,
    runtimeReady: ready,
    runtimeSource: ready ? ("prologue-hifi" as const) : ("fallback" as const),
    targetCount: ARPG_VISUAL_REPLACEMENT_CONTENT.targets.length,
  };
}
