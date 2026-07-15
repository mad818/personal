import { normalizeArpgSave, type ArpgSaveState } from "@/lib/arpgGame";

export type ArpgSaveEnvelopeVersion = "aether-reliquary-save-envelope-v1";
export type ArpgSaveSlotKind = "autosave" | "manual" | "checkpoint";

export interface ArpgSaveSlot {
  id: string;
  label: string;
  kind: ArpgSaveSlotKind;
  save: ArpgSaveState;
  savedAt: number;
  checkpointId: string;
}

export interface ArpgSaveSlotSummary {
  id: string;
  label: string;
  kind: ArpgSaveSlotKind;
  checkpointId: string;
  savedAt: number;
  level: number;
  questId: string;
  gold: number;
}

export interface ArpgSaveEnvelope {
  schemaVersion: ArpgSaveEnvelopeVersion;
  gameTitle: "Aether Reliquary";
  activeSlotId: string;
  exportedAt: string;
  slots: ArpgSaveSlot[];
}

export interface ArpgSaveImportResult {
  save: ArpgSaveState;
  slots: ArpgSaveSlot[];
  activeSlotId: string;
  format: "envelope-v1" | "raw-save";
}

const ENVELOPE_VERSION: ArpgSaveEnvelopeVersion =
  "aether-reliquary-save-envelope-v1";
export const ARPG_AUTOSAVE_SLOT_ID = "autosave";
export const ARPG_MANUAL_SLOT_ID = "manual-01";
const ARPG_CHECKPOINT_SLOT_PREFIX = "checkpoint-";

const SLOT_LABELS: Record<ArpgSaveSlotKind, string> = {
  autosave: "Autosave",
  manual: "Manual save",
  checkpoint: "Checkpoint",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveSavedAt(save: ArpgSaveState) {
  return save.lastSavedAt || Date.now();
}

function resolveCheckpointId(save: ArpgSaveState) {
  return save.world.checkpointId || "gate-room";
}

function isSlotKind(value: unknown): value is ArpgSaveSlotKind {
  return value === "autosave" || value === "manual" || value === "checkpoint";
}

function resolveSlotId(
  save: ArpgSaveState,
  kind: ArpgSaveSlotKind,
  id?: string,
) {
  if (kind === "autosave") return ARPG_AUTOSAVE_SLOT_ID;
  if (kind === "manual") return ARPG_MANUAL_SLOT_ID;
  return id || `${ARPG_CHECKPOINT_SLOT_PREFIX}${resolveCheckpointId(save)}`;
}

export function createArpgSaveSlot(
  save: ArpgSaveState,
  kind: ArpgSaveSlotKind,
  id?: string,
): ArpgSaveSlot {
  const normalized = normalizeArpgSave(save);
  const checkpointId = resolveCheckpointId(normalized);
  const slotId = resolveSlotId(normalized, kind, id);

  return {
    id: slotId,
    label: SLOT_LABELS[kind],
    kind,
    save: normalized,
    savedAt: resolveSavedAt(normalized),
    checkpointId,
  };
}

export function createArpgSaveSlotSet(save: ArpgSaveState): ArpgSaveSlot[] {
  return [
    createArpgSaveSlot(save, "autosave", ARPG_AUTOSAVE_SLOT_ID),
    createArpgSaveSlot(save, "manual", ARPG_MANUAL_SLOT_ID),
    createArpgSaveSlot(save, "checkpoint"),
  ];
}

function normalizeArpgSaveSlot(
  input: unknown,
  fallbackSave: ArpgSaveState,
  fallbackKind: ArpgSaveSlotKind,
): ArpgSaveSlot {
  if (!isRecord(input)) return createArpgSaveSlot(fallbackSave, fallbackKind);

  const save = normalizeArpgSave(
    ("save" in input ? input.save : fallbackSave) as
      | (Partial<ArpgSaveState> & { version?: number })
      | null
      | undefined,
  );
  const kind = isSlotKind(input.kind) ? input.kind : fallbackKind;
  const id = typeof input.id === "string" ? input.id : undefined;
  const label =
    typeof input.label === "string" && input.label.trim()
      ? input.label
      : SLOT_LABELS[kind];
  const savedAt =
    typeof input.savedAt === "number" && input.savedAt > 0
      ? input.savedAt
      : resolveSavedAt(save);
  const checkpointId =
    typeof input.checkpointId === "string" && input.checkpointId.trim()
      ? input.checkpointId
      : resolveCheckpointId(save);

  return {
    id: resolveSlotId(save, kind, id),
    label,
    kind,
    save,
    savedAt,
    checkpointId,
  };
}

export function normalizeArpgSaveSlots(
  slots: unknown,
  fallbackSave: ArpgSaveState = normalizeArpgSave(undefined),
): ArpgSaveSlot[] {
  const normalizedFallback = normalizeArpgSave(fallbackSave);
  const rawSlots = Array.isArray(slots) ? slots : [];
  const normalized = rawSlots.map((slot) =>
    normalizeArpgSaveSlot(slot, normalizedFallback, "autosave"),
  );

  const autosave =
    normalized.find((slot) => slot.kind === "autosave") ??
    createArpgSaveSlot(normalizedFallback, "autosave", ARPG_AUTOSAVE_SLOT_ID);
  const manual =
    normalized.find((slot) => slot.kind === "manual") ??
    createArpgSaveSlot(normalizedFallback, "manual", ARPG_MANUAL_SLOT_ID);
  const checkpoint =
    normalized.find((slot) => slot.kind === "checkpoint") ??
    createArpgSaveSlot(normalizedFallback, "checkpoint");

  return [
    createArpgSaveSlot(autosave.save, "autosave", ARPG_AUTOSAVE_SLOT_ID),
    { ...manual, id: ARPG_MANUAL_SLOT_ID, label: SLOT_LABELS.manual },
    {
      ...checkpoint,
      id: resolveSlotId(checkpoint.save, "checkpoint", checkpoint.id),
      label: SLOT_LABELS.checkpoint,
    },
  ];
}

export function syncArpgAutosaveSlot(
  save: ArpgSaveState,
  slots: unknown,
): ArpgSaveSlot[] {
  const normalized = normalizeArpgSave(save);
  return normalizeArpgSaveSlots(slots, normalized).map((slot) =>
    slot.kind === "autosave"
      ? createArpgSaveSlot(normalized, "autosave", ARPG_AUTOSAVE_SLOT_ID)
      : slot,
  );
}

export function upsertArpgSaveSlot(
  slots: unknown,
  save: ArpgSaveState,
  kind: ArpgSaveSlotKind,
  id?: string,
): ArpgSaveSlot[] {
  const normalizedSave = normalizeArpgSave(save);
  const nextSlot = createArpgSaveSlot(normalizedSave, kind, id);
  return normalizeArpgSaveSlots(slots, normalizedSave).map((slot) =>
    slot.kind === kind ? nextSlot : slot,
  );
}

export function getArpgSaveSlotSummary(
  saveOrSlots: ArpgSaveState | ArpgSaveSlot[],
  fallbackSave?: ArpgSaveState,
): ArpgSaveSlotSummary[] {
  const fallback = normalizeArpgSave(
    fallbackSave ?? (Array.isArray(saveOrSlots) ? undefined : saveOrSlots),
  );
  const slots = Array.isArray(saveOrSlots)
    ? normalizeArpgSaveSlots(saveOrSlots, fallback)
    : createArpgSaveSlotSet(fallback);

  return slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    kind: slot.kind,
    checkpointId: slot.checkpointId,
    savedAt: slot.savedAt,
    level: slot.save.player.level,
    questId: slot.save.player.activeQuestId,
    gold: slot.save.player.gold,
  }));
}

export function createArpgSaveEnvelope(
  save: ArpgSaveState,
  slots: ArpgSaveSlot[] = createArpgSaveSlotSet(save),
  activeSlotId = ARPG_AUTOSAVE_SLOT_ID,
): ArpgSaveEnvelope {
  const normalized = normalizeArpgSave(save);
  const normalizedSlots = syncArpgAutosaveSlot(normalized, slots);
  const slotIds = new Set(normalizedSlots.map((slot) => slot.id));
  return {
    schemaVersion: ENVELOPE_VERSION,
    gameTitle: "Aether Reliquary",
    activeSlotId: slotIds.has(activeSlotId)
      ? activeSlotId
      : ARPG_AUTOSAVE_SLOT_ID,
    exportedAt: new Date(normalized.lastSavedAt || Date.now()).toISOString(),
    slots: normalizedSlots,
  };
}

export function normalizeArpgSaveImport(input: unknown): ArpgSaveImportResult {
  if (
    isRecord(input) &&
    input.schemaVersion === ENVELOPE_VERSION &&
    Array.isArray(input.slots)
  ) {
    const activeSlotId =
      typeof input.activeSlotId === "string"
        ? input.activeSlotId
        : ARPG_AUTOSAVE_SLOT_ID;
    const activeSlot = input.slots.find(
      (entry) => isRecord(entry) && entry.id === activeSlotId,
    );
    const fallbackSlot =
      activeSlot ??
      input.slots.find((entry) => isRecord(entry) && "save" in entry);
    if (isRecord(fallbackSlot)) {
      const fallbackSave = normalizeArpgSave(
        ("save" in fallbackSlot ? fallbackSlot.save : undefined) as
          | (Partial<ArpgSaveState> & { version?: number })
          | null
          | undefined,
      );
      const slots = normalizeArpgSaveSlots(input.slots, fallbackSave);
      const slotIds = new Set(slots.map((slot) => slot.id));
      const resolvedActiveSlotId = slotIds.has(activeSlotId)
        ? activeSlotId
        : (slots[0]?.id ?? ARPG_AUTOSAVE_SLOT_ID);
      const save =
        slots.find((slot) => slot.id === resolvedActiveSlotId)?.save ??
        fallbackSave;
      return {
        save,
        slots,
        activeSlotId: resolvedActiveSlotId,
        format: "envelope-v1",
      };
    }
  }

  const save = normalizeArpgSave(
    input as (Partial<ArpgSaveState> & { version?: number }) | null | undefined,
  );
  return {
    save,
    slots: createArpgSaveSlotSet(save),
    activeSlotId: ARPG_AUTOSAVE_SLOT_ID,
    format: "raw-save",
  };
}
