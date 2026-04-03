import { normalizeTokenCandidate } from "@/lib/authToken";

export const NEXUS_SESSION_COOKIE = "nexus_session_token";

export function getConfiguredNexusToken() {
  return normalizeTokenCandidate(process.env.NEXUS_TOKEN ?? "");
}

export function isNexusAuthEnabled() {
  return Boolean(getConfiguredNexusToken());
}

export function matchesConfiguredNexusToken(rawCandidate?: string | null) {
  const configured = getConfiguredNexusToken();
  const candidate = normalizeTokenCandidate(rawCandidate ?? "");
  return Boolean(configured && candidate && configured === candidate);
}

export function sanitizeAuthReturnPath(rawPath?: string | null) {
  const fallback = "/hq";
  if (!rawPath) return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\r") || trimmed.includes("\n")) return fallback;
  if (trimmed.startsWith("/auth/connect")) return fallback;
  return trimmed;
}
