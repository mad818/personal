export interface NetworkHealthTarget {
  id: string;
  label: string;
  url: string;
  method: "http" | "https" | "health";
}

export interface NetworkHealthResult {
  id: string;
  status: "ok" | "warn" | "fail" | "checking" | "idle";
  code: number | null;
  ms: number | null;
  lastSeen: string;
  checkedAt: number | null;
}

export const DEFAULT_NETWORK_HEALTH_TARGETS: NetworkHealthTarget[] = [
  {
    id: "nexus",
    label: "Nexus HQ",
    url: "/api/health",
    method: "health",
  },
  {
    id: "prices",
    label: "Market data route",
    url: "/api/prices?mode=markets&coins=bitcoin,ethereum,solana",
    method: "health",
  },
  {
    id: "risk",
    label: "Conflict monitor",
    url: "/api/conflict",
    method: "health",
  },
  {
    id: "cves",
    label: "Cyber feed",
    url: "/api/cves",
    method: "health",
  },
  {
    id: "sentiment",
    label: "Fear & Greed route",
    url: "/api/fear-greed",
    method: "health",
  },
  {
    id: "seismic",
    label: "Earthquake route",
    url: "/api/earthquakes",
    method: "health",
  },
];
