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

export const MISSION_REVIEW_EXPIRY_OPTIONS = [
  { label: "6h review window", value: 6 },
  { label: "12h review window", value: 12 },
  { label: "24h review window", value: 24 },
  { label: "48h review window", value: 48 },
  { label: "72h review window", value: 72 },
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
  scope: string;
  reentrySummary: string;
  expiryHours: number;
  prompt: string;
}> = [
  {
    id: "brief",
    label: "Morning brief",
    outputTarget: "vault",
    approvalPolicy: "human_gate",
    scope: "Morning command synthesis for the next operator cycle",
    reentrySummary:
      "Review the filed brief, pull the strongest next move into HQ or COMMAND, and clear the run before the next cycle overlaps it.",
    expiryHours: 12,
    prompt:
      "Assemble a morning brief across markets, cyber, and geopolitics. Return five actionable bullets plus a one-sentence command takeaway.",
  },
  {
    id: "dossier",
    label: "Recon dossier",
    outputTarget: "review",
    approvalPolicy: "human_gate",
    scope: "Passive-first recon dossier for a named target or public repo",
    reentrySummary:
      "Approve, reject, or narrow the dossier before handing it into RECON, CYBER, or VAULT for durable follow-through.",
    expiryHours: 24,
    prompt:
      "Build a recon dossier with passive DNS, headers, metadata, and OPSEC notes. Structure the output as a dossier-ready pack.",
  },
  {
    id: "incident",
    label: "Incident memo",
    outputTarget: "notify",
    approvalPolicy: "approve_on_write",
    scope: "Fast incident summary for operator awareness only",
    reentrySummary:
      "Use the memo to decide whether a human-gated follow-up mission is needed before any durable writeback.",
    expiryHours: 6,
    prompt:
      "Summarize the latest cyber risk posture, likely exposure, and recommended triage actions as an operator incident memo.",
  },
  {
    id: "second-brain-heartbeat",
    label: "Second brain heartbeat",
    outputTarget: "vault",
    approvalPolicy: "human_gate",
    scope: "Archive stewardship review for the newest durable memory",
    reentrySummary:
      "Review the archive heartbeat, file the strongest repair into VAULT, and clear the queue before the next heartbeat compounds it.",
    expiryHours: 24,
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
