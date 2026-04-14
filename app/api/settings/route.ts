// ── api/settings ────────────────────────────────────────────
// Settings API: user configuration persistence (keys, watchlist, theme).

import { NextRequest } from "next/server";
import * as fs from "fs/promises";
import {
  DEFAULT_CONNECTOR_POLICY,
  parseConnectorPolicy,
} from "@/lib/security/connectorPolicy";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  summarizeProviderReadiness,
} from "@/lib/brand";
import {
  getDefaultNetworkMode,
  type NetworkMode,
  readNetworkMode,
} from "@/lib/security/routePolicy";
import { applyRuntimePolicyCookies } from "@/lib/security/runtimePolicyCookies";
import {
  getDefaultEntrypoint,
  listSurfaceAliases,
  readBuildChannel,
  readBuildVersion,
  readDeploymentProfile,
  RELEASE_DEFAULTS,
  summarizeSurfaceTiers,
} from "@/lib/releaseMatrix";
import { protectedJson } from "@/lib/protectedApi";
import { getRuntimeEnvFilePath } from "@/lib/serverEnvRuntime";
import { isConfiguredSecretValue } from "@/lib/secretReadiness";

/**
 * Server-side settings store — OpenClaw-style.
 *
 * API keys are NEVER stored in the browser. They live in .env.local
 * on the server. The browser only sends keys when the user explicitly
 * saves them. On read, we return which keys are set (boolean) not their
 * values — the browser never sees the raw key strings.
 *
 * Non-sensitive settings (user profile, watchlist, etc.) stay in
 * localStorage as before.
 */

// Keys that are sensitive and should live server-side only
const SENSITIVE_KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "GOOGLE_AI_KEY",
  "OPENROUTER_API_KEY",
  "MINIMAX_API_KEY",
  "BRAVE_SEARCH_KEY",
  "COINGECKO_KEY",
  "FINNHUB_KEY",
  "GUARDIAN_KEY",
  "NVD_KEY",
  "OTX_KEY",
  "FRED_KEY",
  "AISSTREAM_KEY",
  "FIRMS_MAP_KEY",
  "FIRECRAWL_KEY",
  "HIBP_API_KEY",
  "VT_API_KEY",
  "SHODAN_API_KEY",
  "OPENCLAW_TOKEN",
  "NEXUS_TOKEN",
  "NEXUS_NETWORK_MODE",
  "NEXUS_ENABLE_HIGH_RISK_TOOLS",
  "NEXUS_ALLOW_PAID_APIS",
  "NEXUS_CONNECTOR_POLICY_JSON",
  "NEXUS_DEPLOYMENT_PROFILE",
];

// Legacy keys accepted for backward compatibility while we normalize naming.
const LEGACY_KEY_ALIASES: Record<string, string> = {
  AISSSTREAM_KEY: "AISSTREAM_KEY",
  FIRMS_KEY: "FIRMS_MAP_KEY",
};

const READONLY_SENSITIVE_KEYS = new Set(["NEXUS_TOKEN", "OPENCLAW_TOKEN"]);

const ENV_FILE = getRuntimeEnvFilePath();

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_FILE, "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function writeEnvFile(env: Record<string, string>): Promise<void> {
  // Preserve the original file structure — only update/add value lines
  let content = "";
  try {
    content = await fs.readFile(ENV_FILE, "utf-8");
  } catch {
    /* new file */
  }

  for (const [key, value] of Object.entries(env)) {
    // Basic hardening: keep env values single-line to prevent accidental key injection.
    const safeValue = String(value)
      .replace(/[\r\n]+/g, " ")
      .trim();
    const regex = new RegExp(`^(${key}=)(.*)$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `$1${safeValue}`);
    } else {
      content += `\n${key}=${safeValue}`;
    }
  }

  await fs.writeFile(ENV_FILE, content, "utf-8");
}

function normalizeConfigValue(key: string, value: string): string {
  const v = String(value).trim().toLowerCase();
  if (key === "NEXUS_NETWORK_MODE") {
    if (v === "internal" || v === "connected") return v;
    return getDefaultNetworkMode();
  }
  if (key === "NEXUS_ENABLE_HIGH_RISK_TOOLS" || key === "NEXUS_ALLOW_PAID_APIS") {
    return v === "true" ? "true" : "false";
  }
  if (key === "NEXUS_CONNECTOR_POLICY_JSON") {
    const policy = parseConnectorPolicy(value);
    return JSON.stringify(policy);
  }
  if (key === "NEXUS_DEPLOYMENT_PROFILE") {
    if (v === "web-self-hosted" || v === "desktop-secure") return v;
    return "local-dev";
  }
  return value;
}

function readPendingDeploymentProfile(env: Record<string, string>) {
  const raw = env.NEXUS_DEPLOYMENT_PROFILE ?? process.env.NEXUS_DEPLOYMENT_PROFILE;
  if (!raw) return readDeploymentProfile();
  const v = raw.trim().toLowerCase();
  if (v === "web-self-hosted" || v === "desktop-secure") return v;
  return "local-dev";
}

function buildSecretPosture(status: Record<string, boolean>) {
  const configuredCount = Object.values(status).filter(Boolean).length;
  const readonlyConfiguredCount = Array.from(READONLY_SENSITIVE_KEYS).filter(
    (key) => status[key] === true,
  ).length;
  const editableConfiguredCount = configuredCount - readonlyConfiguredCount;

  return {
    inventoryCount: SENSITIVE_KEYS.length,
    configuredCount,
    readonlyConfiguredCount,
    editableConfiguredCount,
    tokenGateConfigured: READONLY_SENSITIVE_KEYS.has("NEXUS_TOKEN")
      ? status.NEXUS_TOKEN === true
      : false,
    localEnvOnly: true as const,
    rawValuesReturned: false as const,
  };
}

// GET — return which keys are set (true/false), not the values
export async function GET() {
  const env = await readEnvFile();
  const effectiveEnv = { ...process.env, ...env };
  const status: Record<string, boolean> = {};
  for (const key of SENSITIVE_KEYS) {
    const legacyMatch = Object.entries(LEGACY_KEY_ALIASES).find(
      ([, canonical]) => canonical === key,
    )?.[0];
    status[key] = isConfiguredSecretValue(
      env[key] ??
      process.env[key] ??
      (legacyMatch ? (env[legacyMatch] ?? process.env[legacyMatch]) : ""),
    );
  }
  const config: {
    NEXUS_NETWORK_MODE: NetworkMode;
    NEXUS_ENABLE_HIGH_RISK_TOOLS: "true" | "false" | string;
    NEXUS_ALLOW_PAID_APIS: "true" | "false" | string;
    NEXUS_CONNECTOR_POLICY_JSON: ReturnType<typeof parseConnectorPolicy>;
    NEXUS_DEPLOYMENT_PROFILE: ReturnType<typeof readPendingDeploymentProfile>;
  } = {
    NEXUS_NETWORK_MODE:
      normalizeConfigValue(
        "NEXUS_NETWORK_MODE",
        env.NEXUS_NETWORK_MODE ?? process.env.NEXUS_NETWORK_MODE ?? readNetworkMode(),
      ) as NetworkMode,
    NEXUS_ENABLE_HIGH_RISK_TOOLS:
      env.NEXUS_ENABLE_HIGH_RISK_TOOLS ??
      process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS ??
      "false",
    NEXUS_ALLOW_PAID_APIS:
      env.NEXUS_ALLOW_PAID_APIS ?? process.env.NEXUS_ALLOW_PAID_APIS ?? "false",
    NEXUS_CONNECTOR_POLICY_JSON: parseConnectorPolicy(
      env.NEXUS_CONNECTOR_POLICY_JSON ?? process.env.NEXUS_CONNECTOR_POLICY_JSON,
    ),
    NEXUS_DEPLOYMENT_PROFILE: readPendingDeploymentProfile(env),
  };
  const response = protectedJson({
    status,
    secretPosture: buildSecretPosture(status),
    config,
    brand: {
      name: BRAND_NAME,
      tagline: BRAND_TAGLINE,
    },
    providers: summarizeProviderReadiness(effectiveEnv),
    release: {
      buildChannel: readBuildChannel(),
      buildVersion: readBuildVersion(),
      supportedSurfacePolicy: RELEASE_DEFAULTS.supportedSurfacePolicy,
      canonicalDeploymentLane: RELEASE_DEFAULTS.canonicalDeploymentLane,
      defaultEntrypoint: getDefaultEntrypoint(),
      uiShellVersion: RELEASE_DEFAULTS.uiShellVersion,
      aliases: listSurfaceAliases(),
      surfaces: summarizeSurfaceTiers().counts,
    },
  });
  applyRuntimePolicyCookies(response, {
    networkMode: config.NEXUS_NETWORK_MODE,
    highRiskEnabled: config.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true",
  });
  return response;
}

// POST — update one or more keys in .env.local
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, string>;

    // Only allow updating known sensitive keys (minus internal tokens)
    const updates: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      const canonicalKey = LEGACY_KEY_ALIASES[k] ?? k;
      if (
        SENSITIVE_KEYS.includes(canonicalKey) &&
        !READONLY_SENSITIVE_KEYS.has(canonicalKey)
      ) {
        updates[canonicalKey] = normalizeConfigValue(canonicalKey, String(v));
      }
    }

    if (Object.keys(updates).length === 0) {
      return protectedJson(
        { ok: false, error: "No valid keys provided" },
        { status: 400 },
      );
    }

    await writeEnvFile(updates);
    for (const [key, value] of Object.entries(updates)) {
      process.env[key] = value;
    }
    const env = await readEnvFile();
    const networkMode = normalizeConfigValue(
      "NEXUS_NETWORK_MODE",
      env.NEXUS_NETWORK_MODE ?? process.env.NEXUS_NETWORK_MODE ?? getDefaultNetworkMode(),
    ) as NetworkMode;
    const highRiskEnabled =
      normalizeConfigValue(
        "NEXUS_ENABLE_HIGH_RISK_TOOLS",
        env.NEXUS_ENABLE_HIGH_RISK_TOOLS ??
          process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS ??
          "false",
      ) === "true";
    const response = protectedJson({ ok: true, needsRestart: false, runtimePatched: true });
    applyRuntimePolicyCookies(response, { networkMode, highRiskEnabled });
    return response;
  } catch {
    return protectedJson(
      { ok: false, error: "Write failed" },
      { status: 500 },
    );
  }
}
