import type { PrivacyShieldStatus } from "@/store/useStore";

function parseKinds(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function readPrivacyShieldStatusFromHeaders(
  response: Response,
): PrivacyShieldStatus | null {
  const active = response.headers.get("X-Anonymization-Active") === "true";
  if (!active) return null;

  const protectedCount = Number.parseInt(
    response.headers.get("X-Anonymization-Protected") ?? "0",
    10,
  );
  const protectedKinds = parseKinds(response.headers.get("X-Anonymization-Kinds"));
  const provider = response.headers.get("X-Provider")?.trim() || undefined;
  const summary =
    response.headers.get("X-Anonymization-Summary")?.trim() ||
    `Privacy shield masked ${Number.isFinite(protectedCount) ? protectedCount : 0} sensitive value${protectedCount === 1 ? "" : "s"}.`;

  return {
    active: true,
    provider,
    protectedKinds,
    protectedCount: Number.isFinite(protectedCount) ? protectedCount : protectedKinds.length,
    summary,
    updatedAt: Date.now(),
  };
}

