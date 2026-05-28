import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { inspectSecureLink } from "@/lib/secureLink";
import {
  createDefaultAccessPosture,
  createDefaultSubscriptionEscapeState,
  createEmptySafetyChecklist,
  normalizeMonthlyCost,
  parseMediaEscapeFileName,
  type MediaEscapeItem,
  type MediaEscapeIntakeItem,
  type MediaEscapeIntakeStatus,
  type MediaEscapeKind,
  type MediaEscapeStatus,
  type SecureStreamLink,
  type SecureStreamLinkCategory,
  type SubscriptionEscapeAccessEntry,
  type SubscriptionEscapeAccessPosture,
  type SubscriptionEscapeAccessRole,
  type SubscriptionEscapeAccessStatus,
  type SubscriptionEscapeCategory,
  type SubscriptionEscapeHostPosture,
  type SubscriptionEscapeItem,
  type SubscriptionEscapeState,
  type SubscriptionEscapeStatus,
} from "@/lib/subscriptionEscape";

const DATA_FILE =
  process.env.NEXUS_SUBSCRIPTION_ESCAPE_FILE ??
  path.join(process.cwd(), "data", "subscription-escape.json");

const CATEGORIES = new Set<SubscriptionEscapeCategory>([
  "cloud-storage",
  "passwords",
  "media",
  "notes-docs",
  "dns-privacy",
  "ai-dev",
  "device-sync",
  "other",
]);

const STATUSES = new Set<SubscriptionEscapeStatus>([
  "paying",
  "testing",
  "ready_to_cancel",
  "cancelled",
]);

const MEDIA_KINDS = new Set<MediaEscapeKind>(["movie", "music", "book"]);

const MEDIA_STATUSES = new Set<MediaEscapeStatus>([
  "owned",
  "needs_metadata",
  "wishlist",
]);

const MEDIA_INTAKE_STATUSES = new Set<MediaEscapeIntakeStatus>([
  "needs_review",
  "ready",
  "imported",
  "ignored",
]);

const SECURE_STREAM_CATEGORIES = new Set<SecureStreamLinkCategory>([
  "media-server",
  "movie",
  "music",
  "book",
  "show",
  "playlist",
  "other",
]);

const ACCESS_ROLES = new Set<SubscriptionEscapeAccessRole>([
  "owner",
  "family",
  "viewer",
]);

const ACCESS_STATUSES = new Set<SubscriptionEscapeAccessStatus>([
  "active",
  "remove_pending",
  "revoked",
]);

function normalizeCategory(value: unknown): SubscriptionEscapeCategory {
  return typeof value === "string" &&
    CATEGORIES.has(value as SubscriptionEscapeCategory)
    ? (value as SubscriptionEscapeCategory)
    : "other";
}

function normalizeStatus(value: unknown): SubscriptionEscapeStatus {
  return typeof value === "string" &&
    STATUSES.has(value as SubscriptionEscapeStatus)
    ? (value as SubscriptionEscapeStatus)
    : "paying";
}

function normalizeMediaKind(value: unknown): MediaEscapeKind {
  return typeof value === "string" && MEDIA_KINDS.has(value as MediaEscapeKind)
    ? (value as MediaEscapeKind)
    : "movie";
}

function normalizeMediaStatus(value: unknown): MediaEscapeStatus {
  return typeof value === "string" &&
    MEDIA_STATUSES.has(value as MediaEscapeStatus)
    ? (value as MediaEscapeStatus)
    : "owned";
}

function normalizeMediaIntakeStatus(value: unknown): MediaEscapeIntakeStatus {
  return typeof value === "string" &&
    MEDIA_INTAKE_STATUSES.has(value as MediaEscapeIntakeStatus)
    ? (value as MediaEscapeIntakeStatus)
    : "needs_review";
}

function normalizeSecureStreamCategory(
  value: unknown,
): SecureStreamLinkCategory {
  return typeof value === "string" &&
    SECURE_STREAM_CATEGORIES.has(value as SecureStreamLinkCategory)
    ? (value as SecureStreamLinkCategory)
    : "media-server";
}

function normalizeAccessRole(value: unknown): SubscriptionEscapeAccessRole {
  return typeof value === "string" &&
    ACCESS_ROLES.has(value as SubscriptionEscapeAccessRole)
    ? (value as SubscriptionEscapeAccessRole)
    : "viewer";
}

function normalizeAccessStatus(value: unknown): SubscriptionEscapeAccessStatus {
  return typeof value === "string" &&
    ACCESS_STATUSES.has(value as SubscriptionEscapeAccessStatus)
    ? (value as SubscriptionEscapeAccessStatus)
    : "active";
}

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeHost(
  value: Partial<SubscriptionEscapeHostPosture> | undefined,
): SubscriptionEscapeHostPosture {
  const fallback = createDefaultSubscriptionEscapeState().host;
  const accessMode =
    value?.accessMode === "lan" ||
    value?.accessMode === "public" ||
    value?.accessMode === "unknown" ||
    value?.accessMode === "tailscale"
      ? value.accessMode
      : fallback.accessMode;
  const publicExposure =
    value?.publicExposure === "unknown" || value?.publicExposure === "detected"
      ? value.publicExposure
      : "blocked";
  const hostRole =
    value?.hostRole === "desktop" ||
    value?.hostRole === "nas" ||
    value?.hostRole === "unknown" ||
    value?.hostRole === "macbook"
      ? value.hostRole
      : fallback.hostRole;
  const clients = Array.isArray(value?.clients)
    ? value.clients.filter(
        (client): client is "desktop" | "ipad" | "macbook" =>
          client === "desktop" || client === "ipad" || client === "macbook",
      )
    : fallback.clients;

  return {
    hostLabel: normalizeText(value?.hostLabel, fallback.hostLabel),
    hostRole,
    accessMode,
    clients: clients.length ? Array.from(new Set(clients)) : fallback.clients,
    publicExposure,
    backupReminder: normalizeText(
      value?.backupReminder,
      fallback.backupReminder,
    ),
  };
}

function normalizeSubscription(value: Partial<SubscriptionEscapeItem>) {
  const fallbackSafety = createEmptySafetyChecklist();
  const safety = value.safety ?? fallbackSafety;
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

  return {
    id: normalizeText(value.id, `sub-${Date.now()}`),
    name: normalizeText(value.name, "Untitled subscription"),
    category: normalizeCategory(value.category),
    monthlyCost: normalizeMonthlyCost(value.monthlyCost),
    renewalDate:
      typeof value.renewalDate === "string" && value.renewalDate.trim()
        ? value.renewalDate.trim()
        : undefined,
    replacementId:
      typeof value.replacementId === "string" && value.replacementId.trim()
        ? value.replacementId.trim()
        : undefined,
    status: normalizeStatus(value.status),
    notes:
      typeof value.notes === "string" && value.notes.trim()
        ? value.notes.trim()
        : undefined,
    safety: {
      replacementTested: Boolean(safety.replacementTested),
      dataExported: Boolean(safety.dataExported),
      backupVerified: Boolean(safety.backupVerified),
      loginRecoveryConfirmed: Boolean(safety.loginRecoveryConfirmed),
      cancelDateCaptured: Boolean(safety.cancelDateCaptured),
    },
    updatedAt,
  } satisfies SubscriptionEscapeItem;
}

function normalizeMediaItem(value: Partial<MediaEscapeItem>, index: number) {
  const kind = normalizeMediaKind(value.kind);
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

  return {
    id: normalizeText(value.id, `media-${Date.now()}-${index}`),
    kind,
    title: normalizeText(
      value.title,
      kind === "music"
        ? "Untitled music"
        : kind === "book"
          ? "Untitled book"
          : "Untitled movie",
    ),
    subtitle: normalizeOptionalText(value.subtitle),
    creator: normalizeOptionalText(value.creator),
    year: normalizeOptionalText(value.year),
    genre: normalizeOptionalText(value.genre),
    duration: normalizeOptionalText(value.duration),
    rating: normalizeOptionalText(value.rating),
    summary: normalizeOptionalText(value.summary),
    coverUrl: normalizeOptionalText(value.coverUrl),
    filePath: normalizeOptionalText(value.filePath),
    status: normalizeMediaStatus(value.status),
    favorite: Boolean(value.favorite),
    updatedAt,
  } satisfies MediaEscapeItem;
}

function normalizeMediaIntakeItem(
  value: Partial<MediaEscapeIntakeItem>,
  index: number,
) {
  const parsed = parseMediaEscapeFileName(
    normalizeText(value.rawName, "Untitled media"),
    normalizeMediaKind(value.kind),
  );
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

  return {
    id: normalizeText(value.id, `intake-${Date.now()}-${index}`),
    rawName: parsed.rawName,
    kind: normalizeMediaKind(value.kind ?? parsed.kind),
    suggestedTitle: normalizeText(value.suggestedTitle, parsed.suggestedTitle),
    suggestedYear:
      normalizeOptionalText(value.suggestedYear) ?? parsed.suggestedYear,
    suggestedCreator:
      normalizeOptionalText(value.suggestedCreator) ?? parsed.suggestedCreator,
    suggestedGenre: normalizeOptionalText(value.suggestedGenre),
    suggestedPath:
      normalizeOptionalText(value.suggestedPath) ?? parsed.suggestedPath,
    status: normalizeMediaIntakeStatus(value.status),
    duplicateOfId: normalizeOptionalText(value.duplicateOfId),
    notes: normalizeOptionalText(value.notes),
    updatedAt,
  } satisfies MediaEscapeIntakeItem;
}

function normalizeSecureStreamLink(
  value: Partial<SecureStreamLink>,
  index: number,
): SecureStreamLink | null {
  const inspection = inspectSecureLink(normalizeText(value.url));
  if (!inspection.href || !inspection.canOpen) return null;
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

  return {
    id: normalizeText(value.id, `stream-${Date.now()}-${index}`),
    title: normalizeText(
      value.title,
      inspection.displayHost ?? "Secure stream",
    ),
    url: inspection.href,
    category: normalizeSecureStreamCategory(value.category),
    favorite: Boolean(value.favorite),
    notes: normalizeOptionalText(value.notes),
    updatedAt,
  } satisfies SecureStreamLink;
}

function normalizeAccessEntry(
  value: Partial<SubscriptionEscapeAccessEntry>,
  index: number,
) {
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

  return {
    id: normalizeText(value.id, `access-${Date.now()}-${index}`),
    label: normalizeText(value.label, "Authorized person"),
    role: normalizeAccessRole(value.role),
    status: normalizeAccessStatus(value.status),
    deviceHint: normalizeOptionalText(value.deviceHint),
    tailscaleManaged: value.tailscaleManaged !== false,
    notes: normalizeOptionalText(value.notes),
    updatedAt,
  } satisfies SubscriptionEscapeAccessEntry;
}

function normalizeAccessPosture(
  value: Partial<SubscriptionEscapeAccessPosture> | undefined,
): SubscriptionEscapeAccessPosture {
  const fallback = createDefaultAccessPosture();
  const checklist = Array.isArray(value?.revocationChecklist)
    ? value.revocationChecklist
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : fallback.revocationChecklist;

  return {
    policy: "tailscale_first",
    nexusAuth: "required",
    publicLinks: "blocked",
    cloudBackup: "optional",
    localSourceOfTruth: "macbook",
    authorized: Array.isArray(value?.authorized)
      ? value.authorized.map((item, index) => normalizeAccessEntry(item, index))
      : [],
    revocationChecklist: checklist.length
      ? checklist
      : fallback.revocationChecklist,
  };
}

export function normalizeSubscriptionEscapeState(
  input: Partial<SubscriptionEscapeState> | null | undefined,
): SubscriptionEscapeState {
  const fallback = createDefaultSubscriptionEscapeState();
  return {
    version: 1,
    updatedAt:
      typeof input?.updatedAt === "string" && input.updatedAt
        ? input.updatedAt
        : fallback.updatedAt,
    currency: "USD",
    host: normalizeHost(input?.host),
    access: normalizeAccessPosture(input?.access),
    subscriptions: Array.isArray(input?.subscriptions)
      ? input.subscriptions.map((item) => normalizeSubscription(item))
      : [],
    mediaLibrary: Array.isArray(input?.mediaLibrary)
      ? input.mediaLibrary.map((item, index) => normalizeMediaItem(item, index))
      : [],
    mediaIntake: Array.isArray(input?.mediaIntake)
      ? input.mediaIntake.map((item, index) =>
          normalizeMediaIntakeItem(item, index),
        )
      : [],
    secureStreamLinks: Array.isArray(input?.secureStreamLinks)
      ? input.secureStreamLinks
          .map((item, index) => normalizeSecureStreamLink(item, index))
          .filter((item): item is SecureStreamLink => Boolean(item))
      : [],
  };
}

async function ensureSubscriptionEscapeFile() {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(
      DATA_FILE,
      `${JSON.stringify(createDefaultSubscriptionEscapeState(), null, 2)}\n`,
      "utf8",
    );
  }
}

export async function readSubscriptionEscapeState() {
  await ensureSubscriptionEscapeFile();
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeSubscriptionEscapeState(
      JSON.parse(raw) as Partial<SubscriptionEscapeState>,
    );
  } catch {
    const fallback = createDefaultSubscriptionEscapeState();
    await writeSubscriptionEscapeState(fallback);
    return fallback;
  }
}

export async function writeSubscriptionEscapeState(
  input: Partial<SubscriptionEscapeState>,
) {
  await ensureSubscriptionEscapeFile();
  const payload = normalizeSubscriptionEscapeState({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  await writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function getSubscriptionEscapeStoragePath() {
  return DATA_FILE;
}
