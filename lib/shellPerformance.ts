export type ShellDataCapability =
  | "articles"
  | "cves"
  | "fearGreed"
  | "globalData"
  | "otx"
  | "prices"
  | "worldRisk";

export const ALL_SHELL_DATA_CAPABILITIES: readonly ShellDataCapability[] = [
  "articles",
  "cves",
  "fearGreed",
  "globalData",
  "prices",
  "worldRisk",
];

export interface ShellPerformancePlan {
  routeOwned: readonly ShellDataCapability[];
  immediate: readonly ShellDataCapability[];
  deferred: readonly ShellDataCapability[];
  deferTimeoutMs: number;
}

const ROUTE_OWNED_CAPABILITIES: Array<{
  prefix: string;
  capabilities: readonly ShellDataCapability[];
}> = [
  {
    prefix: "/command",
    capabilities: ["articles", "cves", "fearGreed", "prices", "worldRisk"],
  },
  { prefix: "/alpha", capabilities: ["prices"] },
  { prefix: "/intel", capabilities: ["articles"] },
  { prefix: "/cyber", capabilities: ["articles", "cves", "otx"] },
  {
    prefix: "/home",
    capabilities: ["articles", "cves", "fearGreed", "prices", "worldRisk"],
  },
];

const GLOBAL_DATA_IMMEDIATE_PREFIXES = [
  "/command",
  "/alpha",
  "/intel",
  "/cyber",
  "/security",
  "/iot",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getShellPerformancePlan(
  pathname: string | null | undefined,
): ShellPerformancePlan {
  const normalizedPath = pathname || "/";
  const routeOwned =
    ROUTE_OWNED_CAPABILITIES.find(({ prefix }) =>
      matchesPrefix(normalizedPath, prefix),
    )?.capabilities ?? [];
  const immediate = GLOBAL_DATA_IMMEDIATE_PREFIXES.some((prefix) =>
    matchesPrefix(normalizedPath, prefix),
  )
    ? (["globalData"] as const)
    : [];
  const active = new Set<ShellDataCapability>([...routeOwned, ...immediate]);
  const deferred = ALL_SHELL_DATA_CAPABILITIES.filter(
    (capability) => !active.has(capability),
  );

  return {
    routeOwned,
    immediate,
    deferred,
    deferTimeoutMs: matchesPrefix(normalizedPath, "/hq") ? 2_000 : 2_500,
  };
}
