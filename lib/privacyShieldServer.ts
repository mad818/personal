import type { NextResponse } from "next/server";

export type PrivacyShieldKind =
  | "credential"
  | "internal_host"
  | "protected_path"
  | "sensitive_evidence";

export interface PrivacyShieldServerStatus {
  active: boolean;
  protectedKinds: PrivacyShieldKind[];
  protectedCount: number;
  classCounts: Record<string, number>;
  summary: string;
  dispatchMode: "redacted" | "blocked";
  blockedReason?: string | null;
}

interface RedactionState {
  classCounts: Record<PrivacyShieldKind, number>;
  blockedReason: string | null;
}

const SENSITIVE_EVIDENCE_PATTERNS = [
  /\b(?:operator-only|operator only|for operator eyes only|internal incident evidence|sensitive incident evidence|chain[- ]of[- ]custody|do not send upstream|never send upstream)\b/gi,
];

const CREDENTIAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "Bearer [redacted-token]"],
  [
    /\b(api[_ -]?key|access[_ -]?key|secret|password|token|cookie|session|client secret|refresh token)\s*[:=]\s*([^\s,;]+)/gi,
    "$1=[redacted]",
  ],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted-access-key]"],
  [/\bghp_[A-Za-z0-9]{16,}\b/g, "[redacted-token]"],
  [/\bsk-[A-Za-z0-9]{16,}\b/gi, "[redacted-key]"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gi, "[redacted-token]"],
];

const INTERNAL_HOST_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/[^\s"'`<>]*)?/gi,
    "[local-service]",
  ],
  [
    /https?:\/\/[A-Za-z0-9.-]+\.(?:local|internal)(?::\d+)?(?:\/[^\s"'`<>]*)?/gi,
    "[internal-service]",
  ],
  [
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[A-Za-z0-9.-]+\.local|[A-Za-z0-9.-]+\.internal)\b/gi,
    "[internal-host]",
  ],
];

const PROTECTED_PATH_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:\.ssh|secrets?|credentials?|keys?|certs?|private)(?:[\\/][^\s"'`<>]*)?/gi,
    "[protected-path]",
  ],
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:\.git|\.next|node_modules)(?:[\\/][^\s"'`<>]*)?/gi,
    "[repo-path]",
  ],
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:app|components|lib|store|hooks|scripts|tests|docs)(?:[\\/][^\s"'`<>]*)/gi,
    "[repo-path]",
  ],
  [/\b\.env(?:\.[A-Za-z0-9_-]+)?\b/gi, "[protected-env]"],
];

function replaceAndCount(
  value: string,
  pattern: RegExp,
  replacement: string,
) {
  const count = value.match(pattern)?.length ?? 0;
  const next = value.replace(pattern, replacement);
  return { next, count };
}

function bumpCount(state: RedactionState, kind: PrivacyShieldKind, count: number) {
  if (count <= 0) return;
  state.classCounts[kind] += count;
}

function sanitizeString(value: string, state: RedactionState): string {
  let next = value;

  for (const pattern of SENSITIVE_EVIDENCE_PATTERNS) {
    const matches = next.match(pattern)?.length ?? 0;
    if (matches > 0) {
      bumpCount(state, "sensitive_evidence", matches);
      state.blockedReason =
        state.blockedReason ??
        "Sensitive incident or operator-only evidence markers were detected.";
    }
  }

  for (const [pattern, replacement] of CREDENTIAL_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "credential", result.count);
  }

  for (const [pattern, replacement] of INTERNAL_HOST_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "internal_host", result.count);
  }

  for (const [pattern, replacement] of PROTECTED_PATH_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "protected_path", result.count);
  }

  return next;
}

function sanitizeUnknown(value: unknown, state: RedactionState): unknown {
  if (typeof value === "string") {
    return sanitizeString(value, state);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeUnknown(entry, state));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeUnknown(entry, state),
      ]),
    );
  }
  return value;
}

function buildSummary(status: Omit<PrivacyShieldServerStatus, "summary">) {
  const classLabels = status.protectedKinds
    .map((kind) => `${kind.replace(/_/g, " ")} ${status.classCounts[kind] ?? 0}`)
    .join(" · ");
  if (status.dispatchMode === "blocked") {
    return `Privacy shield blocked cloud dispatch after detecting ${classLabels || "sensitive evidence"}.`;
  }
  return `Privacy shield redacted ${status.protectedCount} sensitive value${status.protectedCount === 1 ? "" : "s"} across ${classLabels || "protected classes"}.`;
}

function finalizeStatus(state: RedactionState): PrivacyShieldServerStatus | null {
  const protectedKinds = (Object.entries(state.classCounts) as Array<
    [PrivacyShieldKind, number]
  >)
    .filter(([, count]) => count > 0)
    .map(([kind]) => kind);
  const protectedCount = protectedKinds.reduce(
    (sum, kind) => sum + (state.classCounts[kind] ?? 0),
    0,
  );

  if (protectedCount === 0 && !state.blockedReason) return null;

  const status: Omit<PrivacyShieldServerStatus, "summary"> = {
    active: true,
    protectedKinds,
    protectedCount,
    classCounts: state.classCounts,
    dispatchMode: state.blockedReason ? "blocked" : "redacted",
    blockedReason: state.blockedReason,
  };
  return {
    ...status,
    summary: buildSummary(status),
  };
}

export function protectCloudBoundPayload(args: {
  providerName: string;
  messages: unknown[];
  system?: string;
}) {
  if (args.providerName === "ollama") {
    return {
      messages: args.messages,
      system: args.system,
      status: null,
    };
  }

  const state: RedactionState = {
    classCounts: {
      credential: 0,
      internal_host: 0,
      protected_path: 0,
      sensitive_evidence: 0,
    },
    blockedReason: null,
  };

  const messages = sanitizeUnknown(args.messages, state) as unknown[];
  const system =
    typeof args.system === "string"
      ? (sanitizeUnknown(args.system, state) as string)
      : args.system;

  return {
    messages,
    system,
    status: finalizeStatus(state),
  };
}

export function applyPrivacyShieldHeaders(
  response: NextResponse,
  status: PrivacyShieldServerStatus | null,
) {
  if (!status?.active) return response;
  response.headers.set("X-Anonymization-Active", "true");
  response.headers.set("X-Anonymization-Protected", String(status.protectedCount));
  response.headers.set(
    "X-Anonymization-Kinds",
    status.protectedKinds.join(","),
  );
  response.headers.set(
    "X-Anonymization-Classes",
    Object.entries(status.classCounts)
      .filter(([, count]) => count > 0)
      .map(([kind, count]) => `${kind}:${count}`)
      .join(","),
  );
  response.headers.set("X-Anonymization-Mode", status.dispatchMode);
  response.headers.set("X-Anonymization-Summary", status.summary);
  if (status.blockedReason) {
    response.headers.set("X-Anonymization-Blocked", "true");
    response.headers.set("X-Anonymization-Blocked-Reason", status.blockedReason);
  }
  return response;
}
