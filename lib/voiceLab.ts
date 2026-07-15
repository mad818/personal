export type VoiceLabEngineId = "browser" | "local-runtime";

export type VoiceEffectPreset = "clean" | "briefing" | "urgent" | "warm";

export type VoiceProfileSource = "browser" | "clone" | "import";

export interface VoiceProfile {
  id: string;
  name: string;
  engine: VoiceLabEngineId;
  source: VoiceProfileSource;
  runtimeVoiceId?: string;
  effectPreset: VoiceEffectPreset;
  sampleText?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceProjectSegment {
  id: string;
  text: string;
  voiceProfileId?: string;
  effectPreset?: VoiceEffectPreset;
  speakerLabel?: string;
}

export type VoiceProjectRenderStatus =
  | "idle"
  | "rendered"
  | "runtime-unavailable"
  | "error";

export interface VoiceProject {
  id: string;
  title: string;
  summary: string;
  sourceKey?: string;
  sourceRoute?: string;
  engine: VoiceLabEngineId;
  effectPreset: VoiceEffectPreset;
  segments: VoiceProjectSegment[];
  lastRenderedAt?: number;
  renderStatus?: VoiceProjectRenderStatus;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceRuntimeStatus {
  checkedAt: number;
  runtimeUrl: string | null;
  runtimeAvailable: boolean;
  browserFallback: boolean;
  features: {
    synthesis: boolean;
    cloning: boolean;
    render: boolean;
    projects: boolean;
  };
  detail: string;
}

const DEFAULT_RUNTIME_URL = "http://127.0.0.1:18181";
const DEFAULT_SAMPLE_TEXT =
  "Nexus voice lab is ready for a local-first command briefing.";

const EFFECT_PRESET_SET = new Set<VoiceEffectPreset>([
  "clean",
  "briefing",
  "urgent",
  "warm",
]);

function clampText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function normalizeEffectPreset(
  value: string | null | undefined,
): VoiceEffectPreset {
  return EFFECT_PRESET_SET.has((value ?? "") as VoiceEffectPreset)
    ? ((value ?? "briefing") as VoiceEffectPreset)
    : "briefing";
}

function generateId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getVoiceRuntimeUrl() {
  const raw =
    process.env.NEXUS_VOICE_RUNTIME_URL?.trim() ??
    process.env.VOICE_RUNTIME_URL?.trim() ??
    DEFAULT_RUNTIME_URL;
  return raw.length > 0 ? raw : DEFAULT_RUNTIME_URL;
}

export async function probeVoiceRuntime(): Promise<VoiceRuntimeStatus> {
  const runtimeUrl = getVoiceRuntimeUrl();
  const baseStatus: VoiceRuntimeStatus = {
    checkedAt: Date.now(),
    runtimeUrl,
    runtimeAvailable: false,
    browserFallback: true,
    features: {
      synthesis: false,
      cloning: false,
      render: false,
      projects: false,
    },
    detail:
      "Local voice runtime unavailable. Browser speech remains ready as the zero-dependency fallback.",
  };

  try {
    const response = await fetch(`${runtimeUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(1800),
    });
    if (!response.ok) return baseStatus;
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      status?: string;
      features?: Partial<VoiceRuntimeStatus["features"]>;
    } | null;
    return {
      checkedAt: Date.now(),
      runtimeUrl,
      runtimeAvailable: payload?.ok !== false,
      browserFallback: true,
      features: {
        synthesis: payload?.features?.synthesis ?? true,
        cloning: payload?.features?.cloning ?? true,
        render: payload?.features?.render ?? true,
        projects: payload?.features?.projects ?? true,
      },
      detail:
        payload?.status?.trim() ||
        "Local voice runtime is reachable for synthesis, cloning, and project rendering.",
    };
  } catch {
    return baseStatus;
  }
}

export function normalizeVoiceProfileInput(
  input: Partial<VoiceProfile> & { name?: string | null },
): VoiceProfile {
  const createdAt = Number.isFinite(input.createdAt)
    ? Number(input.createdAt)
    : Date.now();
  const updatedAt = Number.isFinite(input.updatedAt)
    ? Number(input.updatedAt)
    : Date.now();
  return {
    id: input.id?.trim() || generateId("voice-profile"),
    name: clampText(input.name?.trim() || "New voice profile", 64),
    engine: input.engine === "browser" ? "browser" : "local-runtime",
    source:
      input.source === "browser" || input.source === "import"
        ? input.source
        : "clone",
    runtimeVoiceId: input.runtimeVoiceId?.trim() || undefined,
    effectPreset: normalizeEffectPreset(input.effectPreset),
    sampleText: clampText(input.sampleText?.trim() || DEFAULT_SAMPLE_TEXT, 220),
    createdAt,
    updatedAt,
  };
}

export function normalizeVoiceProjectInput(
  input: Partial<VoiceProject> & { title?: string | null },
): VoiceProject {
  const createdAt = Number.isFinite(input.createdAt)
    ? Number(input.createdAt)
    : Date.now();
  const updatedAt = Number.isFinite(input.updatedAt)
    ? Number(input.updatedAt)
    : Date.now();
  const rawSegments = Array.isArray(input.segments) ? input.segments : [];
  const segments = rawSegments
    .map((segment) => ({
      id: segment.id?.trim() || generateId("voice-segment"),
      text: clampText(segment.text?.trim() || "", 4000),
      voiceProfileId: segment.voiceProfileId?.trim() || undefined,
      effectPreset: segment.effectPreset
        ? normalizeEffectPreset(segment.effectPreset)
        : undefined,
      speakerLabel: segment.speakerLabel?.trim() || undefined,
    }))
    .filter((segment) => segment.text.length > 0);

  const fallbackSegment = {
    id: generateId("voice-segment"),
    text: "Draft a short local-first command briefing for the current operator session.",
  };

  return {
    id: input.id?.trim() || generateId("voice-project"),
    title: clampText(input.title?.trim() || "Voice briefing", 96),
    summary: clampText(input.summary?.trim() || "", 180),
    sourceKey: input.sourceKey?.trim() || undefined,
    sourceRoute: input.sourceRoute?.trim() || undefined,
    engine: input.engine === "browser" ? "browser" : "local-runtime",
    effectPreset: normalizeEffectPreset(input.effectPreset),
    segments: segments.length > 0 ? segments : [fallbackSegment],
    lastRenderedAt: Number.isFinite(input.lastRenderedAt)
      ? Number(input.lastRenderedAt)
      : undefined,
    renderStatus:
      input.renderStatus === "rendered" ||
      input.renderStatus === "runtime-unavailable" ||
      input.renderStatus === "error"
        ? input.renderStatus
        : "idle",
    createdAt,
    updatedAt,
  };
}

export function buildVoiceProjectFromText(input: {
  title: string;
  text: string;
  sourceKey?: string | null;
  sourceRoute?: string | null;
  voiceProfileId?: string | null;
  effectPreset?: VoiceEffectPreset | null;
  engine?: VoiceLabEngineId | null;
}) {
  const summary = clampText(input.text, 140);
  return normalizeVoiceProjectInput({
    title: input.title,
    summary,
    sourceKey: input.sourceKey ?? undefined,
    sourceRoute: input.sourceRoute ?? undefined,
    effectPreset: input.effectPreset ?? "briefing",
    engine: input.engine ?? "local-runtime",
    segments: [
      {
        id: generateId("voice-segment"),
        text: input.text.trim(),
        voiceProfileId: input.voiceProfileId ?? undefined,
        effectPreset: input.effectPreset ?? "briefing",
      },
    ],
  });
}

export function buildVoiceRenderFilename(title: string) {
  return `${
    clampText(title, 48)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "voice-briefing"
  }.wav`;
}
