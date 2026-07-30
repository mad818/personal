export type SubscriptionEscapeCategory =
  | "cloud-storage"
  | "passwords"
  | "media"
  | "notes-docs"
  | "dns-privacy"
  | "ai-dev"
  | "device-sync"
  | "other";

export type SubscriptionEscapeStatus =
  | "paying"
  | "testing"
  | "ready_to_cancel"
  | "cancelled";

export type SubscriptionEscapeDifficulty = "easy" | "medium" | "hard";

export type SubscriptionEscapeCostPosture =
  | "free_local"
  | "open_source"
  | "byok"
  | "one_time"
  | "manual_review";

export type SubscriptionSafetyKey =
  | "replacementTested"
  | "dataExported"
  | "backupVerified"
  | "loginRecoveryConfirmed"
  | "cancelDateCaptured";

export interface SubscriptionSafetyChecklist {
  replacementTested: boolean;
  dataExported: boolean;
  backupVerified: boolean;
  loginRecoveryConfirmed: boolean;
  cancelDateCaptured: boolean;
}

export interface SubscriptionEscapeItem {
  id: string;
  name: string;
  category: SubscriptionEscapeCategory;
  monthlyCost: number;
  renewalDate?: string;
  replacementId?: string;
  status: SubscriptionEscapeStatus;
  notes?: string;
  safety: SubscriptionSafetyChecklist;
  updatedAt: string;
}

export type MediaEscapeKind = "movie" | "music" | "book";

export type MediaEscapeStatus = "owned" | "needs_metadata" | "wishlist";

export type MediaEscapeSort = "recent" | "title" | "year" | "favorite";

export type MediaEscapeIntakeStatus =
  | "needs_review"
  | "ready"
  | "imported"
  | "ignored";

export type SecureStreamLinkCategory =
  | "media-server"
  | "movie"
  | "music"
  | "book"
  | "show"
  | "playlist"
  | "other";

export interface MediaEscapeItem {
  id: string;
  kind: MediaEscapeKind;
  title: string;
  subtitle?: string;
  creator?: string;
  year?: string;
  genre?: string;
  duration?: string;
  rating?: string;
  summary?: string;
  coverUrl?: string;
  filePath?: string;
  status: MediaEscapeStatus;
  favorite: boolean;
  updatedAt: string;
}

export interface MediaEscapeIntakeItem {
  id: string;
  rawName: string;
  kind: MediaEscapeKind;
  suggestedTitle: string;
  suggestedYear?: string;
  suggestedCreator?: string;
  suggestedGenre?: string;
  suggestedPath?: string;
  status: MediaEscapeIntakeStatus;
  duplicateOfId?: string;
  notes?: string;
  updatedAt: string;
}

export interface SecureStreamLink {
  id: string;
  title: string;
  url: string;
  category: SecureStreamLinkCategory;
  favorite: boolean;
  notes?: string;
  updatedAt: string;
}

export interface SubscriptionReplacementOption {
  id: string;
  category: SubscriptionEscapeCategory;
  title: string;
  replaces: string;
  costPosture: SubscriptionEscapeCostPosture;
  difficulty: SubscriptionEscapeDifficulty;
  hostFit: "macbook-host" | "client-only" | "either";
  privacyPosture: string;
  bestFor: string;
  setupSteps: string[];
  safetyNotes: string[];
}

export interface SubscriptionEscapeSource {
  id: string;
  url: string;
  status: "supplied" | "metadata_unverified";
  note: string;
}

export interface SubscriptionEscapeHostPosture {
  hostLabel: string;
  hostRole: "macbook" | "desktop" | "nas" | "unknown";
  accessMode: "tailscale" | "lan" | "public" | "unknown";
  clients: Array<"desktop" | "ipad" | "macbook">;
  publicExposure: "blocked" | "unknown" | "detected";
  backupReminder: string;
}

export type SubscriptionEscapeAccessRole = "owner" | "family" | "viewer";

export type SubscriptionEscapeAccessStatus =
  | "active"
  | "remove_pending"
  | "revoked";

export interface SubscriptionEscapeAccessEntry {
  id: string;
  label: string;
  role: SubscriptionEscapeAccessRole;
  status: SubscriptionEscapeAccessStatus;
  deviceHint?: string;
  tailscaleManaged: boolean;
  notes?: string;
  updatedAt: string;
}

export interface SubscriptionEscapeAccessPosture {
  policy: "tailscale_first";
  nexusAuth: "required";
  publicLinks: "blocked";
  cloudBackup: "optional";
  localSourceOfTruth: "macbook";
  authorized: SubscriptionEscapeAccessEntry[];
  revocationChecklist: string[];
}

export interface SubscriptionEscapeState {
  version: 1;
  updatedAt: string;
  currency: "USD";
  host: SubscriptionEscapeHostPosture;
  access: SubscriptionEscapeAccessPosture;
  subscriptions: SubscriptionEscapeItem[];
  mediaLibrary: MediaEscapeItem[];
  mediaIntake: MediaEscapeIntakeItem[];
  secureStreamLinks: SecureStreamLink[];
}

export const SUBSCRIPTION_ESCAPE_SAFETY_LABELS: Record<
  SubscriptionSafetyKey,
  string
> = {
  replacementTested: "Replacement tested",
  dataExported: "Data exported",
  backupVerified: "Backup verified",
  loginRecoveryConfirmed: "Login recovery confirmed",
  cancelDateCaptured: "Cancel date captured",
};

export const SUBSCRIPTION_ESCAPE_GUARDRAILS = [
  "Use Tailscale/LAN as the private access layer; Nexus does not build a VPN or anonymizer.",
  "Keep the MacBook-hosted route token-gated and avoid public unauthenticated exposure.",
  "Cloud is optional backup only; the local MacBook state remains the source of truth.",
  "Do not use piracy, DRM bypass, paywall bypass, ad-circumvention claims, or account-ban evasion as replacements.",
  "Do not auto-cancel accounts; the operator reviews and performs cancellation manually.",
  "Do not add Nexus-side billing, cloud sync, or a new public product surface.",
] as const;

export const SUBSCRIPTION_ESCAPE_ACCESS_ROLE_LABELS: Record<
  SubscriptionEscapeAccessRole,
  string
> = {
  owner: "Owner",
  family: "Family",
  viewer: "Viewer",
};

export const SUBSCRIPTION_ESCAPE_ACCESS_STATUS_LABELS: Record<
  SubscriptionEscapeAccessStatus,
  string
> = {
  active: "Active",
  remove_pending: "Remove pending",
  revoked: "Revoked",
};

export const MEDIA_ESCAPE_KIND_LABELS: Record<MediaEscapeKind, string> = {
  movie: "Movie",
  music: "Music",
  book: "Book",
};

export const MEDIA_ESCAPE_STATUS_LABELS: Record<MediaEscapeStatus, string> = {
  owned: "Owned",
  needs_metadata: "Needs info",
  wishlist: "Wishlist",
};

export const MEDIA_ESCAPE_INTAKE_STATUS_LABELS: Record<
  MediaEscapeIntakeStatus,
  string
> = {
  needs_review: "Needs review",
  ready: "Ready",
  imported: "Imported",
  ignored: "Ignored",
};

export const SECURE_STREAM_LINK_CATEGORY_LABELS: Record<
  SecureStreamLinkCategory,
  string
> = {
  "media-server": "Media server",
  movie: "Movie",
  music: "Music",
  book: "Book",
  show: "Show",
  playlist: "Playlist",
  other: "Other",
};

export const SUBSCRIPTION_ESCAPE_SOURCES: SubscriptionEscapeSource[] = [
  {
    id: "fmhy-reading",
    url: "https://fmhy.net/",
    status: "supplied",
    note: "Operator-supplied free-media reference. Use only for lawful, public-domain, owned, or licensed material.",
  },
  {
    id: "yt-IN9jr1VbwZM",
    url: "https://www.youtube.com/watch?v=IN9jr1VbwZM",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
  {
    id: "yt-w8_IBJLNo04",
    url: "https://www.youtube.com/watch?v=w8_IBJLNo04",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
  {
    id: "yt-S8mG6KOku1I",
    url: "https://www.youtube.com/watch?v=S8mG6KOku1I",
    status: "supplied",
    note: "Referenced as a digital-life ownership and subscription reduction source.",
  },
  {
    id: "yt-efl2kuPNEpE",
    url: "https://www.youtube.com/watch?v=efl2kuPNEpE",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
  {
    id: "yt-46T4cDQBkDs",
    url: "https://www.youtube.com/watch?v=46T4cDQBkDs",
    status: "supplied",
    note: "Referenced as an old-laptop/home-server replacement projects source.",
  },
  {
    id: "yt-AVLZOCW7v6Y",
    url: "https://www.youtube.com/watch?v=AVLZOCW7v6Y",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
  {
    id: "yt-ziuRW5P4MfM",
    url: "https://www.youtube.com/watch?v=ziuRW5P4MfM",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
  {
    id: "yt--gMogGlXcAA",
    url: "https://www.youtube.com/watch?v=-gMogGlXcAA",
    status: "metadata_unverified",
    note: "Operator-supplied subscription replacement reference.",
  },
] as const;

export const SUBSCRIPTION_REPLACEMENT_CATALOG: SubscriptionReplacementOption[] =
  [
    {
      id: "nextcloud-macbook",
      category: "cloud-storage",
      title: "Nextcloud on the MacBook host",
      replaces: "iCloud/Drive-style file sync and personal document storage",
      costPosture: "open_source",
      difficulty: "hard",
      hostFit: "macbook-host",
      privacyPosture:
        "Private tailnet access through Tailscale; no public share by default.",
      bestFor:
        "Files, photos, documents, and personal sync where you own the host.",
      setupSteps: [
        "Run the service on the always-on MacBook or a later NAS.",
        "Expose only over Tailscale or LAN.",
        "Test upload, download, mobile access, and backup restore before canceling any storage plan.",
      ],
      safetyNotes: [
        "Confirm backups before deleting cloud originals.",
        "Avoid public file sharing until reverse-proxy and auth posture are reviewed.",
      ],
    },
    {
      id: "vaultwarden-tailnet",
      category: "passwords",
      title: "Vaultwarden behind Tailscale",
      replaces: "Password manager subscriptions",
      costPosture: "open_source",
      difficulty: "medium",
      hostFit: "macbook-host",
      privacyPosture:
        "Tailnet-only password vault; operator-owned backups required.",
      bestFor:
        "Password vault replacement after export/import and recovery testing.",
      setupSteps: [
        "Export the existing vault from the paid provider.",
        "Import into Vaultwarden on the MacBook host.",
        "Test desktop, browser extension, iPad, emergency access, and restore before canceling.",
      ],
      safetyNotes: [
        "Do not cancel the old vault until recovery keys and backups are proven.",
        "Use strong master password and 2FA before production use.",
      ],
    },
    {
      id: "jellyfin-tailnet",
      category: "media",
      title: "Jellyfin private media library",
      replaces:
        "Personal media streaming subscriptions where you own the media",
      costPosture: "open_source",
      difficulty: "medium",
      hostFit: "macbook-host",
      privacyPosture:
        "Private streaming over LAN/Tailscale; no public media endpoint.",
      bestFor:
        "Owned video/music library playback across desktop, iPad, and TV clients.",
      setupSteps: [
        "Place legally owned media on the MacBook host or attached storage.",
        "Run Jellyfin on LAN/Tailscale only.",
        "Test playback and remote bandwidth before canceling overlapping services.",
      ],
      safetyNotes: [
        "No piracy, DRM bypass, or scraping paid libraries.",
        "Keep media rights and storage provenance clean.",
      ],
    },
    {
      id: "calibre-web-tailnet",
      category: "media",
      title: "Calibre-Web private bookshelf",
      replaces: "Book library subscriptions where you own the books",
      costPosture: "open_source",
      difficulty: "medium",
      hostFit: "macbook-host",
      privacyPosture:
        "Private reading catalog over LAN/Tailscale; no public book endpoint.",
      bestFor:
        "Owned ebooks, PDFs, comics, manuals, and reading lists across trusted devices.",
      setupSteps: [
        "Place legally owned books on the MacBook host or attached storage.",
        "Run Calibre or Calibre-Web behind Tailscale/LAN only.",
        "Test search, metadata, covers, backups, and iPad reading flow before canceling overlapping services.",
      ],
      safetyNotes: [
        "No piracy, DRM bypass, or paid-library scraping.",
        "Keep book provenance, backups, and restore proof clean.",
      ],
    },
    {
      id: "obsidian-syncthing",
      category: "notes-docs",
      title: "Obsidian plus Syncthing",
      replaces: "Notes, lightweight docs, and personal knowledge subscriptions",
      costPosture: "free_local",
      difficulty: "easy",
      hostFit: "either",
      privacyPosture: "Local files with optional private-device sync.",
      bestFor:
        "Markdown notes, checklists, migration logs, and personal knowledge base.",
      setupSteps: [
        "Create a local vault folder.",
        "Sync only trusted devices.",
        "Export old notes and verify search/history before canceling.",
      ],
      safetyNotes: [
        "Avoid syncing secrets into plain-text notes.",
        "Keep device-level backups enabled.",
      ],
    },
    {
      id: "adguard-home-tailnet",
      category: "dns-privacy",
      title: "AdGuard Home or Pi-hole",
      replaces: "Paid DNS filtering or family-safe resolver subscriptions",
      costPosture: "open_source",
      difficulty: "medium",
      hostFit: "macbook-host",
      privacyPosture:
        "Private DNS filtering for your devices; not an anonymity service.",
      bestFor:
        "Reducing noisy trackers and blocking known bad domains on trusted devices.",
      setupSteps: [
        "Run DNS filtering on the MacBook host or later dedicated device.",
        "Point only your devices to it.",
        "Keep bypass and emergency fallback DNS documented.",
      ],
      safetyNotes: [
        "This does not hide identity from websites by itself.",
        "Do not break banking, school, or work device policies.",
      ],
    },
    {
      id: "ollama-local-ai",
      category: "ai-dev",
      title: "Ollama local AI lane",
      replaces:
        "Some paid AI utility usage for private drafting and coding support",
      costPosture: "free_local",
      difficulty: "easy",
      hostFit: "either",
      privacyPosture:
        "Runs on your machine; optional BYOK providers remain separate.",
      bestFor:
        "Private drafts, summaries, local code help, and offline-first assistant checks.",
      setupSteps: [
        "Keep Ollama running on the host with the chosen local model.",
        "Use Nexus provider-health proof to confirm local/free posture.",
        "Keep paid provider keys disabled unless you explicitly need them.",
      ],
      safetyNotes: [
        "Local models are not a complete replacement for every paid model.",
        "Review output before using it in sensitive workflows.",
      ],
    },
    {
      id: "tailscale-private-access",
      category: "device-sync",
      title: "Tailscale private access",
      replaces: "Public hosting needs for personal-only Nexus access",
      costPosture: "free_local",
      difficulty: "easy",
      hostFit: "either",
      privacyPosture:
        "Private tailnet path between MacBook, desktop, and iPad.",
      bestFor:
        "Opening MacBook-hosted Nexus from your own devices without port forwarding.",
      setupSteps: [
        "Keep Tailscale installed and signed in on MacBook, desktop, and iPad.",
        "Run Nexus on the MacBook host.",
        "Open the MacBook Tailscale IP or MagicDNS name from desktop/iPad.",
      ],
      safetyNotes: [
        "Do not enable public Funnel for Nexus by default.",
        "This protects access to the host; outbound website IP privacy still depends on OS-level VPN or exit-node settings.",
      ],
    },
  ] as const;

export function createEmptySafetyChecklist(): SubscriptionSafetyChecklist {
  return {
    replacementTested: false,
    dataExported: false,
    backupVerified: false,
    loginRecoveryConfirmed: false,
    cancelDateCaptured: false,
  };
}

export function createDefaultAccessPosture(): SubscriptionEscapeAccessPosture {
  return {
    policy: "tailscale_first",
    nexusAuth: "required",
    publicLinks: "blocked",
    cloudBackup: "optional",
    localSourceOfTruth: "macbook",
    authorized: [],
    revocationChecklist: [
      "Remove or disable the shared Tailscale user/device.",
      "Rotate the Nexus token if the link or password was shared.",
      "Confirm old browser sessions no longer open protected Escape APIs.",
      "Mark the person/device revoked in this tracker.",
    ],
  };
}

export function createDefaultSubscriptionEscapeState(): SubscriptionEscapeState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    currency: "USD",
    host: {
      hostLabel: "MacBook always-on host",
      hostRole: "macbook",
      accessMode: "tailscale",
      clients: ["macbook", "desktop", "ipad"],
      publicExposure: "blocked",
      backupReminder:
        "Export or back up the local state file before canceling a provider.",
    },
    access: createDefaultAccessPosture(),
    subscriptions: [],
    mediaLibrary: [],
    mediaIntake: [],
    secureStreamLinks: [],
  };
}

export function normalizeMonthlyCost(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function countCompletedSafetySteps(item: SubscriptionEscapeItem) {
  return Object.values(item.safety).filter(Boolean).length;
}

export function isSafeToCancel(item: SubscriptionEscapeItem) {
  return Object.values(item.safety).every(Boolean);
}

export function calculateSubscriptionEscapeTotals(
  items: SubscriptionEscapeItem[],
) {
  const activeMonthly = items
    .filter((item) => item.status !== "cancelled")
    .reduce((total, item) => total + normalizeMonthlyCost(item.monthlyCost), 0);
  const readyMonthly = items
    .filter((item) => item.status === "ready_to_cancel")
    .reduce((total, item) => total + normalizeMonthlyCost(item.monthlyCost), 0);
  const cancelledMonthly = items
    .filter((item) => item.status === "cancelled")
    .reduce((total, item) => total + normalizeMonthlyCost(item.monthlyCost), 0);

  return {
    activeMonthly: Math.round(activeMonthly * 100) / 100,
    readyMonthly: Math.round(readyMonthly * 100) / 100,
    cancelledMonthly: Math.round(cancelledMonthly * 100) / 100,
    yearlyActive: Math.round(activeMonthly * 12 * 100) / 100,
  };
}

export function createDefaultMediaEscapeItem(
  kind: MediaEscapeKind,
): Omit<MediaEscapeItem, "id"> {
  return {
    kind,
    title: "",
    subtitle: "",
    creator: "",
    year: "",
    genre: "",
    duration: "",
    rating: "",
    summary: "",
    coverUrl: "",
    filePath: "",
    status: "owned",
    favorite: false,
    updatedAt: new Date().toISOString(),
  };
}

const MEDIA_ESCAPE_AUDIO_EXTENSIONS = new Set([
  "aac",
  "aiff",
  "alac",
  "flac",
  "m4a",
  "mp3",
  "ogg",
  "opus",
  "wav",
  "wma",
]);

const MEDIA_ESCAPE_VIDEO_EXTENSIONS = new Set([
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  "wmv",
]);

const MEDIA_ESCAPE_BOOK_EXTENSIONS = new Set([
  "azw",
  "azw3",
  "cbr",
  "cbz",
  "djvu",
  "epub",
  "mobi",
  "pdf",
]);

const MEDIA_ESCAPE_RELEASE_TAGS =
  /\b(480p|720p|1080p|1440p|2160p|4k|8k|aac|atmos|av1|bluray|brrip|dvdrip|dts|extended|h264|h265|hdr|hdr10|hdrip|hevc|internal|limited|proper|repack|remaster(?:ed)?|remux|uhd|unrated|web[ .-]?dl|webrip|x264|x265|yify|yts)\b/gi;

export function normalizeMediaEscapeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getMediaEscapeExtension(rawName: string) {
  const basename = rawName.trim().split(/[\\/]/).pop() ?? rawName.trim();
  const match = basename.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function titleCaseMediaEscapeName(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (!/[a-z]/.test(clean)) return clean;
  return clean.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

export function parseMediaEscapeFileName(
  input: string,
  fallbackKind: MediaEscapeKind = "movie",
) {
  const rawName = input.trim();
  const extension = getMediaEscapeExtension(rawName);
  const kind = MEDIA_ESCAPE_AUDIO_EXTENSIONS.has(extension)
    ? "music"
    : MEDIA_ESCAPE_VIDEO_EXTENSIONS.has(extension)
      ? "movie"
      : MEDIA_ESCAPE_BOOK_EXTENSIONS.has(extension)
        ? "book"
        : fallbackKind;
  const basename = rawName.split(/[\\/]/).pop() ?? rawName;
  const suffix = extension ? `.${extension}` : "";
  const withoutExtension =
    suffix && basename.toLowerCase().endsWith(suffix)
      ? basename.slice(0, -suffix.length)
      : basename;
  const suggestedPath =
    /[\\/]/.test(rawName) || /^[a-zA-Z]:/.test(rawName) ? rawName : undefined;
  const yearMatch = withoutExtension.match(/\b(19\d{2}|20\d{2})\b/);
  const suggestedYear = yearMatch?.[1];
  const cleaned = withoutExtension
    .replace(/[._]+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(MEDIA_ESCAPE_RELEASE_TAGS, " ")
    .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const suggestedCreator =
    (kind === "music" || kind === "book") && parts.length > 1
      ? titleCaseMediaEscapeName(parts[0])
      : undefined;
  const titleSource =
    (kind === "music" || kind === "book") && parts.length > 1
      ? parts.slice(1).join(" ")
      : cleaned;
  const suggestedTitle =
    titleCaseMediaEscapeName(titleSource) ||
    (kind === "music"
      ? "Untitled music"
      : kind === "book"
        ? "Untitled book"
        : "Untitled movie");

  return {
    rawName,
    kind,
    suggestedTitle,
    suggestedYear,
    suggestedCreator,
    suggestedPath,
  } satisfies Omit<
    MediaEscapeIntakeItem,
    "id" | "status" | "duplicateOfId" | "suggestedGenre" | "notes" | "updatedAt"
  >;
}

export function findMediaEscapeDuplicate(
  items: MediaEscapeItem[],
  candidate: Pick<MediaEscapeItem, "kind" | "title"> &
    Partial<Pick<MediaEscapeItem, "creator" | "year">>,
) {
  const title = normalizeMediaEscapeTitle(candidate.title);
  if (!title) return null;
  const year = candidate.year?.trim().toLowerCase();
  const creator = candidate.creator?.trim().toLowerCase();

  return (
    items.find((item) => {
      if (item.kind !== candidate.kind) return false;
      if (normalizeMediaEscapeTitle(item.title) !== title) return false;
      const itemYear = item.year?.trim().toLowerCase();
      const itemCreator = item.creator?.trim().toLowerCase();
      if (year && itemYear) return year === itemYear;
      if (creator && itemCreator) return creator === itemCreator;
      return true;
    }) ?? null
  );
}

export function getMediaEscapeCounts(items: MediaEscapeItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.kind] += 1;
      if (item.favorite) acc.favorite += 1;
      if (item.status === "needs_metadata") acc.needsMetadata += 1;
      return acc;
    },
    {
      total: 0,
      movie: 0,
      music: 0,
      book: 0,
      favorite: 0,
      needsMetadata: 0,
    },
  );
}

export function getSubscriptionEscapeAccessCounts(
  access: SubscriptionEscapeAccessPosture,
) {
  return access.authorized.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] += 1;
      return acc;
    },
    {
      total: 0,
      active: 0,
      remove_pending: 0,
      revoked: 0,
    },
  );
}

export function filterMediaEscapeItems(
  items: MediaEscapeItem[],
  opts: {
    query?: string;
    kind?: MediaEscapeKind | "all";
  },
) {
  const query = opts.query?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (opts.kind && opts.kind !== "all" && item.kind !== opts.kind) {
      return false;
    }
    if (!query) return true;
    return [
      item.title,
      item.subtitle,
      item.creator,
      item.year,
      item.genre,
      item.rating,
      item.summary,
      item.filePath,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

export function sortMediaEscapeItems(
  items: MediaEscapeItem[],
  sort: MediaEscapeSort,
) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "year") {
      return (b.year ?? "").localeCompare(a.year ?? "");
    }
    if (sort === "favorite") {
      return (
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.localeCompare(a.updatedAt)
      );
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return sorted;
}
