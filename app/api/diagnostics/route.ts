import { NextResponse } from "next/server";
import { readNetworkMode } from "@/lib/security/routePolicy";
import { readConnectorPolicy } from "@/lib/security/connectorPolicy";

function present(v: string | undefined) {
  return Boolean(v && v.trim().length > 0);
}

export async function GET() {
  const now = new Date().toISOString();
  const mode = readNetworkMode();

  const security = {
    networkMode: mode,
    highRiskRoutesEnabled: process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true",
    allowPaidApis: process.env.NEXUS_ALLOW_PAID_APIS === "true",
    connectorPolicy: readConnectorPolicy(),
    tokenConfigured: present(process.env.NEXUS_TOKEN),
  };

  const providers = {
    local: {
      ollamaEndpoint:
        process.env.OLLAMA_ENDPOINT ?? "http://localhost:11434/v1/chat/completions",
    },
    configured: {
      anthropic: present(process.env.ANTHROPIC_API_KEY),
      openai: present(process.env.OPENAI_API_KEY),
      minimax: present(process.env.MINIMAX_API_KEY),
      groq: present(process.env.GROQ_API_KEY),
      openrouter: present(process.env.OPENROUTER_API_KEY),
      google: present(process.env.GOOGLE_AI_KEY),
    },
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

  return NextResponse.json({
    generatedAt: now,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    security,
    providers,
    dataSources,
    notes: [
      "All values are redacted to booleans/metadata only.",
      "Use this payload for secured-network diagnostics exports.",
    ],
  });
}
