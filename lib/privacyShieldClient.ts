import type { PrivacyShieldStatus } from "@/store/useStore";

function parseKinds(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseClassCounts(value: string | null) {
  return parseKinds(value).reduce<Record<string, number>>((acc, entry) => {
    const [kind, rawCount] = entry.split(":");
    const count = Number.parseInt(rawCount ?? "0", 10);
    if (!kind) return acc;
    acc[kind] = Number.isFinite(count) ? count : 0;
    return acc;
  }, {});
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
  const classCounts = parseClassCounts(
    response.headers.get("X-Anonymization-Classes"),
  );
  const provider = response.headers.get("X-Provider")?.trim() || undefined;
  const dispatchMode =
    response.headers.get("X-Anonymization-Mode")?.trim() === "blocked"
      ? "blocked"
      : "redacted";
  const blockedReason =
    response.headers.get("X-Anonymization-Blocked-Reason")?.trim() || null;
  const summary =
    response.headers.get("X-Anonymization-Summary")?.trim() ||
    `Privacy shield masked ${Number.isFinite(protectedCount) ? protectedCount : 0} sensitive value${protectedCount === 1 ? "" : "s"}.`;

  return {
    active: true,
    provider,
    protectedKinds,
    protectedCount: Number.isFinite(protectedCount) ? protectedCount : protectedKinds.length,
    summary,
    classCounts,
    dispatchMode,
    blockedReason,
    updatedAt: Date.now(),
  };
}
