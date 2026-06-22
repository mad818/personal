import type { PrivacyShieldStatus } from "@/store/useStore";

export interface PrivacyShieldReceipt {
  issuedAt: number;
  policy: string;
  dispatchMode: "redacted" | "blocked" | "idle";
  protectedCount: number;
  protectedKinds: string[];
  protectedFields: string[];
  classCounts: Record<string, number>;
  summary: string;
  blockedReason: string | null;
}

export function buildPrivacyShieldReceipt(
  status: PrivacyShieldStatus | null,
): PrivacyShieldReceipt | null {
  if (!status?.active) return null;
  return {
    issuedAt: status.updatedAt ?? Date.now(),
    policy: status.policy ?? "local_redaction_v2",
    dispatchMode: status.dispatchMode ?? "redacted",
    protectedCount: status.protectedCount ?? 0,
    protectedKinds: status.protectedKinds ?? [],
    protectedFields: status.protectedFields ?? [],
    classCounts: status.classCounts ?? {},
    summary: status.summary ?? "Privacy shield active.",
    blockedReason: status.blockedReason ?? null,
  };
}

export function formatPrivacyShieldReceiptSummary(
  receipt: PrivacyShieldReceipt,
): string {
  const kinds = receipt.protectedKinds.slice(0, 4).join(", ");
  const mode =
    receipt.dispatchMode === "blocked"
      ? "blocked dispatch"
      : `${receipt.protectedCount} redacted field${receipt.protectedCount === 1 ? "" : "s"}`;
  return `${receipt.policy} · ${mode}${kinds ? ` · ${kinds}` : ""}`;
}
