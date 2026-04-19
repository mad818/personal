import type { ScheduledJob } from "@/store/useStore";

export type NativeBatchPostureState = {
  loading: boolean;
  nativeReady: boolean;
  mode: "provider_native" | "internal_fallback";
  featureEnabled: boolean;
  paidApisAllowed: boolean;
  apiKeyConfigured: boolean;
  reason: string;
};

export const PRESET_CRONS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 09:00", value: "0 9 * * *" },
  { label: "Every day at 18:00", value: "0 18 * * *" },
  { label: "Mon-Fri 08:30", value: "30 8 * * 1-5" },
];

export const SCHEDULER_AUDIT_FILTER_STORAGE_KEY =
  "nexus:scheduler-audit-filters:v1";
export const SCHEDULER_AUDIT_VIEWS_STORAGE_KEY =
  "nexus:scheduler-audit-views:v1";

export const MISSION_TEMPLATES: Array<{
  id: string;
  label: string;
  outputTarget: NonNullable<ScheduledJob["outputTarget"]>;
  approvalPolicy: NonNullable<ScheduledJob["approvalPolicy"]>;
  prompt: string;
}> = [
  {
    id: "brief",
    label: "Morning brief",
    outputTarget: "vault",
    approvalPolicy: "human_gate",
    prompt:
      "Assemble a morning brief across markets, cyber, and geopolitics. Return five actionable bullets plus a one-sentence command takeaway.",
  },
  {
    id: "dossier",
    label: "Recon dossier",
    outputTarget: "review",
    approvalPolicy: "human_gate",
    prompt:
      "Build a recon dossier with passive DNS, headers, metadata, and OPSEC notes. Structure the output as a dossier-ready pack.",
  },
  {
    id: "incident",
    label: "Incident memo",
    outputTarget: "notify",
    approvalPolicy: "approve_on_write",
    prompt:
      "Summarize the latest cyber risk posture, likely exposure, and recommended triage actions as an operator incident memo.",
  },
  {
    id: "second-brain-heartbeat",
    label: "Second brain heartbeat",
    outputTarget: "vault",
    approvalPolicy: "human_gate",
    prompt:
      "Review the newest compiled pages, saved clips, route-less artifacts, untagged pages, and linked-context drift. Return a second-brain heartbeat with the strongest new insight, weak archive seams, and the next exact repair actions to file into VAULT.",
  },
];

export function fmtChars(value: number): string {
  return `${value.toLocaleString()} ch`;
}

export function fmtAgeSince(timestamp?: number): string {
  if (!timestamp) return "unknown";
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function fmtExecutionOrigin(
  origin?: ScheduledJob["lastArtifactOrigin"],
): string {
  if (origin === "provider_native_batch") return "provider-native batch";
  if (origin === "internal_batch") return "internal batch";
  if (origin === "single_run") return "single run";
  return "unknown";
}

export function fmtBatchMode(
  mode?: NonNullable<ScheduledJob["recentExecutions"]>[number]["batchMode"],
) {
  if (mode === "provider_native") return "provider-native batch";
  if (mode === "internal") return "internal batch";
  return "single run";
}

export function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^(\*|\d+|\*\/\d+|\d+-\d+|\d+(,\d+)*)$/.test(p));
}
