export type LocalAccelerationCapabilityOwner =
  | "nexus"
  | "environment"
  | "upstream";
export type LocalAccelerationCapabilityDisposition =
  | "implemented"
  | "adapted"
  | "excluded"
  | "pending";

export interface LocalAccelerationCapabilityStatus {
  id: string;
  disposition: LocalAccelerationCapabilityDisposition;
  owner: LocalAccelerationCapabilityOwner;
}

export interface LocalAccelerationAcceptanceEvidence {
  staticChecksPassed: boolean;
  localFallbackLifecyclePassed: boolean;
  turboVecLifecyclePassed: boolean;
  turboQuantCheckoutPassed: boolean;
  turboQuantGpuPassed: boolean;
}

export interface LocalAccelerationCompletionInput {
  capabilities: LocalAccelerationCapabilityStatus[];
  evidence: LocalAccelerationAcceptanceEvidence;
}

export interface LocalAccelerationBlocker {
  id: string;
  owner: LocalAccelerationCapabilityOwner;
}

export interface LocalAccelerationCompletion {
  status: "complete" | "in_progress";
  nexusOwnedPercent: number;
  offlineOperationalPercent: number;
  integrationAcceptancePercent: number;
  optionalUpstreamRuntimePercent: number;
  optionalUpstreamStatus: "ready" | "partial" | "unavailable";
  sourceParityPercent: number;
  blockers: LocalAccelerationBlocker[];
  optionalUpstreamGaps: LocalAccelerationBlocker[];
}

export interface LocalAccelerationMachinePosture {
  gpuPresent: boolean;
  linuxRuntimeAvailable: boolean;
  pythonAvailable: boolean;
  turboVecPackageAvailable: boolean;
  turboQuantCheckoutAvailable: boolean;
  ollamaAvailable: boolean;
  embeddingAvailable: boolean;
  outboundPackageRegistryAvailable: boolean;
}

export interface LocalAccelerationAcceptanceArtifact {
  generatedAt: string;
  platform: string;
  machine: LocalAccelerationMachinePosture;
  completion: LocalAccelerationCompletion;
  probes: Record<string, unknown>;
}

const SAFE_PROBE_KEYS = new Set([
  "safeStatus",
  "staticChecks",
  "localFallbackLifecycle",
  "turboVecService",
  "turboVecLifecycle",
  "turboQuantService",
  "turboQuantCheckout",
  "turboQuantGpu",
  "ollama",
  "embedding",
  "packageRegistry",
]);

function percent(completed: number, total: number) {
  if (total === 0) return 100;
  return Math.round((completed / total) * 100);
}

function dispositionComplete(
  disposition: LocalAccelerationCapabilityDisposition,
) {
  return disposition !== "pending";
}

export function assessLocalAccelerationCompletion({
  capabilities,
  evidence,
}: LocalAccelerationCompletionInput): LocalAccelerationCompletion {
  const nexusOwned = capabilities.filter(
    (capability) => capability.owner === "nexus",
  );
  const nexusOwnedComplete = nexusOwned.filter((capability) =>
    dispositionComplete(capability.disposition),
  ).length;
  const sourceCapabilities = capabilities.filter(
    (capability) => capability.owner !== "environment",
  );
  const sourceComplete = sourceCapabilities.filter((capability) =>
    dispositionComplete(capability.disposition),
  ).length;
  const runtimeGates = [
    evidence.turboVecLifecyclePassed,
    evidence.turboQuantCheckoutPassed,
    evidence.turboQuantGpuPassed,
  ];
  const blockersById = new Map<string, LocalAccelerationBlocker>();
  const optionalUpstreamGapsById = new Map<string, LocalAccelerationBlocker>();
  if (!evidence.staticChecksPassed) {
    blockersById.set("nexus:static-checks", {
      id: "nexus:static-checks",
      owner: "nexus",
    });
  }
  if (!evidence.localFallbackLifecyclePassed) {
    blockersById.set("nexus:offline-fallback-lifecycle", {
      id: "nexus:offline-fallback-lifecycle",
      owner: "nexus",
    });
  }
  if (!evidence.turboVecLifecyclePassed) {
    optionalUpstreamGapsById.set("turbovec:real-runtime-acceptance", {
      id: "turbovec:real-runtime-acceptance",
      owner: "environment",
    });
  }
  if (!evidence.turboQuantCheckoutPassed) {
    optionalUpstreamGapsById.set("turboquant:reviewed-checkout-acceptance", {
      id: "turboquant:reviewed-checkout-acceptance",
      owner: "environment",
    });
  }
  if (!evidence.turboQuantGpuPassed) {
    optionalUpstreamGapsById.set("turboquant:real-gpu-runtime-acceptance", {
      id: "turboquant:real-gpu-runtime-acceptance",
      owner: "environment",
    });
  }
  for (const capability of capabilities.filter(
    (item) => item.disposition === "pending",
  )) {
    const target =
      capability.owner === "environment"
        ? optionalUpstreamGapsById
        : blockersById;
    target.set(capability.id, {
      id: capability.id,
      owner: capability.owner,
    });
  }
  const blockers = [...blockersById.values()];
  const optionalUpstreamGaps = [...optionalUpstreamGapsById.values()];

  const nexusOwnedPercent = percent(nexusOwnedComplete, nexusOwned.length);
  const offlineOperationalPercent = percent(
    [evidence.staticChecksPassed, evidence.localFallbackLifecyclePassed].filter(
      Boolean,
    ).length,
    2,
  );
  const optionalUpstreamRuntimePercent = percent(
    runtimeGates.filter(Boolean).length,
    runtimeGates.length,
  );
  const sourceParityPercent = percent(
    sourceComplete,
    sourceCapabilities.length,
  );
  const integrationGates = [
    evidence.staticChecksPassed,
    evidence.localFallbackLifecyclePassed,
    nexusOwnedPercent === 100,
    sourceParityPercent === 100,
  ];
  const integrationAcceptancePercent = percent(
    integrationGates.filter(Boolean).length,
    integrationGates.length,
  );

  return {
    status: integrationAcceptancePercent === 100 ? "complete" : "in_progress",
    nexusOwnedPercent,
    offlineOperationalPercent,
    integrationAcceptancePercent,
    optionalUpstreamRuntimePercent,
    optionalUpstreamStatus:
      optionalUpstreamRuntimePercent === 100
        ? "ready"
        : optionalUpstreamRuntimePercent === 0
          ? "unavailable"
          : "partial",
    sourceParityPercent,
    blockers,
    optionalUpstreamGaps,
  };
}

export function sanitizeLocalAccelerationAcceptance(
  artifact: LocalAccelerationAcceptanceArtifact,
): LocalAccelerationAcceptanceArtifact {
  const probes = Object.fromEntries(
    Object.entries(artifact.probes).filter(([key]) => SAFE_PROBE_KEYS.has(key)),
  );
  return {
    generatedAt: artifact.generatedAt,
    platform: artifact.platform,
    machine: { ...artifact.machine },
    completion: {
      ...artifact.completion,
      blockers: artifact.completion.blockers.map((blocker) => ({ ...blocker })),
      optionalUpstreamGaps: artifact.completion.optionalUpstreamGaps.map(
        (gap) => ({ ...gap }),
      ),
    },
    probes,
  };
}
