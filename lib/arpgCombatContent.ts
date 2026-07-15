import type { ArpgStats } from "@/lib/arpgGame";

export type ArpgDamageType =
  | "physical"
  | "ember"
  | "frost"
  | "poison"
  | "bleed"
  | "curse"
  | "holy"
  | "void";

export type ArpgEnemyIntent =
  | "idle"
  | "aggro"
  | "telegraph"
  | "attack"
  | "recover"
  | "flee"
  | "defeated";

export interface ArpgStatusDefinition {
  id: string;
  label: string;
  summary: string;
  kind: "buff" | "debuff";
  durationMs: number;
  damageType?: ArpgDamageType;
  statModifier?: Partial<ArpgStats>;
  iconFrame: number;
  accent: string;
}

export interface ArpgEnemyTraitDefinition {
  id: string;
  label: string;
  summary: string;
  iconFrame: number;
  accent: string;
}

export interface ArpgEnemyFamilyDefinition {
  id: string;
  label: string;
  summary: string;
  defaultWeaknesses: ArpgDamageType[];
  defaultResistances: ArpgDamageType[];
  codexHint: string;
}

export interface ArpgEnemyCombatProfile {
  enemyId: string;
  familyId: string;
  spriteFrame: number;
  damageType: ArpgDamageType;
  basicDamage: number;
  attackReach: number;
  telegraphMs: number;
  recoverMs: number;
  traits: string[];
  appliesStatuses: string[];
  weaknesses: ArpgDamageType[];
  resistances: ArpgDamageType[];
  codexEntry: string;
  eliteModifierId?: string;
  phaseThreshold?: number;
}

export interface ArpgEliteModifierDefinition {
  id: string;
  label: string;
  summary: string;
  statBonus: Partial<ArpgStats>;
  statusId?: string;
  accent: string;
}

export interface ArpgSheetFrame {
  id: string;
  label: string;
  frame: number;
}

export const ARPG_DAMAGE_TYPES: Record<
  ArpgDamageType,
  { label: string; color: string }
> = {
  physical: { label: "Physical", color: "#e7c99b" },
  ember: { label: "Ember", color: "#fb923c" },
  frost: { label: "Frost", color: "#93c5fd" },
  poison: { label: "Poison", color: "#84cc16" },
  bleed: { label: "Bleed", color: "#ef4444" },
  curse: { label: "Curse", color: "#c084fc" },
  holy: { label: "Holy", color: "#fde68a" },
  void: { label: "Void", color: "#a78bfa" },
};

export const ARPG_STATUS_EFFECTS: Record<string, ArpgStatusDefinition> = {
  exposed: {
    id: "exposed",
    label: "Exposed",
    summary: "Takes cleaner follow-up hits.",
    kind: "debuff",
    durationMs: 4600,
    statModifier: { ward: -2 },
    iconFrame: 0,
    accent: "#ffd166",
  },
  staggered: {
    id: "staggered",
    label: "Staggered",
    summary: "Telegraphs slow and recovery windows widen.",
    kind: "debuff",
    durationMs: 2600,
    statModifier: { speed: -2 },
    iconFrame: 1,
    accent: "#f4a261",
  },
  burn: {
    id: "burn",
    label: "Burn",
    summary: "Ember damage keeps pressure on armored foes.",
    kind: "debuff",
    durationMs: 5200,
    damageType: "ember",
    iconFrame: 2,
    accent: "#fb923c",
  },
  bleed: {
    id: "bleed",
    label: "Bleed",
    summary: "Physical wounds punish fast movement.",
    kind: "debuff",
    durationMs: 5200,
    damageType: "bleed",
    iconFrame: 3,
    accent: "#ef4444",
  },
  chill: {
    id: "chill",
    label: "Chill",
    summary: "Movement and attack cadence drop.",
    kind: "debuff",
    durationMs: 4800,
    damageType: "frost",
    statModifier: { speed: -3 },
    iconFrame: 4,
    accent: "#93c5fd",
  },
  poison: {
    id: "poison",
    label: "Poison",
    summary: "Slow toxin pressure against beasts and pilgrims.",
    kind: "debuff",
    durationMs: 6000,
    damageType: "poison",
    iconFrame: 5,
    accent: "#84cc16",
  },
  guard: {
    id: "guard",
    label: "Guard",
    summary: "A brief ward lift after a clean block or dodge.",
    kind: "buff",
    durationMs: 4200,
    statModifier: { ward: 3 },
    iconFrame: 6,
    accent: "#c9a46a",
  },
  haste: {
    id: "haste",
    label: "Haste",
    summary: "Short burst of speed and cooldown recovery.",
    kind: "buff",
    durationMs: 3600,
    statModifier: { speed: 3, cooldown: 2 },
    iconFrame: 7,
    accent: "#a7f3d0",
  },
  "ward-bloom": {
    id: "ward-bloom",
    label: "Ward Bloom",
    summary: "A protective rune opens around the bearer.",
    kind: "buff",
    durationMs: 5000,
    statModifier: { ward: 4, resonance: 1 },
    iconFrame: 8,
    accent: "#8ecae6",
  },
  rooted: {
    id: "rooted",
    label: "Rooted",
    summary: "Movement stops until the roots crack.",
    kind: "debuff",
    durationMs: 3400,
    statModifier: { speed: -5 },
    iconFrame: 9,
    accent: "#bef264",
  },
  fear: {
    id: "fear",
    label: "Fear",
    summary: "Intent breaks and the target hesitates.",
    kind: "debuff",
    durationMs: 3200,
    statModifier: { might: -2 },
    iconFrame: 10,
    accent: "#fde68a",
  },
  slow: {
    id: "slow",
    label: "Slow",
    summary: "Actions take longer to recover.",
    kind: "debuff",
    durationMs: 4200,
    statModifier: { cooldown: -2 },
    iconFrame: 11,
    accent: "#bae6fd",
  },
  "cracked-armor": {
    id: "cracked-armor",
    label: "Cracked Armor",
    summary: "Armor loses its cleanest ward lines.",
    kind: "debuff",
    durationMs: 5200,
    statModifier: { ward: -4 },
    iconFrame: 12,
    accent: "#d6a85f",
  },
  "mana-drain": {
    id: "mana-drain",
    label: "Mana Drain",
    summary: "Focus leaks into nearby relic channels.",
    kind: "debuff",
    durationMs: 4400,
    damageType: "void",
    statModifier: { focus: -3 },
    iconFrame: 13,
    accent: "#a78bfa",
  },
  cursed: {
    id: "cursed",
    label: "Cursed",
    summary: "The next mistake lands harder.",
    kind: "debuff",
    durationMs: 5400,
    damageType: "curse",
    statModifier: { ward: -2, focus: -1 },
    iconFrame: 14,
    accent: "#c084fc",
  },
  "relic-fury": {
    id: "relic-fury",
    label: "Relic Fury",
    summary: "A boss relic surges into a dangerous second rhythm.",
    kind: "buff",
    durationMs: 9000,
    statModifier: { might: 4, speed: 2 },
    iconFrame: 15,
    accent: "#d946ef",
  },
};

export const ARPG_ENEMY_TRAITS: Record<string, ArpgEnemyTraitDefinition> = {
  armored: {
    id: "armored",
    label: "Armored",
    summary: "Resists light physical hits until cracked.",
    iconFrame: 12,
    accent: "#c9a46a",
  },
  swift: {
    id: "swift",
    label: "Swift",
    summary: "Shorter telegraph and faster recovery.",
    iconFrame: 7,
    accent: "#a7f3d0",
  },
  warded: {
    id: "warded",
    label: "Warded",
    summary: "Resists relic pressure until exposed.",
    iconFrame: 8,
    accent: "#8ecae6",
  },
  packbound: {
    id: "packbound",
    label: "Packbound",
    summary: "More dangerous near another living enemy.",
    iconFrame: 0,
    accent: "#ffd166",
  },
  cursed: {
    id: "cursed",
    label: "Cursed",
    summary: "Can apply curse pressure on contact.",
    iconFrame: 14,
    accent: "#c084fc",
  },
  boss: {
    id: "boss",
    label: "Boss",
    summary: "Has a phase shift and unique codex reveal.",
    iconFrame: 15,
    accent: "#d946ef",
  },
};

export const ARPG_ENEMY_FAMILIES: Record<string, ArpgEnemyFamilyDefinition> = {
  "hollow-sentries": {
    id: "hollow-sentries",
    label: "Hollow Sentries",
    summary: "Old reliquary guards that still obey simple oaths.",
    defaultWeaknesses: ["ember", "curse"],
    defaultResistances: ["physical"],
    codexHint: "Sentry shells hate heat after their first guard line cracks.",
  },
  "ash-fiends": {
    id: "ash-fiends",
    label: "Ash Fiends",
    summary: "Small furnace-born scavengers with cruel movement.",
    defaultWeaknesses: ["frost", "holy"],
    defaultResistances: ["ember"],
    codexHint: "Ash fiends burn hot, but cold light makes them panic.",
  },
  "rune-husks": {
    id: "rune-husks",
    label: "Rune Husks",
    summary: "Broken instructions wearing brass and stone.",
    defaultWeaknesses: ["void", "ember"],
    defaultResistances: ["curse", "poison"],
    codexHint: "Husks are instructions, not animals. Interrupt the pattern.",
  },
  "glass-wraiths": {
    id: "glass-wraiths",
    label: "Glass Wraiths",
    summary: "Mirror-bitten things that cut with reflected motion.",
    defaultWeaknesses: ["physical", "holy"],
    defaultResistances: ["frost", "void"],
    codexHint: "Glass wraiths reveal themselves after a grounded strike.",
  },
};

export const ARPG_ELITE_MODIFIERS: Record<string, ArpgEliteModifierDefinition> =
  {
    "brass-oath": {
      id: "brass-oath",
      label: "Brass Oath",
      summary: "Gains ward and relic fury when bloodied.",
      statBonus: { ward: 4, might: 2 },
      statusId: "relic-fury",
      accent: "#d946ef",
    },
    "ember-pack": {
      id: "ember-pack",
      label: "Ember Pack",
      summary: "Moves faster while another ash fiend lives.",
      statBonus: { speed: 2, crit: 1 },
      statusId: "haste",
      accent: "#fb923c",
    },
  };

export const ARPG_ENEMY_COMBAT_PROFILES: Record<
  string,
  ArpgEnemyCombatProfile
> = {
  "hollow-sentry": {
    enemyId: "hollow-sentry",
    familyId: "hollow-sentries",
    spriteFrame: 0,
    damageType: "physical",
    basicDamage: 7,
    attackReach: 1.35,
    telegraphMs: 820,
    recoverMs: 640,
    traits: ["armored"],
    appliesStatuses: ["exposed"],
    weaknesses: ["ember"],
    resistances: ["physical"],
    codexEntry:
      "Hollow Sentries guard old doors. Crack armor first, then strike during recovery.",
  },
  "ashling-scout": {
    enemyId: "ashling-scout",
    familyId: "ash-fiends",
    spriteFrame: 1,
    damageType: "ember",
    basicDamage: 5,
    attackReach: 1.2,
    telegraphMs: 560,
    recoverMs: 480,
    traits: ["swift", "packbound"],
    appliesStatuses: ["burn"],
    weaknesses: ["frost"],
    resistances: ["ember"],
    codexEntry:
      "Ashling Scouts dart before they bite. A dodge turns their speed against them.",
    eliteModifierId: "ember-pack",
  },
  "rune-husk": {
    enemyId: "rune-husk",
    familyId: "rune-husks",
    spriteFrame: 2,
    damageType: "curse",
    basicDamage: 11,
    attackReach: 1.45,
    telegraphMs: 980,
    recoverMs: 820,
    traits: ["warded"],
    appliesStatuses: ["cracked-armor"],
    weaknesses: ["void", "ember"],
    resistances: ["curse"],
    codexEntry:
      "Rune Husks are slow but punitive. Let the telegraph bloom, then cut the command line.",
  },
  "brass-warden": {
    enemyId: "brass-warden",
    familyId: "hollow-sentries",
    spriteFrame: 3,
    damageType: "physical",
    basicDamage: 15,
    attackReach: 1.65,
    telegraphMs: 1180,
    recoverMs: 900,
    traits: ["armored", "warded", "boss"],
    appliesStatuses: ["staggered", "cracked-armor"],
    weaknesses: ["ember", "curse"],
    resistances: ["physical", "holy"],
    codexEntry:
      "The Brass Warden changes rhythm below half health. Dodge the oath slam, then punish recovery.",
    eliteModifierId: "brass-oath",
    phaseThreshold: 0.5,
  },
  "ember-mote": {
    enemyId: "ember-mote",
    familyId: "ash-fiends",
    spriteFrame: 4,
    damageType: "ember",
    basicDamage: 4,
    attackReach: 1.1,
    telegraphMs: 520,
    recoverMs: 420,
    traits: ["swift"],
    appliesStatuses: ["burn"],
    weaknesses: ["frost", "holy"],
    resistances: ["ember"],
    codexEntry:
      "Ember Motes look harmless until they gather heat. Tap them down before they stack burn.",
  },
  "glass-gnawer": {
    enemyId: "glass-gnawer",
    familyId: "glass-wraiths",
    spriteFrame: 5,
    damageType: "bleed",
    basicDamage: 8,
    attackReach: 1.25,
    telegraphMs: 720,
    recoverMs: 560,
    traits: ["swift", "cursed"],
    appliesStatuses: ["bleed"],
    weaknesses: ["physical", "holy"],
    resistances: ["frost"],
    codexEntry:
      "Glass Gnawers punish panic movement. Hold ground, then strike through the reflection.",
  },
};

export const ARPG_ENEMY_SPRITE_FRAMES: Record<string, ArpgSheetFrame> =
  Object.fromEntries(
    Object.values(ARPG_ENEMY_COMBAT_PROFILES).map((profile) => [
      profile.enemyId,
      {
        id: profile.enemyId,
        label: profile.enemyId,
        frame: profile.spriteFrame,
      },
    ]),
  ) as Record<string, ArpgSheetFrame>;

export const ARPG_ITEM_ICON_FRAMES: Record<string, ArpgSheetFrame> = {
  "cinder-glaive": { id: "cinder-glaive", label: "Cinder Glaive", frame: 0 },
  "ember-buckler": { id: "ember-buckler", label: "Ember Buckler", frame: 1 },
  "pilgrim-helm": { id: "pilgrim-helm", label: "Pilgrim Helm", frame: 2 },
  "threadbare-wardplate": {
    id: "threadbare-wardplate",
    label: "Wardplate",
    frame: 3,
  },
  "ash-runner-boots": { id: "ash-runner-boots", label: "Ash Boots", frame: 4 },
  "memory-prism": { id: "memory-prism", label: "Memory Prism", frame: 5 },
  "wayfinder-sigil": {
    id: "wayfinder-sigil",
    label: "Wayfinder Sigil",
    frame: 6,
  },
  "brass-charm": { id: "brass-charm", label: "Brass Charm", frame: 7 },
  "loomshard-charm": { id: "loomshard-charm", label: "Loom-Shard", frame: 8 },
  "oracle-focus": { id: "oracle-focus", label: "Oracle Focus", frame: 9 },
  "warden-cuirass": {
    id: "warden-cuirass",
    label: "Warden Cuirass",
    frame: 10,
  },
  "health-vial": { id: "health-vial", label: "Health Vial", frame: 11 },
  "focus-draught": { id: "focus-draught", label: "Focus Draught", frame: 12 },
  "upgrade-shard": { id: "upgrade-shard", label: "Upgrade Shard", frame: 13 },
  "relic-dust": { id: "relic-dust", label: "Relic Dust", frame: 14 },
  "gate-key-fragment": {
    id: "gate-key-fragment",
    label: "Gate Fragment",
    frame: 15,
  },
};

export const ARPG_STATUS_ICON_FRAMES: Record<string, ArpgSheetFrame> =
  Object.fromEntries(
    Object.values(ARPG_STATUS_EFFECTS).map((status) => [
      status.id,
      {
        id: status.id,
        label: status.label,
        frame: status.iconFrame,
      },
    ]),
  ) as Record<string, ArpgSheetFrame>;
