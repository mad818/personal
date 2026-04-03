export type NetworkMode = "isolated" | "internal" | "connected";
export type RouteClass = "local_only" | "connector_opt_in" | "high_risk";

export interface RoutePolicy {
  prefix: string;
  routeClass: RouteClass;
  public: boolean;
}

export const ROUTE_POLICIES: RoutePolicy[] = [
  // local control plane
  { prefix: "/api/token", routeClass: "local_only", public: true },
  { prefix: "/api/health", routeClass: "local_only", public: true },
  { prefix: "/api/auth-diagnostics", routeClass: "local_only", public: true },
  { prefix: "/api/status", routeClass: "local_only", public: false },
  { prefix: "/api/project", routeClass: "local_only", public: false },
  { prefix: "/api/settings", routeClass: "local_only", public: false },
  { prefix: "/api/verify", routeClass: "local_only", public: false },
  { prefix: "/api/diagnostics", routeClass: "local_only", public: false },
  { prefix: "/api/workflows", routeClass: "local_only", public: false },
  { prefix: "/api/workflow-runs", routeClass: "local_only", public: false },
  { prefix: "/api/registry", routeClass: "local_only", public: false },
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
  { prefix: "/api/sweeps", routeClass: "connector_opt_in", public: false },
  { prefix: "/api/events/sweeps", routeClass: "connector_opt_in", public: false },

  // high-risk / action routes
  { prefix: "/api/ai", routeClass: "high_risk", public: false },
  { prefix: "/api/tools", routeClass: "high_risk", public: false },
  { prefix: "/api/mqtt", routeClass: "high_risk", public: false },
  { prefix: "/api/telegram", routeClass: "high_risk", public: false },
  { prefix: "/api/agent-reach", routeClass: "high_risk", public: false },
];

export function getRoutePolicy(pathname: string): RoutePolicy | null {
  return ROUTE_POLICIES.find((p) => pathname.startsWith(p.prefix)) ?? null;
}

export function getDefaultNetworkMode(): NetworkMode {
  return process.env.NODE_ENV === "development" ? "internal" : "isolated";
}

export function readNetworkMode(): NetworkMode {
  const raw = (
    process.env.NEXUS_NETWORK_MODE ?? getDefaultNetworkMode()
  ).toLowerCase();
  if (raw === "internal" || raw === "connected") return raw;
  return getDefaultNetworkMode();
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
