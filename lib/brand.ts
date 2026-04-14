import {
  isCloudInferenceAllowedInMode,
  isCloudInferenceProvider,
  normalizeCloudNetworkMode,
} from "@/lib/aiCloudReadiness";
import { isConfiguredSecretValue } from "@/lib/secretReadiness";

export const BRAND_NAME = "Aegis Vector";
export const BRAND_SHORT_NAME = "Aegis";
export const BRAND_TAGLINE = "Local-first command intelligence";
export const BRAND_DESCRIPTOR =
  "A local-first command-and-intelligence workspace for markets, cyber, recon, and operator AI on web and desktop.";
export const BRAND_GITHUB_DESCRIPTION =
  "Aegis Vector is a local-first command-and-intelligence workspace for markets, cyber, recon, and operator AI on web and desktop. Free-first, self-hosted, and interactive by design.";

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

export const SURFACE_BRANDING: Record<string, SurfaceBranding> = {
  default: {
    visibleLabel: "Aegis",
    functionalLabel: "Home",
    heroTitle: "Aegis Vector",
    heroKicker: "Command intelligence shell",
    surfaceArtKey: "aegis",
    accentPalette: ["#4f67d8", "#c8a158"],
    ariaLabel: "Aegis Vector home surface",
    note: "A hard-sci-fi command shell tuned for fast comprehension, not ornamental clutter.",
  },
  hq: {
    visibleLabel: "CITADEL",
    functionalLabel: "HQ",
    heroTitle: "CITADEL",
    heroKicker: "Command sanctum",
    surfaceArtKey: "citadel",
    accentPalette: ["#3159da", "#c59a47"],
    ariaLabel: "Citadel, formerly HQ",
    note: "Operator presence, AI orchestration, and sanction telemetry anchored inside one fortified command room.",
  },
  command: {
    visibleLabel: "VECTOR",
    functionalLabel: "COMMAND",
    heroTitle: "VECTOR",
    heroKicker: "Campaign chamber",
    surfaceArtKey: "vector",
    accentPalette: ["#b68534", "#87343b"],
    ariaLabel: "Vector, formerly Command",
    note: "Mission lanes, tactical routes, and readiness signals read like a live war map instead of a dashboard.",
  },
  intel: {
    visibleLabel: "SPECTRA",
    functionalLabel: "INTEL",
    heroTitle: "SPECTRA",
    heroKicker: "Librarium sweep",
    surfaceArtKey: "spectra",
    accentPalette: ["#6a82d0", "#d2c39b"],
    ariaLabel: "Spectra, formerly Intel",
    note: "Narratives, world posture, and prediction layers unfold like sealed cartography inside the librarium.",
  },
  alpha: {
    visibleLabel: "QUANT",
    functionalLabel: "ALPHA",
    heroTitle: "QUANT",
    heroKicker: "Quant altar",
    surfaceArtKey: "quant",
    accentPalette: ["#9e7b32", "#d9c08e"],
    ariaLabel: "Quant, formerly Alpha",
    note: "Scanner flows, watchlists, and position sizing read like a logistics altar built for execution speed.",
  },
  cyber: {
    visibleLabel: "BASTION",
    functionalLabel: "CYBER",
    heroTitle: "BASTION",
    heroKicker: "Fortress bastion",
    surfaceArtKey: "bastion",
    accentPalette: ["#7c2e36", "#c7a46a"],
    ariaLabel: "Bastion, formerly Cyber",
    note: "Threat monitoring and exploit posture stay organized around containment, sanction, and warding instead of noise.",
  },
  recon: {
    visibleLabel: "PARALLAX",
    functionalLabel: "RECON",
    heroTitle: "PARALLAX",
    heroKicker: "Auspex sweep",
    surfaceArtKey: "parallax",
    accentPalette: ["#586db3", "#c7b285"],
    ariaLabel: "Parallax, formerly Recon",
    note: "Free-first reconnaissance stays quiet and disciplined, like a scout chapel built around auspex sweeps.",
  },
  vault: {
    visibleLabel: "ARCHIVE",
    functionalLabel: "VAULT",
    heroTitle: "ARCHIVE",
    heroKicker: "Reliquary archive",
    surfaceArtKey: "archive",
    accentPalette: ["#6b78aa", "#c5a56a"],
    ariaLabel: "Archive, formerly Vault",
    note: "Saved artifacts and dossiers feel sealed, ceremonial, and easy to recover under pressure.",
  },
  vehicle: {
    visibleLabel: "VEHICLE",
    functionalLabel: "VEHICLE",
    heroTitle: "VEHICLE",
    heroKicker: "Flight systems lab",
    surfaceArtKey: "vehicle",
    accentPalette: ["#5b74c5", "#c79b52"],
    ariaLabel: "Vehicle operations lab",
    note: "Internal mobility systems remain aligned with the same command shell language.",
  },
  resources: {
    visibleLabel: "FIELD MANUAL",
    functionalLabel: "RESOURCES",
    heroTitle: "FIELD MANUAL",
    heroKicker: "Codex armory",
    surfaceArtKey: "manual",
    accentPalette: ["#bb8e3d", "#d7ccb1"],
    ariaLabel: "Field Manual, formerly Resources",
    note: "External references stay inside the same codex-armory frame instead of dropping into a generic utility page.",
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
