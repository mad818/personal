import type {
  FreeLocalReadinessSnapshot,
  FreeLocalReadinessStatus,
} from "@/lib/freeLocalReadiness";

export type OperationalLightState =
  | "on"
  | "dim"
  | "off"
  | "blocked"
  | "checking";

export type OperationalLightGroupId =
  | "core"
  | "ai"
  | "security"
  | "network"
  | "release"
  | "agents";

export interface OperationalLight {
  id: string;
  group: OperationalLightGroupId;
  label: string;
  shortLabel: string;
  state: OperationalLightState;
  detail: string;
  proof: string;
}

export interface OperationalLightGroup {
  id: OperationalLightGroupId;
  label: string;
  lights: OperationalLight[];
}

export interface OperationalLightGridModel {
  generatedAt: string;
  headline: string;
  summary: string;
  overallState: OperationalLightState;
  counts: Record<OperationalLightState, number>;
  groups: OperationalLightGroup[];
}

export interface OperationalStatusPayload {
  status?: string;
  generatedAt?: string;
  summary?: {
    networkMode?: string;
    allowPaidApis?: boolean;
    highRiskRoutesEnabled?: boolean;
    tokenConfigured?: boolean;
    release?: {
      buildChannel?: string;
      deploymentProfile?: string;
    };
  };
  readiness?: {
    aiProviders?: {
      paidApisEnabled?: boolean;
      counts?: {
        ready?: number;
        hiddenByDefault?: number;
        total?: number;
        freeLocal?: number;
      };
    };
    auth?: {
      nexusTokenConfigured?: boolean;
    };
    policies?: {
      networkMode?: string;
      allowPaidApis?: boolean;
      highRiskRoutesEnabled?: boolean;
      highRiskWritesRequireApproval?: boolean;
    };
    evalPolicy?: {
      latest?: {
        ok?: boolean | null;
      } | null;
      rollup?: {
        grade?: string;
        stale?: boolean;
        degradedReasons?: string[];
      };
    };
    toolIsolation?: {
      status?: string;
      adapterReady?: boolean;
      reason?: string | null;
    };
    externalTools?: {
      status?: string;
      counts?: {
        ready?: number;
        blocked?: number;
        adapterOffline?: number;
        oauthRequired?: number;
        contractOnly?: number;
      };
    };
  };
}

export interface BuildOperationalLightGridInput {
  freeLocal?: FreeLocalReadinessSnapshot | null;
  status?: OperationalStatusPayload | null;
  runtimeOk?: boolean | null;
  protectedStatusOk?: boolean | null;
  protectedStatusHttp?: number | null;
  generatedAt?: string;
}

export const OPERATIONAL_LIGHT_STATE_HEX: Record<OperationalLightState, string> = {
  on: "#39f6c3",
  dim: "#fbbf24",
  off: "#64748b",
  blocked: "#fb7185",
  checking: "#60a5fa",
};

const GROUP_LABELS: Record<OperationalLightGroupId, string> = {
  core: "Core",
  ai: "AI",
  security: "Security",
  network: "Network",
  release: "Release",
  agents: "Agents",
};

const STATE_PRIORITY: Record<OperationalLightState, number> = {
  on: 0,
  dim: 1,
  checking: 2,
  off: 3,
  blocked: 4,
};

function light(
  group: OperationalLightGroupId,
  id: string,
  shortLabel: string,
  label: string,
  state: OperationalLightState,
  detail: string,
  proof: string,
): OperationalLight {
  return { id, group, shortLabel, label, state, detail, proof };
}

function stateFromFreeLocalStatus(
  status: FreeLocalReadinessStatus | undefined,
): OperationalLightState {
  if (status === "ready") return "on";
  if (status === "warning") return "dim";
  if (status === "blocked") return "blocked";
  return "checking";
}

function stateFromOptionalBoolean(
  value: boolean | null | undefined,
  offState: OperationalLightState = "off",
): OperationalLightState {
  if (value === true) return "on";
  if (value === false) return offState;
  return "checking";
}

function stateFromNetworkMode(mode: string | undefined): OperationalLightState {
  if (!mode) return "checking";
  if (mode === "isolated") return "on";
  if (mode === "internal") return "dim";
  return "blocked";
}

function worstState(lights: OperationalLight[]): OperationalLightState {
  return lights.reduce<OperationalLightState>((worst, item) => {
    return STATE_PRIORITY[item.state] > STATE_PRIORITY[worst]
      ? item.state
      : worst;
  }, "on");
}

function countStates(lights: OperationalLight[]) {
  return lights.reduce<Record<OperationalLightState, number>>(
    (acc, item) => {
      acc[item.state] += 1;
      return acc;
    },
    {
      on: 0,
      dim: 0,
      off: 0,
      blocked: 0,
      checking: 0,
    },
  );
}

function statusNetworkMode(input: BuildOperationalLightGridInput) {
  return (
    input.freeLocal?.networkMode.mode ??
    input.status?.readiness?.policies?.networkMode ??
    input.status?.summary?.networkMode
  );
}

function paidApisAllowed(input: BuildOperationalLightGridInput) {
  return (
    input.freeLocal?.paidApisAllowed.allowed ??
    input.status?.readiness?.policies?.allowPaidApis ??
    input.status?.summary?.allowPaidApis ??
    input.status?.readiness?.aiProviders?.paidApisEnabled
  );
}

function highRiskRoutesEnabled(input: BuildOperationalLightGridInput) {
  return (
    input.freeLocal?.toolPosture.highRiskEnabled ??
    input.status?.readiness?.policies?.highRiskRoutesEnabled ??
    input.status?.summary?.highRiskRoutesEnabled
  );
}

function protectedSessionState(input: BuildOperationalLightGridInput) {
  if (input.freeLocal?.session) {
    return stateFromFreeLocalStatus(input.freeLocal.session.status);
  }
  if (input.protectedStatusOk === true) return "on";
  if (
    input.protectedStatusHttp === 401 ||
    input.protectedStatusHttp === 403
  ) {
    return "blocked";
  }
  return stateFromOptionalBoolean(input.status?.summary?.tokenConfigured, "dim");
}

function buildGroups(lights: OperationalLight[]): OperationalLightGroup[] {
  return (Object.keys(GROUP_LABELS) as OperationalLightGroupId[])
    .map((id) => ({
      id,
      label: GROUP_LABELS[id],
      lights: lights.filter((item) => item.group === id),
    }))
    .filter((group) => group.lights.length > 0);
}

export function buildOperationalLightGrid(
  input: BuildOperationalLightGridInput = {},
): OperationalLightGridModel {
  const networkMode = statusNetworkMode(input);
  const paidAllowed = paidApisAllowed(input);
  const highRiskEnabled = highRiskRoutesEnabled(input);
  const evalLatestOk = input.status?.readiness?.evalPolicy?.latest?.ok;
  const evalStale = input.status?.readiness?.evalPolicy?.rollup?.stale;
  const toolIsolation = input.status?.readiness?.toolIsolation;
  const externalTools = input.status?.readiness?.externalTools;
  const providerCounts = input.status?.readiness?.aiProviders?.counts;
  const freeLocal = input.freeLocal;

  const runtimeState = freeLocal?.runtime
    ? stateFromFreeLocalStatus(freeLocal.runtime.status)
    : stateFromOptionalBoolean(input.runtimeOk, "off");

  const sessionState = protectedSessionState(input);
  const phoneLanState = freeLocal
    ? freeLocal.phoneLan.enabled && freeLocal.phoneLan.preferredLanUrl
      ? "on"
      : freeLocal.phoneLan.enabled
        ? "dim"
        : "off"
    : "dim";
  const ollamaState = freeLocal?.ollama
    ? stateFromFreeLocalStatus(freeLocal.ollama.status)
    : providerCounts?.freeLocal
      ? "dim"
      : "checking";
  const modelState = freeLocal?.resolvedModel
    ? stateFromFreeLocalStatus(freeLocal.resolvedModel.status)
    : "dim";
  const agentState = freeLocal?.agentHealth
    ? stateFromFreeLocalStatus(freeLocal.agentHealth.status)
    : evalLatestOk === true && !evalStale
      ? "on"
      : evalLatestOk === false
        ? "blocked"
        : evalStale
          ? "dim"
          : "checking";
  const toolState = highRiskEnabled
    ? "dim"
    : toolIsolation?.status === "blocked"
      ? "blocked"
      : toolIsolation?.adapterReady === false
        ? "dim"
        : "on";
  const externalToolState =
    externalTools?.status === "ready"
      ? "on"
      : externalTools?.status === "blocked"
        ? "blocked"
        : externalTools?.status === "adapter-offline"
          ? "dim"
          : "off";

  const lights: OperationalLight[] = [
    light(
      "core",
      "runtime",
      "Run",
      "Runtime",
      runtimeState,
      runtimeState === "on"
        ? "The local Next.js runtime answered a health/readiness request."
        : "Runtime proof is still being checked from the current shell.",
      "Source: /api/health or protected readiness status.",
    ),
    light(
      "core",
      "session",
      "Auth",
      "Session",
      sessionState,
      sessionState === "on"
        ? "Protected status is reachable in this browser session."
        : "Protected routes need an authenticated local session.",
      "Source: protected /api/status or /api/free-local-readiness.",
    ),
    light(
      "core",
      "git-sync",
      "Git",
      "Git sync",
      "dim",
      "Git sync stays proof-driven and should be checked from PowerShell before publishing.",
      "Run: npm run git:safe -- status --short --branch.",
    ),
    light(
      "ai",
      "ollama",
      "Oll",
      "Ollama",
      ollamaState,
      freeLocal?.ollama.reachable
        ? "Local Ollama is reachable for free/offline AI work."
        : "Ollama reachability is either offline or awaiting readiness proof.",
      "Source: Free Local Readiness; no token or endpoint values are stored.",
    ),
    light(
      "ai",
      "model",
      "Mdl",
      "Resolved model",
      modelState,
      freeLocal?.resolvedModel.resolvedModel
        ? `Resolved local model: ${freeLocal.resolvedModel.resolvedModel}.`
        : "Resolved local model is awaiting proof from the protected readiness check.",
      "Source: model resolver summary only.",
    ),
    light(
      "ai",
      "provider-posture",
      "BYOK",
      "Provider posture",
      paidAllowed ? "dim" : "on",
      paidAllowed
        ? "Paid provider access is explicitly enabled and should stay operator-reviewed."
        : "Paid provider access is blocked by the current free-first posture.",
      "Source: policy flags; provider secrets are never exposed.",
    ),
    light(
      "security",
      "paid-apis",
      "Paid",
      "Paid API guard",
      paidAllowed ? "blocked" : "on",
      paidAllowed
        ? "Paid API access is enabled. Disable it for fully free local acceptance."
        : "Nexus-side billing and paid API fallback are blocked by default.",
      "Source: product guarantees and runtime policy.",
    ),
    light(
      "security",
      "review-gates",
      "Gate",
      "Review gates",
      toolState,
      highRiskEnabled
        ? "High-risk routes are enabled and require review discipline."
        : "High-risk tools remain review-gated or unavailable by default.",
      "Source: tool posture and isolation policy.",
    ),
    light(
      "security",
      "publication-safety",
      "Pub",
      "Publication safety",
      "on",
      "Publication safety is a required verification gate before evidence or publishing.",
      "Run: npm run publication:safety:check.",
    ),
    light(
      "network",
      "network-mode",
      "Net",
      "Network mode",
      stateFromNetworkMode(networkMode),
      networkMode
        ? `Current network mode is ${networkMode}.`
        : "Network mode proof is still loading.",
      "Source: protected route policy summary.",
    ),
    light(
      "network",
      "phone-lan",
      "LAN",
      "Phone LAN",
      phoneLanState,
      phoneLanState === "on"
        ? "Phone LAN mode is enabled and has at least one local URL candidate."
        : "Phone LAN/PWA proof remains manual until the physical phone flow is confirmed.",
      "Source: LAN readiness counts only; URLs are not surfaced in this model.",
    ),
    light(
      "release",
      "dependency-posture",
      "Deps",
      "Dependency posture",
      "dim",
      "Dependabot classification remains queued separately from visual smoothness work.",
      "Run: npm run dependency:risk:check.",
    ),
    light(
      "release",
      "docker-release-proof",
      "Ship",
      "Release proof",
      "off",
      "Docker/staged-host release proof is still blocked until local evidence exists.",
      "Run: npm run release:diagnostics:capture after Docker and staged host are ready.",
    ),
    light(
      "agents",
      "agent-health",
      "Ag",
      "Agent health",
      agentState,
      agentState === "on"
        ? "Latest agent health proof is passing and fresh."
        : "Agent health needs fresh proof or recovery before autonomy claims.",
      "Source: agent-runtime artifact summary.",
    ),
    light(
      "agents",
      "external-tools",
      "Tool",
      "External tools",
      externalToolState,
      externalTools?.status
        ? `External tool bridge status is ${externalTools.status}.`
        : "External tools stay contract-only until adapters are explicitly configured.",
      "Source: sanitized external tool bridge summary.",
    ),
  ];

  const counts = countStates(lights);
  const overallState = worstState(lights);
  const readyCount = counts.on;
  const totalCount = lights.length;
  const summary =
    overallState === "on"
      ? "All tracked local lights are green."
      : `${readyCount}/${totalCount} lights are ready; blocked, off, and dim lanes stay visible until proven.`;

  return {
    generatedAt:
      input.generatedAt ??
      input.freeLocal?.generatedAt ??
      input.status?.generatedAt ??
      new Date(0).toISOString(),
    headline: "Operational lights",
    summary,
    overallState,
    counts,
    groups: buildGroups(lights),
  };
}

export function getOperationalLightStateHex(state: OperationalLightState) {
  return OPERATIONAL_LIGHT_STATE_HEX[state];
}
