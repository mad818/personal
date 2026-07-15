import { existsSync, readFileSync } from "fs";
import { networkInterfaces } from "os";
import { join } from "path";
import { NextRequest } from "next/server";
import { DEFAULT_LOCAL_MODEL, type AITask } from "@/lib/aiModelRouting";
import {
  getConfiguredNexusToken,
  isNexusAuthEnabled,
  isNexusPhoneTokenConfigured,
} from "@/lib/authSession";
import type {
  FreeLocalReadinessAction,
  FreeLocalReadinessSection,
  FreeLocalReadinessSnapshot,
  FreeLocalReadinessStatus,
  PhoneLanReadinessSnapshot,
} from "@/lib/freeLocalReadiness";
import {
  NEXUS_APP_CHARGES_END_USERS,
  NEXUS_FREE_USE_DESCRIPTION,
  NEXUS_FREE_USE_LABEL,
} from "@/lib/productGuarantees";
import { protectedJson } from "@/lib/protectedApi";
import { readRuntimeIdentity } from "@/lib/runtimeIdentity";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";
import {
  listReachableOllamaModels,
  listRunningOllamaModels,
  resolveInstalledOllamaModel,
} from "@/lib/ollamaModelResolver";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import {
  readProtectedActionContext,
  resolveProtectedActionDescriptor,
} from "@/lib/security/toolCapabilityPolicy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface EvalCheck {
  pass?: boolean;
}

function section(
  status: FreeLocalReadinessStatus,
  label: string,
  value: string,
  detail: string,
): FreeLocalReadinessSection {
  return { status, label, value, detail };
}

function readLanAddresses() {
  const addresses: string[] = [];
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!entry.address || entry.address.startsWith("169.254.")) continue;
      addresses.push(entry.address);
    }
  }
  return Array.from(new Set(addresses)).sort();
}

async function readAgentHealth() {
  const latestPath = join(
    resolveRuntimeProjectRoot(),
    "docs",
    "metrics",
    "agent-runtime-latest.json",
  );
  if (!existsSync(latestPath)) {
    return {
      passRate: null,
      passCount: 0,
      failCount: 0,
      lastRun: null,
    };
  }
  try {
    const latest = JSON.parse(readFileSync(latestPath, "utf-8")) as {
      ts?: string;
      score?: number;
      checks?: EvalCheck[];
    };
    const checks = latest.checks ?? [];
    const passCount = checks.filter((check) => check.pass).length;
    const failCount = Math.max(0, checks.length - passCount);
    const passRate =
      typeof latest.score === "number"
        ? Math.max(0, Math.min(1, latest.score / 100))
        : checks.length
          ? passCount / checks.length
          : null;
    return {
      passRate,
      passCount,
      failCount,
      lastRun: latest.ts ?? null,
    };
  } catch {
    return {
      passRate: null,
      passCount: 0,
      failCount: 0,
      lastRun: null,
    };
  }
}

function buildPhoneLanSnapshot(input: {
  tokenRequired: boolean;
  phoneTokenConfigured: boolean;
}): PhoneLanReadinessSnapshot {
  const enabled = process.env.NEXUS_PHONE_LAN_ENABLED === "true";
  const bindHost =
    process.env.NEXUS_RUNTIME_HOST ?? process.env.HOSTNAME ?? "127.0.0.1";
  const port =
    process.env.NEXUS_PHONE_LAN_PORT ??
    process.env.NEXUS_RUNTIME_PORT ??
    process.env.PORT ??
    "3100";
  const lanUrls = enabled
    ? readLanAddresses().map((address) => `http://${address}:${port}`)
    : [];
  const hqLanUrls = lanUrls.map((url) => `${url}/hq?focus=hq-chronicle`);
  const desktopUrl = `http://127.0.0.1:${port}`;
  const desktopHqUrl = `${desktopUrl}/hq?focus=hq-chronicle`;

  return {
    enabled,
    bindHost: enabled ? "0.0.0.0" : bindHost,
    port,
    desktopUrl,
    desktopHqUrl,
    lanUrls,
    hqLanUrls,
    preferredLanUrl: lanUrls[0] ?? null,
    preferredHqLanUrl: hqLanUrls[0] ?? null,
    tokenRequired: input.tokenRequired,
    phoneTokenConfigured: input.phoneTokenConfigured,
    pwaReady: true,
    firewallStatus: enabled
      ? "Allow Node/Next on this port through Windows Firewall before using phone LAN access."
      : "Disabled until NEXUS_PHONE_LAN_ENABLED=true or npm run phone:lan:start is used intentionally.",
    tailscaleOptional:
      "Optional free private tunnel: use Tailscale personal/free tier if LAN is not available.",
  };
}

function worstStatus(statuses: FreeLocalReadinessStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("checking")) return "checking";
  return "ready";
}

export async function GET(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-free-local-readiness",
    windowMs: 10_000,
    maxAttempts: 20,
    includeBearerToken: false,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: { message: "Free local readiness endpoint rate limited." } },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  const trustContext = await readProtectedActionContext(req);
  const runtime = readRuntimeIdentity();
  const authEnabled = isNexusAuthEnabled();
  const tokenConfigured = Boolean(getConfiguredNexusToken());
  const tokenRequired = authEnabled && tokenConfigured;
  const phoneTokenConfigured = isNexusPhoneTokenConfigured();
  const paidApisAllowed = process.env.NEXUS_ALLOW_PAID_APIS === "true";
  const requestedModel =
    req.nextUrl.searchParams.get("model")?.trim() || DEFAULT_LOCAL_MODEL;
  const task = (req.nextUrl.searchParams.get("task")?.trim() || "default") as
    | AITask
    | "default";

  const [catalog, running, resolution, agentHealth] = await Promise.all([
    listReachableOllamaModels(),
    listRunningOllamaModels(),
    resolveInstalledOllamaModel({
      requestedModel,
      task,
      preferActiveModel: true,
    }),
    readAgentHealth(),
  ]);

  const ollamaReachable =
    catalog.reachable || running.reachable || resolution.reachable;
  const modelResolved = Boolean(resolution.resolvedModel);
  const sessionAuthenticated = authEnabled
    ? trustContext.sessionAuthenticated
    : true;
  const phoneLanSnapshot = buildPhoneLanSnapshot({
    tokenRequired,
    phoneTokenConfigured,
  });

  const freeInvariant = {
    ...section(
      "ready",
      "Free invariant",
      NEXUS_FREE_USE_LABEL,
      NEXUS_FREE_USE_DESCRIPTION,
    ),
    chargesEndUsers: NEXUS_APP_CHARGES_END_USERS,
    label: NEXUS_FREE_USE_LABEL,
  } satisfies FreeLocalReadinessSnapshot["freeInvariant"];

  const networkMode = {
    ...section(
      trustContext.networkMode === "isolated" ? "ready" : "warning",
      "Network mode",
      trustContext.networkMode,
      trustContext.networkMode === "isolated"
        ? "Offline/local-only posture is active. Connector routes stay locked."
        : "Set NEXUS_NETWORK_MODE=isolated for the strict offline local profile.",
    ),
    mode: trustContext.networkMode,
  } satisfies FreeLocalReadinessSnapshot["networkMode"];

  const paidApis = {
    ...section(
      paidApisAllowed ? "warning" : "ready",
      "Paid APIs",
      paidApisAllowed ? "allowed" : "blocked",
      paidApisAllowed
        ? "Paid provider access is explicitly enabled. Disable it for the fully free default."
        : "Paid provider access is blocked by default.",
    ),
    allowed: paidApisAllowed,
  } satisfies FreeLocalReadinessSnapshot["paidApisAllowed"];

  const runtimeSection = {
    ...section(
      "ready",
      "Website runtime",
      "online",
      "The local Next.js runtime answered this protected readiness check.",
    ),
    bootId: runtime.bootId,
    startedAt: runtime.startedAt,
    ageSeconds:
      typeof runtime.ageSeconds === "number" ? runtime.ageSeconds : null,
  } satisfies FreeLocalReadinessSnapshot["runtime"];

  const ollama = {
    ...section(
      ollamaReachable ? "ready" : "blocked",
      "Ollama",
      ollamaReachable ? "reachable" : "offline",
      ollamaReachable
        ? `${catalog.models.length} installed model(s), ${running.models.length} running model(s).`
        : "Start Ollama at http://localhost:11434 before local AI can answer.",
    ),
    reachable: ollamaReachable,
    tagsUrl: catalog.tagsUrl,
    psUrl: running.psUrl,
    installedCount: catalog.models.length,
    runningCount: running.models.length,
  } satisfies FreeLocalReadinessSnapshot["ollama"];

  const resolvedModel = {
    ...section(
      modelResolved ? "ready" : "blocked",
      "Resolved model",
      resolution.resolvedModel ?? "missing",
      modelResolved
        ? `Requested ${resolution.requestedModel}; using ${resolution.resolvedModel} (${resolution.reason}).`
        : `Requested ${resolution.requestedModel}; no installed Ollama model could be resolved.`,
    ),
    requestedModel: resolution.requestedModel,
    resolvedModel: resolution.resolvedModel,
    resolutionReason: resolution.reason,
  } satisfies FreeLocalReadinessSnapshot["resolvedModel"];

  const agentHealthSection = {
    ...section(
      agentHealth.passRate === null
        ? "warning"
        : agentHealth.passRate >= 0.85
          ? "ready"
          : "warning",
      "Agent health",
      agentHealth.passRate === null
        ? "not recorded"
        : `${Math.round(agentHealth.passRate * 100)}%`,
      agentHealth.lastRun
        ? `${agentHealth.passCount} pass / ${agentHealth.failCount} fail · ${agentHealth.lastRun}`
        : "Run npm run eval:agent-runtime:ci for a fresh local proof snapshot.",
    ),
    ...agentHealth,
  } satisfies FreeLocalReadinessSnapshot["agentHealth"];

  const storage = {
    ...section(
      "checking",
      "Browser storage",
      "client checked",
      "The browser panel checks localStorage/session behavior because server routes cannot inspect it.",
    ),
    browserLocalStorage: "unknown",
  } satisfies FreeLocalReadinessSnapshot["storage"];

  const session = {
    ...section(
      sessionAuthenticated ? "ready" : "blocked",
      "Session",
      sessionAuthenticated ? "authenticated" : "session required",
      tokenRequired
        ? "Protected APIs require NEXUS_TOKEN; current browser session must be logged in."
        : "No required token is configured for this local runtime.",
    ),
    authenticated: sessionAuthenticated,
    tokenConfigured,
    remainingSeconds: trustContext.session?.remainingSeconds ?? null,
  } satisfies FreeLocalReadinessSnapshot["session"];

  const settingsWrites = resolveProtectedActionDescriptor(
    "settings_writes",
    trustContext,
  );
  const verification = resolveProtectedActionDescriptor(
    "verification",
    trustContext,
  );
  const mutateExecTools = resolveProtectedActionDescriptor(
    "tools_mutate_exec",
    trustContext,
  );
  const networkedTools = resolveProtectedActionDescriptor(
    "tools_networked",
    trustContext,
  );
  const toolPosture = {
    ...section(
      trustContext.highRiskEnabled ? "warning" : "ready",
      "Tool posture",
      trustContext.highRiskEnabled ? "high-risk enabled" : "review-gated",
      "Read/analyze tools stay local. Mutating, exec, and networked tools remain gated by route policy and step-up posture.",
    ),
    highRiskEnabled: trustContext.highRiskEnabled,
    settingsWrites: settingsWrites.status,
    verification: verification.status,
    mutateExecTools: mutateExecTools.status,
    networkedTools: networkedTools.status,
  } satisfies FreeLocalReadinessSnapshot["toolPosture"];

  const phoneLan = {
    ...section(
      phoneLanSnapshot.enabled
        ? phoneLanSnapshot.lanUrls.length > 0
          ? "ready"
          : "warning"
        : "warning",
      "Phone LAN",
      phoneLanSnapshot.enabled ? "enabled" : "disabled",
      phoneLanSnapshot.enabled
        ? phoneLanSnapshot.lanUrls.length > 0
          ? "Use a listed LAN URL from your phone while this desktop runtime stays on."
          : "LAN mode is enabled, but no non-internal IPv4 address was detected."
        : "Use npm run phone:lan:start when you want phone access through this desktop.",
    ),
    ...phoneLanSnapshot,
  } satisfies FreeLocalReadinessSnapshot["phoneLan"];

  const recoveryActions: FreeLocalReadinessAction[] = [];
  if (!sessionAuthenticated) {
    recoveryActions.push({
      label: "Reset session",
      detail: "Return to the landing/token gate and sign in again.",
      href: "/",
    });
  }
  if (!ollamaReachable) {
    recoveryActions.push({
      label: "Start Ollama",
      detail: "Start the local model server before AI dispatch.",
      command: "ollama serve",
    });
  }
  if (!modelResolved) {
    recoveryActions.push({
      label: "Pull model",
      detail: `Install the requested local model ${resolution.requestedModel}.`,
      command: `ollama pull ${resolution.requestedModel}`,
    });
  }
  if (trustContext.networkMode !== "isolated") {
    recoveryActions.push({
      label: "Lock network",
      detail: "Use the strict local/offline route policy.",
      command: "$env:NEXUS_NETWORK_MODE='isolated'",
    });
  }
  if (paidApisAllowed) {
    recoveryActions.push({
      label: "Block paid APIs",
      detail: "Return to the free default.",
      command: "$env:NEXUS_ALLOW_PAID_APIS='false'",
    });
  }
  if (!phoneLanSnapshot.enabled) {
    recoveryActions.push({
      label: "Start phone LAN",
      detail: "Bind the local app for phone browser/PWA access.",
      command: "npm run phone:lan:start",
    });
  }

  const overallStatus = worstStatus([
    networkMode.status,
    paidApis.status,
    runtimeSection.status,
    ollama.status,
    resolvedModel.status,
    agentHealthSection.status,
    session.status,
    toolPosture.status,
  ]);

  const body: FreeLocalReadinessSnapshot = {
    ok: overallStatus !== "blocked",
    generatedAt: new Date().toISOString(),
    overallStatus,
    headline:
      overallStatus === "ready"
        ? "Free local lane is ready"
        : overallStatus === "blocked"
          ? "Free local lane needs recovery"
          : "Free local lane needs review",
    summary:
      "Homefront stays free-first: local runtime, Ollama-first AI, paid APIs blocked by default, and phone access through an explicit desktop/LAN path.",
    freeInvariant,
    networkMode,
    paidApisAllowed: paidApis,
    runtime: runtimeSection,
    ollama,
    resolvedModel,
    agentHealth: agentHealthSection,
    storage,
    session,
    toolPosture,
    phoneLan,
    recoveryActions,
  };

  const response = protectedJson(body);
  applyRateLimitHeaders(response, rateLimitConfig);
  return response;
}
