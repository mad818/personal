"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AGENTS } from "@/components/home/office/constants";
import type { AgentId } from "@/components/home/office/types";
import { getArpgRealAssetIntakeSummary } from "@/lib/arpgAssetIntake";
import {
  ARPG_ASSET_MANIFEST,
  ARPG_ASSET_SOURCE_POLICY,
  ARPG_GENERATED_ASSET_TOOL_POLICY,
} from "@/lib/arpgAssetManifest";
import { ARPG_ASSET_TOOL_CANDIDATE_SOURCES } from "@/lib/arpgAssetToolCandidates";
import {
  ARPG_ARSENAL_CONTENT,
  getArpgArsenalDropPreview,
  getArpgArsenalVisualForItem,
} from "@/lib/arpgArsenalContent";
import { getArpgBalancePlaytestSummary } from "@/lib/arpgBalancePlaytestContent";
import { getArpgCompletionSummary } from "@/lib/arpgCompletionContent";
import { getArpgContentToolsSummary } from "@/lib/arpgContentToolsContent";
import {
  getArpgIllustratedAssetBenchSummary,
  type ArpgIllustratedAssetBatch,
} from "@/lib/arpgIllustratedAssetBenchContent";
import { getArpgProductionReadinessSummary } from "@/lib/arpgProductionReadiness";
import { getArpgVisualAssetBriefSummary } from "@/lib/arpgVisualAssetBriefs";
import { getArpgVisualDirectionSummary } from "@/lib/arpgVisualDirectionContent";
import { getArpgVisualReplacementSummary } from "@/lib/arpgVisualReplacementContent";
import {
  ARPG_FIRST_TOWN_PRESENTATION_CUES,
  getArpgFirstTownPresentationCue,
  getArpgFirstTownPresentationSummary,
} from "@/lib/arpgFirstTownPresentationContent";
import {
  ARPG_BELLROOT_COMMONS_BREWS,
  ARPG_BELLROOT_LAMP_READINGS,
  ARPG_OATHMARKET_LEDGER_CHOICES,
  ARPG_OATHMARKET_VENDOR_WARES,
  ARPG_VEYR_DISTRICT_HOOKS,
  ARPG_VEYR_DISTRICT_MAP_NODES,
  ARPG_VEYR_HUB_SERVICES,
  ARPG_VEYR_MINI_QUESTS,
  ARPG_VEYR_SERVICE_OUTCOMES,
  ARPG_VEYR_STARTER_GEAR_PROGRESSION,
  ARPG_VEYR_TOWN_NPCS,
  ARPG_WARDENS_STEPS_ARMOR_FITTINGS,
  ARPG_WARDENS_STEPS_OATH_CONTRACTS,
  getArpgVeyrholdTownServiceSummary,
} from "@/lib/arpgTownServicesContent";
import {
  createArpgSaveEnvelope,
  getArpgSaveSlotSummary,
  normalizeArpgSaveImport,
} from "@/lib/arpgSaveEnvelope";
import { ARPG_ITEM_ICON_FRAMES, ARPG_STATUS_ICON_FRAMES } from "@/lib/arpgCombatContent";
import {
  ARPG_ENEMIES,
  ARPG_GAME_TITLE,
  ARPG_LOOT_NODES,
  ARPG_LOOT_PEDESTAL_ITEM_ID,
  ARPG_LORE_NODES,
} from "@/lib/arpgGameContent";
import {
  ARPG_PROLOGUE_CONTENT,
  ARPG_PROLOGUE_FIRST_LOCATION,
} from "@/lib/arpgPrologueContent";
import {
  deriveArpgStats,
  getArpgActiveQuest,
  getArpgArmorySummary,
  getArpgCharacterOptions,
  getArpgCharacterProfile,
  getArpgCombatSummary,
  getArpgEndgameSummary,
  getArpgEnemyCodex,
  getArpgEquippedItems,
  getArpgInventory,
  getArpgKnownSkills,
  getNearestArpgInteraction,
  getArpgWorldLoopSummary,
  resolveArpgObjective,
  type ArpgInteractionPrompt,
} from "@/lib/arpgGame";
import { useStore } from "@/store/useStore";
import {
  getArpgMotionDuration,
  loadOptionalGsapRuntime,
} from "./pixi/arpgOptionalMotion";
import { ArpgProductionMenuIndex } from "./ArpgProductionMenuIndex";

type ArpgDrawer =
  | "adventure"
  | "inventory"
  | "hero"
  | "skills"
  | "map"
  | "armory"
  | "journal"
  | "people"
  | "endgame"
  | "production"
  | "credits"
  | "settings"
  | null;

const ARPG_DRAWER_IDS: Array<Exclude<ArpgDrawer, null>> = [
  "adventure",
  "inventory",
  "hero",
  "skills",
  "map",
  "armory",
  "journal",
  "people",
  "endgame",
  "production",
  "credits",
  "settings",
];

function coerceArpgDrawerTarget(target: string): Exclude<ArpgDrawer, null> {
  return ARPG_DRAWER_IDS.includes(target as Exclude<ArpgDrawer, null>)
    ? (target as Exclude<ArpgDrawer, null>)
    : "settings";
}

const edgePanelStyle: CSSProperties = {
  border: "1px solid rgba(255, 214, 150, 0.2)",
  borderRadius: 14,
  background:
    "linear-gradient(180deg, rgba(31, 22, 13, 0.72), rgba(12, 9, 7, 0.58))",
  boxShadow:
    "0 16px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06)",
  color: "#f8ead1",
  backdropFilter: "blur(12px)",
};

const chipStyle: CSSProperties = {
  border: "1px solid rgba(255, 214, 150, 0.17)",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.045)",
  color: "#ffe3ad",
  fontSize: 7,
  fontWeight: 850,
  letterSpacing: ".11em",
  padding: "2px 5px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(255, 214, 150, 0.24)",
  borderRadius: 999,
  background: "rgba(255, 195, 105, 0.11)",
  color: "#fff4dc",
  cursor: "pointer",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: ".08em",
  padding: "4px 7px",
  textTransform: "uppercase",
};

const ghostButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(255,255,255,.045)",
  color: "rgba(255,240,214,.74)",
};

const ARPG_ECONOMY_ICON_FRAMES: Record<string, number> = {
  gold: 0,
  "relic-dust": 1,
  "upgrade-shard": 2,
  "rare-catalyst": 3,
  "monster-part": 4,
  "city-scrip": 5,
  "health-vial": 6,
  "focus-draught": 7,
  "gate-key-fragment": 8,
  "rune-ember": 9,
  "rune-frost": 10,
  "rune-poison": 11,
  "rune-bleed": 12,
  "rune-curse": 13,
  "rune-holy": 14,
  "rune-void": 15,
};

const ARPG_PLAYER_CLASS_FRAMES: Record<string, number> = {
  wardbreaker: 0,
  relicweaver: 1,
  ashrunner: 2,
  oathblade: 3,
  thornwarden: 4,
  gravechanter: 5,
  "ember-monk": 6,
  wayfarer: 7,
};

const ARPG_ARMOR_ICON_FRAMES: Record<string, number> = {
  cloth: 0,
  leather: 1,
  mail: 2,
  plate: 3,
  bone: 4,
  bark: 5,
  glass: 6,
  "ash-forged": 7,
  nacre: 8,
  ceremonial: 9,
  "relic-bound": 10,
  "city-faction": 11,
};

interface ArpgHudProps {
  activeAgent: AgentId | null;
  runtimeStatusLabel: string;
  onSwitchToCommandRoom: () => void;
  reducedMotion: boolean;
}

function formatDistance(prompt: ArpgInteractionPrompt | null) {
  if (!prompt) return "No signal";
  return `${prompt.distance.toFixed(1)}m`;
}

function rarityBorder(rarity: string) {
  if (rarity === "mythic") return "#fb7185";
  if (rarity === "ancient") return "#f59e0b";
  if (rarity === "relic") return "#8ecae6";
  if (rarity === "epic") return "#d946ef";
  if (rarity === "rare") return "#ffd166";
  if (rarity === "uncommon") return "#90be6d";
  return "#f4a261";
}

function spriteBackground(
  frame: number,
  columns: number,
  rows: number,
  sheet: string,
  renderedSize: number,
) {
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  return {
    backgroundImage: `url(${sheet})`,
    backgroundPosition: `-${column * renderedSize}px -${row * renderedSize}px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${columns * renderedSize}px ${rows * renderedSize}px`,
  } as const;
}

const HERO_KIT_CLASS_FRAME_BY_ID: Record<string, number> = {
  wardbreaker: 0,
  relicweaver: 1,
  ashrunner: 2,
};

const HERO_KIT_ITEM_FRAMES: Record<string, number> = {
  "cinder-glaive": 7,
  "ember-buckler": 1,
  "health-vial": 8,
  "oracle-focus": 2,
  "focus-draught": 8,
  "relic-dust": 9,
  "upgrade-shard": 10,
  "gate-key-fragment": 11,
  "loomshard-charm": 11,
};

const HERO_KIT_EQUIPMENT_FRAMES: Record<string, number> = {
  "pilgrim-helm": 0,
  "threadbare-wardplate": 1,
  "ash-runner-boots": 2,
  "oath-stitch-gloves": 3,
  "warden-cuirass": 1,
  gloves: 3,
  "memory-prism": 7,
  "wayfinder-sigil": 7,
  "brass-charm": 6,
  "copper-oath-ring": 6,
  "pilgrim-tin-ring": 6,
  "bellroot-cord-amulet": 7,
};

const ILLUSTRATED_ENEMY_FRAME_BY_ID: Record<string, number> = {
  "hollow-sentry": 0,
  "ashling-scout": 1,
  "rune-husk": 2,
  "brass-warden": 3,
  "glass-gnawer": 4,
  "ember-mote": 5,
  "veyrhold-champion": 6,
  "hollow-regent-seed": 7,
};

const ILLUSTRATED_SKILL_FRAME_BY_ID: Record<string, number> = {
  "wardbreaker-cleave": 0,
  "wardbreaker-guard": 0,
  "relicweaver-surge": 1,
  "relicweaver-tuning": 1,
  "ashrunner-dash": 2,
  "ashrunner-footwork": 2,
};

const ILLUSTRATED_LOCATION_FRAME_BY_CITY_ID: Record<string, number> = {
  "first-reliquary": 0,
  veyrhold: 1,
  cinderfall: 2,
};

const HERO_KIT_WEAPON_ITEM_LABELS = [
  "Sword",
  "Shield",
  "Staff",
  "Dagger",
  "Bow",
  "Axe",
  "Mace",
  "Spear",
  "Health vial",
  "Relic dust",
  "Upgrade shard",
  "Gate fragment",
] as const;

const HERO_KIT_ARMOR_EQUIPMENT_LABELS = [
  "Helm",
  "Chest",
  "Boots",
  "Gloves",
  "Belt",
  "Cloak",
  "Ring",
  "Amulet",
] as const;

function heroKitSheetFrameStyle(
  sheet: string,
  frame: number,
  frameCount: number,
  renderedWidth: number,
  renderedHeight: number,
  borderRadius: number,
): CSSProperties {
  return {
    backgroundImage: `url(${sheet})`,
    backgroundPosition: `-${frame * renderedWidth}px 0`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${frameCount * renderedWidth}px ${renderedHeight}px`,
    border: "1px solid rgba(255, 214, 150, 0.24)",
    borderRadius,
    boxShadow: "inset 0 0 20px rgba(255, 209, 102, 0.08), 0 12px 28px rgba(0,0,0,.26)",
    flex: "0 0 auto",
    height: renderedHeight,
    width: renderedWidth,
  };
}

function heroKitPortraitStyle(frame: number, size = 58): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/hero-kit-character-portraits.png",
    frame,
    3,
    size,
    size,
    14,
  );
}

function heroKitOutfitStyle(frame: number, width = 48, height = 72): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/hero-kit-class-outfits.png",
    frame,
    3,
    width,
    height,
    13,
  );
}

function heroKitWeaponItemIconStyle(frame: number, size = 28): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/hero-kit-weapons-items.png",
    frame,
    12,
    size,
    size,
    10,
  );
}

function heroKitArmorEquipmentIconStyle(frame: number, size = 28): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/hero-kit-armor-equipment.png",
    frame,
    8,
    size,
    size,
    10,
  );
}

function arsenalWeaponIconStyle(frame: number, size = 28): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/arsenal-weapon-icons.png",
    frame,
    21,
    size,
    size,
    11,
  );
}

function arsenalQualityOverlayStyle(frame: number, size = 28): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/arsenal-quality-overlays.png",
    frame,
    7,
    size,
    size,
    11,
  );
}

function arsenalNamedWeaponCardStyle(frame: number, width = 82, height = 123): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/arsenal-named-weapon-cards.png",
    frame,
    8,
    width,
    height,
    14,
  );
}

function arsenalVfxStyle(frame: number, size = 28): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/arsenal-vfx-drops.png",
    frame,
    12,
    size,
    size,
    999,
  );
}

function arsenalLayeredIconStyle(
  iconFrame: number,
  overlayFrame: number,
  size = 28,
): CSSProperties {
  return {
    ...arsenalWeaponIconStyle(iconFrame, size),
    backgroundImage:
      "url(/arpg/illustrated/arsenal-quality-overlays.png), url(/arpg/illustrated/arsenal-weapon-icons.png)",
    backgroundPosition: `-${overlayFrame * size}px 0, -${iconFrame * size}px 0`,
    backgroundSize: `${7 * size}px ${size}px, ${21 * size}px ${size}px`,
  };
}

function itemIconStyle(itemId: string, size = 24): CSSProperties {
  const arsenalVisual = getArpgArsenalVisualForItem(itemId);
  if (arsenalVisual) {
    return arsenalLayeredIconStyle(arsenalVisual.iconFrame, arsenalVisual.overlayFrame, size);
  }
  const heroKitFrame = HERO_KIT_ITEM_FRAMES[itemId];
  if (heroKitFrame !== undefined) {
    return heroKitWeaponItemIconStyle(heroKitFrame, size);
  }
  const heroKitEquipmentFrame = HERO_KIT_EQUIPMENT_FRAMES[itemId];
  if (heroKitEquipmentFrame !== undefined) {
    return heroKitArmorEquipmentIconStyle(heroKitEquipmentFrame, size);
  }
  const frame = ARPG_ITEM_ICON_FRAMES[itemId]?.frame ?? 0;
  return {
    ...spriteBackground(frame, 4, 4, "/arpg/items-first-reliquary.png", size),
    border: "1px solid rgba(255, 214, 150, 0.22)",
    borderRadius: 10,
    flex: "0 0 auto",
    height: size,
    width: size,
  };
}

function statusIconStyle(statusId: string): CSSProperties {
  const frame = ARPG_STATUS_ICON_FRAMES[statusId]?.frame ?? 0;
  return {
    ...spriteBackground(frame, 8, 2, "/arpg/status-effects.png", 20),
    border: "1px solid rgba(255, 214, 150, 0.2)",
    borderRadius: 8,
    flex: "0 0 auto",
    height: 20,
    width: 20,
  };
}

function weaponIconStyle(frame: number): CSSProperties {
  return arsenalWeaponIconStyle(frame, 26);
}

function economyIconStyle(itemId: string): CSSProperties {
  const frame = ARPG_ECONOMY_ICON_FRAMES[itemId] ?? 0;
  return {
    ...spriteBackground(frame, 4, 4, "/arpg/economy-material-icons.png", 22),
    border: "1px solid rgba(255, 214, 150, 0.2)",
    borderRadius: 9,
    flex: "0 0 auto",
    height: 22,
    width: 22,
  };
}

function armorIconStyle(armorFamilyId: string): CSSProperties {
  const heroKitFrame = HERO_KIT_EQUIPMENT_FRAMES[armorFamilyId];
  if (heroKitFrame !== undefined) {
    return heroKitArmorEquipmentIconStyle(heroKitFrame, 28);
  }
  const frame = ARPG_ARMOR_ICON_FRAMES[armorFamilyId] ?? 0;
  return {
    ...spriteBackground(frame, 4, 3, "/arpg/armor-cosmetic-icons.png", 28),
    border: "1px solid rgba(255, 214, 150, 0.22)",
    borderRadius: 9,
    flex: "0 0 auto",
    height: 28,
    width: 28,
  };
}

function stableFrameFromId(id: string, frameCount: number): number {
  return Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0) % frameCount;
}

function illustratedLocationCardStyle(frame: number): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/location-cards.png",
    frame,
    3,
    108,
    65,
    14,
  );
}

function regionLocationCardStyle(regionId: string): CSSProperties {
  return illustratedLocationCardStyle(
    ILLUSTRATED_LOCATION_FRAME_BY_CITY_ID[regionId] ?? stableFrameFromId(regionId, 3),
  );
}

function illustratedCharacterSeedStyle(frame: number, size = 36): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/character-portraits.png",
    frame,
    3,
    size,
    size,
    12,
  );
}

function illustratedEnemyCardStyle(frame: number): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/enemy-boss-hifi-cards.png",
    frame,
    8,
    58,
    82,
    14,
  );
}

function illustratedSkillIconStyle(skillId: string, size = 24): CSSProperties {
  return heroKitSheetFrameStyle(
    "/arpg/illustrated/skill-vfx-icons.png",
    ILLUSTRATED_SKILL_FRAME_BY_ID[skillId] ?? stableFrameFromId(skillId, 6),
    6,
    size,
    size,
    10,
  );
}

function playerSpriteStyle(classPathId: string): CSSProperties {
  const frame = ARPG_PLAYER_CLASS_FRAMES[classPathId] ?? 0;
  const renderedWidth = 54;
  const renderedHeight = 72;
  const column = frame % 4;
  const row = Math.floor(frame / 4);
  return {
    backgroundImage: "url(/arpg/player-character-sprites.png)",
    backgroundPosition: `-${column * renderedWidth}px -${row * renderedHeight}px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${4 * renderedWidth}px ${2 * renderedHeight}px`,
    border: "1px solid rgba(255, 214, 150, 0.24)",
    borderRadius: 14,
    boxShadow: "0 14px 30px rgba(0,0,0,.28), inset 0 0 18px rgba(255,209,102,.08)",
    flex: "0 0 auto",
    height: renderedHeight,
    width: renderedWidth,
  };
}

function illustratedPreviewFrameStyle(batch: ArpgIllustratedAssetBatch, frame: number): CSSProperties {
  const rendered =
    batch.role === "arsenal-named-weapon-card"
      ? { width: 42, height: 63 }
      : batch.kind === "enemy-card"
      ? { width: 48, height: 68 }
      : batch.kind === "location-card"
        ? { width: 72, height: 43 }
        : batch.kind === "outfit-card"
          ? { width: 48, height: 72 }
        : batch.kind === "character-portrait"
          ? { width: 48, height: 48 }
          : { width: 30, height: 30 };
  const runtimeUrl = `/${batch.runtimePath.replace(/^public\//, "")}`;

  return {
    backgroundImage: `url(${runtimeUrl})`,
    backgroundPosition: `-${frame * rendered.width}px 0`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${batch.frameCount * rendered.width}px ${rendered.height}px`,
    border: "1px solid rgba(255, 214, 150, 0.24)",
    borderRadius: batch.kind === "enemy-card" || batch.kind === "location-card" || batch.kind === "outfit-card" ? 10 : 999,
    boxShadow: "inset 0 0 18px rgba(255, 209, 102, 0.08), 0 10px 24px rgba(0,0,0,.22)",
    flex: "0 0 auto",
    height: rendered.height,
    width: rendered.width,
  };
}

function routeLabel(from?: string, to?: string) {
  const clean = (value?: string) =>
    value ? value.replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()) : "Unknown";
  return `${clean(from)} to ${clean(to)}`;
}

function adventureSceneStyle(kind: "map" | "encounter" | "loot" | "story"): CSSProperties {
  const gradients: Record<typeof kind, string> = {
    map:
      "radial-gradient(circle at 18% 20%, rgba(255,209,102,.38), transparent 26%), linear-gradient(135deg, rgba(84,48,22,.92), rgba(18,14,10,.76) 52%, rgba(9,35,38,.62))",
    encounter:
      "radial-gradient(circle at 76% 28%, rgba(244,90,68,.32), transparent 25%), linear-gradient(135deg, rgba(55,24,15,.92), rgba(16,12,10,.78) 58%, rgba(57,38,18,.68))",
    loot:
      "radial-gradient(circle at 72% 30%, rgba(255,225,140,.42), transparent 28%), linear-gradient(135deg, rgba(69,48,18,.9), rgba(21,16,10,.76) 55%, rgba(70,47,87,.52))",
    story:
      "radial-gradient(circle at 20% 22%, rgba(126,227,184,.26), transparent 28%), linear-gradient(135deg, rgba(32,53,37,.86), rgba(18,14,10,.78) 58%, rgba(68,45,21,.64))",
  };

  return {
    border: "1px solid rgba(255, 214, 150, 0.2)",
    borderRadius: 16,
    background: gradients[kind],
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 18px 38px rgba(0,0,0,.28)",
    overflow: "hidden",
    padding: 10,
    position: "relative",
  };
}

export default function ArpgHud({
  activeAgent,
  runtimeStatusLabel,
  onSwitchToCommandRoom,
  reducedMotion,
}: ArpgHudProps) {
  const [drawer, setDrawer] = useState<ArpgDrawer>(null);
  const [activeMenuPanelId, setActiveMenuPanelId] = useState<string | null>(null);
  const [saveImportText, setSaveImportText] = useState("");
  const [saveImportMessage, setSaveImportMessage] = useState("Ready");
  const [resetArmed, setResetArmed] = useState(false);
  const objectiveRef = useRef<HTMLElement | null>(null);
  const loadoutRef = useRef<HTMLElement | null>(null);
  const promptRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const save = useStore((s) => s.arpgSave);
  const saveSlots = useStore((s) => s.arpgSaveSlots);
  const activeSaveSlotId = useStore((s) => s.arpgActiveSaveSlotId);
  const setArpgSave = useStore((s) => s.setArpgSave);
  const saveArpgManualSlot = useStore((s) => s.saveArpgManualSlot);
  const saveArpgCheckpointSlot = useStore((s) => s.saveArpgCheckpointSlot);
  const loadArpgSaveSlot = useStore((s) => s.loadArpgSaveSlot);
  const confirmResetArpgSave = useStore((s) => s.confirmResetArpgSave);
  const collectArpgItem = useStore((s) => s.collectArpgItem);
  const equipArpgItem = useStore((s) => s.equipArpgItem);
  const upgradeArpgItem = useStore((s) => s.upgradeArpgItem);
  const unlockArpgSkill = useStore((s) => s.unlockArpgSkill);
  const createArpgCharacter = useStore((s) => s.createArpgCharacter);
  const respecArpgCharacter = useStore((s) => s.respecArpgCharacter);
  const setArpgCharacterCosmetic = useStore((s) => s.setArpgCharacterCosmetic);
  const consumeArpgItem = useStore((s) => s.useArpgConsumable);
  const strikeArpgEnemy = useStore((s) => s.strikeArpgEnemy);
  const targetArpgEnemy = useStore((s) => s.targetArpgEnemy);
  const triggerArpgSkill = useStore((s) => s.useArpgSkill);
  const dodgeArpgPlayer = useStore((s) => s.dodgeArpgPlayer);
  const advanceArpgStory = useStore((s) => s.advanceArpgStory);
  const selectArpgRegion = useStore((s) => s.selectArpgRegion);
  const beginArpgTravel = useStore((s) => s.beginArpgTravel);
  const resolveArpgTravelEvent = useStore((s) => s.resolveArpgTravelEvent);
  const acceptArpgQuest = useStore((s) => s.acceptArpgQuest);
  const recruitArpgCompanion = useStore((s) => s.recruitArpgCompanion);
  const craftArpgRecipe = useStore((s) => s.craftArpgRecipe);
  const salvageArpgItem = useStore((s) => s.salvageArpgItem);
  const recordArpgReputation = useStore((s) => s.recordArpgReputation);
  const selectArpgEndgameDifficulty = useStore((s) => s.selectArpgEndgameDifficulty);
  const startArpgEndgameDungeon = useStore((s) => s.startArpgEndgameDungeon);
  const completeArpgEndgameDungeon = useStore((s) => s.completeArpgEndgameDungeon);
  const startArpgRelicTrial = useStore((s) => s.startArpgRelicTrial);
  const completeArpgRelicTrial = useStore((s) => s.completeArpgRelicTrial);
  const startArpgBossRematch = useStore((s) => s.startArpgBossRematch);
  const completeArpgBossRematch = useStore((s) => s.completeArpgBossRematch);
  const claimArpgTreasureMap = useStore((s) => s.claimArpgTreasureMap);
  const completeArpgTreasureMap = useStore((s) => s.completeArpgTreasureMap);
  const startArpgArenaChallenge = useStore((s) => s.startArpgArenaChallenge);
  const completeArpgArenaChallenge = useStore((s) => s.completeArpgArenaChallenge);
  const claimArpgCosmeticReward = useStore((s) => s.claimArpgCosmeticReward);
  const stats = deriveArpgStats(save);
  const profile = getArpgCharacterProfile(save);
  const characterOptions = getArpgCharacterOptions();
  const equipped = getArpgEquippedItems(save);
  const inventory = getArpgInventory(save);
  const quest = getArpgActiveQuest(save);
  const skills = getArpgKnownSkills(save);
  const combat = getArpgCombatSummary(save);
  const enemyCodex = getArpgEnemyCodex(save);
  const worldLoop = getArpgWorldLoopSummary(save);
  const armory = getArpgArmorySummary(save);
  const endgame = getArpgEndgameSummary(save);
  const townServices = getArpgVeyrholdTownServiceSummary();
  const balancePlaytest = getArpgBalancePlaytestSummary();
  const completion = getArpgCompletionSummary();
  const contentTools = getArpgContentToolsSummary();
  const productionReadiness = getArpgProductionReadinessSummary();
  const firstTownPresentation = getArpgFirstTownPresentationSummary();
  const productionMenuPanels = productionReadiness.menuSurface.requiredPanels;
  const activeMenuPanel =
    productionMenuPanels.find((panel) => panel.id === activeMenuPanelId) ?? null;
  const objective = resolveArpgObjective(save);
  const interaction = useMemo(() => getNearestArpgInteraction(save), [save]);
  const sentry = save.enemies["hollow-sentry"];
  const activeAgentLabel = activeAgent ? AGENTS[activeAgent].name : "Standby";
  const lootNode = ARPG_LOOT_NODES["loomshard-pedestal"];
  const hasLoomShard = inventory.some((item) => item.id === ARPG_LOOT_PEDESTAL_ITEM_ID);
  const selectedItem = inventory.find(
    (item) => item.instanceId === save.selectedItemInstanceId,
  );
  const selectedArsenalComparison = armory.selectedComparison;
  const featuredArsenalWeapon =
    ARPG_ARSENAL_CONTENT.namedWeaponCards.find((weapon) => weapon.itemId === "veyrhold-banner-spear") ??
    ARPG_ARSENAL_CONTENT.namedWeaponCards[1] ??
    ARPG_ARSENAL_CONTENT.namedWeaponCards[0]!;
  const featuredArsenalDrop = getArpgArsenalDropPreview(featuredArsenalWeapon.quality);
  const visibleCreditAssets = ARPG_ASSET_MANIFEST.filter(
    (asset) => asset.visibleCreditRequired,
  );
  const realAssetIntake = getArpgRealAssetIntakeSummary();
  const illustratedBench = getArpgIllustratedAssetBenchSummary();
  const visualDirection = getArpgVisualDirectionSummary();
  const visualBriefs = getArpgVisualAssetBriefSummary();
  const visualReplacements = getArpgVisualReplacementSummary();
  const approvedIllustratedBatches = illustratedBench.approvedBatches;
  const rejectedIllustratedBatches = illustratedBench.rejectedBatches;
  const heroKitClassFrame = HERO_KIT_CLASS_FRAME_BY_ID[profile.classTree.id] ?? 0;
  const currentClassSkills = skills.filter((skill) => skill.pathId === profile.classTree.id);
  const lineagePalettes = characterOptions.palettes.filter(
    (palette) => palette.lineageId === profile.lineage.id,
  );
  const activeHotbar = save.player.equippedSkillIds
    .map((skillId) => skills.find((skill) => skill.id === skillId))
    .filter(Boolean)
    .slice(0, 2);
  const latestCombatEvent = combat.latestEvents[0];
  const selectedJourneyCityId = save.journey?.selectedCityId ?? "first-reliquary";
  const selectedPresentationCue = getArpgFirstTownPresentationCue(
    selectedJourneyCityId,
    save.journey?.selectedSubCityId,
  );
  const veyrholdPresentationCues = ARPG_FIRST_TOWN_PRESENTATION_CUES.filter(
    (cue) => cue.zone === "veyrhold",
  );
  const saveSlotSummary = useMemo(
    () => getArpgSaveSlotSummary(saveSlots, save),
    [saveSlots, save],
  );
  const saveExportText = useMemo(
    () => JSON.stringify(createArpgSaveEnvelope(save, saveSlots, activeSaveSlotId), null, 2),
    [save, saveSlots, activeSaveSlotId],
  );
  const fallbackRouteEvent = worldLoop.routeEvents[0] ?? null;
  const activeAdventureEvent = worldLoop.activeTravelEvent ?? fallbackRouteEvent;
  const adventureCityStoryline =
    worldLoop.cityStorylines.find((storyline) => storyline.cityId === selectedJourneyCityId) ??
    worldLoop.cityStorylines[0] ??
    null;
  const adventureSubCityArc =
    worldLoop.subCitySideArcs.find((arc) => arc.cityId === adventureCityStoryline?.cityId) ??
    worldLoop.subCitySideArcs[0] ??
    null;
  const firstReleaseTownId = "veyrhold";
  const firstReleaseTownStoryline =
    worldLoop.cityStorylines.find((storyline) => storyline.cityId === firstReleaseTownId) ?? null;
  const firstReleaseDistricts = worldLoop.subCitySideArcs
    .filter((arc) => arc.cityId === firstReleaseTownId)
    .slice(0, 4);
  const firstReleaseRouteEvent =
    worldLoop.routeEvents.find((event) => event.from === "first-reliquary" && event.to === firstReleaseTownId) ??
    worldLoop.routeEvents[0] ??
    null;
  const firstReleaseTownOpen = save.discoveredCityIds.includes(firstReleaseTownId);
  const firstReleaseRouteUnlocked = Boolean(
    firstReleaseRouteEvent &&
      (save.journey?.unlockedRouteIds.includes(firstReleaseRouteEvent.routeId) ||
        save.storyFlags.includes(firstReleaseRouteEvent.unlockFlag)),
  );
  const firstReleaseRouteActive =
    worldLoop.activeTravelEvent?.routeId === firstReleaseRouteEvent?.routeId;
  const firstReleaseTownStatus = firstReleaseTownOpen
    ? "Town open"
    : firstReleaseRouteActive
      ? "Road active"
      : firstReleaseRouteUnlocked
        ? "Route ready"
        : "Locked";
  const firstReleaseTownCopy = firstReleaseTownOpen
    ? "Veyrhold is the first-release town. Pick one of its four districts to begin civic quests, shops, and local conflicts."
    : firstReleaseRouteActive
      ? "Resolve the north-gate road card to arrive at Veyrhold and open the first town map."
      : firstReleaseRouteUnlocked
        ? "The Brass Warden is down and the gate fragment is recovered. Start the north-gate route to open Veyrhold."
        : "Finish Bellroot, claim the gate fragment, and defeat the Brass Warden before the first town opens.";
  const oathmarketVisited = save.storyFlags.includes("veyrhold:visited:oathmarket");
  const oathmarketSelected = save.journey?.selectedSubCityId === "veyrhold-oathmarket";
  const oathmarketUnlocked = firstReleaseTownOpen && (oathmarketVisited || oathmarketSelected);
  const oathmarketChoiceResolved = ARPG_OATHMARKET_LEDGER_CHOICES.some((choice) =>
    save.storyFlags.includes(choice.storyFlag),
  );
  const wardensStepsVisited = save.storyFlags.includes("veyrhold:visited:wardens-steps");
  const wardensStepsSelected = save.journey?.selectedSubCityId === "veyrhold-wardens-steps";
  const wardensStepsUnlocked = firstReleaseTownOpen && (wardensStepsVisited || wardensStepsSelected);
  const wardensStepsContractCount = ARPG_WARDENS_STEPS_OATH_CONTRACTS.filter((contract) =>
    save.storyFlags.includes(contract.storyFlag),
  ).length;
  const bellrootCommonsVisited = save.storyFlags.includes("veyrhold:visited:bellroot-commons");
  const bellrootCommonsSelected = save.journey?.selectedSubCityId === "veyrhold-bellroot-commons";
  const bellrootCommonsUnlocked = firstReleaseTownOpen && (bellrootCommonsVisited || bellrootCommonsSelected);
  const bellrootLampReadingCount = ARPG_BELLROOT_LAMP_READINGS.filter((reading) =>
    save.storyFlags.includes(reading.storyFlag),
  ).length;
  const adventureEnemyId = combat.targetId ?? "hollow-sentry";
  const adventureEnemyName =
    combat.targetDefinition?.name ?? ARPG_ENEMIES[adventureEnemyId]?.name ?? "Hollow Sentry";
  const adventureEnemyHp =
    combat.targetState && combat.targetDefinition
      ? `${combat.targetState.hp}/${combat.targetDefinition.maxHp} HP`
      : "Scan";
  const prologueOpeningFlow = ARPG_PROLOGUE_CONTENT.openingFlow;
  const completedPrologueStepCount = prologueOpeningFlow.filter((step) =>
    save.storyFlags.includes(step.storyFlag),
  ).length;
  const nextPrologueStep =
    prologueOpeningFlow.find((step) => !save.storyFlags.includes(step.storyFlag)) ?? null;
  const bellrootCombatUnlocked =
    save.storyFlags.includes("combat:first-ward") ||
    Boolean(save.enemies["hollow-sentry"]?.defeated || save.enemies["brass-warden"]?.defeated);
  const prologueProgressLabel = `${completedPrologueStepCount}/${prologueOpeningFlow.length}`;

  useEffect(() => {
    let cancelled = false;
    void loadOptionalGsapRuntime().then((runtime) => {
      if (cancelled) return;
      const targets = [objectiveRef.current, loadoutRef.current, promptRef.current].filter(
        (node): node is HTMLElement => Boolean(node),
      );
      if (runtime?.gsap.fromTo) {
        runtime.gsap.fromTo(
          targets,
          { opacity: 0, y: -8 },
          {
            opacity: 1,
            y: 0,
            duration: getArpgMotionDuration(reducedMotion, 0.34),
            ease: "power2.out",
            stagger: reducedMotion ? 0 : 0.045,
          },
        );
        return;
      }

      for (const [index, target] of targets.entries()) {
        target.animate(
          [
            { opacity: 0, transform: "translateY(-8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            delay: reducedMotion ? 0 : index * 35,
            duration: getArpgMotionDuration(reducedMotion, 0.34) * 1000,
            easing: "cubic-bezier(.22,1,.36,1)",
          },
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!drawer) return;
    let cancelled = false;
    void loadOptionalGsapRuntime().then((runtime) => {
      if (cancelled || !drawerRef.current) return;
      if (runtime?.gsap.fromTo) {
        runtime.gsap.fromTo(
          drawerRef.current,
          { opacity: 0, x: 14 },
          {
            opacity: 1,
            x: 0,
            duration: getArpgMotionDuration(reducedMotion, 0.24),
            ease: "power2.out",
          },
        );
        return;
      }

      drawerRef.current.animate(
        [
          { opacity: 0, transform: "translateX(14px)" },
          { opacity: 1, transform: "translateX(0)" },
        ],
        {
          duration: getArpgMotionDuration(reducedMotion, 0.24) * 1000,
          easing: "cubic-bezier(.22,1,.36,1)",
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [drawer, reducedMotion]);

  const handleAdvancePrologueStep = () => {
    if (!nextPrologueStep) {
      setDrawer("journal");
      return;
    }
    if (nextPrologueStep.storyFlag === `loot:${ARPG_LOOT_PEDESTAL_ITEM_ID}`) {
      if (hasLoomShard) {
        advanceArpgStory(nextPrologueStep.storyFlag);
      } else {
        collectArpgItem(lootNode.itemId, lootNode.id);
      }
      setDrawer("adventure");
      return;
    }
    advanceArpgStory(nextPrologueStep.storyFlag);
    setDrawer("adventure");
  };

  const handlePromptAction = () => {
    if (!interaction) {
      setDrawer("journal");
      return;
    }
    if (!interaction.inRange) {
      setDrawer("journal");
      return;
    }
    if (interaction.kind === "lore") {
      const node = ARPG_LORE_NODES[interaction.id];
      if (node) advanceArpgStory(node.storyFlag);
      return;
    }
    if (interaction.kind === "loot") {
      const node = ARPG_LOOT_NODES[interaction.id];
      if (!node) return;
      if (interaction.complete) {
        setDrawer("inventory");
      } else {
        collectArpgItem(node.itemId, node.id);
      }
      return;
    }
    if (interaction.kind === "travel") {
      if (interaction.complete) {
        setDrawer("map");
      } else {
        beginArpgTravel(interaction.id);
        setDrawer("map");
      }
      return;
    }
    if (!bellrootCombatUnlocked) {
      setDrawer("adventure");
      return;
    }
    strikeArpgEnemy(interaction.id);
  };

  const handleTownServiceAction = (service: (typeof ARPG_VEYR_HUB_SERVICES)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    recordArpgReputation("veyrhold", 1);

    if (service.kind === "blacksmith") {
      craftArpgRecipe("first-temper");
      setDrawer("armory");
      return;
    }

    if (service.kind === "alchemy") {
      collectArpgItem("health-vial", `veyrhold-service:${service.id}`);
      setDrawer("inventory");
      return;
    }

    if (service.kind === "market") {
      collectArpgItem("city-scrip", `veyrhold-service:${service.id}`);
      setDrawer("inventory");
      return;
    }

    if (service.kind === "inn") {
      saveArpgCheckpointSlot();
      setDrawer("settings");
      return;
    }

    if (firstReleaseTownStoryline) {
      acceptArpgQuest(firstReleaseTownStoryline.id);
    }
    setDrawer("journal");
  };

  const handleVeyrholdMiniQuestAction = (quest: (typeof ARPG_VEYR_MINI_QUESTS)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    const alreadyResolved = quest.storyFlags.every((flag) => save.storyFlags.includes(flag));
    if (!alreadyResolved) {
      for (const storyFlag of quest.storyFlags) {
        advanceArpgStory(storyFlag);
      }
      for (const rewardItemId of quest.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-miniquest:${quest.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", quest.reputationDelta);
    }
    setDrawer("journal");
  };

  const handleVeyrholdDistrictVisit = (node: (typeof ARPG_VEYR_DISTRICT_MAP_NODES)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    selectArpgRegion(firstReleaseTownId, node.districtId);
    const alreadyVisited = save.storyFlags.includes(node.storyFlag);
    if (!alreadyVisited) {
      advanceArpgStory(node.storyFlag);
      for (const rewardItemId of node.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-district:${node.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", 1);
    }
    setDrawer("map");
  };

  const handleVeyrholdOutcomeAction = (outcome: (typeof ARPG_VEYR_SERVICE_OUTCOMES)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    const alreadyRecorded = save.storyFlags.includes(outcome.statusFlag);
    if (!alreadyRecorded) {
      advanceArpgStory(outcome.statusFlag);
      for (const rewardItemId of outcome.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-outcome:${outcome.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", 1);
    }
    setDrawer("inventory");
  };

  const handleOathmarketWareAction = (ware: (typeof ARPG_OATHMARKET_VENDOR_WARES)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    if (!save.storyFlags.includes(ware.storyFlag)) {
      advanceArpgStory(ware.storyFlag);
      collectArpgItem(ware.itemId, `veyrhold-oathmarket-ware:${ware.id}`);
      recordArpgReputation("veyrhold", 1);
    }
    setDrawer("inventory");
  };

  const handleOathmarketLedgerChoice = (choice: (typeof ARPG_OATHMARKET_LEDGER_CHOICES)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    const anyLedgerChoiceResolved = ARPG_OATHMARKET_LEDGER_CHOICES.some((entry) =>
      save.storyFlags.includes(entry.storyFlag),
    );
    if (!anyLedgerChoiceResolved) {
      advanceArpgStory(choice.storyFlag);
      advanceArpgStory("veyrhold:oathmarket-ledger-resolved");
      for (const rewardItemId of choice.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-oathmarket-choice:${choice.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", choice.reputationDelta);
    }
    setDrawer("journal");
  };

  const handleWardensStepsArmorFitting = (fitting: (typeof ARPG_WARDENS_STEPS_ARMOR_FITTINGS)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    if (!save.storyFlags.includes(fitting.storyFlag)) {
      advanceArpgStory(fitting.storyFlag);
      if (fitting.serviceId === "bellroot-anvil") {
        craftArpgRecipe("first-temper");
      }
      for (const rewardItemId of fitting.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-wardens-fitting:${fitting.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", 1);
    }
    setDrawer("armory");
  };

  const handleWardensStepsOathContract = (contract: (typeof ARPG_WARDENS_STEPS_OATH_CONTRACTS)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    if (!save.storyFlags.includes(contract.storyFlag)) {
      advanceArpgStory(contract.storyFlag);
      for (const rewardItemId of contract.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-wardens-contract:${contract.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", contract.reputationDelta);
    }
    setDrawer("journal");
  };

  const handleBellrootCommonsBrew = (brew: (typeof ARPG_BELLROOT_COMMONS_BREWS)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    if (!save.storyFlags.includes(brew.storyFlag)) {
      advanceArpgStory(brew.storyFlag);
      for (const rewardItemId of brew.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-bellroot-brew:${brew.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", 1);
    }
    setDrawer("inventory");
  };

  const handleBellrootLampReading = (reading: (typeof ARPG_BELLROOT_LAMP_READINGS)[number]) => {
    if (!firstReleaseTownOpen) {
      setDrawer("map");
      return;
    }

    if (!save.storyFlags.includes(reading.storyFlag)) {
      advanceArpgStory(reading.storyFlag);
      for (const rewardItemId of reading.rewardItemIds) {
        collectArpgItem(rewardItemId, `veyrhold-bellroot-reading:${reading.id}:${rewardItemId}`);
      }
      recordArpgReputation("veyrhold", reading.reputationDelta);
    }
    setDrawer("journal");
  };

  const handleSaveImport = () => {
    try {
      const parsed = JSON.parse(saveImportText);
      const result = normalizeArpgSaveImport(parsed);
      setArpgSave(result.save, result.slots, result.activeSlotId);
      setResetArmed(false);
      setSaveImportMessage(
        result.format === "envelope-v1"
          ? "Imported envelope-v1 and restored slots"
          : "Imported raw-save and rebuilt slots",
      );
    } catch {
      setSaveImportMessage("Import blocked: paste a valid Aether Reliquary save JSON");
    }
  };

  const handleResetSave = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setSaveImportMessage("Reset armed - click again to confirm.");
      return;
    }

    confirmResetArpgSave();
    setResetArmed(false);
    setSaveImportText("");
    setSaveImportMessage("Save reset.");
  };

  const openDrawer = (id: Exclude<ArpgDrawer, null>, menuPanelId?: string) => {
    setDrawer((current) => {
      const shouldClose = current === id && (!menuPanelId || activeMenuPanelId === menuPanelId);
      return shouldClose ? null : id;
    });
    setActiveMenuPanelId(menuPanelId ?? null);
  };

  const handleProductionMenuLaunch = (
    panel: (typeof productionMenuPanels)[number],
  ) => {
    openDrawer(coerceArpgDrawerTarget(panel.drawerTarget), panel.id);
  };

  const drawerButton = (id: Exclude<ArpgDrawer, null>, label: string) => (
    <button
      key={id}
      data-testid={`arpg-${id}-toggle`}
      type="button"
      onClick={() => openDrawer(id)}
      style={{
        ...ghostButtonStyle,
        borderColor:
          drawer === id
            ? "rgba(255, 209, 102, 0.58)"
            : "rgba(255, 214, 150, 0.24)",
        color: drawer === id ? "#ffd166" : ghostButtonStyle.color,
        fontSize: 7,
        padding: "4px 6px",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="arpg-hud"
      data-motion="optional-gsap"
      data-density="compact"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 48,
        pointerEvents: "none",
      }}
    >
      <section
        ref={objectiveRef}
        data-testid="arpg-objective-chip"
        style={{
          ...edgePanelStyle,
          position: "absolute",
          left: 10,
          top: 10,
          width: "min(220px, calc(46% - 16px))",
          padding: "6px 7px",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={chipStyle}>ARPG</span>
          <strong
            style={{
              color: "#ffe1a6",
              fontFamily: "var(--font-serif, Georgia, serif)",
              fontSize: 11,
              letterSpacing: ".03em",
            }}
          >
            {ARPG_GAME_TITLE}
          </strong>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            color: "rgba(255, 240, 214, 0.82)",
            fontSize: 8,
            lineHeight: 1.18,
            maxHeight: 18,
            overflow: "hidden",
          }}
        >
          {objective}
        </p>
        <div
          data-testid="arpg-position"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginTop: 6,
          }}
        >
          <span style={chipStyle}>LV {save.player.level}</span>
          <span style={chipStyle}>
            HP {save.player.hp}/{save.player.maxHp}
          </span>
          <span style={chipStyle}>
            Focus {save.player.mana}/{save.player.maxMana}
          </span>
          <span style={chipStyle}>XP {save.player.xp}</span>
          <span style={chipStyle}>Gold {save.player.gold}</span>
          <span style={chipStyle}>
            POS {save.player.x.toFixed(1)} / {save.player.z.toFixed(1)}
          </span>
        </div>
      </section>

      <section
        ref={loadoutRef}
        data-testid="arpg-loadout"
        style={{
          ...edgePanelStyle,
          position: "absolute",
          right: 10,
          top: 10,
          width: "min(250px, calc(46% - 16px))",
          padding: "6px 7px",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <strong
            style={{
              color: "#ffe1a6",
              fontSize: 8,
              letterSpacing: ".13em",
              textTransform: "uppercase",
            }}
          >
            Loadout
          </strong>
          <span
            data-testid="arpg-identity-chip"
            style={{
              ...chipStyle,
              maxWidth: 138,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profile.lineage.name} / {profile.classTree.name} / {profile.subclass.name}
          </span>
          <span style={{ ...chipStyle, borderColor: `${profile.palette.accent}66` }}>
            {profile.palette.label}
          </span>
          <span style={{ ...chipStyle, marginLeft: "auto" }}>{runtimeStatusLabel}</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 4,
            marginTop: 5,
          }}
        >
          {equipped.map(({ slot, item }) => (
            <button
              key={slot}
              type="button"
              onClick={() => setDrawer("inventory")}
              style={{
                border: `1px solid ${item?.accent ?? "rgba(255,255,255,.14)"}`,
                borderRadius: 12,
                background: "rgba(255,255,255,.04)",
                color: item?.accent ?? "#ffe1a6",
                cursor: "pointer",
                fontSize: 7,
                fontWeight: 850,
                overflow: "hidden",
                padding: "4px 4px",
                textAlign: "left",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`${slot}: ${item?.name ?? "Empty"}`}
            >
              <span style={{ alignItems: "center", display: "flex", gap: 5, minWidth: 0 }}>
                {item ? (
                  <span
                    aria-hidden="true"
                    data-testid={`arpg-loadout-icon-${slot}`}
                    style={itemIconStyle(item.id, 16)}
                  />
                ) : null}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {slot.slice(0, 3)}. {item?.displayName ?? "Empty"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        data-testid="arpg-ai-indicators"
        style={{
          ...edgePanelStyle,
          position: "absolute",
          left: 10,
          bottom: 8,
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          maxWidth: "min(220px, calc(100% - 20px))",
          padding: "4px 5px",
          pointerEvents: "auto",
        }}
      >
        <span style={chipStyle}>Oracle {activeAgentLabel}</span>
        <span style={chipStyle}>AI pips live</span>
        <span style={chipStyle}>Autosaved</span>
      </section>

      <section
        data-testid="arpg-combat-target"
        style={{
          ...edgePanelStyle,
          position: "absolute",
          left: 10,
          bottom: 40,
          display: "grid",
          gap: 4,
          maxWidth: "min(276px, calc(100% - 20px))",
          padding: "6px 7px",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={chipStyle}>Target</span>
          <strong
            style={{
              color: combat.targetProfile?.damageType
                ? combat.damageTypes[combat.targetProfile.damageType]?.color
                : "#ffe1a6",
              fontSize: 9,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {combat.targetDefinition?.name ?? "No hostile"}
          </strong>
          {combat.targetState ? (
            <span style={{ ...chipStyle, marginLeft: "auto" }}>
              HP {combat.targetState.hp}/{combat.targetDefinition?.maxHp ?? 0}
            </span>
          ) : null}
        </div>
        <div data-testid="arpg-status-row" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {combat.targetStatuses.length || combat.playerStatuses.length ? (
            [...combat.targetStatuses, ...combat.playerStatuses].slice(0, 6).map((status) => (
              <span
                key={`${status.id}:${status.sourceId}:${status.appliedAt}`}
                title={status.definition?.summary ?? status.id}
                style={statusIconStyle(status.id)}
              />
            ))
          ) : (
            <span style={{ ...chipStyle, opacity: 0.72 }}>No active statuses</span>
          )}
          <span data-testid="arpg-damage-number" style={{ ...chipStyle, marginLeft: "auto" }}>
            {latestCombatEvent?.kind === "damage"
              ? `${latestCombatEvent.amount ?? 0} ${latestCombatEvent.damageType ?? ""}`
              : "Ready"}
          </span>
        </div>
        <div data-testid="arpg-combat-toast" style={{ color: "rgba(255,240,214,.66)", fontSize: 7, lineHeight: 1.2, maxHeight: 16, overflow: "hidden" }}>
          {latestCombatEvent?.label ?? "Space strikes, 1/2 use skills, Shift dodges."}
        </div>
        <div
          data-testid="arpg-browser-rpg-panel"
          style={{
            border: "1px solid rgba(255, 214, 150, 0.16)",
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(255,209,102,.08), rgba(255,255,255,.035))",
            display: "grid",
            gap: 4,
            padding: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={chipStyle}>Click RPG</span>
            <strong
              style={{
                color: "#ffe1a6",
                fontSize: 8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {worldLoop.activeTravelEvent?.title ??
                adventureCityStoryline?.title ??
                ARPG_PROLOGUE_FIRST_LOCATION.name}
            </strong>
          </div>
          <div
            data-testid="arpg-runtime-hero-kit-strip"
            style={{ alignItems: "center", display: "flex", gap: 5, minWidth: 0 }}
          >
            <span aria-hidden="true" style={heroKitPortraitStyle(heroKitClassFrame, 24)} />
            <span aria-hidden="true" style={heroKitOutfitStyle(heroKitClassFrame, 22, 33)} />
            <span aria-hidden="true" style={itemIconStyle(ARPG_LOOT_PEDESTAL_ITEM_ID, 24)} />
            <span
              aria-hidden="true"
              data-testid="arpg-arsenal-loot-vfx"
              style={arsenalVfxStyle(reducedMotion ? featuredArsenalDrop.reducedMotionFrame : featuredArsenalDrop.frame, 24)}
            />
            <span
              title="Approved Hero Kit art is now the runtime lead for hero, kit, and reward cues."
              style={{
                color: "rgba(255,240,214,.62)",
                fontSize: 7,
                lineHeight: 1.2,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Bellroot intro {prologueProgressLabel}. Combat unlocks at the antechamber.
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
            <button
              data-testid="arpg-adventure-panel-open"
              type="button"
              onClick={() => setDrawer("adventure")}
              style={{ ...buttonStyle, padding: "4px 3px" }}
            >
              Cards
            </button>
            <button
              data-testid="arpg-adventure-panel-travel"
              type="button"
              onClick={() => {
                if (!activeAdventureEvent) return;
                if (worldLoop.activeTravelEvent) {
                  setDrawer("adventure");
                  return;
                }
                beginArpgTravel(activeAdventureEvent.routeId);
              }}
              style={{ ...ghostButtonStyle, padding: "4px 3px" }}
            >
              Travel
            </button>
            <button
              data-testid="arpg-adventure-panel-fight"
              type="button"
              onClick={() => {
                if (!bellrootCombatUnlocked) {
                  setDrawer("adventure");
                  return;
                }
                targetArpgEnemy(adventureEnemyId);
                strikeArpgEnemy(adventureEnemyId);
              }}
              style={{ ...ghostButtonStyle, opacity: bellrootCombatUnlocked ? 1 : 0.58, padding: "4px 3px" }}
            >
              {bellrootCombatUnlocked ? "Fight" : "Locked"}
            </button>
            <button
              data-testid="arpg-adventure-panel-loot"
              type="button"
              onClick={() => {
                if (hasLoomShard) {
                  setDrawer("inventory");
                  return;
                }
                collectArpgItem(lootNode.itemId, lootNode.id);
              }}
              style={{ ...ghostButtonStyle, padding: "4px 3px" }}
            >
              Loot
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          <button
            data-testid="arpg-basic-attack"
            type="button"
            onClick={() => {
              if (!bellrootCombatUnlocked) {
                setDrawer("adventure");
                return;
              }
              if (combat.targetId) targetArpgEnemy(combat.targetId);
              if (combat.targetId) strikeArpgEnemy(combat.targetId);
            }}
            style={{ ...buttonStyle, opacity: bellrootCombatUnlocked ? 1 : 0.62 }}
          >
            Space strike
          </button>
          {activeHotbar.map((skill, index) =>
            skill ? (
              <button
                key={skill.id}
                data-testid={`arpg-hotbar-${index + 1}`}
                type="button"
                onClick={() => {
                  if (!bellrootCombatUnlocked) {
                    setDrawer("adventure");
                    return;
                  }
                  triggerArpgSkill(skill.id, combat.targetId);
                }}
                style={{
                  ...ghostButtonStyle,
                  borderColor: `${skill.accent}77`,
                  color: skill.accent,
                  opacity: bellrootCombatUnlocked ? 1 : 0.62,
                }}
              >
                <span style={{ alignItems: "center", display: "inline-flex", gap: 5 }}>
                  <span
                    aria-hidden="true"
                    data-testid={`arpg-hotbar-icon-${index + 1}`}
                    style={illustratedSkillIconStyle(skill.id, 18)}
                  />
                  <span>{index + 1} {skill.name}</span>
                </span>
              </button>
            ) : null,
          )}
          <button
            data-testid="arpg-dodge"
            type="button"
            onClick={() => dodgeArpgPlayer()}
            style={ghostButtonStyle}
          >
            Shift dodge
          </button>
        </div>
      </section>

      <section
        ref={promptRef}
        data-testid="arpg-context-prompt"
        style={{
          ...edgePanelStyle,
          position: "absolute",
          left: "50%",
          bottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          maxWidth: "min(310px, calc(100% - 20px))",
          padding: "5px 7px",
          pointerEvents: "auto",
          transform: "translateX(-50%)",
        }}
      >
        <span
          style={{
            ...chipStyle,
            borderColor: interaction?.accent
              ? `${interaction.accent}66`
              : "rgba(255, 214, 150, 0.17)",
            color: interaction?.accent ?? "#ffe3ad",
          }}
        >
          {interaction?.inRange ? "In range" : "Seek"}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#fff0d6",
              fontSize: 9,
              fontWeight: 850,
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {interaction
              ? `${interaction.label} (${formatDistance(interaction)})`
              : "Explore the reliquary for glowing objects"}
          </div>
          <div
            style={{
              color: "rgba(255,240,214,.56)",
              fontSize: 7,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {interaction?.inRange
              ? `Press E or ${interaction.actionLabel.toLowerCase()}`
              : interaction?.hint ?? "Use WASD or arrows. Details live in the journal."}
          </div>
        </div>
        <button
          data-testid="arpg-context-action"
          type="button"
          disabled={Boolean(interaction && !interaction.inRange)}
          onClick={handlePromptAction}
          style={{
            ...buttonStyle,
            marginLeft: "auto",
            opacity: interaction && !interaction.inRange ? 0.55 : 1,
          }}
        >
          {interaction?.actionLabel ?? "Journal"}
        </button>
      </section>

      <nav
        aria-label="Aether Reliquary drawers"
        style={{
          position: "absolute",
          right: 10,
          bottom: 8,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: 3,
          maxWidth: "min(236px, calc(100% - 20px))",
          pointerEvents: "auto",
          zIndex: 5,
        }}
      >
        {drawerButton("adventure", "Quest")}
        {drawerButton("inventory", "Kit")}
        {drawerButton("hero", "Hero")}
        {drawerButton("skills", "Skills")}
        {drawerButton("map", "Map")}
        {drawerButton("armory", "Gear")}
        {drawerButton("journal", "Journal")}
        {drawerButton("people", "People")}
        {drawerButton("endgame", "Trials")}
        {drawerButton("production", "Prod")}
        {drawerButton("credits", "Assets")}
        {drawerButton("settings", "Room")}
      </nav>

      {drawer ? (
        <aside
          ref={drawerRef}
          data-testid="arpg-drawer"
          style={{
            ...edgePanelStyle,
            position: "absolute",
            right: 12,
            top: 74,
            bottom: 88,
            width: "min(318px, calc(100% - 24px))",
            overflow: "auto",
            padding: 10,
            pointerEvents: "auto",
            zIndex: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong
              style={{
                color: "#ffe1a6",
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              {drawer}
            </strong>
            <button
              type="button"
              onClick={() => {
                setDrawer(null);
                setActiveMenuPanelId(null);
              }}
              style={{ ...ghostButtonStyle, marginLeft: "auto" }}
            >
              Close
            </button>
          </div>

          {activeMenuPanel ? (
            <div
              data-testid="arpg-active-menu-panel"
              style={{
                border: "1px solid rgba(255, 209, 102, 0.2)",
                borderRadius: 12,
                background: "rgba(255, 209, 102, 0.06)",
                display: "grid",
                gap: 5,
                marginTop: 9,
                padding: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={chipStyle}>Menu</span>
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  {activeMenuPanel.label}
                </strong>
                <span style={{ ...chipStyle, marginLeft: "auto" }}>
                  {activeMenuPanel.surface}
                </span>
              </div>
              <p style={{ margin: 0, color: "rgba(255,240,214,.68)", fontSize: 9, lineHeight: 1.35 }}>
                {activeMenuPanel.coverage}
              </p>
              <p style={{ margin: 0, color: "rgba(255,240,214,.5)", fontSize: 8, lineHeight: 1.3 }}>
                Empty state: {activeMenuPanel.emptyState}
              </p>
            </div>
          ) : null}

          {drawer === "adventure" ? (
            <div data-testid="arpg-adventure-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div style={adventureSceneStyle("map")}>
                <div style={{ alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "108px minmax(0, 1fr)" }}>
                  <span
                    aria-label="Illustrated world region card"
                    data-testid="arpg-adventure-location-art"
                    role="img"
                    style={regionLocationCardStyle(selectedJourneyCityId)}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={chipStyle}>World map</span>
                      <span style={{ ...chipStyle, marginLeft: "auto" }}>
                        {worldLoop.discoveredCityCount}/12 cities
                      </span>
                    </div>
                    <strong style={{ color: "#fff3d6", display: "block", fontSize: 13, marginTop: 8 }}>
                      {activeAdventureEvent
                        ? routeLabel(activeAdventureEvent.from, activeAdventureEvent.to)
                        : ARPG_PROLOGUE_FIRST_LOCATION.name}
                    </strong>
                <p style={{ margin: "5px 0 8px", color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.35 }}>
                  {worldLoop.activeTravelEvent?.summary ??
                    activeAdventureEvent?.summary ??
                    ARPG_PROLOGUE_FIRST_LOCATION.visualSummary}
                </p>
                  </div>
                </div>
                <div
                  data-testid="arpg-adventure-presentation-cue"
                  style={{
                    alignItems: "center",
                    border: "1px solid rgba(255, 214, 150, 0.13)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "34px minmax(0, 1fr)",
                    marginBottom: 8,
                    padding: 7,
                  }}
                >
                  <span
                    aria-label={`${selectedPresentationCue.label} VFX cue`}
                    role="img"
                    style={arsenalVfxStyle(selectedPresentationCue.vfxFrame, 34)}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 5 }}>
                      <span style={chipStyle}>Presentation cue</span>
                      <span style={chipStyle}>Audio staged</span>
                      <span style={chipStyle}>Low flash</span>
                    </div>
                    <strong style={{ color: "#ffe1a6", display: "block", fontSize: 11, marginTop: 5 }}>
                      {selectedPresentationCue.label}
                    </strong>
                    <p style={{ color: "rgba(255,240,214,.62)", fontSize: 9, lineHeight: 1.35, margin: "3px 0 0" }}>
                      {selectedPresentationCue.ambientCopy}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    data-testid="arpg-adventure-travel"
                    type="button"
                    onClick={() => {
                      if (!activeAdventureEvent) return;
                      if (worldLoop.activeTravelEvent) {
                        const firstChoice = worldLoop.activeTravelEvent.choices[0];
                        if (firstChoice) resolveArpgTravelEvent(firstChoice.id);
                        return;
                      }
                      beginArpgTravel(activeAdventureEvent.routeId);
                    }}
                    style={buttonStyle}
                  >
                    {worldLoop.activeTravelEvent ? "Resolve road card" : "Begin route"}
                  </button>
                  {worldLoop.activeTravelEvent?.choices.slice(0, 2).map((choice) => (
                    <button
                      key={choice.id}
                      data-testid={`arpg-adventure-choice-${choice.id}`}
                      type="button"
                      onClick={() => resolveArpgTravelEvent(choice.id)}
                      style={ghostButtonStyle}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={adventureSceneStyle("encounter")}>
                <div style={{ alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "58px minmax(0, 1fr)" }}>
                  <span
                    aria-label={`${adventureEnemyName} illustrated enemy card`}
                    data-testid="arpg-adventure-enemy-art"
                    role="img"
                    style={illustratedEnemyCardStyle(ILLUSTRATED_ENEMY_FRAME_BY_ID[adventureEnemyId] ?? 0)}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={chipStyle}>
                        {bellrootCombatUnlocked ? "Encounter" : "Encounter locked"}
                      </span>
                      <strong style={{ color: "#ffe1a6", fontSize: 12 }}>{adventureEnemyName}</strong>
                      <span style={{ ...chipStyle, marginLeft: "auto" }}>{adventureEnemyHp}</span>
                    </div>
                    <p style={{ margin: "6px 0 8px", color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.35 }}>
                      {bellrootCombatUnlocked
                        ? "Click-to-fight remains backed by the same deterministic combat loop, statuses, codex, and loot."
                        : "No blades yet. Finish the Bellroot witness steps before the Warden's Antechamber opens combat."}
                    </p>
                  </div>
                </div>
                <button
                  data-testid="arpg-adventure-fight"
                  type="button"
                  onClick={() => {
                    if (!bellrootCombatUnlocked) {
                      handleAdvancePrologueStep();
                      return;
                    }
                    targetArpgEnemy(adventureEnemyId);
                    strikeArpgEnemy(adventureEnemyId);
                  }}
                  style={buttonStyle}
                >
                  {bellrootCombatUnlocked
                    ? `Strike ${adventureEnemyName}`
                    : nextPrologueStep
                      ? nextPrologueStep.title
                      : "Open journal"}
                </button>
              </div>

              <div style={adventureSceneStyle("loot")}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    aria-label="Illustrated loom-shard reward icon"
                    data-testid="arpg-adventure-loot-art"
                    role="img"
                    style={itemIconStyle(ARPG_LOOT_PEDESTAL_ITEM_ID, 38)}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span style={chipStyle}>Loot card</span>
                    <strong style={{ color: "#fff3d6", display: "block", fontSize: 12, marginTop: 4 }}>
                      Loom-Shard pedestal
                    </strong>
                  </div>
                </div>
                <p style={{ margin: "6px 0 8px", color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.35 }}>
                  Loot uses icons and inventory state now; later real item renders can drop into this card system.
                </p>
                <button
                  data-testid="arpg-adventure-loot"
                  type="button"
                  onClick={() => {
                    if (hasLoomShard) {
                      setDrawer("inventory");
                      return;
                    }
                    collectArpgItem(lootNode.itemId, lootNode.id);
                  }}
                  style={buttonStyle}
                >
                  {hasLoomShard ? "Open inventory" : "Claim relic"}
                </button>
              </div>

              <div style={adventureSceneStyle("story")}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={chipStyle}>Story card</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>Journal linked</span>
                </div>
                <strong style={{ color: "#fff3d6", display: "block", fontSize: 12, marginTop: 8 }}>
                  {adventureCityStoryline?.title ?? ARPG_PROLOGUE_CONTENT.firstQuest.title}
                </strong>
                <p style={{ margin: "5px 0 8px", color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.35 }}>
                  {adventureSubCityArc
                    ? `${adventureSubCityArc.title}: ${adventureSubCityArc.localConflict}`
                    : ARPG_PROLOGUE_CONTENT.openingChapter.summary}
                </p>
                <div
                  aria-label="Prologue art direction status"
                  data-testid="arpg-prologue-story-props"
                  style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}
                >
                  <span style={chipStyle}>Bellroot intro {prologueProgressLabel}</span>
                  <span style={chipStyle}>
                    {nextPrologueStep ? `Next: ${nextPrologueStep.title}` : "Antechamber open"}
                  </span>
                  <span style={chipStyle}>No forced name/gender</span>
                </div>
                <button
                  data-testid="arpg-adventure-quest"
                  type="button"
                  onClick={() => {
                    if (nextPrologueStep) {
                      handleAdvancePrologueStep();
                      return;
                    }
                    if (adventureCityStoryline) {
                      selectArpgRegion(adventureCityStoryline.cityId, adventureSubCityArc?.subCityId);
                      acceptArpgQuest(adventureSubCityArc?.id ?? adventureCityStoryline.id);
                    }
                    setDrawer("journal");
                  }}
                  style={buttonStyle}
                >
                  {nextPrologueStep ? "Continue intro" : "Accept story beat"}
                </button>
              </div>
            </div>
          ) : null}

          {drawer === "inventory" ? (
            <div data-testid="arpg-inventory-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                {(["might", "ward", "focus", "speed", "crit", "cooldown", "resonance"] as const).map((stat) => (
                  <div
                    key={stat}
                    style={{
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,.04)",
                      padding: "6px 5px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#ffce7a", fontSize: 13, fontWeight: 900 }}>
                      {stats[stat]}
                    </div>
                    <div style={{ color: "rgba(255,240,214,.56)", fontSize: 8, fontWeight: 850, letterSpacing: ".11em", textTransform: "uppercase" }}>
                      {stat}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                <button
                  data-testid="arpg-claim-loot"
                  type="button"
                  onClick={() => collectArpgItem(lootNode.itemId, lootNode.id)}
                  style={buttonStyle}
                >
                  {hasLoomShard ? "Loom-shard claimed" : "Claim loom-shard"}
                </button>
                <button
                  data-testid="arpg-upgrade-selected"
                  type="button"
                  onClick={() => upgradeArpgItem(selectedItem?.instanceId)}
                  style={buttonStyle}
                >
                  Upgrade {selectedItem?.name ?? "selected gear"}
                </button>
                <button
                  data-testid="arpg-use-health-vial"
                  type="button"
                  onClick={() => consumeArpgItem("health-vial")}
                  style={ghostButtonStyle}
                >
                  Use health vial
                </button>
                <button
                  data-testid="arpg-attack"
                  type="button"
                  onClick={() => strikeArpgEnemy("hollow-sentry")}
                  style={buttonStyle}
                >
                  Strike sentry {sentry?.defeated ? "quiet" : `${sentry?.hp ?? 0} HP`}
                </button>
              </div>
              <div
                data-testid="arpg-hero-kit-inventory-art"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <span style={chipStyle}>Hero Kit inventory art</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {HERO_KIT_WEAPON_ITEM_LABELS.map((label, frame) => (
                    <span
                      key={label}
                      aria-label={label}
                      role="img"
                      title={label}
                      style={heroKitWeaponItemIconStyle(frame, 30)}
                    />
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-oathmarket-kit-wares"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Oathmarket kit</span>
                  <span style={chipStyle}>{oathmarketUnlocked ? "trade open" : "visit market"}</span>
                  <span style={chipStyle}>starter accessories</span>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {ARPG_OATHMARKET_VENDOR_WARES.map((ware) => (
                    <button
                      key={ware.id}
                      data-testid={`arpg-oathmarket-kit-ware-${ware.id}`}
                      type="button"
                      disabled={!oathmarketUnlocked}
                      onClick={() => handleOathmarketWareAction(ware)}
                      style={{
                        ...ghostButtonStyle,
                        cursor: oathmarketUnlocked ? "pointer" : "not-allowed",
                        opacity: oathmarketUnlocked ? 1 : 0.52,
                        textAlign: "left",
                        whiteSpace: "normal",
                      }}
                    >
                      {ware.label} - {ware.qualityHint} {ware.slotHint} - {ware.comparisonCopy}
                    </button>
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-bellroot-kit-brews"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Bellroot brews</span>
                  <span style={chipStyle}>{bellrootCommonsUnlocked ? "lamp still open" : "visit commons"}</span>
                  <span style={chipStyle}>recovery + mystery prep</span>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {ARPG_BELLROOT_COMMONS_BREWS.map((brew) => (
                    <button
                      key={brew.id}
                      data-testid={`arpg-bellroot-kit-brew-${brew.id}`}
                      type="button"
                      disabled={!bellrootCommonsUnlocked}
                      onClick={() => handleBellrootCommonsBrew(brew)}
                      style={{
                        ...ghostButtonStyle,
                        cursor: bellrootCommonsUnlocked ? "pointer" : "not-allowed",
                        opacity: bellrootCommonsUnlocked ? 1 : 0.52,
                        textAlign: "left",
                        whiteSpace: "normal",
                      }}
                    >
                      {brew.label} - {brew.brewRole} - {brew.conditionTags.join(" / ")}
                    </button>
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-arsenal-grid"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Arsenal visuals</span>
                  <span style={chipStyle}>{ARPG_ARSENAL_CONTENT.weaponItemTemplates.length} families</span>
                  <span style={chipStyle}>{ARPG_ARSENAL_CONTENT.qualityRules.length} qualities</span>
                  <button
                    data-testid="arpg-claim-arsenal-weapon"
                    type="button"
                    onClick={() => {
                      collectArpgItem(featuredArsenalWeapon.itemId, "arsenal-demo-cache");
                      setDrawer("inventory");
                    }}
                    style={{ ...buttonStyle, marginLeft: "auto" }}
                  >
                    Claim {featuredArsenalWeapon.name}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ARPG_ARSENAL_CONTENT.weaponItemTemplates.map((template) => (
                    <span
                      key={template.id}
                      aria-label={template.name}
                      data-testid={`arpg-arsenal-weapon-${template.familyId}`}
                      role="img"
                      title={`${template.name} - ${template.damageType} - ${template.classAffinity.join(", ")}`}
                      style={arsenalWeaponIconStyle(template.iconFrame, 30)}
                    />
                  ))}
                </div>
                <div data-testid="arpg-arsenal-quality-row" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {ARPG_ARSENAL_CONTENT.qualityRules.map((quality) => (
                    <span
                      key={quality.id}
                      title={`${quality.label}: ${quality.comparisonCopy}`}
                      style={{
                        ...chipStyle,
                        alignItems: "center",
                        borderColor: `${quality.color}88`,
                        color: quality.color,
                        display: "inline-flex",
                        gap: 5,
                        padding: "4px 6px",
                      }}
                    >
                      <span aria-hidden="true" style={arsenalQualityOverlayStyle(quality.overlayFrame, 20)} />
                      <span>{quality.label} +{quality.upgradeCap}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: 7 }}>
                {inventory.map((item) => (
                  <button
                    key={item.instanceId}
                    data-testid={`arpg-equip-${item.id}`}
                    type="button"
                    onClick={() =>
                      item.type === "equipment"
                        ? equipArpgItem(item.instanceId)
                        : item.type === "consumable"
                          ? consumeArpgItem(item.id)
                          : undefined
                    }
                    style={{
                      ...(item.type === "equipment" ? buttonStyle : ghostButtonStyle),
                      borderColor: `${rarityBorder(item.rarity)}88`,
                      color: item.accent,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span data-testid={`arpg-item-icon-${item.id}`} style={itemIconStyle(item.id)} />
                      <span>
                        {item.type === "equipment" ? "Equip" : item.type === "consumable" ? "Use" : "Keep"}{" "}
                        {item.displayName} - {item.type === "equipment" ? item.slot : item.type} -{" "}
                        {item.summary}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "hero" ? (
            <div data-testid="arpg-hero-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Hero</span>
                <span style={chipStyle}>Save v{profile.saveVersion}</span>
                <span style={{ ...chipStyle, borderColor: `${profile.palette.accent}77` }}>
                  {profile.character.characterName}
                </span>
              </div>
              <div
                style={{
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 9,
                  gridTemplateColumns: "54px minmax(0, 1fr)",
                  padding: 8,
                }}
              >
                <span
                  aria-hidden="true"
                  data-testid="arpg-hero-sprite-preview"
                  style={playerSpriteStyle(profile.classTree.id)}
                />
                <div>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                    {profile.classTree.name} {profile.subclass.name} - {profile.lineage.name}
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.66)", fontSize: 10, lineHeight: 1.4 }}>
                    {profile.lineage.passive.name}: {profile.lineage.passive.summary}
                  </p>
                </div>
              </div>
              <div
                data-testid="arpg-hero-kit-preview"
                style={{
                  alignItems: "center",
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 9,
                  gridTemplateColumns: "112px minmax(0, 1fr)",
                  padding: 8,
                }}
              >
                <span style={{ display: "flex", gap: 6 }}>
                  <span aria-hidden="true" style={heroKitPortraitStyle(heroKitClassFrame)} />
                  <span aria-hidden="true" style={heroKitOutfitStyle(heroKitClassFrame)} />
                </span>
                <div>
                  <span style={chipStyle}>Hero Kit art</span>
                  <p style={{ margin: "5px 0 0", color: "rgba(255,240,214,.66)", fontSize: 10, lineHeight: 1.35 }}>
                    Approved illustrated portrait and outfit cards now lead this class preview before procedural sprites.
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                {characterOptions.lineages.map((lineage) => (
                  <button
                    key={lineage.id}
                    data-testid={`arpg-race-${lineage.id}`}
                    type="button"
                    onClick={() => createArpgCharacter({ raceId: lineage.id })}
                    style={{
                      ...(lineage.id === profile.lineage.id ? buttonStyle : ghostButtonStyle),
                      textAlign: "left",
                    }}
                  >
                    {lineage.name} - {lineage.passive.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                {characterOptions.classTrees.map((classTree) => {
                  const classArtFrame = HERO_KIT_CLASS_FRAME_BY_ID[classTree.id];
                  return (
                    <button
                      key={classTree.id}
                      data-testid={`arpg-class-${classTree.id}`}
                      type="button"
                      onClick={() => respecArpgCharacter({ classPathId: classTree.id })}
                      style={{
                        ...(classTree.id === profile.classTree.id ? buttonStyle : ghostButtonStyle),
                        borderColor: `${classTree.accent}66`,
                        color: classTree.accent,
                        minHeight: classArtFrame !== undefined ? 64 : undefined,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ alignItems: "center", display: "flex", gap: 7 }}>
                        {classArtFrame !== undefined ? (
                          <span
                            aria-label={`${classTree.name} Hero Kit class art`}
                            data-testid={`arpg-hero-class-art-${classTree.id}`}
                            role="img"
                            style={heroKitPortraitStyle(classArtFrame, 42)}
                          />
                        ) : null}
                        <span style={{ display: "grid", gap: 2 }}>
                          <span>{classTree.name}</span>
                          <span style={{ color: "rgba(255,240,214,.6)", fontSize: 8 }}>
                            {classTree.resource} - {classTree.role}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Subclasses</span>
                {profile.classTree.subclasses.map((subclass) => (
                  <button
                    key={subclass.id}
                    data-testid={`arpg-subclass-${subclass.id}`}
                    type="button"
                    onClick={() => respecArpgCharacter({ subclassId: subclass.id })}
                    style={{
                      ...(subclass.id === profile.subclass.id ? buttonStyle : ghostButtonStyle),
                      textAlign: "left",
                    }}
                  >
                    {subclass.name} - {subclass.perk}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {lineagePalettes.map((palette) => (
                  <button
                    key={palette.id}
                    data-testid={`arpg-palette-${palette.id}`}
                    type="button"
                    onClick={() => setArpgCharacterCosmetic({ paletteId: palette.id })}
                    style={{
                      ...(palette.id === profile.palette.id ? buttonStyle : ghostButtonStyle),
                      borderColor: `${palette.accent}77`,
                      color: palette.accent,
                    }}
                  >
                    {palette.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "skills" ? (
            <div data-testid="arpg-skills-drawer" style={{ display: "grid", gap: 8, marginTop: 11 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Skills</span>
                <span style={{ ...chipStyle, borderColor: `${profile.classTree.accent}66` }}>
                  {profile.classTree.name}
                </span>
                <span style={chipStyle}>{profile.classTree.resource}</span>
              </div>
              <p style={{ margin: 0, color: "rgba(255,240,214,.66)", fontSize: 10, lineHeight: 1.4 }}>
                {profile.classTree.role}
              </p>
              {currentClassSkills.map((skill) => (
                <button
                  key={skill.id}
                  data-testid={`arpg-skill-${skill.id}`}
                  type="button"
                  onClick={() => unlockArpgSkill(skill.id)}
                  style={{
                    ...(skill.unlocked ? buttonStyle : ghostButtonStyle),
                    borderColor: `${skill.accent}66`,
                    color: skill.accent,
                    textAlign: "left",
                    opacity: skill.available ? 1 : 0.62,
                  }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-label={`${skill.name} illustrated skill icon`}
                        data-testid={`arpg-skill-art-${skill.id}`}
                        role="img"
                        style={illustratedSkillIconStyle(skill.id, 28)}
                      />
                      <span>
                        {skill.equipped ? "Equipped" : skill.unlocked ? "Known" : "Unlock"} {skill.name} -{" "}
                        {skill.kind} - {skill.summary}
                      </span>
                    </span>
                  </button>
              ))}
              <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{profile.subclass.name}</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                  {profile.subclass.summary} {profile.subclass.perk}
                </p>
              </div>
            </div>
          ) : null}

          {drawer === "map" ? (
            <div data-testid="arpg-map-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div data-testid="arpg-world-progress" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Cities {worldLoop.production.majorCityCount}</span>
                <span style={chipStyle}>Sub-cities {worldLoop.production.subCityCount}</span>
                <span style={chipStyle}>Routes {worldLoop.production.routeCount}</span>
                <span style={chipStyle}>Found {worldLoop.discoveredCityCount}/12</span>
              </div>
              <div
                data-testid="arpg-map-illustrated-region"
                style={{
                  alignItems: "center",
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 14,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "108px minmax(0, 1fr)",
                  padding: 8,
                }}
              >
                <span
                  aria-label="Illustrated selected region card"
                  data-testid="arpg-map-location-art"
                  role="img"
                  style={regionLocationCardStyle(selectedJourneyCityId)}
                />
                <div style={{ minWidth: 0 }}>
                  <span style={chipStyle}>Illustrated region</span>
                  <strong style={{ color: "#ffe1a6", display: "block", fontSize: 11, marginTop: 5 }}>
                    {selectedJourneyCityId.replace(/-/g, " ")}
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                    Approved location cards now lead the world map before full city tilemaps land.
                  </p>
                </div>
              </div>
              <div
                data-testid="arpg-first-town-release"
                style={{
                  border: "1px solid rgba(255, 197, 112, 0.2)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(255,176,76,.1), rgba(11,18,24,.46))",
                  boxShadow: "0 16px 32px rgba(0,0,0,.22)",
                  display: "grid",
                  gap: 8,
                  padding: 9,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>First release town</span>
                  <strong style={{ color: "#ffe1a6", fontSize: 12 }}>
                    {firstReleaseTownStoryline?.title ?? "Veyrhold"}
                  </strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>{firstReleaseTownStatus}</span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.66)", fontSize: 10, lineHeight: 1.35 }}>
                  {firstReleaseTownCopy}
                </p>
                {firstReleaseRouteEvent ? (
                  <button
                    data-testid={`arpg-route-${firstReleaseRouteEvent.routeId}`}
                    type="button"
                    disabled={!firstReleaseRouteUnlocked && !firstReleaseTownOpen}
                    onClick={() => {
                      if (firstReleaseTownOpen) {
                        selectArpgRegion(firstReleaseTownId);
                        return;
                      }
                      if (firstReleaseRouteUnlocked) {
                        beginArpgTravel(firstReleaseRouteEvent.routeId);
                      }
                    }}
                    style={{
                      ...(firstReleaseRouteUnlocked || firstReleaseTownOpen ? buttonStyle : ghostButtonStyle),
                      cursor: firstReleaseRouteUnlocked || firstReleaseTownOpen ? "pointer" : "not-allowed",
                      opacity: firstReleaseRouteUnlocked || firstReleaseTownOpen ? 1 : 0.58,
                      textAlign: "left",
                    }}
                  >
                    {firstReleaseTownOpen
                      ? "Open Veyrhold town map"
                      : firstReleaseRouteUnlocked
                        ? "Begin north-gate route"
                        : "North gate locked"}
                  </button>
                ) : null}
              </div>
              <div
                data-testid="arpg-first-town-presentation-cues"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.15)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(126,227,184,.075), rgba(255,209,102,.045))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Presentation cues</span>
                  <span style={chipStyle}>{firstTownPresentation.cueCount} total</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstTownPresentation.reducedMotionCueCount} reduced-motion
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {veyrholdPresentationCues.map((cue) => {
                    const selected =
                      cue.districtId === save.journey?.selectedSubCityId ||
                      (cue.districtId === firstReleaseTownId && selectedJourneyCityId === firstReleaseTownId);
                    return (
                      <span
                        key={cue.id}
                        data-testid={`arpg-presentation-cue-${cue.districtId}`}
                        style={{
                          border: selected
                            ? "1px solid rgba(255, 209, 102, 0.34)"
                            : "1px solid rgba(255,255,255,.08)",
                          borderRadius: 12,
                          background: selected ? "rgba(255, 209, 102, 0.08)" : "rgba(255,255,255,.035)",
                          display: "grid",
                          gap: 5,
                          gridTemplateColumns: "28px minmax(0, 1fr)",
                          padding: 6,
                        }}
                      >
                        <span aria-hidden="true" style={arsenalVfxStyle(cue.vfxFrame, 28)} />
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ color: "#ffe1a6", display: "block", fontSize: 9 }}>
                            {cue.label}
                          </strong>
                          <span style={{ color: "rgba(255,240,214,.58)", display: "block", fontSize: 8, lineHeight: 1.25 }}>
                            {cue.vfxIntent}
                          </span>
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
              {worldLoop.activeTravelEvent ? (
                <div data-testid="arpg-travel-event" style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{worldLoop.activeTravelEvent.title}</strong>
                  <p style={{ margin: "4px 0 8px", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                    {worldLoop.activeTravelEvent.summary}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {worldLoop.activeTravelEvent.choices.map((choice) => (
                      <button
                        key={choice.id}
                        data-testid={`arpg-travel-choice-${choice.id}`}
                        type="button"
                        onClick={() => resolveArpgTravelEvent(choice.id)}
                        style={buttonStyle}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={chipStyle}>Roads</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {worldLoop.routeEvents
                      .filter((event) => event.routeId !== firstReleaseRouteEvent?.routeId)
                      .slice(0, 3)
                      .map((event) => (
                        <button
                          key={event.routeId}
                          type="button"
                          disabled
                          style={{
                            ...ghostButtonStyle,
                            cursor: "not-allowed",
                            opacity: 0.48,
                          }}
                          title="Locked for a later city-release slice"
                        >
                          {event.to.replace(/-/g, " ")} locked
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Town map</span>
                {firstReleaseTownStoryline ? (
                  <button
                    data-testid={`arpg-city-${firstReleaseTownStoryline.cityId}`}
                    type="button"
                    disabled={!firstReleaseTownOpen}
                    onClick={() => {
                      if (!firstReleaseTownOpen) return;
                      selectArpgRegion(firstReleaseTownStoryline.cityId);
                      acceptArpgQuest(firstReleaseTownStoryline.id);
                    }}
                    style={{
                      ...(selectedJourneyCityId === firstReleaseTownStoryline.cityId ? buttonStyle : ghostButtonStyle),
                      cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                      opacity: firstReleaseTownOpen ? 1 : 0.62,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-label={`${firstReleaseTownStoryline.title} illustrated city card`}
                        data-testid={`arpg-city-art-${firstReleaseTownStoryline.cityId}`}
                        role="img"
                        style={regionLocationCardStyle(firstReleaseTownStoryline.cityId)}
                      />
                      <span>
                        {firstReleaseTownStoryline.title} -{" "}
                        {firstReleaseTownOpen
                          ? firstReleaseTownStoryline.factionIds.slice(0, 2).join(" / ")
                          : "locked until north gate"}
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
              <div data-testid="arpg-first-town-districts" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Veyrhold districts {firstReleaseDistricts.length}/4</span>
                {firstReleaseDistricts.map((arc) => (
                    <button
                      key={arc.id}
                      data-testid={`arpg-subcity-${arc.subCityId}`}
                      type="button"
                      disabled={!firstReleaseTownOpen}
                      onClick={() => {
                        if (!firstReleaseTownOpen) return;
                        selectArpgRegion(arc.cityId, arc.subCityId);
                        acceptArpgQuest(arc.id);
                      }}
                      style={{
                        ...ghostButtonStyle,
                        cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                        opacity: firstReleaseTownOpen ? 1 : 0.55,
                        textAlign: "left",
                      }}
                    >
                      {arc.title} -{" "}
                      {firstReleaseTownOpen
                        ? `${arc.miniBoss} drops ${arc.rewardName}`
                        : "opens after Veyrhold arrival"}
                    </button>
                  ))}
              </div>
              <div
                data-testid="arpg-veyrhold-district-hub"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(58,39,18,.42), rgba(10,17,18,.42))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Town hub</span>
                  <span style={chipStyle}>{townServices.districtMapNodeCount} districts</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstReleaseTownOpen ? "visitable" : "locked"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_VEYR_DISTRICT_MAP_NODES.map((node) => {
                    const visited = save.storyFlags.includes(node.storyFlag);
                    const selected = save.journey?.selectedSubCityId === node.districtId;
                    return (
                      <button
                        key={node.id}
                        data-testid={`arpg-veyrhold-district-node-${node.districtId}`}
                        type="button"
                        disabled={!firstReleaseTownOpen}
                        onClick={() => handleVeyrholdDistrictVisit(node)}
                        style={{
                          ...(selected || visited ? buttonStyle : ghostButtonStyle),
                          borderRadius: 12,
                          cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                          opacity: firstReleaseTownOpen ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 4 }}>
                          <span style={{ alignItems: "center", display: "flex", gap: 5 }}>
                            <strong style={{ color: "#ffe1a6", fontSize: 9 }}>{node.label}</strong>
                            <span style={{ ...chipStyle, fontSize: 6, padding: "1px 4px" }}>
                              {visited ? "visited" : "visit"}
                            </span>
                          </span>
                          <span style={{ color: "rgba(255,240,214,.62)", fontSize: 8, lineHeight: 1.25 }}>
                            {node.mapRole}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.5)", fontSize: 8, lineHeight: 1.25 }}>
                            Rewards: {node.rewardItemIds.join(" / ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-oathmarket-runtime"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(92,59,24,.34), rgba(17,11,8,.5))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Oathmarket exchange</span>
                  <span style={chipStyle}>{townServices.oathmarketWareCount} wares</span>
                  <span style={chipStyle}>{townServices.oathmarketChoiceCount} rulings</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {oathmarketUnlocked ? "open" : "visit Oathmarket"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_OATHMARKET_VENDOR_WARES.map((ware) => {
                    const claimed = save.storyFlags.includes(ware.storyFlag);
                    return (
                      <button
                        key={ware.id}
                        data-testid={`arpg-oathmarket-ware-${ware.id}`}
                        type="button"
                        disabled={!oathmarketUnlocked}
                        onClick={() => handleOathmarketWareAction(ware)}
                        style={{
                          ...(claimed ? buttonStyle : ghostButtonStyle),
                          cursor: oathmarketUnlocked ? "pointer" : "not-allowed",
                          opacity: oathmarketUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {claimed ? "Reserved" : "Trade"} - {ware.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {ware.priceAmount} {ware.priceCurrencyItemId.replace(/-/g, " ")} - {ware.slotHint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={chipStyle}>Ledger choice</span>
                  {ARPG_OATHMARKET_LEDGER_CHOICES.map((choice) => {
                    const chosen = save.storyFlags.includes(choice.storyFlag);
                    return (
                      <button
                        key={choice.id}
                        data-testid={`arpg-oathmarket-choice-${choice.id}`}
                        type="button"
                        disabled={!oathmarketUnlocked || (oathmarketChoiceResolved && !chosen)}
                        onClick={() => handleOathmarketLedgerChoice(choice)}
                        style={{
                          ...(chosen ? buttonStyle : ghostButtonStyle),
                          cursor: oathmarketUnlocked && (!oathmarketChoiceResolved || chosen) ? "pointer" : "not-allowed",
                          opacity: oathmarketUnlocked && (!oathmarketChoiceResolved || chosen) ? 1 : 0.5,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {chosen ? "Chosen" : "Choose"} - {choice.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {choice.stance} - {choice.rewardItemIds.join(" / ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-wardens-steps-runtime"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(72,47,28,.38), rgba(12,12,11,.52))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Warden&apos;s Steps forge</span>
                  <span style={chipStyle}>{townServices.wardensStepsArmorFittingCount} fittings</span>
                  <span style={chipStyle}>{townServices.wardensStepsOathContractCount} contracts</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {wardensStepsUnlocked ? "forge open" : "visit Warden's Steps"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_WARDENS_STEPS_ARMOR_FITTINGS.map((fitting) => {
                    const claimed = save.storyFlags.includes(fitting.storyFlag);
                    return (
                      <button
                        key={fitting.id}
                        data-testid={`arpg-wardens-armor-fit-${fitting.id}`}
                        type="button"
                        disabled={!wardensStepsUnlocked}
                        onClick={() => handleWardensStepsArmorFitting(fitting)}
                        style={{
                          ...(claimed ? buttonStyle : ghostButtonStyle),
                          cursor: wardensStepsUnlocked ? "pointer" : "not-allowed",
                          opacity: wardensStepsUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {claimed ? "Fitted" : "Fit"} - {fitting.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {fitting.slot} - {fitting.qualityPath.join(" > ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={chipStyle}>Civic oath contracts {wardensStepsContractCount}/3</span>
                  {ARPG_WARDENS_STEPS_OATH_CONTRACTS.map((contract) => {
                    const resolved = save.storyFlags.includes(contract.storyFlag);
                    return (
                      <button
                        key={contract.id}
                        data-testid={`arpg-wardens-contract-${contract.id}`}
                        type="button"
                        disabled={!wardensStepsUnlocked}
                        onClick={() => handleWardensStepsOathContract(contract)}
                        style={{
                          ...(resolved ? buttonStyle : ghostButtonStyle),
                          cursor: wardensStepsUnlocked ? "pointer" : "not-allowed",
                          opacity: wardensStepsUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {resolved ? "Witnessed" : "Take"} - {contract.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {contract.rewardItemIds.join(" / ")} - {contract.outcomeCopy}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-bellroot-commons-runtime"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.16)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(20,62,52,.34), rgba(13,13,10,.54))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Bellroot Commons</span>
                  <span style={chipStyle}>{townServices.bellrootCommonsBrewCount} brews</span>
                  <span style={chipStyle}>lamp readings {bellrootLampReadingCount}/{townServices.bellrootLampReadingCount}</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {bellrootCommonsUnlocked ? "still open" : "visit Commons"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_BELLROOT_COMMONS_BREWS.map((brew) => {
                    const brewed = save.storyFlags.includes(brew.storyFlag);
                    return (
                      <button
                        key={brew.id}
                        data-testid={`arpg-bellroot-brew-${brew.id}`}
                        type="button"
                        disabled={!bellrootCommonsUnlocked}
                        onClick={() => handleBellrootCommonsBrew(brew)}
                        style={{
                          ...(brewed ? buttonStyle : ghostButtonStyle),
                          cursor: bellrootCommonsUnlocked ? "pointer" : "not-allowed",
                          opacity: bellrootCommonsUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {brewed ? "Brewed" : "Brew"} - {brew.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {brew.brewRole} - {brew.rewardItemIds.join(" / ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={chipStyle}>Ilo lamp mystery</span>
                  {ARPG_BELLROOT_LAMP_READINGS.map((reading) => {
                    const recorded = save.storyFlags.includes(reading.storyFlag);
                    return (
                      <button
                        key={reading.id}
                        data-testid={`arpg-bellroot-reading-${reading.id}`}
                        type="button"
                        disabled={!bellrootCommonsUnlocked}
                        onClick={() => handleBellrootLampReading(reading)}
                        style={{
                          ...(recorded ? buttonStyle : ghostButtonStyle),
                          cursor: bellrootCommonsUnlocked ? "pointer" : "not-allowed",
                          opacity: bellrootCommonsUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {recorded ? "Recorded" : "Study"} - {reading.label}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {reading.rewardItemIds.join(" / ")} - {reading.outcomeCopy}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-veyrhold-town-services"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(84,55,24,.34), rgba(12,9,7,.48))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Town services</span>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{townServices.title}</strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstReleaseTownOpen ? `${townServices.serviceCount} open` : "locked"}
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  {townServices.summary}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_VEYR_HUB_SERVICES.map((service) => (
                    <button
                      key={service.id}
                      data-testid={`arpg-town-service-${service.id}`}
                      type="button"
                      disabled={!firstReleaseTownOpen}
                      onClick={() => handleTownServiceAction(service)}
                      style={{
                        ...ghostButtonStyle,
                        cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                        opacity: firstReleaseTownOpen ? 1 : 0.52,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ display: "grid", gap: 3 }}>
                        <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                          {service.label} - {service.kind.replace(/-/g, " ")}
                        </span>
                        <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                          {firstReleaseTownOpen ? service.primaryAction : "Open Veyrhold first"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {ARPG_VEYR_DISTRICT_HOOKS.map((hook) => (
                    <span key={hook.id} style={{ ...chipStyle, letterSpacing: ".06em" }} title={hook.firstConflict}>
                      {hook.label}: {hook.releaseRole}
                    </span>
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-veyrhold-miniquests"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.14)",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(28,67,50,.24), rgba(12,9,7,.48))",
                  display: "grid",
                  gap: 8,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Town jobs</span>
                  <span style={chipStyle}>NPCs {townServices.npcCount}</span>
                  <span style={chipStyle}>Mini-quests {townServices.miniQuestCount}</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstReleaseTownOpen ? "board live" : "open Veyrhold"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_VEYR_MINI_QUESTS.map((quest) => {
                    const npc = ARPG_VEYR_TOWN_NPCS.find((entry) => entry.id === quest.npcId);
                    const resolved = quest.storyFlags.every((flag) => save.storyFlags.includes(flag));
                    return (
                      <button
                        key={quest.id}
                        data-testid={`arpg-town-miniquest-${quest.id}`}
                        type="button"
                        disabled={!firstReleaseTownOpen}
                        onClick={() => handleVeyrholdMiniQuestAction(quest)}
                        style={{
                          ...(resolved ? buttonStyle : ghostButtonStyle),
                          cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                          opacity: firstReleaseTownOpen ? 1 : 0.52,
                          textAlign: "left",
                        }}
                      >
                        <span style={{ display: "grid", gap: 3 }}>
                          <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                            {resolved ? "Resolved" : "Start"} - {quest.title}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                            {npc?.name ?? "Veyrhold local"} - {quest.rewardItemIds.join(" / ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-veyrhold-gear-paths"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.12)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Starter gear paths</span>
                  <span style={chipStyle}>Armor + accessories</span>
                  <span style={chipStyle}>{townServices.starterGearSlotCount} slots</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_VEYR_STARTER_GEAR_PROGRESSION.map((entry) => (
                    <span
                      key={entry.slot}
                      style={{
                        border: "1px solid rgba(255,255,255,.08)",
                        borderRadius: 10,
                        background: "rgba(255,255,255,.035)",
                        color: "rgba(255,240,214,.68)",
                        fontSize: 8,
                        lineHeight: 1.3,
                        padding: 6,
                      }}
                      title={entry.visualRule}
                    >
                      <strong style={{ color: "#ffe1a6", display: "block", fontSize: 9 }}>
                        {entry.slot.replace(/-/g, " ")}
                      </strong>
                      {entry.source} - {entry.qualityPath.join(" > ")}
                    </span>
                  ))}
                </div>
              </div>
              <div data-testid="arpg-locked-world-preview" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Locked world preview</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {worldLoop.cityStorylines
                    .filter((storyline) => storyline.cityId !== firstReleaseTownId)
                    .slice(0, 5)
                    .map((storyline) => (
                      <button
                        key={storyline.id}
                        type="button"
                        disabled
                        style={{
                          ...ghostButtonStyle,
                          cursor: "not-allowed",
                          opacity: 0.45,
                        }}
                        title="Future act city"
                      >
                        {storyline.title} locked
                      </button>
                    ))}
                  <span style={chipStyle}>+{Math.max(0, worldLoop.cityStorylines.length - 6)} future cities</span>
                </div>
              </div>
            </div>
          ) : null}

          {drawer === "armory" ? (
            <div data-testid="arpg-armory-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div data-testid="arpg-armory-progress" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Weapons {armory.systems.weaponFamilyCount}</span>
                <span style={chipStyle}>Slots {armory.systems.gearSlotCount}</span>
                <span style={chipStyle}>Qualities {armory.systems.qualityCount}</span>
                <span style={chipStyle}>Recipes {armory.systems.craftingRecipeCount}</span>
              </div>
              <div data-testid="arpg-armory-comparison" style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                <div style={{ alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "44px minmax(0, 1fr)" }}>
                  <span
                    aria-hidden="true"
                    data-testid="arpg-armory-selected-visual"
                    style={itemIconStyle(armory.selectedItem?.id ?? selectedItem?.id ?? featuredArsenalWeapon.itemId, 42)}
                  />
                  <div>
                    <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                      {armory.selectedItem?.displayName ?? selectedItem?.displayName ?? "No item selected"}
                    </strong>
                    <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                      {armory.selectedItem
                        ? selectedArsenalComparison?.comparisonCopy ??
                          `${armory.selectedItem.summary} Quality ${armory.selectedItem.quality}, +${armory.selectedItem.upgradeRank}.`
                        : "Choose kit gear to compare, craft, or salvage."}
                    </p>
                  </div>
                </div>
                {selectedArsenalComparison ? (
                  <div
                    data-testid="arpg-arsenal-comparison"
                    style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}
                  >
                    <span style={chipStyle}>Power {selectedArsenalComparison.powerScore}</span>
                    <span style={chipStyle}>Sockets {selectedArsenalComparison.socketCount}</span>
                    <span style={chipStyle}>Left +{selectedArsenalComparison.upgradeRemaining}</span>
                    <span style={chipStyle}>Salvage {selectedArsenalComparison.salvageSummary}</span>
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  data-testid="arpg-craft-first-temper"
                  type="button"
                  onClick={() => craftArpgRecipe("first-temper")}
                  style={buttonStyle}
                >
                  Craft first temper
                </button>
                <button
                  data-testid="arpg-salvage-selected"
                  type="button"
                  onClick={() => salvageArpgItem(selectedItem?.instanceId)}
                  style={ghostButtonStyle}
                >
                  Salvage selected
                </button>
              </div>
              <div
                data-testid="arpg-hero-kit-armory-art"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <span style={chipStyle}>Hero Kit armory art</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {HERO_KIT_ARMOR_EQUIPMENT_LABELS.map((label, frame) => (
                    <span
                      key={label}
                      aria-label={label}
                      role="img"
                      title={label}
                      style={heroKitArmorEquipmentIconStyle(frame, 30)}
                    />
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-veyrhold-armory-services"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Veyrhold gear plan</span>
                  <span style={chipStyle}>Helm / armor / gloves / boots</span>
                  <span style={chipStyle}>Rings / amulet</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_VEYR_STARTER_GEAR_PROGRESSION.map((entry) => (
                    <div
                      key={entry.starterItemId}
                      style={{
                        alignItems: "center",
                        border: "1px solid rgba(255,255,255,.08)",
                        borderRadius: 10,
                        display: "grid",
                        gap: 6,
                        gridTemplateColumns: "28px minmax(0, 1fr)",
                        padding: 6,
                      }}
                    >
                      <span aria-hidden="true" style={itemIconStyle(entry.starterItemId, 26)} />
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ color: "#ffe1a6", display: "block", fontSize: 8 }}>
                          {entry.slot.replace(/-/g, " ")} - {entry.firstUpgradeTheme}
                        </strong>
                        <span style={{ color: "rgba(255,240,214,.58)", display: "block", fontSize: 7, lineHeight: 1.25 }}>
                          {entry.source}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                data-testid="arpg-wardens-steps-armory-fittings"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.14)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Warden&apos;s Steps fittings</span>
                  <span style={chipStyle}>{wardensStepsUnlocked ? "forge ready" : "visit district"}</span>
                  <span style={chipStyle}>quality teaches silhouette</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {ARPG_WARDENS_STEPS_ARMOR_FITTINGS.map((fitting) => {
                    const claimed = save.storyFlags.includes(fitting.storyFlag);
                    return (
                      <button
                        key={fitting.id}
                        data-testid={`arpg-wardens-armory-fit-${fitting.id}`}
                        type="button"
                        disabled={!wardensStepsUnlocked}
                        onClick={() => handleWardensStepsArmorFitting(fitting)}
                        style={{
                          ...(claimed ? buttonStyle : ghostButtonStyle),
                          cursor: wardensStepsUnlocked ? "pointer" : "not-allowed",
                          opacity: wardensStepsUnlocked ? 1 : 0.52,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        <span style={{ alignItems: "center", display: "grid", gap: 6, gridTemplateColumns: "28px minmax(0, 1fr)" }}>
                          <span aria-hidden="true" style={itemIconStyle(fitting.starterItemId, 26)} />
                          <span>
                            <strong style={{ color: "#ffe1a6", display: "block", fontSize: 8 }}>
                              {fitting.slot} - {fitting.label}
                            </strong>
                            <span style={{ color: "rgba(255,240,214,.58)", display: "block", fontSize: 7, lineHeight: 1.25 }}>
                              {fitting.statLesson}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                data-testid="arpg-arsenal-named-cards"
                style={{
                  border: "1px solid rgba(255, 214, 150, 0.16)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Named weapon cards</span>
                  <span style={chipStyle}>{armory.arsenalSystems.namedWeaponCardCount} samples</span>
                  <span style={chipStyle}>Base art + quality overlays first</span>
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {ARPG_ARSENAL_CONTENT.namedWeaponCards.map((weapon) => {
                    const quality = ARPG_ARSENAL_CONTENT.qualityRules.find((rule) => rule.id === weapon.quality);
                    return (
                      <button
                        key={weapon.id}
                        data-testid={`arpg-arsenal-card-${weapon.itemId}`}
                        type="button"
                        onClick={() => {
                          collectArpgItem(weapon.itemId, `arsenal-card:${weapon.id}`);
                          setDrawer("inventory");
                        }}
                        style={{
                          ...ghostButtonStyle,
                          borderColor: `${quality?.color ?? "#ffd166"}77`,
                          display: "grid",
                          gap: 5,
                          minWidth: 104,
                          padding: 7,
                          textAlign: "left",
                        }}
                      >
                        <span aria-hidden="true" style={arsenalNamedWeaponCardStyle(weapon.cardFrame)} />
                        <strong style={{ color: quality?.color ?? "#ffe1a6", fontSize: 8 }}>
                          {weapon.name}
                        </strong>
                        <span style={{ color: "rgba(255,240,214,.58)", fontSize: 7, lineHeight: 1.25 }}>
                          {weapon.quality} {weapon.familyId.replace(/-/g, " ")} +{weapon.upgradeRank}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Weapon families</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {armory.weaponFamilies.map((family, index) => (
                    <span
                      key={family.id}
                      style={{
                        ...chipStyle,
                        alignItems: "center",
                        display: "flex",
                        gap: 6,
                        justifyContent: "flex-start",
                        letterSpacing: ".06em",
                        padding: "4px 6px",
                      }}
                    >
                      <span aria-hidden="true" style={weaponIconStyle(index)} />
                      <span>{family.id.replace(/-/g, " ")} - {family.critProfile}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div data-testid="arpg-arsenal-vfx-row" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ARPG_ARSENAL_CONTENT.vfxFrames.slice(0, 8).map((effect) => (
                  <span
                    key={effect.id}
                    title={effect.label}
                    style={{
                      ...chipStyle,
                      alignItems: "center",
                      borderColor: `${effect.color}77`,
                      color: effect.color,
                      display: "inline-flex",
                      gap: 5,
                      padding: "4px 6px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={arsenalVfxStyle(reducedMotion ? effect.reducedMotionFrame : effect.frame, 22)}
                    />
                    <span>{effect.label}</span>
                  </span>
                ))}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Economy materials</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {armory.currencies.map((currency) => (
                    <span
                      key={currency.id}
                      title={currency.source}
                      style={{
                        ...chipStyle,
                        alignItems: "center",
                        display: "inline-flex",
                        gap: 6,
                        padding: "4px 6px",
                      }}
                    >
                      <span aria-hidden="true" style={economyIconStyle(currency.id)} />
                      <span>{currency.id.replace(/-/g, " ")}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Crafting outputs</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["health-vial", "focus-draught", "gate-key-fragment", "rune-ember", "rune-frost", "rune-void"].map((id) => (
                    <span
                      key={id}
                      style={{
                        ...chipStyle,
                        alignItems: "center",
                        display: "inline-flex",
                        gap: 6,
                        padding: "4px 6px",
                      }}
                    >
                      <span aria-hidden="true" style={economyIconStyle(id)} />
                      <span>{id.replace(/-/g, " ")}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>City armor sets {armory.systems.cityArmorSetCount}</span>
                {armory.armorSets.slice(0, 6).map((set) => (
                  <span
                    key={set.id}
                    style={{
                      ...chipStyle,
                      alignItems: "center",
                      display: "inline-flex",
                      gap: 6,
                      justifyContent: "flex-start",
                      padding: "4px 6px",
                    }}
                  >
                    <span aria-hidden="true" style={armorIconStyle(set.armorFamilyId)} />
                    <span>{set.name} - {set.setBonus}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "journal" ? (
            <div data-testid="arpg-journal-drawer" style={{ display: "grid", gap: 9, marginTop: 11 }}>
              <span style={chipStyle}>Story objective</span>
              <p style={{ margin: 0, color: "#fff0d6", fontSize: 11, lineHeight: 1.4 }}>
                {objective}
              </p>
              <div style={{ border: "1px solid rgba(255,214,150,.12)", borderRadius: 12, padding: 8 }}>
                <span style={chipStyle}>Prologue</span>
                <strong style={{ color: "#ffe1a6", display: "block", fontSize: 11, marginTop: 5 }}>
                  {ARPG_PROLOGUE_CONTENT.openingChapter.title}
                </strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                  {ARPG_PROLOGUE_CONTENT.protagonistIdentity.defaultRuntimeTitle} is a neutral title until the player chooses identity. The opening starts with ledger, lamps, Ilo, and the gate before combat.
                </p>
                <div
                  data-testid="arpg-bellroot-intro-flow"
                  style={{ display: "grid", gap: 5, marginTop: 8 }}
                >
                  {prologueOpeningFlow.map((step) => {
                    const complete = save.storyFlags.includes(step.storyFlag);
                    const isNext = nextPrologueStep?.id === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (!complete && isNext) handleAdvancePrologueStep();
                        }}
                        style={{
                          ...ghostButtonStyle,
                          borderColor: complete
                            ? "rgba(126, 227, 184, 0.34)"
                            : isNext
                              ? "rgba(255, 214, 150, 0.42)"
                              : "rgba(255,255,255,.08)",
                          opacity: complete || isNext ? 1 : 0.58,
                          textAlign: "left",
                        }}
                      >
                        {complete ? "Done" : isNext ? "Next" : "Locked"} - {step.title}
                      </button>
                    );
                  })}
                  <button
                    data-testid="arpg-continue-intro"
                    type="button"
                    onClick={handleAdvancePrologueStep}
                    style={buttonStyle}
                  >
                    {nextPrologueStep ? nextPrologueStep.title : "Bellroot intro complete"}
                  </button>
                </div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{quest.title}</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                  {quest.summary}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {quest.steps.map((step) => (
                    <span key={step} style={chipStyle}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
              <p style={{ margin: 0, color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.4 }}>
                {save.lastEvent}
              </p>
              <div
                data-testid="arpg-veyrhold-service-outcomes"
                style={{
                  border: "1px solid rgba(255,214,150,.12)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Veyrhold outcomes</span>
                  <span style={chipStyle}>{townServices.serviceOutcomeCount} service cards</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstReleaseTownOpen ? "available" : "locked"}
                  </span>
                </div>
                {ARPG_VEYR_SERVICE_OUTCOMES.map((outcome) => {
                  const service = ARPG_VEYR_HUB_SERVICES.find((entry) => entry.id === outcome.serviceId);
                  const recorded = save.storyFlags.includes(outcome.statusFlag);
                  return (
                    <button
                      key={outcome.id}
                      data-testid={`arpg-town-outcome-${outcome.id}`}
                      type="button"
                      disabled={!firstReleaseTownOpen}
                      onClick={() => handleVeyrholdOutcomeAction(outcome)}
                      style={{
                        ...(recorded ? buttonStyle : ghostButtonStyle),
                        cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                        opacity: firstReleaseTownOpen ? 1 : 0.55,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ display: "grid", gap: 3 }}>
                        <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                          {recorded ? "Recorded" : "Claim"} - {outcome.label}
                        </span>
                        <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                          {service?.label ?? "Veyrhold service"} - {outcome.rewardItemIds.join(" / ")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                data-testid="arpg-bellroot-lamp-readings"
                style={{
                  border: "1px solid rgba(126,227,184,.12)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Ilo lamp readings</span>
                  <span style={chipStyle}>{bellrootLampReadingCount}/{townServices.bellrootLampReadingCount} recorded</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {bellrootCommonsUnlocked ? "commons open" : "visit Commons"}
                  </span>
                </div>
                {ARPG_BELLROOT_LAMP_READINGS.map((reading) => {
                  const recorded = save.storyFlags.includes(reading.storyFlag);
                  return (
                    <button
                      key={reading.id}
                      data-testid={`arpg-journal-bellroot-reading-${reading.id}`}
                      type="button"
                      disabled={!bellrootCommonsUnlocked}
                      onClick={() => handleBellrootLampReading(reading)}
                      style={{
                        ...(recorded ? buttonStyle : ghostButtonStyle),
                        cursor: bellrootCommonsUnlocked ? "pointer" : "not-allowed",
                        opacity: bellrootCommonsUnlocked ? 1 : 0.55,
                        textAlign: "left",
                        whiteSpace: "normal",
                      }}
                    >
                      <span style={{ display: "grid", gap: 3 }}>
                        <span style={{ color: "#ffe1a6", fontSize: 9 }}>
                          {recorded ? "Recorded" : "Study"} - {reading.label}
                        </span>
                        <span style={{ color: "rgba(255,240,214,.58)", fontSize: 8, lineHeight: 1.25 }}>
                          {reading.mysteryHook}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {Object.values(ARPG_LORE_NODES).map((node, index) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => advanceArpgStory(node.storyFlag)}
                    style={{ ...ghostButtonStyle, textAlign: "left" }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-hidden="true"
                        data-testid={`arpg-prologue-lore-art-${node.id}`}
                        style={chipStyle}
                      >
                        Beat {index + 1}
                      </span>
                      <span>Study {node.title} - {node.summary}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div data-testid="arpg-skills" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Skills</span>
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    data-testid={`arpg-skill-${skill.id}`}
                    type="button"
                    onClick={() => unlockArpgSkill(skill.id)}
                    style={{
                      ...(skill.unlocked ? buttonStyle : ghostButtonStyle),
                      borderColor: `${skill.accent}66`,
                      color: skill.accent,
                      textAlign: "left",
                      opacity: skill.available ? 1 : 0.62,
                    }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-hidden="true"
                        data-testid={`arpg-journal-skill-art-${skill.id}`}
                        style={illustratedSkillIconStyle(skill.id, 26)}
                      />
                      <span>
                        {skill.equipped ? "Equipped" : skill.unlocked ? "Known" : "Unlock"} {skill.name} - {skill.kind} -{" "}
                        {skill.summary}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div data-testid="arpg-combat-codex" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Combat codex</span>
                {enemyCodex.map(({ enemy, profile, family, discovered, defeated }) => (
                  <div
                    key={profile.enemyId}
                    style={{
                      alignItems: "center",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,.035)",
                      display: "grid",
                      gap: 8,
                      gridTemplateColumns: "58px minmax(0, 1fr)",
                      padding: 8,
                    }}
                  >
                    <span
                      aria-label={`${enemy?.name ?? profile.enemyId} illustrated codex card`}
                      data-testid={`arpg-codex-enemy-art-${profile.enemyId}`}
                      role="img"
                      style={illustratedEnemyCardStyle(ILLUSTRATED_ENEMY_FRAME_BY_ID[profile.enemyId] ?? 0)}
                    />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: discovered ? "#ffe1a6" : "rgba(255,240,214,.54)", fontSize: 11 }}>
                        {enemy?.name ?? profile.enemyId} {defeated ? "- defeated" : ""}
                      </strong>
                      <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                        {discovered ? profile.codexEntry : `${family?.label ?? "Unknown family"} signs are unread.`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Move WASD</span>
                <span style={chipStyle}>Interact E</span>
                <span style={chipStyle}>Strike Space</span>
                <span style={chipStyle}>Skills 1/2</span>
                <span style={chipStyle}>Dodge Shift</span>
              </div>
            </div>
          ) : null}

          {drawer === "people" ? (
            <div data-testid="arpg-people-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Companions {worldLoop.systems.companionArcCount}</span>
                <span style={chipStyle}>NPCs {worldLoop.systems.majorNpcCount}</span>
                <span style={chipStyle}>Factions live</span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {worldLoop.companions.map((companion, index) => (
                  <button
                    key={companion.id}
                    data-testid={`arpg-companion-${companion.id}`}
                    type="button"
                    onClick={() => recruitArpgCompanion(companion.id)}
                    style={{
                      ...(companion.state?.recruited ? buttonStyle : ghostButtonStyle),
                      textAlign: "left",
                    }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-label={`${companion.name} illustrated companion portrait`}
                        data-testid={`arpg-companion-art-${companion.id}`}
                        role="img"
                        style={
                          companion.id === "oracle-guide"
                            ? heroKitPortraitStyle(1, 34)
                            : illustratedCharacterSeedStyle(index % 3, 34)
                        }
                      />
                      <span>
                        {companion.state?.recruited ? "Traveling" : "Recruit"} {companion.name} -{" "}
                        {companion.perkDetail}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div data-testid="arpg-faction-reputation" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Reputation</span>
                {Object.entries(save.reputations ?? {})
                  .slice(0, 8)
                  .map(([factionId, value]) => (
                    <button
                      key={factionId}
                      type="button"
                      onClick={() => recordArpgReputation(factionId, 1)}
                      style={{ ...ghostButtonStyle, textAlign: "left" }}
                    >
                      {factionId.replace(/-/g, " ")} {value >= 0 ? "+" : ""}
                      {value}
                    </button>
                  ))}
              </div>
              <div
                data-testid="arpg-veyrhold-npcs"
                style={{
                  border: "1px solid rgba(255,214,150,.12)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>Veyrhold locals</span>
                  <span style={chipStyle}>{townServices.npcCount} named</span>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {firstReleaseTownOpen ? "meet now" : "town locked"}
                  </span>
                </div>
                {ARPG_VEYR_TOWN_NPCS.map((npc, index) => (
                  <button
                    key={npc.id}
                    data-testid={`arpg-town-npc-${npc.id}`}
                    type="button"
                    disabled={!firstReleaseTownOpen}
                    onClick={() => {
                      if (!firstReleaseTownOpen) return;
                      recordArpgReputation(npc.reputationFactionId, 1);
                      collectArpgItem(npc.rewardItemId, `veyrhold-npc:${npc.id}`);
                      advanceArpgStory(`veyrhold:npc:${npc.id}`);
                      setDrawer("journal");
                    }}
                    style={{
                      ...ghostButtonStyle,
                      cursor: firstReleaseTownOpen ? "pointer" : "not-allowed",
                      opacity: firstReleaseTownOpen ? 1 : 0.55,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
                      <span
                        aria-label={`${npc.name} Veyrhold portrait`}
                        data-testid={`arpg-town-npc-art-${npc.id}`}
                        role="img"
                        style={
                          npc.id === "ilo-little-oracle"
                            ? illustratedCharacterSeedStyle(0, 34)
                            : heroKitPortraitStyle(index % 3, 34)
                        }
                      />
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ color: "#ffe1a6", display: "block", fontSize: 9 }}>
                          {npc.name} - {npc.role}
                        </strong>
                        <span style={{ color: "rgba(255,240,214,.58)", display: "block", fontSize: 8, lineHeight: 1.25 }}>
                          {npc.dialogueHook}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Local NPC roster</span>
                {worldLoop.majorNpcs
                  .filter((npc) => npc.cityId === selectedJourneyCityId)
                  .slice(0, 4)
                  .map((npc) => (
                    <span key={npc.id} style={chipStyle}>
                      {npc.name} - {npc.roleId.replace(/-/g, " ")}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          {drawer === "endgame" ? (
            <div data-testid="arpg-endgame-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div data-testid="arpg-endgame-progress" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>Dungeons {endgame.systems.challengeDungeonCount}</span>
                <span style={chipStyle}>Trials {endgame.systems.relicTrialCount}</span>
                <span style={chipStyle}>Treasure {endgame.systems.treasureMapCount}</span>
                <span style={chipStyle}>Bosses {endgame.systems.bossRematchCount}</span>
                <span style={chipStyle}>{endgame.unlocked ? "Unlocked" : "Preview"}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {endgame.difficultyTiers.map((tier) => (
                  <button
                    key={tier.id}
                    data-testid={`arpg-endgame-difficulty-${tier.id}`}
                    type="button"
                    onClick={() => selectArpgEndgameDifficulty(tier.id)}
                    style={{
                      ...(tier.id === endgame.difficulty.id ? buttonStyle : ghostButtonStyle),
                      textAlign: "left",
                    }}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
              <div data-testid="arpg-endgame-dungeon" style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  {endgame.selectedDungeon.name}
                </strong>
                <p style={{ margin: "4px 0 8px", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                  {endgame.selectedDungeon.objective} Rotation: {endgame.eliteRotation.label}. Completed{" "}
                  {endgame.completed.dungeons}/{endgame.systems.challengeDungeonCount}.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    data-testid="arpg-start-endgame-dungeon"
                    type="button"
                    onClick={() => startArpgEndgameDungeon(endgame.selectedDungeon.id)}
                    style={buttonStyle}
                  >
                    Start dungeon
                  </button>
                  <button
                    data-testid="arpg-complete-endgame-dungeon"
                    type="button"
                    onClick={() => completeArpgEndgameDungeon(endgame.selectedDungeon.id)}
                    style={ghostButtonStyle}
                  >
                    Complete run
                  </button>
                </div>
              </div>
              <div data-testid="arpg-endgame-trial" style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  {endgame.selectedTrial.name}
                </strong>
                <p style={{ margin: "4px 0 8px", color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                  {endgame.selectedTrial.mechanic} Focus: {endgame.selectedTrial.statFocus}. Completed{" "}
                  {endgame.completed.trials}/{endgame.systems.relicTrialCount}.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    data-testid="arpg-start-relic-trial"
                    type="button"
                    onClick={() => startArpgRelicTrial(endgame.selectedTrial.id)}
                    style={buttonStyle}
                  >
                    Start trial
                  </button>
                  <button
                    data-testid="arpg-complete-relic-trial"
                    type="button"
                    onClick={() => completeArpgRelicTrial(endgame.selectedTrial.id)}
                    style={ghostButtonStyle}
                  >
                    Complete trial
                  </button>
                </div>
              </div>
              <div data-testid="arpg-endgame-treasure" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Local treasure maps {endgame.localTreasureMaps.length}</span>
                {endgame.localTreasureMaps.slice(0, 3).map((map) => (
                  <button
                    key={map.id}
                    data-testid={`arpg-treasure-map-${map.id}`}
                    type="button"
                    onClick={() => {
                      claimArpgTreasureMap(map.id);
                      completeArpgTreasureMap(map.id);
                    }}
                    style={{ ...ghostButtonStyle, textAlign: "left" }}
                  >
                    {map.name} - clues {map.clueCount}
                  </button>
                ))}
              </div>
              <div data-testid="arpg-endgame-bosses" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Boss rematches {endgame.systems.bossRematchCount}</span>
                {endgame.localBossRematches.slice(0, 3).map((rematch) => (
                  <button
                    key={rematch.id}
                    data-testid={`arpg-boss-rematch-${rematch.id}`}
                    type="button"
                    onClick={() => {
                      startArpgBossRematch(rematch.id);
                      completeArpgBossRematch(rematch.id);
                    }}
                    style={{ ...ghostButtonStyle, textAlign: "left" }}
                  >
                    {rematch.name} - {rematch.uniqueDrop}
                  </button>
                ))}
              </div>
              <div data-testid="arpg-endgame-arena" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Arena {endgame.systems.arenaChallengeCount}</span>
                {endgame.arenaChallenges.slice(0, 4).map((challenge) => (
                  <button
                    key={challenge.id}
                    data-testid={`arpg-arena-${challenge.id}`}
                    type="button"
                    onClick={() => {
                      startArpgArenaChallenge(challenge.id);
                      completeArpgArenaChallenge(challenge.id);
                    }}
                    style={{ ...ghostButtonStyle, textAlign: "left" }}
                  >
                    {challenge.label} - {challenge.objective}
                  </button>
                ))}
              </div>
              <div data-testid="arpg-endgame-collections" style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Collections {endgame.systems.collectionGoalCount}</span>
                {endgame.collectionGoals.slice(0, 7).map((goal) => (
                  <span key={goal.id} style={chipStyle}>
                    {goal.complete ? "Complete" : "Open"} {goal.label} {goal.target}
                  </span>
                ))}
              </div>
              <div data-testid="arpg-endgame-cosmetics" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {endgame.cosmeticRewards.slice(0, 4).map((reward) => (
                  <button
                    key={reward.id}
                    data-testid={`arpg-cosmetic-${reward.id}`}
                    type="button"
                    onClick={() => claimArpgCosmeticReward(reward.id)}
                    style={{
                      ...(reward.claimed ? buttonStyle : ghostButtonStyle),
                      borderColor: `${reward.paletteAccent}77`,
                      color: reward.paletteAccent,
                    }}
                  >
                    {reward.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "production" ? (
            <div data-testid="arpg-production-drawer" style={{ display: "grid", gap: 10, marginTop: 11 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chipStyle}>MW6 {completion.completionPercent}%</span>
                <span style={chipStyle}>Done {completion.doneCount}/{completion.tracks.length}</span>
                <span style={chipStyle}>Open {completion.openCount}</span>
                <span style={chipStyle}>
                  {completion.canCloseParent ? "Parent close ready" : "Parent still open"}
                </span>
              </div>
              <div
                style={{
                  border: "1px solid rgba(255, 209, 102, 0.18)",
                  borderRadius: 14,
                  background: "rgba(255, 209, 102, 0.06)",
                  padding: 9,
                }}
              >
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  {completion.title}
                </strong>
                <p style={{ margin: "5px 0 0", color: "rgba(255,240,214,.66)", fontSize: 10, lineHeight: 1.4 }}>
                  {completion.completionDefinition}
                </p>
              </div>
              <div
                data-testid="arpg-production-readiness"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.18)",
                  borderRadius: 14,
                  background: "rgba(126, 227, 184, 0.055)",
                  display: "grid",
                  gap: 7,
                  padding: 9,
                }}
              >
                <strong style={{ color: "#d5ffe7", fontSize: 11 }}>
                  {productionReadiness.title}
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={chipStyle}>
                    Licenses {productionReadiness.acceptedLicenseCount}
                  </span>
                  <span style={chipStyle}>
                    Save slots {productionReadiness.saveSlotKindCount}
                  </span>
                  <span style={chipStyle}>
                    Migrations {productionReadiness.migrationSourceCount}
                  </span>
                  <span style={chipStyle}>
                    Cities {productionReadiness.cityPlaytestCount}
                  </span>
                  <span style={chipStyle}>
                    Gates {productionReadiness.releaseGateCount}
                  </span>
                  <span style={chipStyle}>
                    Menus {productionReadiness.menuPanelCount}
                  </span>
                  <span style={chipStyle}>
                    Save checks {productionReadiness.saveFixtureCount}
                  </span>
                  <span style={chipStyle}>
                    Balance {productionReadiness.balanceFixtureCount}
                  </span>
                  <span style={chipStyle}>
                    Tools {contentTools.registryCount}
                  </span>
                  <span style={chipStyle}>
                    Release flows {productionReadiness.releaseFlowCount}
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  {productionReadiness.assetPipeline.commercialProofRule}
                </p>
                <div
                  data-testid="arpg-presentation-readiness"
                  style={{
                    border: "1px solid rgba(126, 227, 184, 0.14)",
                    borderRadius: 12,
                    background: "rgba(126, 227, 184, 0.045)",
                    display: "grid",
                    gap: 6,
                    padding: 8,
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={chipStyle}>Presentation {firstTownPresentation.cueCount}</span>
                    <span style={chipStyle}>Approved assets {firstTownPresentation.assetCount}</span>
                    <span style={chipStyle}>
                      Surfaces {firstTownPresentation.surfaceTargets.length}
                    </span>
                    <span style={{ ...chipStyle, marginLeft: "auto" }}>No rejected prologue art</span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                    {firstTownPresentation.summary}
                  </p>
                </div>
                <div
                  data-testid="arpg-visual-replacement-readiness"
                  style={{
                    border: "1px solid rgba(255, 209, 102, 0.18)",
                    borderRadius: 12,
                    background: "rgba(255, 209, 102, 0.045)",
                    display: "grid",
                    gap: 7,
                    padding: 8,
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                      Visual replacement lane
                    </strong>
                    <span style={{ ...chipStyle, marginLeft: "auto" }}>
                      {visualReplacements.targetCount} queued
                    </span>
                    <span style={chipStyle}>
                      Retired {visualReplacements.retiredAssetCount}
                    </span>
                    <span style={chipStyle}>
                      Fallbacks {visualReplacements.fallbackAssetCount}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                    {visualReplacements.summary}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {visualReplacements.targets.slice(0, 4).map((target) => (
                      <span key={target.id} data-testid={`arpg-visual-replacement-${target.id}`} style={chipStyle}>
                        {target.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div data-testid="arpg-production-large-chunk" style={{ display: "grid", gap: 6 }}>
                  <ArpgProductionMenuIndex
                    panels={productionMenuPanels}
                    onLaunch={handleProductionMenuLaunch}
                    buttonStyle={ghostButtonStyle}
                  />
                  <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                    Save fixtures cover {productionReadiness.saveHardening.migrationSources.join(", ")} with
                    {" "}
                    {productionReadiness.saveHardening.recoveryScenarios.length} recovery scenarios. Balance now
                    has {productionReadiness.balanceTargets.fixtureSuites.length} static suites before release
                    flow expansion.
                  </p>
                  <div
                    data-testid="arpg-balance-playtest"
                    style={{
                      border: "1px solid rgba(255, 209, 102, 0.16)",
                      borderRadius: 12,
                      background: "rgba(255, 209, 102, 0.045)",
                      display: "grid",
                      gap: 6,
                      padding: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                        {balancePlaytest.title}
                      </strong>
                      <span style={{ ...chipStyle, marginLeft: "auto" }}>
                        arpg:balance:check
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                      {balancePlaytest.purpose}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={chipStyle}>Sessions {balancePlaytest.sessionTargetCount}</span>
                      <span style={chipStyle}>XP {balancePlaytest.xpAnchorCount}</span>
                      <span style={chipStyle}>Bosses {balancePlaytest.bossTargetCount}</span>
                      <span style={chipStyle}>Classes {balancePlaytest.classViabilityCount}</span>
                      <span style={chipStyle}>Lineages {balancePlaytest.lineageViabilityCount}</span>
                      <span style={chipStyle}>Cities {balancePlaytest.cityChecklistCount}</span>
                      <span style={chipStyle}>Checklist {balancePlaytest.playtestChecklistCount}</span>
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {balancePlaytest.sessionTargets.slice(0, 3).map((target) => (
                        <span key={target.id} data-testid={`arpg-balance-session-${target.id}`} style={chipStyle}>
                          {target.label} {target.minutes[0]}-{target.minutes[1]}m
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {balancePlaytest.classViability.slice(0, 3).map((target) => (
                        <span key={target.classId} data-testid={`arpg-balance-class-${target.classId}`} style={chipStyle}>
                          {target.classId} {"->"} {target.beginnerBuild}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {balancePlaytest.cityChecklist.slice(0, 3).map((target) => (
                        <span key={target.id} data-testid={`arpg-balance-city-${target.regionId}`} style={chipStyle}>
                          {target.label} playtest
                        </span>
                      ))}
                    </div>
                    {balancePlaytest.finalBossTarget ? (
                      <p
                        data-testid="arpg-balance-final-boss"
                        style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}
                      >
                        Final boss target: {balancePlaytest.finalBossTarget.label} in{" "}
                        {balancePlaytest.finalBossTarget.timeToKillSeconds[0]}-
                        {balancePlaytest.finalBossTarget.timeToKillSeconds[1]}s with{" "}
                        {balancePlaytest.finalBossTarget.phaseCount} phases.
                      </p>
                    ) : null}
                  </div>
                  <div
                    data-testid="arpg-content-tools"
                    style={{
                      border: "1px solid rgba(126, 227, 184, 0.16)",
                      borderRadius: 12,
                      background: "rgba(126, 227, 184, 0.045)",
                      display: "grid",
                      gap: 6,
                      padding: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ color: "#d5ffe7", fontSize: 11 }}>
                        {contentTools.title}
                      </strong>
                      <span style={{ ...chipStyle, marginLeft: "auto" }}>
                        arpg:tools:check
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                      {contentTools.purpose}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={chipStyle}>Registries {contentTools.registryCount}</span>
                      <span style={chipStyle}>Helpers {contentTools.helperCount}</span>
                      <span style={chipStyle}>Fixtures {contentTools.fixtureSaveCount}</span>
                      <span style={chipStyle}>Checks {contentTools.progressionCheckCount}</span>
                      <span style={chipStyle}>Dev-only {contentTools.devOnlyHelperCount}</span>
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {contentTools.registries.slice(0, 4).map((registry) => (
                        <span key={registry.id} data-testid={`arpg-content-tool-registry-${registry.id}`} style={chipStyle}>
                          {registry.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {contentTools.helpers.slice(0, 3).map((helper) => (
                        <span key={helper.id} data-testid={`arpg-content-tool-helper-${helper.id}`} style={chipStyle}>
                          {helper.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {productionReadiness.contentTooling.validationScripts.slice(-3).map((script) => (
                      <span key={script} style={chipStyle}>
                        {script}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Current / blocked</span>
                {[...completion.activeTracks, ...completion.blockedTracks].map((track) => (
                  <div
                    key={track.id}
                    data-testid={`arpg-production-track-${track.id}`}
                    style={{
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{track.label}</strong>
                      <span style={{ ...chipStyle, marginLeft: "auto" }}>{track.status}</span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                      {track.summary}
                    </p>
                    <span style={chipStyle}>{track.requiredGates[0]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={chipStyle}>Next production gates</span>
                {completion.nextTracks.slice(0, 4).map((track) => (
                  <span key={track.id} style={chipStyle}>
                    {track.label} - {track.category}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "credits" ? (
            <div data-testid="arpg-asset-credits" style={{ display: "grid", gap: 9, marginTop: 11 }}>
              <p style={{ margin: 0, color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.45 }}>
                Asset intake is CC0-first, with clean CC-BY and operator-approved commercial packs allowed only when this drawer can explain provenance and credits.
              </p>
              <div
                data-testid="arpg-approved-style-target"
                style={{
                  border: "1px solid rgba(255, 209, 102, 0.28)",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(255, 209, 102, 0.13), rgba(255, 146, 87, 0.06))",
                  display: "grid",
                  gap: 8,
                  padding: 9,
                }}
              >
                <div style={{ alignItems: "center", display: "flex", gap: 7 }}>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                    {visualDirection.approvedStyleTarget.label}
                  </strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {visualDirection.approvedStyleAssetCount} approved sheets
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.68)", fontSize: 10, lineHeight: 1.38 }}>
                  {visualDirection.approvedStyleTarget.description}
                </p>
                <div
                  aria-label="Approved Hero Kit style references"
                  style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 7 }}
                >
                  <span title="Approved Wardbreaker portrait" style={heroKitPortraitStyle(0, 42)} />
                  <span title="Approved class outfit quality" style={heroKitOutfitStyle(0, 34, 51)} />
                  <span title="Approved weapon icon quality" style={heroKitWeaponItemIconStyle(0, 34)} />
                  <span title="Approved armor icon quality" style={heroKitArmorEquipmentIconStyle(0, 34)} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {visualDirection.approvedStyleTarget.requiredTraits.slice(0, 6).map((trait) => (
                    <span key={trait} style={chipStyle}>
                      {trait.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
                <div data-testid="arpg-next-visual-batches" style={{ display: "grid", gap: 5 }}>
                  {visualDirection.nextProductionBatches.slice(0, 3).map((batch) => (
                    <span key={batch.id} style={chipStyle}>
                      Next {batch.count}: {batch.label}
                    </span>
                  ))}
                </div>
                <div
                  data-testid="arpg-visual-asset-briefs"
                  style={{
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 6,
                    padding: 7,
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
                    <span style={chipStyle}>Briefs {visualBriefs.briefCount}</span>
                    <span style={chipStyle}>{visualBriefs.totalBriefItems} assets queued</span>
                  </div>
                  {visualBriefs.nextBrief ? (
                    <p style={{ margin: 0, color: "rgba(255,240,214,.66)", fontSize: 9, lineHeight: 1.35 }}>
                      Next: {visualBriefs.nextBrief.label} - {visualBriefs.nextBrief.items.length} prompts ready for
                      reviewed image generation or artist intake.
                    </p>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {visualBriefs.briefs.slice(0, 4).map((brief) => (
                      <span key={brief.id} style={chipStyle}>
                        {brief.items.length} {brief.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div
                data-testid="arpg-illustrated-asset-bench"
                style={{
                  border: "1px solid rgba(255, 209, 102, 0.22)",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(255, 209, 102, 0.1), rgba(126, 227, 184, 0.05))",
                  display: "grid",
                  gap: 8,
                  padding: 9,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                    Illustrated 2D asset bench
                  </strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {illustratedBench.totalFrames} approved frames
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.38 }}>
                  High-fidelity illustrated 2D is the primary game-art path now. Flat vector/glyph batches are rejected or reference-only; only approved painted/rendered browser RPG assets appear in this preview grid.
                </p>
                <div data-testid="arpg-illustrated-preview-grid" style={{ display: "grid", gap: 7 }}>
                  {approvedIllustratedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      data-kind={batch.kind}
                      data-testid={`arpg-illustrated-batch-${batch.id}`}
                      style={{
                        alignItems: "center",
                        border: "1px solid rgba(255,255,255,.08)",
                        borderRadius: 12,
                        display: "grid",
                        gap: 6,
                        gridTemplateColumns: "minmax(92px, .7fr) minmax(0, 1fr)",
                        padding: 7,
                      }}
                    >
                      <span style={{ ...chipStyle, justifyContent: "center" }}>
                        {batch.frameCount} {batch.kind.replace(/-/g, " ")}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {batch.previewLabels.slice(0, 4).map((label, frame) => (
                          <span key={label} title={label} style={illustratedPreviewFrameStyle(batch, frame)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {rejectedIllustratedBatches.length > 0 ? (
                  <div
                    data-testid="arpg-rejected-asset-batches"
                    style={{
                      border: "1px solid rgba(255, 91, 91, 0.18)",
                      borderRadius: 12,
                      color: "rgba(255, 216, 190, 0.78)",
                      display: "grid",
                      gap: 5,
                      padding: 7,
                    }}
                  >
                    <span style={chipStyle}>Rejected reference art {rejectedIllustratedBatches.length}</span>
                    <p style={{ margin: 0, fontSize: 9, lineHeight: 1.35 }}>
                      The Bellroot prologue SVG/glyph sheets are retained only for provenance and replacement planning;
                      they are no longer shown as production game art.
                    </p>
                  </div>
                ) : null}
                <div
                  data-testid="arpg-visual-replacement-queue"
                  style={{
                    border: "1px solid rgba(255, 209, 102, 0.18)",
                    borderRadius: 12,
                    background: "rgba(255, 209, 102, 0.045)",
                    display: "grid",
                    gap: 6,
                    padding: 7,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                      Replacement queue
                    </strong>
                    <span style={{ ...chipStyle, marginLeft: "auto" }}>
                      {visualReplacements.replacementBatchId}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.35 }}>
                    {visualReplacements.retiredAssetCount} rejected prologue sheets are retired from production display.
                    The next approved pass replaces them with {visualReplacements.targetCount} high-fidelity location,
                    character, and prop targets.
                  </p>
                  <div style={{ display: "grid", gap: 5 }}>
                    {visualReplacements.targets.slice(0, 5).map((target) => (
                      <span key={target.id} style={chipStyle}>
                        {target.kind.replace(/-/g, " ")}: {target.label}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={chipStyle}>Runtime {illustratedBench.runtimePath}</span>
                <span style={chipStyle}>Record {illustratedBench.promptRecordPath}</span>
              </div>
              <div
                data-testid="arpg-real-asset-intake"
                style={{
                  border: "1px solid rgba(255, 209, 102, 0.2)",
                  borderRadius: 14,
                  background: "rgba(255, 209, 102, 0.06)",
                  display: "grid",
                  gap: 7,
                  padding: 9,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                    Real asset intake
                  </strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>
                    {realAssetIntake.importedCount
                      ? `${realAssetIntake.importedCount} imported`
                      : "Awaiting imported CC0 assets"}
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.64)", fontSize: 10, lineHeight: 1.38 }}>
                  {realAssetIntake.blockedReason ??
                    "Imported GLB/glTF models are manifest-tracked and ready for preview once selected."}
                </p>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={chipStyle}>Raw {realAssetIntake.intakeRawPath}</span>
                  <span style={chipStyle}>Work {realAssetIntake.intakeWorkPath}</span>
                  <span style={chipStyle}>Runtime {realAssetIntake.runtimeImportPath}</span>
                </div>
                {realAssetIntake.importedEntries.length ? (
                  <div style={{ display: "grid", gap: 5 }}>
                    {realAssetIntake.importedEntries.slice(0, 4).map((asset) => (
                      <span key={asset.id} style={chipStyle}>
                        {asset.label} - {asset.kind}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 5 }}>
                    {realAssetIntake.nextRequiredPacks.map((pack) => (
                      <span key={pack.id} style={chipStyle}>
                        {pack.provider}: {pack.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                data-testid="arpg-real-model-preview"
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  Real model preview
                </strong>
                {realAssetIntake.importedModelCount ? (
                  realAssetIntake.importedEntries
                    .filter((asset) => asset.kind === "glb-model" || asset.kind === "gltf-model")
                    .slice(0, 2)
                    .map((asset) => (
                      <span key={asset.id} style={chipStyle}>
                        {asset.label} - {asset.license}
                      </span>
                    ))
                ) : (
                  <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                    Blocked until an official CC0, clean CC-BY, or redacted commercial-license model is imported. No generated placeholder is shown here.
                  </p>
                )}
              </div>
              <div
                data-testid="arpg-generator-policy"
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  Optional generator policy
                </strong>
                {ARPG_GENERATED_ASSET_TOOL_POLICY.map((tool) => (
                  <span key={tool.id} style={chipStyle}>
                    {tool.name} - operator approved only
                  </span>
                ))}
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  {productionReadiness.assetPipeline.generatorRule}
                </p>
              </div>
              <div
                data-testid="arpg-sprite-tool-candidates"
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 6,
                  padding: 8,
                }}
              >
                <strong style={{ color: "#ffe1a6", fontSize: 11 }}>
                  Sprite tooling candidates
                </strong>
                {ARPG_ASSET_TOOL_CANDIDATE_SOURCES.map((tool) => (
                  <span key={tool.id} style={chipStyle}>
                    {tool.label} - {tool.license} / {tool.toolKind}
                  </span>
                ))}
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  Guarded tooling only. These can help generate or clean original sprite sheets, but they do not unblock real asset intake and no output ships without provenance, rights review, normalization, and manifest validation.
                </p>
              </div>
              {visibleCreditAssets.length ? (
                visibleCreditAssets.map((asset) => (
                  <div key={asset.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 8 }}>
                    <strong style={{ color: "#ffe1a6", fontSize: 11 }}>{asset.label}</strong>
                    <p style={{ margin: "4px 0 0", color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                      {asset.attribution}
                    </p>
                  </div>
                ))
              ) : (
                <span style={chipStyle}>No CC-BY assets committed yet</span>
              )}
              <div style={{ display: "grid", gap: 5 }}>
                {ARPG_ASSET_SOURCE_POLICY.map((source) => (
                  <span key={source.name} style={chipStyle}>
                    {source.name} - {source.defaultLicense}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {drawer === "settings" ? (
            <div data-testid="arpg-room-drawer" style={{ display: "grid", gap: 8, marginTop: 11 }}>
              <div
                data-testid="arpg-save-slot-summary"
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ color: "#ffe1a6", fontSize: 11 }}>Start / Continue</strong>
                  <span style={chipStyle}>Active {activeSaveSlotId}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    data-testid="arpg-save-continue"
                    type="button"
                    onClick={() => {
                      loadArpgSaveSlot(activeSaveSlotId);
                      setResetArmed(false);
                      setSaveImportMessage("Continued active local slot");
                    }}
                    style={buttonStyle}
                  >
                    Continue
                  </button>
                  <button
                    data-testid="arpg-save-manual"
                    type="button"
                    onClick={() => {
                      saveArpgManualSlot();
                      setResetArmed(false);
                      setSaveImportMessage("Manual save recorded");
                    }}
                    style={ghostButtonStyle}
                  >
                    Save manual
                  </button>
                  <button
                    data-testid="arpg-save-checkpoint"
                    type="button"
                    onClick={() => {
                      saveArpgCheckpointSlot();
                      setResetArmed(false);
                      setSaveImportMessage("Checkpoint save recorded");
                    }}
                    style={ghostButtonStyle}
                  >
                    Save checkpoint
                  </button>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {saveSlotSummary.map((slot) => {
                    const loadSlotTestId =
                      slot.kind === "manual"
                        ? "arpg-load-slot-manual"
                        : slot.kind === "checkpoint"
                          ? "arpg-load-slot-checkpoint"
                          : "arpg-load-slot-autosave";

                    return (
                      <div
                        key={slot.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          border: "1px solid rgba(255,214,150,.1)",
                          borderRadius: 10,
                          padding: "6px 7px",
                        }}
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <span style={{ color: "#fff2d7", fontSize: 10, fontWeight: 800 }}>
                            {slot.label} {slot.id === activeSaveSlotId ? "(active)" : ""}
                          </span>
                          <span style={{ color: "rgba(255,240,214,.62)", fontSize: 9 }}>
                            Lv {slot.level} / {slot.checkpointId} / {new Date(slot.savedAt).toISOString().slice(11, 16)}
                          </span>
                        </div>
                        <button
                          data-testid={loadSlotTestId}
                          type="button"
                          onClick={() => {
                            loadArpgSaveSlot(slot.id);
                            setResetArmed(false);
                            setSaveImportMessage(`Loaded ${slot.label}`);
                          }}
                          style={{
                            ...ghostButtonStyle,
                            fontSize: 8,
                            padding: "3px 7px",
                          }}
                        >
                          Load
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  Continue uses the active local save; exports now include autosave, manual, and checkpoint
                  slots for recovery testing without cloud saves.
                </p>
              </div>
              <div
                data-testid="arpg-tutorial-panel"
                style={{
                  border: "1px solid rgba(126, 227, 184, 0.16)",
                  borderRadius: 12,
                  background: "rgba(126, 227, 184, 0.045)",
                  display: "grid",
                  gap: 7,
                  padding: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ color: "#d5ffe7", fontSize: 11 }}>Tutorial + controls</strong>
                  <span style={{ ...chipStyle, marginLeft: "auto" }}>Keyboard safe</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["WASD/arrows move", "Space basic", "1/2 skills", "Shift dodge", "E interact"].map((hint) => (
                    <span key={hint} style={chipStyle}>
                      {hint}
                    </span>
                  ))}
                </div>
                <p style={{ margin: 0, color: "rgba(255,240,214,.62)", fontSize: 10, lineHeight: 1.35 }}>
                  Menus pause the reading load, not the game identity: keep command input focused when typing,
                  use the compact drawers for details, and resize the playfield with the S/M/L/XL controls.
                </p>
              </div>
              <button
                data-testid="arpg-command-room-toggle"
                type="button"
                onClick={onSwitchToCommandRoom}
                style={buttonStyle}
              >
                Command room
              </button>
              <button
                data-testid="arpg-reset"
                type="button"
                onClick={handleResetSave}
                style={{
                  ...ghostButtonStyle,
                  borderColor: resetArmed ? "rgba(255, 102, 102, 0.48)" : ghostButtonStyle.borderColor,
                  color: resetArmed ? "#ffb7a3" : ghostButtonStyle.color,
                }}
              >
                {resetArmed ? "Confirm reset" : "Reset save"}
              </button>
              <span data-testid="arpg-reset-confirm-message" style={chipStyle}>
                {resetArmed ? "Reset confirmation armed" : "Reset guarded"}
              </span>
              <label style={{ display: "grid", gap: 5 }}>
                <span style={chipStyle}>Export save envelope</span>
                <textarea
                  data-testid="arpg-save-export"
                  readOnly
                  value={saveExportText}
                  rows={4}
                  style={{
                    border: "1px solid rgba(255, 214, 150, 0.16)",
                    borderRadius: 12,
                    background: "rgba(0,0,0,.26)",
                    color: "rgba(255,240,214,.72)",
                    fontSize: 9,
                    padding: 8,
                    resize: "vertical",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                <span style={chipStyle}>Import / repair save envelope</span>
                <textarea
                  data-testid="arpg-save-import-input"
                  value={saveImportText}
                  onChange={(event) => setSaveImportText(event.currentTarget.value)}
                  placeholder="Paste Aether Reliquary save envelope or legacy save JSON..."
                  rows={3}
                  style={{
                    border: "1px solid rgba(255, 214, 150, 0.16)",
                    borderRadius: 12,
                    background: "rgba(0,0,0,.22)",
                    color: "#fff4dc",
                    fontSize: 9,
                    padding: 8,
                    resize: "vertical",
                  }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  data-testid="arpg-save-import"
                  type="button"
                  onClick={handleSaveImport}
                  style={buttonStyle}
                >
                  Normalize import
                </button>
                <button
                  data-testid="arpg-save-copy-current"
                  type="button"
                  onClick={() => {
                    setSaveImportText(saveExportText);
                    setSaveImportMessage("Current save staged for import test");
                  }}
                  style={ghostButtonStyle}
                >
                  Stage current
                </button>
              </div>
              <span data-testid="arpg-save-import-message" style={chipStyle}>
                {saveImportMessage}
              </span>
              <span style={chipStyle}>Runtime {runtimeStatusLabel}</span>
              <span style={chipStyle}>Zone {ARPG_PROLOGUE_FIRST_LOCATION.name}</span>
              <span style={chipStyle}>
                Enemies {Object.keys(ARPG_ENEMIES).length} / mini-boss ready after forge
              </span>
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
