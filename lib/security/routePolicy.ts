export type NetworkMode = "isolated" | "internal" | "connected";
export type RouteClass = "local_only" | "connector_opt_in" | "high_risk";

export interface RoutePolicy {
  prefix: string;
  routeClass: RouteClass;
  public: boolean;
}

export const ROUTE_POLICIES: RoutePolicy[] = [
  // local control plane
  { prefix: "/api/health/providers", routeClass: "local_only", public: false },
  { prefix: "/api/health/usage", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-experiments/run", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-experiments", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/forecast/run", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/forecast", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/scheduler-efficiency/run", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/scheduler-efficiency/source", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/scheduler-efficiency", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval/run", routeClass: "local_only", public: false },
  { prefix: "/api/metrics/runtime-eval", routeClass: "local_only", public: false },
  { prefix: "/api/agent-health", routeClass: "local_only", public: false },
  { prefix: "/api/agent-learnings", routeClass: "local_only", public: false },
  { prefix: "/api/free-local-readiness", routeClass: "local_only", public: false },
  { prefix: "/api/phone-acceptance/receipt", routeClass: "local_only", public: false },
  { prefix: "/api/privacy-shield/preview", routeClass: "local_only", public: false },
  { prefix: "/api/feynman/artifacts", routeClass: "local_only", public: false },
  { prefix: "/api/token", routeClass: "local_only", public: true },
  { prefix: "/api/health", routeClass: "local_only", public: true },
  { prefix: "/api/auth-diagnostics", routeClass: "local_only", public: true },
  { prefix: "/api/network-health/check", routeClass: "local_only", public: false },
  { prefix: "/api/espectre", routeClass: "local_only", public: false },
  { prefix: "/api/masterdnsvpn/readiness", routeClass: "local_only", public: false },
  { prefix: "/api/windows-optimization-advisor", routeClass: "local_only", public: false },
  { prefix: "/api/status", routeClass: "local_only", public: false },
  { prefix: "/api/project", routeClass: "local_only", public: false },
  { prefix: "/api/ollama/catalog", routeClass: "local_only", public: false },
  { prefix: "/api/local-acceleration", routeClass: "local_only", public: false },
  { prefix: "/api/assistant/retrieve", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/settings", routeClass: "local_only", public: false },
  { prefix: "/api/verify", routeClass: "local_only", public: false },
  { prefix: "/api/diagnostics", routeClass: "local_only", public: false },
  { prefix: "/api/memory/pages", routeClass: "local_only", public: false },
  { prefix: "/api/memory/ask", routeClass: "local_only", public: false },
  { prefix: "/api/memory/mine", routeClass: "local_only", public: false },
  { prefix: "/api/memory/eval", routeClass: "local_only", public: false },
  { prefix: "/api/memory/search", routeClass: "local_only", public: false },
  { prefix: "/api/memory/stats", routeClass: "local_only", public: false },
  { prefix: "/api/memory/snapshot", routeClass: "local_only", public: false },
  { prefix: "/api/vehicle/telemetry", routeClass: "local_only", public: false },
  { prefix: "/api/workflows", routeClass: "local_only", public: false },
  { prefix: "/api/workflow-runs", routeClass: "local_only", public: false },
  { prefix: "/api/registry", routeClass: "local_only", public: false },
  { prefix: "/api/subscription-escape", routeClass: "local_only", public: false },
  { prefix: "/api/security/scenarios", routeClass: "local_only", public: false },
  { prefix: "/api/security/runs", routeClass: "local_only", public: false },
  { prefix: "/api/model-lab", routeClass: "local_only", public: false },
  { prefix: "/api/geo-delta", routeClass: "local_only", public: false },

  // connectors: read-only / data ingest
  { prefix: "/api/news", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/gdelt", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/conflict", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/cisa-kev", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/cves", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/threat-intel", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/sec-filings", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/prices", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/metals", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/commodities", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/fx", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/fear-greed", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/defi", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/polymarket", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/weather", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/earthquakes", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/fires", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/flights", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/maritime", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/geo-scan", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/hacker-news", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/headers", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/recon/status", routeClass: "local_only", public: false },
  { prefix: "/api/recon/lookup", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/recon/passive-dns", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/recon/tor-check", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/repo-intel", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/sweeps", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/events/sweeps", routeClass: "connector_opt_in", public: false },

  // high-risk / action routes
  { prefix: "/api/legal-compliance/drone", routeClass: "high_risk", public: false },
  { prefix: "/api/vault-synthesis", routeClass: "high_risk", public: false },
  { prefix: "/api/ai/batches/[batchId]", routeClass: "high_risk", public: false },
  { prefix: "/api/ai/batches", routeClass: "high_risk", public: false },
  { prefix: "/api/ai", routeClass: "local_only", public: false },
  { prefix: "/api/tools", routeClass: "local_only", public: false },
  { prefix: "/api/mqtt", routeClass: "high_risk", public: false },
  { prefix: "/api/telegram", routeClass: "high_risk", public: false },
  { prefix: "/api/agent-reach", routeClass: "high_risk", public: false },
];

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRoutePolicy(pathname: string): RoutePolicy | null {
  const matches = ROUTE_POLICIES.filter((policy) =>
    matchesRoutePrefix(pathname, policy.prefix),
  );
  if (matches.length === 0) return null;

  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0] ?? null;
}

export function getDefaultNetworkMode(): NetworkMode {
  return process.env.NODE_ENV === "development" ? "internal" : "isolated";
}

export function readNetworkMode(): NetworkMode {
  const raw = (
    process.env.NEXUS_NETWORK_MODE ?? getDefaultNetworkMode()
  ).toLowerCase();
  if (raw === "isolated") return raw;
  if (raw === "internal" || raw === "connected") return raw;
  return getDefaultNetworkMode();
}

export function isLocalOnlyNetworkMode(mode: NetworkMode = readNetworkMode()) {
  return mode === "isolated";
}

export function isRouteAllowedInMode(
  routeClass: RouteClass,
  mode: NetworkMode,
  highRiskEnabled: boolean,
) {
  if (routeClass === "local_only") return true;
  if (routeClass === "connector_opt_in") return mode !== "isolated";
  // high_risk
  return mode === "connected" && highRiskEnabled;
}
