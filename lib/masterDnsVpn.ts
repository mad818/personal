export type MasterDnsVpnEncryption = "aes" | "chacha20" | "xor" | "unknown";

export interface MasterDnsVpnConfigPosture {
  authorized: boolean;
  delegatedDomainConfigured: boolean;
  resolverCount: number;
  encryption: MasterDnsVpnEncryption;
  proxyHost: string;
  proxyPort: number;
  localDnsEnabled: boolean;
  cacheEnabled: boolean;
  compressionEnabled: boolean;
  requestPackingEnabled: boolean;
  externalSocksConfigured: boolean;
}

export interface MasterDnsVpnReadiness {
  status: "disabled" | "misconfigured" | "client-offline" | "ready";
  ready: boolean;
  listenerReachable: boolean;
  blockers: string[];
  summary: string;
  warning: string;
}

export function isLoopbackMasterDnsVpnHost(host: string) {
  const normalized = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "127.0.0.1"
  );
}

export function normalizeMasterDnsVpnEncryption(
  value: unknown,
): MasterDnsVpnEncryption {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized.includes("chacha")) return "chacha20";
  if (normalized.includes("aes")) return "aes";
  if (normalized.includes("xor")) return "xor";
  return "unknown";
}

export function buildMasterDnsVpnReadiness(
  config: MasterDnsVpnConfigPosture,
  listenerReachable: boolean,
): MasterDnsVpnReadiness {
  const blockers: string[] = [];
  if (!config.authorized) {
    blockers.push("Explicit authorization is required.");
  }
  if (!config.delegatedDomainConfigured) {
    blockers.push(
      "A delegated domain and operator-managed server are required.",
    );
  }
  if (config.resolverCount < 1) {
    blockers.push(
      "At least one approved resolver must be configured externally.",
    );
  }
  if (config.encryption === "xor") {
    blockers.push("XOR is weak and is not approved.");
  } else if (!["aes", "chacha20"].includes(config.encryption)) {
    blockers.push("Use AES or ChaCha20 encryption.");
  }
  if (!isLoopbackMasterDnsVpnHost(config.proxyHost)) {
    blockers.push("The client proxy listener must stay on loopback.");
  }
  if (
    !Number.isInteger(config.proxyPort) ||
    config.proxyPort < 1 ||
    config.proxyPort > 65_535
  ) {
    blockers.push("The local proxy port is invalid.");
  }

  const warning =
    "MasterDnsVPN is an emergency external transport. It does not hide your IP, provide anonymity, or unlock public links in Nexus.";
  if (!config.authorized) {
    return {
      status: "disabled",
      ready: false,
      listenerReachable: false,
      blockers,
      summary:
        "MasterDnsVPN readiness is disabled until explicitly authorized.",
      warning,
    };
  }
  if (blockers.length > 0) {
    return {
      status: "misconfigured",
      ready: false,
      listenerReachable: false,
      blockers,
      summary:
        "The external client configuration does not meet Nexus safety requirements.",
      warning,
    };
  }
  if (!listenerReachable) {
    return {
      status: "client-offline",
      ready: false,
      listenerReachable: false,
      blockers: ["The approved loopback proxy listener is not reachable."],
      summary: "Configuration is approved, but the external client is offline.",
      warning,
    };
  }
  return {
    status: "ready",
    ready: true,
    listenerReachable: true,
    blockers: [],
    summary: "The authorized external client is reachable on loopback.",
    warning,
  };
}
