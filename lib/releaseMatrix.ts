import releaseMatrixJson from "@/lib/release-matrix.json";
import type { ConnectorKey, ConnectorPolicy } from "@/lib/security/connectorPolicy";
import type { NetworkMode, RouteClass } from "@/lib/security/routePolicy";

export type SurfaceTier = "ga" | "beta" | "internal";
export type SurfaceKind = "tab" | "support";
export type DeploymentTrack = "web" | "desktop";
export type ConnectorAccess = "free_public" | "byok_optional" | "byok_required";
export type DeploymentProfile = "local-dev" | "web-self-hosted" | "desktop-secure";
export type BuildChannel = "dev" | "preview" | "release";

export interface ReleaseDefaults {
  supportedSurfacePolicy: "ga-only";
  canonicalDeploymentLane: "dual-track" | "web-first" | "desktop-first";
  defaultDeploymentProfile: DeploymentProfile;
  defaultBuildChannel: BuildChannel;
  defaultEntrypoint: string;
  uiShellVersion: string;
}

export interface ProductSurface {
  id: string;
  href: string;
  aliases?: string[];
  label: string;
  tier: SurfaceTier;
  kind: SurfaceKind;
  inNav: boolean;
  deploymentTracks: DeploymentTrack[];
  description: string;
}

export interface ConnectorMetadata {
  key: ConnectorKey;
  routePrefix: string;
  routeClass: RouteClass;
  primarySurface: string;
  access: ConnectorAccess;
  defaultEnabled: boolean;
  requiresEnv: string | null;
  description: string;
}

export interface ReleaseMatrix {
  releaseDefaults: ReleaseDefaults;
  surfaces: ProductSurface[];
  connectors: ConnectorMetadata[];
}

export const RELEASE_MATRIX = releaseMatrixJson as ReleaseMatrix;
export const RELEASE_DEFAULTS = RELEASE_MATRIX.releaseDefaults;
export const PRODUCT_SURFACES = RELEASE_MATRIX.surfaces;
export const CONNECTOR_METADATA = RELEASE_MATRIX.connectors;

const SURFACE_PATH_INDEX = new Map<string, ProductSurface>(
  PRODUCT_SURFACES.flatMap((surface) => [
    [surface.href, surface],
    ...(surface.aliases ?? []).map((alias) => [alias, surface] as const),
  ]),
);

export function getNavProductSurfaces(): ProductSurface[] {
  return PRODUCT_SURFACES.filter((surface) => surface.inNav && surface.tier === "ga");
}

export function getDefaultEntrypoint() {
  return RELEASE_DEFAULTS.defaultEntrypoint;
}

export function findSurfaceByPath(pathname?: string | null): ProductSurface | null {
  if (!pathname) return null;
  return SURFACE_PATH_INDEX.get(pathname) ?? null;
}

export function normalizeSurfaceHref(pathname?: string | null) {
  return findSurfaceByPath(pathname)?.href ?? pathname ?? RELEASE_DEFAULTS.defaultEntrypoint;
}

export function listSurfaceAliases() {
  return PRODUCT_SURFACES.flatMap((surface) =>
    (surface.aliases ?? []).map((alias) => ({
      alias,
      canonicalHref: surface.href,
      id: surface.id,
    })),
  );
}

export function summarizeSurfaceTiers() {
  const tiers = {
    ga: PRODUCT_SURFACES.filter((surface) => surface.tier === "ga"),
    beta: PRODUCT_SURFACES.filter((surface) => surface.tier === "beta"),
    internal: PRODUCT_SURFACES.filter((surface) => surface.tier === "internal"),
  };
  return {
    counts: {
      total: PRODUCT_SURFACES.length,
      ga: tiers.ga.length,
      beta: tiers.beta.length,
      internal: tiers.internal.length,
      gaNav: getNavProductSurfaces().length,
    },
    tiers,
  };
}

export function readDeploymentProfile(): DeploymentProfile {
  const raw = (process.env.NEXUS_DEPLOYMENT_PROFILE ?? RELEASE_DEFAULTS.defaultDeploymentProfile).toLowerCase();
  if (raw === "web-self-hosted" || raw === "desktop-secure") return raw;
  return "local-dev";
}

export function readBuildChannel(): BuildChannel {
  const raw = (process.env.NEXUS_BUILD_CHANNEL ?? RELEASE_DEFAULTS.defaultBuildChannel).toLowerCase();
  if (raw === "preview" || raw === "release") return raw;
  return "dev";
}

export function readBuildVersion(): string {
  return (
    process.env.NEXUS_BUILD_VERSION ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.GITHUB_SHA?.slice(0, 12) ??
    "local-dev"
  );
}

type EnvValueMap = Record<string, string | undefined>;

export interface ConnectorReadinessItem {
  key: ConnectorKey;
  primarySurface: string;
  access: ConnectorAccess;
  enabledByPolicy: boolean;
  allowedInMode: boolean;
  keyConfigured: boolean;
  status:
    | "ready"
    | "ready_limited"
    | "disabled_by_policy"
    | "blocked_by_mode"
    | "needs_key";
  description: string;
}

function isTruthyEnv(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function summarizeConnectorReadiness(
  networkMode: NetworkMode,
  connectorPolicy: ConnectorPolicy,
  env: EnvValueMap = process.env,
) {
  const items: ConnectorReadinessItem[] = CONNECTOR_METADATA.map((connector) => {
    const enabledByPolicy = connectorPolicy[connector.key] ?? connector.defaultEnabled;
    const allowedInMode = networkMode !== "isolated";
    const keyConfigured = connector.requiresEnv ? isTruthyEnv(env[connector.requiresEnv]) : false;

    let status: ConnectorReadinessItem["status"] = "ready";
    if (!allowedInMode) {
      status = "blocked_by_mode";
    } else if (!enabledByPolicy) {
      status = "disabled_by_policy";
    } else if (connector.access === "byok_required" && !keyConfigured) {
      status = "needs_key";
    } else if (connector.access === "byok_optional" && !keyConfigured) {
      status = "ready_limited";
    }

    return {
      key: connector.key,
      primarySurface: connector.primarySurface,
      access: connector.access,
      enabledByPolicy,
      allowedInMode,
      keyConfigured,
      status,
      description: connector.description,
    };
  });

  return {
    counts: {
      total: items.length,
      ready: items.filter((item) => item.status === "ready").length,
      readyLimited: items.filter((item) => item.status === "ready_limited").length,
      disabledByPolicy: items.filter((item) => item.status === "disabled_by_policy").length,
      blockedByMode: items.filter((item) => item.status === "blocked_by_mode").length,
      needsKey: items.filter((item) => item.status === "needs_key").length,
      freePublic: items.filter((item) => item.access === "free_public").length,
      byokOptional: items.filter((item) => item.access === "byok_optional").length,
    },
    items,
  };
}
