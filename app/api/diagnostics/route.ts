import {
  BRAND_DESCRIPTOR,
  BRAND_NAME,
  BRAND_TAGLINE,
  getBrandServiceName,
  summarizeProviderReadiness,
} from "@/lib/brand";
import { readNetworkMode } from "@/lib/security/routePolicy";
import { readConnectorPolicy } from "@/lib/security/connectorPolicy";
import { readLocalDataPolicySummary } from "@/lib/security/localDataPolicy";
import { readTimesfmSpikeStatus } from "@/lib/experiments";
import {
  getDefaultEntrypoint,
  listSurfaceAliases,
  readBuildChannel,
  readBuildVersion,
  readDeploymentProfile,
  RELEASE_DEFAULTS,
  summarizeConnectorReadiness,
  summarizeSurfaceTiers,
} from "@/lib/releaseMatrix";
import { summarizeSkillGovernance } from "@/lib/skillMetadata";
import { protectedJson } from "@/lib/protectedApi";
import { readRuntimeIdentity } from "@/lib/runtimeIdentity";
import { isAzureOpenAIConfigured } from "@/lib/azureOpenAI";
import { readReleaseIdentity } from "@/lib/releaseIdentity";

export const dynamic = "force-dynamic";

function present(v: string | undefined) {
  return Boolean(v && v.trim().length > 0);
}

export async function GET() {
  const runtimeIdentity = readRuntimeIdentity();
  const releaseIdentity = readReleaseIdentity();
  const now = new Date().toISOString();
  const mode = readNetworkMode();
  const localData = readLocalDataPolicySummary();

  const security = {
    networkMode: mode,
    highRiskRoutesEnabled: process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true",
    allowPaidApis: process.env.NEXUS_ALLOW_PAID_APIS === "true",
    connectorPolicy: readConnectorPolicy(),
    tokenConfigured: present(process.env.NEXUS_TOKEN),
  };
  const connectorReadiness = summarizeConnectorReadiness(
    security.networkMode,
    security.connectorPolicy,
  );
  const surfaceSummary = summarizeSurfaceTiers();
  const rollbackHints = [
    !security.tokenConfigured
      ? "Set NEXUS_TOKEN before exposing protected API routes."
      : null,
    security.networkMode === "connected" && security.highRiskRoutesEnabled
      ? "If behavior looks unsafe, revert to isolated mode and disable high-risk routes."
      : null,
    security.allowPaidApis
      ? "Paid APIs are enabled; revert NEXUS_ALLOW_PAID_APIS=false to return to the free-default posture."
      : null,
  ].filter(Boolean);

  const providers = {
    local: {
      ollamaEndpoint:
        process.env.OLLAMA_ENDPOINT ??
        "http://localhost:11434/v1/chat/completions",
    },
    configured: {
      anthropic: present(process.env.ANTHROPIC_API_KEY),
      azure: isAzureOpenAIConfigured(),
      openai: present(process.env.OPENAI_API_KEY),
      minimax: present(process.env.MINIMAX_API_KEY),
      groq: present(process.env.GROQ_API_KEY),
      openrouter: present(process.env.OPENROUTER_API_KEY),
      google: present(process.env.GOOGLE_AI_KEY),
    },
    posture: summarizeProviderReadiness(),
  };

  const dataSources = {
    coingecko: present(process.env.COINGECKO_KEY),
    finnhub: present(process.env.FINNHUB_KEY),
    nvd: present(process.env.NVD_KEY),
    guardian: present(process.env.GUARDIAN_KEY),
    fred: present(process.env.FRED_KEY),
    otx: present(process.env.OTX_KEY),
    aisstream: present(process.env.AISSTREAM_KEY),
    firms: present(process.env.FIRMS_MAP_KEY),
    firecrawl: present(process.env.FIRECRAWL_KEY),
    brave: present(process.env.BRAVE_SEARCH_KEY),
  };

  return protectedJson({
    generatedAt: now,
    summary: {
      networkMode: security.networkMode,
      highRiskRoutesEnabled: security.highRiskRoutesEnabled,
      allowPaidApis: security.allowPaidApis,
      tokenConfigured: security.tokenConfigured,
      localData,
    },
    release: {
      service: getBrandServiceName(),
      brand: {
        name: BRAND_NAME,
        tagline: BRAND_TAGLINE,
        descriptor: BRAND_DESCRIPTOR,
      },
      channel: readBuildChannel(),
      version: readBuildVersion(),
      deploymentProfile: readDeploymentProfile(),
      canonicalDeploymentLane: RELEASE_DEFAULTS.canonicalDeploymentLane,
      supportedSurfacePolicy: RELEASE_DEFAULTS.supportedSurfacePolicy,
      defaultEntrypoint: getDefaultEntrypoint(),
      uiShellVersion: RELEASE_DEFAULTS.uiShellVersion,
      surfaceCounts: surfaceSummary.counts,
      surfaceAliases: listSurfaceAliases(),
      connectorReadiness: connectorReadiness.counts,
      rollbackHints,
    },
    runtime: {
      bootId: runtimeIdentity.bootId,
      startedAt: runtimeIdentity.startedAt,
      ageSeconds: runtimeIdentity.ageSeconds,
      pid: runtimeIdentity.pid,
      node: runtimeIdentity.node,
      platform: runtimeIdentity.platform,
      arch: runtimeIdentity.arch,
    },
    releaseIdentity,
    security,
    providers,
    dataSources,
    skillGovernance: summarizeSkillGovernance(),
    experiments: {
      timesfmSpike: readTimesfmSpikeStatus(),
    },
    notes: [
      "All values are redacted to booleans/metadata only.",
      "Use this payload for secured-network diagnostics exports.",
    ],
  });
}
