export type FreeLocalReadinessStatus =
  | "ready"
  | "warning"
  | "blocked"
  | "checking";

export interface FreeLocalReadinessAction {
  label: string;
  detail: string;
  href?: string;
  command?: string;
}

export interface FreeLocalReadinessSection {
  status: FreeLocalReadinessStatus;
  label: string;
  value: string;
  detail: string;
}

export interface PhoneLanReadinessSnapshot {
  enabled: boolean;
  bindHost: string;
  port: string;
  desktopUrl: string;
  desktopHqUrl: string;
  lanUrls: string[];
  hqLanUrls: string[];
  preferredLanUrl: string | null;
  preferredHqLanUrl: string | null;
  tokenRequired: boolean;
  phoneTokenConfigured: boolean;
  pwaReady: boolean;
  firewallStatus: string;
  tailscaleOptional: string;
}

export interface FreeLocalReadinessSnapshot {
  ok: boolean;
  generatedAt: string;
  overallStatus: FreeLocalReadinessStatus;
  headline: string;
  summary: string;
  freeInvariant: FreeLocalReadinessSection & {
    chargesEndUsers: false;
    label: string;
  };
  networkMode: FreeLocalReadinessSection & {
    mode: string;
  };
  paidApisAllowed: FreeLocalReadinessSection & {
    allowed: boolean;
  };
  runtime: FreeLocalReadinessSection & {
    bootId: string;
    startedAt: string;
    ageSeconds: number | null;
  };
  ollama: FreeLocalReadinessSection & {
    reachable: boolean;
    tagsUrl?: string;
    psUrl?: string;
    installedCount: number;
    runningCount: number;
  };
  resolvedModel: FreeLocalReadinessSection & {
    requestedModel: string;
    resolvedModel: string | null;
    resolutionReason: string;
  };
  agentHealth: FreeLocalReadinessSection & {
    passRate: number | null;
    passCount: number;
    failCount: number;
    lastRun: string | null;
  };
  storage: FreeLocalReadinessSection & {
    browserLocalStorage: "client_checked" | "unknown";
  };
  session: FreeLocalReadinessSection & {
    authenticated: boolean;
    tokenConfigured: boolean;
    remainingSeconds: number | null;
  };
  toolPosture: FreeLocalReadinessSection & {
    highRiskEnabled: boolean;
    settingsWrites: string;
    verification: string;
    mutateExecTools: string;
    networkedTools: string;
  };
  phoneLan: PhoneLanReadinessSnapshot & FreeLocalReadinessSection;
  recoveryActions: FreeLocalReadinessAction[];
}

export function formatFreeLocalStatusLabel(status: FreeLocalReadinessStatus) {
  switch (status) {
    case "ready":
      return "ready";
    case "warning":
      return "review";
    case "blocked":
      return "blocked";
    case "checking":
    default:
      return "checking";
  }
}
