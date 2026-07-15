export interface SecurityPostureInput {
  networkMode?: string;
  highRiskRoutesEnabled?: boolean;
  tokenConfigured?: boolean;
  toolIsolation?: {
    status?: string;
    adapterReady?: boolean;
    blockedReason?: string | null;
  };
  localData?: {
    posture?: string;
    summary?: string;
  };
}

export interface SecurityPostureRollup {
  headline: string;
  networkMode: string;
  toolIsolationStatus: string;
  tokenConfigured: boolean;
  advisories: string[];
}

export function buildSecurityPostureRollup(
  input: SecurityPostureInput,
): SecurityPostureRollup {
  const networkMode = input.networkMode?.trim() || "unknown";
  const toolIsolationStatus = input.toolIsolation?.status?.trim() || "unknown";
  const tokenConfigured = Boolean(input.tokenConfigured);
  const advisories: string[] = [];

  if (!tokenConfigured) {
    advisories.push("Configure NEXUS_TOKEN for protected local routes.");
  }
  if (networkMode === "isolated") {
    advisories.push(
      "Isolated network mode — outbound connectors are restricted.",
    );
  }
  if (toolIsolationStatus === "blocked") {
    advisories.push(
      input.toolIsolation?.blockedReason?.trim() ||
        "High-risk exec tools are blocked until sandbox adapter is ready.",
    );
  } else if (toolIsolationStatus === "unavailable") {
    advisories.push(
      "Tool isolation runner unavailable — exec tools stay fail-closed.",
    );
  }
  if (input.highRiskRoutesEnabled) {
    advisories.push(
      "High-risk tool routes are enabled — review operator approvals.",
    );
  }
  if (input.localData?.summary?.trim()) {
    advisories.push(input.localData.summary.trim());
  }

  const headline =
    advisories.length === 0
      ? "Security posture nominal for local operator mode."
      : `${advisories.length} security advisory${advisories.length === 1 ? "" : "ies"} active`;

  return {
    headline,
    networkMode,
    toolIsolationStatus,
    tokenConfigured,
    advisories: advisories.slice(0, 4),
  };
}
