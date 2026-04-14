import type { NetworkMode } from "@/lib/security/routePolicy";

const DEFAULT_CLOUD_PROVIDER_LABEL = "Cloud AI";

export function normalizeCloudNetworkMode(value: unknown): NetworkMode {
  if (value === "internal" || value === "connected") return value;
  return "isolated";
}

export function isCloudInferenceProvider(
  provider: string | null | undefined,
): boolean {
  return Boolean(provider && provider !== "ollama");
}

export function isCloudInferenceAllowedInMode(mode: NetworkMode): boolean {
  return mode !== "isolated";
}

export function getCloudInferenceBlockedMessage(options?: {
  mode?: NetworkMode;
  providerLabel?: string;
}) {
  const mode = options?.mode ?? "isolated";
  const providerLabel = options?.providerLabel ?? DEFAULT_CLOUD_PROVIDER_LABEL;

  if (mode === "isolated") {
    return `${providerLabel} is configured, but isolated network mode blocks cloud chat. Open Settings, switch Network Mode to internal or connected, save, and try again. High-risk API routes are only for action routes and are not required for normal cloud chat.`;
  }

  return `${providerLabel} is configured, but cloud inference is blocked by the current network posture. Open Settings, review Network Mode, save, and try again.`;
}

export function getCloudInferenceStatusLabel(options: {
  configured: boolean;
  enabledByPolicy: boolean;
  hiddenByPolicy?: boolean;
}) {
  if (options.hiddenByPolicy) return "hidden";
  if (!options.enabledByPolicy && options.configured) return "blocked by mode";
  if (options.configured) return "ready";
  return "needs key";
}

