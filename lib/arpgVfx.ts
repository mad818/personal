import type { AgentId } from "@/components/home/office/types";
import { AGENTS } from "@/components/home/office/constants";
import {
  ARPG_ITEMS,
  ARPG_LOOT_PEDESTAL_ITEM_ID,
  ARPG_LORE_NODES,
} from "@/lib/arpgGameContent";
import {
  getNearestArpgInteraction,
  normalizeArpgSave,
  resolveArpgObjective,
  type ArpgSaveState,
} from "@/lib/arpgGame";

export type ArpgVfxKind =
  | "ambient"
  | "loot"
  | "equip"
  | "hit"
  | "objective"
  | "oracle";

export interface ArpgVfxSnapshot {
  eventKey: string;
  kind: ArpgVfxKind;
  accent: string;
  intensity: number;
  label: string;
  oracleLabel: string;
  reducedMotion: boolean;
}

const KIND_ACCENTS: Record<ArpgVfxKind, string> = {
  ambient: "#f4a261",
  loot: "#ffd166",
  equip: "#8ecae6",
  hit: "#ef4444",
  objective: "#7dd3fc",
  oracle: "#a7f3d0",
};

function eventKindFor(
  lastEvent: string,
  activeAgent: AgentId | null,
): ArpgVfxKind {
  const event = lastEvent.toLowerCase();
  if (
    /equipped|upgraded|tempered|tune your build|not equippable|select equipment/.test(
      event,
    )
  ) {
    return "equip";
  }
  if (/collected|already in your kit|loom-shard|vial|draught/.test(event))
    return "loot";
  if (/struck|defeated|dissolved|quiet|closer|ignores/.test(event))
    return "hit";
  if (/monolith|map-fragment|records|reliquary gate stabilized/.test(event)) {
    return "objective";
  }
  if (activeAgent) return "oracle";
  return "ambient";
}

function accentFor(
  save: ArpgSaveState,
  kind: ArpgVfxKind,
  activeAgent: AgentId | null,
) {
  if (kind === "oracle" && activeAgent) return AGENTS[activeAgent].color;
  if (kind === "loot") {
    return ARPG_ITEMS[ARPG_LOOT_PEDESTAL_ITEM_ID]?.accent ?? KIND_ACCENTS.loot;
  }
  if (
    kind === "equip" &&
    save.selectedItemId &&
    ARPG_ITEMS[save.selectedItemId]
  ) {
    return ARPG_ITEMS[save.selectedItemId].accent;
  }
  const nearest = getNearestArpgInteraction(save);
  return nearest?.accent ?? KIND_ACCENTS[kind];
}

export function deriveArpgVfxSnapshot({
  save,
  activeAgent,
  runtimeStatusLabel,
  reducedMotion,
}: {
  save: Partial<ArpgSaveState> | null | undefined;
  activeAgent: AgentId | null;
  runtimeStatusLabel: string;
  reducedMotion: boolean;
}): ArpgVfxSnapshot {
  const normalized = normalizeArpgSave(save);
  const kind = eventKindFor(normalized.lastEvent, activeAgent);
  const objective = resolveArpgObjective(normalized);
  const monolithDiscovered = normalized.storyFlags.includes(
    ARPG_LORE_NODES["gate-monolith"]?.storyFlag ?? "lore:gate-monolith",
  );
  const objectiveWeight = monolithDiscovered ? 0.66 : 0.92;
  const activityWeight =
    runtimeStatusLabel.toLowerCase().includes("live") || activeAgent ? 1 : 0.76;

  return {
    eventKey: [
      kind,
      normalized.lastSavedAt,
      normalized.lastEvent,
      activeAgent ?? "standby",
      runtimeStatusLabel,
    ].join(":"),
    kind,
    accent: accentFor(normalized, kind, activeAgent),
    intensity: Number((objectiveWeight * activityWeight).toFixed(2)),
    label: kind === "objective" ? objective : normalized.lastEvent,
    oracleLabel: activeAgent ? AGENTS[activeAgent].name : "Standby oracle",
    reducedMotion,
  };
}
