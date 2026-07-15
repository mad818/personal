export const PRIMARY_AI_PROVIDER_OPTIONS = [
  "ollama",
  "groq",
  "google",
] as const;
export const ADVANCED_AI_PROVIDER_OPTIONS = [
  "anthropic",
  "openai",
  "minimax",
] as const;

export const ALL_AI_PROVIDER_OPTIONS = [
  ...PRIMARY_AI_PROVIDER_OPTIONS,
  ...ADVANCED_AI_PROVIDER_OPTIONS,
] as const;

export type PreferredAIProvider = (typeof ALL_AI_PROVIDER_OPTIONS)[number];

export function isPreferredAIProvider(
  value: unknown,
): value is PreferredAIProvider {
  return (
    typeof value === "string" &&
    (ALL_AI_PROVIDER_OPTIONS as readonly string[]).includes(
      value.trim().toLowerCase(),
    )
  );
}

export function isAdvancedPreferredAIProvider(
  provider: PreferredAIProvider,
): boolean {
  return (ADVANCED_AI_PROVIDER_OPTIONS as readonly string[]).includes(provider);
}

export function normalizePreferredAIProvider(
  value: unknown,
  opts?: { allowAdvanced?: boolean },
): PreferredAIProvider {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  const candidate =
    normalized === "local"
      ? "ollama"
      : isPreferredAIProvider(normalized)
        ? normalized
        : null;
  if (!candidate) return "ollama";
  if (!opts?.allowAdvanced && isAdvancedPreferredAIProvider(candidate)) {
    return "ollama";
  }
  return candidate;
}

export function resolveApiAIProvider(
  provider: PreferredAIProvider,
): Exclude<PreferredAIProvider, "ollama"> | null {
  return provider === "ollama" ? null : provider;
}

export function getVisibleAIProviderOptions(allowAdvanced: boolean) {
  return allowAdvanced
    ? [...PRIMARY_AI_PROVIDER_OPTIONS, ...ADVANCED_AI_PROVIDER_OPTIONS]
    : [...PRIMARY_AI_PROVIDER_OPTIONS];
}
