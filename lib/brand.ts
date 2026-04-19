export const BRAND_NAME = "Nexus Prime";
export const BRAND_SHORT_NAME = "Nexus";
export const BRAND_TAGLINE = "Local-first command intelligence";
export const BRAND_DESCRIPTOR =
  "A local-first command room for markets, cyber, recon, and operator AI on web and desktop.";
export const BRAND_GITHUB_DESCRIPTION =
  "Nexus Prime is a local-first command room for markets, cyber, recon, and operator AI on web and desktop. Free-first, self-hosted, and interactive by design.";

export type BillingTier =
  | "free_local"
  | "free_public"
  | "free_tier_optional"
  | "paid_optional_hidden";

export interface SurfaceBranding {
  visibleLabel: string;
  functionalLabel: string;
  heroTitle: string;
  heroKicker: string;
  surfaceArtKey: string;
  accentPalette: [string, string];
  ariaLabel: string;
  note: string;
}

export interface ProviderBranding {
  id: string;
  label: string;
  envKey: string | null;
  billingTier: BillingTier;
  surface: "primary" | "advanced";
  recommended: boolean;
  description: string;
}

export interface ProviderReadinessItem extends ProviderBranding {
  configured: boolean;
  enabledByPolicy: boolean;
  tierLabel: string;
  status: "ready" | "available_if_configured" | "hidden_by_default";
}

export const BILLING_TIER_LABELS: Record<BillingTier, string> = {
  free_local: "Free local",
  free_public: "Free public",
  free_tier_optional: "Free tier optional",
  paid_optional_hidden: "Advanced BYOK",
};

type CloudNetworkMode = "isolated" | "internal" | "open";

function normalizeCloudNetworkMode(mode?: string | null): CloudNetworkMode {
  if (mode === "internal" || mode === "open") return mode;
  return "isolated";
}

function isCloudInferenceAllowedInMode(mode: CloudNetworkMode) {
  return mode !== "isolated";
}

function isCloudInferenceProvider(providerId: string) {
  return providerId !== "ollama";
}

function isConfiguredSecretValue(value?: string | null) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return !/^(your-|replace-|changeme|example|placeholder)/i.test(normalized);
}

export const SURFACE_BRANDING: Record<string, SurfaceBranding> = {
  default: {
    visibleLabel: "Nexus",
    functionalLabel: "Home",
    heroTitle: "Nexus Prime",
    heroKicker: "Command room shell",
    surfaceArtKey: "nexus",
    accentPalette: ["#38d7ff", "#dcefff"],
    ariaLabel: "Nexus Prime home surface",
    note: "A local-first command shell designed as one operating picture instead of a decorative dashboard.",
  },
  hq: {
    visibleLabel: "HQ",
    functionalLabel: "Mission control",
    heroTitle: "HQ",
    heroKicker: "Command center",
    surfaceArtKey: "citadel",
    accentPalette: ["#3fd8ff", "#e4f2ff"],
    ariaLabel: "HQ mission control surface",
    note: "Operator presence, live continuity, and tactical control should read like one active operating picture.",
  },
  command: {
    visibleLabel: "COMMAND",
    functionalLabel: "Operations grid",
    heroTitle: "COMMAND",
    heroKicker: "Live operations board",
    surfaceArtKey: "vector",
    accentPalette: ["#36c8ff", "#cde8ff"],
    ariaLabel: "Command operations surface",
    note: "Mission lanes, readiness, and system status should read like a live tasking board.",
  },
  intel: {
    visibleLabel: "INTEL",
    functionalLabel: "World picture",
    heroTitle: "INTEL",
    heroKicker: "Signal field",
    surfaceArtKey: "spectra",
    accentPalette: ["#62cfff", "#d7ebff"],
    ariaLabel: "Intel world picture surface",
    note: "Narratives, world posture, and prediction layers should feel like an active briefing board, not a themed archive.",
  },
  alpha: {
    visibleLabel: "ALPHA",
    functionalLabel: "Market desk",
    heroTitle: "ALPHA",
    heroKicker: "Market picture",
    surfaceArtKey: "quant",
    accentPalette: ["#64d8ff", "#dff4ff"],
    ariaLabel: "Alpha market desk surface",
    note: "Scanner flows, watchlists, and position sizing should feel like a disciplined trading desk inside the same war room.",
  },
  cyber: {
    visibleLabel: "CYBER",
    functionalLabel: "Threat desk",
    heroTitle: "CYBER",
    heroKicker: "Containment board",
    surfaceArtKey: "bastion",
    accentPalette: ["#7be5ff", "#d6f3ff"],
    ariaLabel: "Cyber threat desk surface",
    note: "Threat monitoring, exploit posture, and repair lanes should read like one containment board under pressure.",
  },
  recon: {
    visibleLabel: "RECON",
    functionalLabel: "Collection desk",
    heroTitle: "RECON",
    heroKicker: "Acquisition sweep",
    surfaceArtKey: "parallax",
    accentPalette: ["#8fdfff", "#dcefff"],
    ariaLabel: "Recon collection surface",
    note: "Collection, OPSEC, and repo intel should stay quiet, fast, and exact inside the same operating room.",
  },
  vault: {
    visibleLabel: "VAULT",
    functionalLabel: "Archive spine",
    heroTitle: "VAULT",
    heroKicker: "Dossier archive",
    surfaceArtKey: "archive",
    accentPalette: ["#b9d8ff", "#eff7ff"],
    ariaLabel: "Vault archive surface",
    note: "Saved artifacts and dossiers should feel indexed, linked, and easy to recover under pressure.",
  },
  vehicle: {
    visibleLabel: "VEHICLE",
    functionalLabel: "Systems lab",
    heroTitle: "VEHICLE",
    heroKicker: "Vehicle operations lab",
    surfaceArtKey: "vehicle",
    accentPalette: ["#4fd5ff", "#d8eeff"],
    ariaLabel: "Vehicle operations lab",
    note: "Internal mobility systems should inherit the same tactical shell language as the rest of the room.",
  },
  resources: {
    visibleLabel: "RESOURCES",
    functionalLabel: "Reference desk",
    heroTitle: "RESOURCES",
    heroKicker: "Manuals and playbooks",
    surfaceArtKey: "manual",
    accentPalette: ["#8ddcff", "#deefff"],
    ariaLabel: "Resources reference desk",
    note: "References and internal manuals should feel like part of the same operating system, not a separate utility page.",
  },
  security: {
    visibleLabel: "SECURITY",
    functionalLabel: "Control surface",
    heroTitle: "SECURITY",
    heroKicker: "Protected controls",
    surfaceArtKey: "security",
    accentPalette: ["#7acfff", "#ddefff"],
    ariaLabel: "Security control surface",
    note: "Protected actions, route posture, and hardening state should read like one control surface.",
  },
  skills: {
    visibleLabel: "SKILLS",
    functionalLabel: "Workflow forge",
    heroTitle: "SKILLS",
    heroKicker: "Capability forge",
    surfaceArtKey: "skills",
    accentPalette: ["#8ddcff", "#e6f4ff"],
    ariaLabel: "Skills workflow forge surface",
    note: "Reusable workflow capability should feel like a forge rail, not a catalog wall.",
  },
};

export const AI_PROVIDER_BRANDING: ProviderBranding[] = [
  {
    id: "ollama",
    label: "Ollama",
    envKey: null,
    billingTier: "free_local",
    surface: "primary",
    recommended: true,
    description: "Primary local lane for free-first operation and offline control.",
  },
  {
    id: "groq",
    label: "Groq",
    envKey: "GROQ_API_KEY",
    billingTier: "free_tier_optional",
    surface: "primary",
    recommended: true,
    description: "Fast inference lane with a usable free tier for normal operator workflows.",
  },
  {
    id: "google",
    label: "Google AI",
    envKey: "GOOGLE_AI_KEY",
    billingTier: "free_tier_optional",
    surface: "primary",
    recommended: false,
    description: "Optional Gemini lane for teams that want another free-tier cloud option.",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    billingTier: "paid_optional_hidden",
    surface: "advanced",
    recommended: false,
    description: "Advanced BYOK lane kept out of the primary free-first story.",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    billingTier: "paid_optional_hidden",
    surface: "advanced",
    recommended: false,
    description: "Advanced BYOK lane for teams that explicitly opt into paid providers.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    billingTier: "paid_optional_hidden",
    surface: "advanced",
    recommended: false,
    description: "Advanced routing gateway; intentionally not part of the default product posture.",
  },
  {
    id: "minimax",
    label: "MiniMax",
    envKey: "MINIMAX_API_KEY",
    billingTier: "paid_optional_hidden",
    surface: "advanced",
    recommended: false,
    description: "Advanced compatible lane retained for explicit BYOK opt-in only.",
  },
];

export function getSurfaceBranding(surfaceId?: string | null): SurfaceBranding {
  if (!surfaceId) return SURFACE_BRANDING.default;
  return SURFACE_BRANDING[surfaceId] ?? SURFACE_BRANDING.default;
}

export function getBrandServiceName() {
  return BRAND_NAME.toLowerCase().replace(/\s+/g, "-");
}

export function summarizeProviderReadiness(
  env: Record<string, string | undefined> = process.env,
) {
  const paidApisEnabled = env.NEXUS_ALLOW_PAID_APIS === "true";
  const networkMode = normalizeCloudNetworkMode(
    env.NEXUS_NETWORK_MODE ??
      (process.env.NODE_ENV === "development" ? "internal" : "isolated"),
  );
  const cloudInferenceEnabled = isCloudInferenceAllowedInMode(networkMode);
  const items: ProviderReadinessItem[] = AI_PROVIDER_BRANDING.map((provider) => {
    const configured = provider.envKey
      ? isConfiguredSecretValue(env[provider.envKey])
      : true;
    const enabledByPolicy = isCloudInferenceProvider(provider.id)
      ? provider.billingTier === "paid_optional_hidden"
        ? paidApisEnabled && cloudInferenceEnabled
        : cloudInferenceEnabled
      : provider.billingTier !== "paid_optional_hidden" || paidApisEnabled;
    const status: ProviderReadinessItem["status"] = !enabledByPolicy
      ? "hidden_by_default"
      : configured
        ? "ready"
        : "available_if_configured";

    return {
      ...provider,
      configured,
      enabledByPolicy,
      tierLabel: BILLING_TIER_LABELS[provider.billingTier],
      status,
    };
  });

  return {
    paidApisEnabled,
    counts: {
      total: items.length,
      configured: items.filter((item) => item.configured).length,
      ready: items.filter((item) => item.status === "ready").length,
      availableIfConfigured: items.filter(
        (item) => item.status === "available_if_configured",
      ).length,
      hiddenByDefault: items.filter(
        (item) => item.status === "hidden_by_default",
      ).length,
      primary: items.filter((item) => item.surface === "primary").length,
      advanced: items.filter((item) => item.surface === "advanced").length,
      freeLocal: items.filter((item) => item.billingTier === "free_local").length,
      freePublic: items.filter((item) => item.billingTier === "free_public").length,
      freeTierOptional: items.filter(
        (item) => item.billingTier === "free_tier_optional",
      ).length,
      paidOptionalHidden: items.filter(
        (item) => item.billingTier === "paid_optional_hidden",
      ).length,
    },
    items,
  };
}
