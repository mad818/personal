export type ProviderSnapshotStatus =
  | "up"
  | "circuit-open"
  | "no-key"
  | "paid-gated";

export type ProviderDisplayStatus =
  | ProviderSnapshotStatus
  | "local-runtime-unavailable";

export type ProviderHealthBadgeTone =
  | "success"
  | "muted"
  | "default"
  | "accent";

export interface ProviderHealthSnapshotProvider {
  name: string;
  status: ProviderSnapshotStatus;
  free: boolean;
  hasKey: boolean;
  model: string;
  cooldownRemainingMs: number;
}

export interface ProviderHealthSnapshot {
  providers: ProviderHealthSnapshotProvider[];
  chain: string[];
  activeProvider: string | null;
  openCircuitCount: number;
  freeProviderCount: number;
  upCount: number;
  timestamp: number;
}

export interface ProviderHealthBadge {
  key: string;
  label: string;
  tone: ProviderHealthBadgeTone;
}

export interface ProviderDisplayProvider extends ProviderHealthSnapshotProvider {
  displayStatus: ProviderDisplayStatus;
}

export type ProviderOutageReason =
  | "loading"
  | "local-runtime-unavailable"
  | "no-cloud-keys"
  | "providers-cooling-down"
  | "no-provider-lane";

export interface ProviderResiliencePosture {
  loading: boolean;
  internetReachable: boolean;
  runtimeReachable: boolean | null;
  runtimeLabel: string;
  summaryTitle: string;
  summaryDescription: string;
  readinessSummary: string;
  noAiLaneAvailable: boolean;
  noAiLaneReason: ProviderOutageReason | null;
  freeKeyOnboardingUseful: boolean;
  repairAction: string;
  activeCloudLane: string | null;
  providers: ProviderDisplayProvider[];
  counts: {
    up: number;
    noKey: number;
    circuitOpen: number;
    localRuntimeUnavailable: number;
    paidGated: number;
  };
  badges: ProviderHealthBadge[];
}

function providerLabel(name: string) {
  if (name === "ollama") return "Local runtime";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function badgeToneForStatus(
  status: ProviderDisplayStatus,
): ProviderHealthBadgeTone {
  switch (status) {
    case "up":
      return "success";
    case "circuit-open":
      return "accent";
    case "local-runtime-unavailable":
      return "accent";
    case "no-key":
    case "paid-gated":
    default:
      return "muted";
  }
}

function formatStatusLabel(status: ProviderDisplayStatus) {
  switch (status) {
    case "up":
      return "up";
    case "no-key":
      return "no key";
    case "circuit-open":
      return "circuit open";
    case "paid-gated":
      return "paid gated";
    case "local-runtime-unavailable":
      return "local runtime unavailable";
    default:
      return status;
  }
}

function buildSummary(input: {
  loading: boolean;
  internetReachable: boolean;
  runtimeReachable: boolean | null;
  activeCloudLane: string | null;
  noAiLaneReason: ProviderOutageReason | null;
}) {
  const { loading, internetReachable, runtimeReachable, activeCloudLane, noAiLaneReason } =
    input;
  if (loading) {
    return {
      title: "Checking provider posture",
      description:
        "Inspecting the provider chain, local runtime reachability, and browser internet posture before staging operator work.",
      readinessSummary: "Checking provider posture",
      repairAction: "Wait for the provider snapshot to finish loading.",
    };
  }

  if (!internetReachable && runtimeReachable) {
    return {
      title: "Local-only operator lane is ready",
      description:
        "Browser internet is offline, but the local runtime is still reachable, so Nexus can keep working through local-first operator lanes.",
      readinessSummary: "Internet offline · local operator lane still ready",
      repairAction: "Keep the current session local-first until browser connectivity returns.",
    };
  }

  if (runtimeReachable && activeCloudLane) {
    return {
      title: "Local and cloud lanes are ready",
      description: `${providerLabel(activeCloudLane)} is currently the strongest cloud lane, while the local runtime remains available for explicit fallback.`,
      readinessSummary: `${providerLabel(activeCloudLane)} up · local runtime ready`,
      repairAction: "Use the current lane and keep explicit fallback available.",
    };
  }

  if (runtimeReachable) {
    return {
      title: "Local runtime is ready",
      description:
        "The local runtime is reachable, so operator work can still proceed even if no cloud lane is currently configured or healthy.",
      readinessSummary: "Local runtime ready",
      repairAction: "Continue locally or add a cloud key only if you want explicit fallback.",
    };
  }

  if (noAiLaneReason === "no-cloud-keys") {
    return {
      title: "No AI lanes are available",
      description:
        "The local runtime is unavailable and no cloud keys are configured, so HQ cannot dispatch an AI run until one of those lanes is restored.",
      readinessSummary: "Local runtime down · no cloud keys configured",
      repairAction:
        "Restore Ollama locally or add one free cloud key such as Groq, Cerebras, or SambaNova in Settings.",
    };
  }

  if (noAiLaneReason === "providers-cooling-down") {
    return {
      title: "Cloud lanes are cooling down",
      description:
        "The local runtime is unavailable and every configured cloud lane is currently circuit-open, so dispatch should wait for cooldown or local recovery.",
      readinessSummary: "Local runtime down · configured cloud lanes cooling down",
      repairAction: "Wait for a circuit to close or restore the local runtime.",
    };
  }

  if (noAiLaneReason === "local-runtime-unavailable") {
    return {
      title: "Local runtime is unavailable",
      description:
        "The local runtime is down and no cloud lane is currently healthy enough to take over, so operator work should pause until a lane recovers.",
      readinessSummary: "Local runtime unavailable",
      repairAction: "Restore the local runtime or wait for a healthy cloud lane.",
    };
  }

  return {
    title: "Provider posture is limited",
    description:
      "Nexus can see the provider chain, but there is no healthy AI lane ready for a bounded operator run right now.",
    readinessSummary: "No healthy AI lane ready",
    repairAction: "Restore one AI lane before dispatching operator work.",
  };
}

export function buildProviderResiliencePosture(input: {
  snapshot: ProviderHealthSnapshot | null;
  internetReachable: boolean;
  runtimeReachable: boolean | null;
  loadError?: string | null;
}): ProviderResiliencePosture {
  const { snapshot, internetReachable, runtimeReachable, loadError } = input;
  const loading = !snapshot && !loadError;
  const providers = (snapshot?.providers ?? []).map((provider) => {
    const displayStatus: ProviderDisplayStatus =
      provider.name === "ollama" && runtimeReachable === false
        ? "local-runtime-unavailable"
        : provider.status;
    return {
      ...provider,
      displayStatus,
    };
  });

  const cloudProviders = providers.filter((provider) => provider.name !== "ollama");
  const cloudConfiguredProviders = cloudProviders.filter((provider) => provider.hasKey);
  const cloudUpProviders = cloudProviders.filter(
    (provider) => provider.displayStatus === "up",
  );
  const activeCloudLane = cloudUpProviders[0]?.name ?? null;

  const counts = {
    up: providers.filter((provider) => provider.displayStatus === "up").length,
    noKey: providers.filter((provider) => provider.displayStatus === "no-key").length,
    circuitOpen: providers.filter(
      (provider) => provider.displayStatus === "circuit-open",
    ).length,
    localRuntimeUnavailable: providers.filter(
      (provider) => provider.displayStatus === "local-runtime-unavailable",
    ).length,
    paidGated: providers.filter(
      (provider) => provider.displayStatus === "paid-gated",
    ).length,
  };

  let noAiLaneReason: ProviderOutageReason | null = null;
  const noAiLaneAvailable = runtimeReachable === false && cloudUpProviders.length === 0;
  if (loading) {
    noAiLaneReason = "loading";
  } else if (noAiLaneAvailable) {
    if (cloudConfiguredProviders.length === 0) {
      noAiLaneReason = "no-cloud-keys";
    } else if (
      cloudConfiguredProviders.every(
        (provider) => provider.displayStatus === "circuit-open",
      )
    ) {
      noAiLaneReason = "providers-cooling-down";
    } else {
      noAiLaneReason = "local-runtime-unavailable";
    }
  } else if (runtimeReachable === null && !snapshot) {
    noAiLaneReason = "loading";
  }

  const summary = buildSummary({
    loading,
    internetReachable,
    runtimeReachable,
    activeCloudLane,
    noAiLaneReason,
  });

  const badges: ProviderHealthBadge[] = [];
  badges.push({
    key: "local-runtime",
    label:
      runtimeReachable === null
        ? "Local runtime checking"
        : runtimeReachable
          ? "Local runtime up"
          : "Local runtime unavailable",
      tone:
      runtimeReachable === null
        ? "muted"
        : runtimeReachable
          ? "success"
          : "accent",
  });
  if (activeCloudLane) {
    badges.push({
      key: "cloud-up",
      label: `${providerLabel(activeCloudLane)} up`,
      tone: "success",
    });
  }
  if (counts.noKey > 0) {
    badges.push({
      key: "no-key",
      label: `${counts.noKey} no key`,
      tone: "muted",
    });
  }
  if (counts.circuitOpen > 0) {
    badges.push({
      key: "circuit-open",
      label: `${counts.circuitOpen} circuit open`,
      tone: "accent",
    });
  }
  if (counts.paidGated > 0) {
    badges.push({
      key: "paid-gated",
      label: `${counts.paidGated} paid gated`,
      tone: "muted",
    });
  }
  if (!internetReachable) {
    badges.push({
      key: "internet",
      label: "Browser internet offline",
      tone: "muted",
    });
  }

  return {
    loading,
    internetReachable,
    runtimeReachable,
    runtimeLabel:
      runtimeReachable === null
        ? "checking"
        : runtimeReachable
          ? "reachable"
          : "unreachable",
    summaryTitle: summary.title,
    summaryDescription: summary.description,
    readinessSummary: summary.readinessSummary,
    noAiLaneAvailable,
    noAiLaneReason,
    freeKeyOnboardingUseful:
      runtimeReachable === false && cloudConfiguredProviders.length === 0,
    repairAction: summary.repairAction,
    activeCloudLane,
    providers,
    counts,
    badges,
  };
}

export function formatProviderHealthBadgeLabel(provider: ProviderDisplayProvider) {
  return `${providerLabel(provider.name)} ${formatStatusLabel(provider.displayStatus)}`;
}

export function formatProviderStatusTone(provider: ProviderDisplayProvider) {
  return badgeToneForStatus(provider.displayStatus);
}
