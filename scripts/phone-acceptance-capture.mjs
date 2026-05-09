#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envLocalPath = path.join(root, ".env.local");
const metricsDir = path.join(root, "docs", "metrics");
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const DEFAULT_ROUTES = [
  "/api/health",
  "/hq?focus=hq-chronicle",
  "/command",
  "/api/free-local-readiness",
];

const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

function parseArgs(argv) {
  const args = {
    manual: {
      phoneOpened: false,
      phoneLogin: false,
      pingReceipt: false,
      localAiReceipt: false,
      pwaInstalled: false,
    },
  };

  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      args.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--routes=")) {
      args.routes = arg
        .slice("--routes=".length)
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = arg.slice("--out-dir=".length);
    } else if (arg === "--phone-opened") {
      args.manual.phoneOpened = true;
    } else if (arg === "--phone-login") {
      args.manual.phoneLogin = true;
    } else if (arg === "--ping-receipt") {
      args.manual.pingReceipt = true;
    } else if (arg === "--local-ai-receipt") {
      args.manual.localAiReceipt = true;
    } else if (arg === "--pwa-installed") {
      args.manual.pwaInstalled = true;
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

function envValue(key, fileEnv) {
  return process.env[key] ?? fileEnv[key] ?? "";
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sanitizeString(value) {
  return value
    .replace(PRIVATE_LAN_IP_RE, "<LAN-IP>")
    .replace(WINDOWS_HOME_RE, "<repo-root>");
}

function sanitizeValue(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeValue(nestedValue, nestedKey),
      ]),
    );
  }

  if (typeof value === "string") {
    if (/token|secret|password|authorization|cookie|header/i.test(key)) {
      return Boolean(value);
    }
    return sanitizeString(value);
  }

  return value;
}

function routeIsHealthy(result) {
  if (result.route === "/api/health") return result.status === 200;
  if (result.route === "/api/free-local-readiness") return result.status === 200;
  return result.status >= 200 && result.status < 400;
}

async function fetchRoute(baseUrl, route, token) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = token ? { [INTERNAL_AUTH_HEADER]: token } : undefined;
    const response = await fetch(`${baseUrl}${route}`, {
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      route,
      ok: routeIsHealthy({ route, status: response.status }),
      status: response.status,
      redirected: response.status >= 300 && response.status < 400,
      contentType: response.headers.get("content-type") ?? "",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      redirected: false,
      contentType: null,
      durationMs: Date.now() - startedAt,
      error: sanitizeString(error instanceof Error ? error.message : String(error)),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchReadiness(baseUrl, token) {
  if (!token) {
    return {
      ok: false,
      status: 0,
      summary: null,
      error: "NEXUS_TOKEN unavailable; protected readiness capture skipped.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/free-local-readiness`, {
      headers: { [INTERNAL_AUTH_HEADER]: token },
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        summary: null,
      };
    }

    const snapshot = await response.json();
    return {
      ok: true,
      status: response.status,
      summary: summarizeReadiness(snapshot),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      summary: null,
      error: sanitizeString(error instanceof Error ? error.message : String(error)),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeReadiness(snapshot) {
  return sanitizeValue({
    overallStatus: snapshot?.overallStatus ?? "unknown",
    freeInvariant: {
      status: snapshot?.freeInvariant?.status ?? "unknown",
      chargesEndUsers: snapshot?.freeInvariant?.chargesEndUsers,
      value: snapshot?.freeInvariant?.value ?? "",
    },
    networkMode: {
      status: snapshot?.networkMode?.status ?? "unknown",
      mode: snapshot?.networkMode?.mode ?? "unknown",
      value: snapshot?.networkMode?.value ?? "",
    },
    paidApisAllowed: {
      status: snapshot?.paidApisAllowed?.status ?? "unknown",
      allowed: snapshot?.paidApisAllowed?.allowed,
      value: snapshot?.paidApisAllowed?.value ?? "",
    },
    ollama: {
      status: snapshot?.ollama?.status ?? "unknown",
      reachable: snapshot?.ollama?.reachable,
      installedCount: snapshot?.ollama?.installedCount ?? 0,
      runningCount: snapshot?.ollama?.runningCount ?? 0,
      value: snapshot?.ollama?.value ?? "",
    },
    resolvedModel: {
      status: snapshot?.resolvedModel?.status ?? "unknown",
      resolvedModel: snapshot?.resolvedModel?.resolvedModel ?? null,
      value: snapshot?.resolvedModel?.value ?? "",
      resolutionReason: snapshot?.resolvedModel?.resolutionReason ?? "",
    },
    agentHealth: {
      status: snapshot?.agentHealth?.status ?? "unknown",
      passRate: snapshot?.agentHealth?.passRate ?? null,
      passCount: snapshot?.agentHealth?.passCount ?? 0,
      failCount: snapshot?.agentHealth?.failCount ?? 0,
      lastRun: snapshot?.agentHealth?.lastRun ?? null,
    },
    session: {
      status: snapshot?.session?.status ?? "unknown",
      authenticated: snapshot?.session?.authenticated,
      tokenConfigured: snapshot?.session?.tokenConfigured,
      remainingSeconds: snapshot?.session?.remainingSeconds ?? null,
    },
    toolPosture: {
      status: snapshot?.toolPosture?.status ?? "unknown",
      highRiskEnabled: snapshot?.toolPosture?.highRiskEnabled,
      settingsWrites: snapshot?.toolPosture?.settingsWrites ?? "",
      verification: snapshot?.toolPosture?.verification ?? "",
      mutateExecTools: snapshot?.toolPosture?.mutateExecTools ?? "",
      networkedTools: snapshot?.toolPosture?.networkedTools ?? "",
      value: snapshot?.toolPosture?.value ?? "",
    },
    phoneLan: {
      status: snapshot?.phoneLan?.status ?? "unknown",
      enabled: snapshot?.phoneLan?.enabled,
      tokenRequired: snapshot?.phoneLan?.tokenRequired,
      pwaReady: snapshot?.phoneLan?.pwaReady,
      preferredLanUrl: snapshot?.phoneLan?.preferredLanUrl ?? null,
      preferredHqLanUrl: snapshot?.phoneLan?.preferredHqLanUrl ?? null,
      lanUrlCount: snapshot?.phoneLan?.lanUrls?.length ?? 0,
      hqLanUrlCount: snapshot?.phoneLan?.hqLanUrls?.length ?? 0,
      firewallStatus: snapshot?.phoneLan?.firewallStatus ?? "",
      tailscaleOptional: snapshot?.phoneLan?.tailscaleOptional ?? "",
    },
  });
}

function readinessIsLocalFree(summary) {
  if (!summary) return false;
  return (
    summary.freeInvariant?.chargesEndUsers === false &&
    summary.networkMode?.mode === "isolated" &&
    summary.paidApisAllowed?.allowed === false &&
    summary.ollama?.reachable === true &&
    Boolean(summary.resolvedModel?.resolvedModel) &&
    summary.session?.authenticated === true &&
    summary.toolPosture?.highRiskEnabled === false &&
    summary.phoneLan?.enabled === true
  );
}

function manualProofBlockedReasons(manual) {
  const blocked = [];
  if (!manual.phoneOpened) blocked.push("Manual phone proof missing: phone opened LAN URL.");
  if (!manual.phoneLogin) blocked.push("Manual phone proof missing: phone logged in with NEXUS_TOKEN.");
  if (!manual.pingReceipt) blocked.push("Manual phone proof missing: HQ ping receipt.");
  if (!manual.localAiReceipt) blocked.push("Manual phone proof missing: local AI receipt.");
  if (!manual.pwaInstalled) blocked.push("Manual phone proof missing: PWA install.");
  return blocked;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnvFile(envLocalPath);
  const baseUrl = normalizeBaseUrl(args.baseUrl ?? DEFAULT_BASE_URL);
  const token = envValue("NEXUS_TOKEN", fileEnv);
  const hasToken = Boolean(token);
  const routes = args.routes ?? DEFAULT_ROUTES;
  const capturedAt = new Date();

  const routeResults = [];
  for (const route of routes) {
    const result = await fetchRoute(baseUrl, route, token);
    routeResults.push(result);
    const label = result.status === 0 ? "ERR" : result.status;
    console.log(`[phone-acceptance] ${route} ${label} ${result.durationMs}ms`);
  }

  const readiness = await fetchReadiness(baseUrl, token);
  const blocked = [];

  for (const result of routeResults) {
    if (!result.ok) {
      blocked.push(
        `Route ${result.route} did not pass acceptance capture (${result.status || "ERR"}).`,
      );
    }
  }

  if (!hasToken) {
    blocked.push("NEXUS_TOKEN unavailable; protected readiness capture is auth-gated.");
  }
  if (!readiness.ok) {
    blocked.push(
      `Free Local Readiness capture did not return 200 (${readiness.status || "ERR"}).`,
    );
  }
  if (!readinessIsLocalFree(readiness.summary)) {
    blocked.push("Free Local Readiness is not fully local/free for phone acceptance.");
  }
  blocked.push(...manualProofBlockedReasons(args.manual));

  const artifact = {
    capturedAt: capturedAt.toISOString(),
    baseUrl: sanitizeString(baseUrl),
    routes: sanitizeValue(routeResults),
    readinessSummary: readiness.summary,
    manualPhoneProof: args.manual,
    blocked,
    acceptanceReady: blocked.length === 0,
  };

  const outDir = args.outDir ? path.resolve(root, args.outDir) : metricsDir;
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(
    outDir,
    `phone-local-acceptance-${timestampForFile(capturedAt)}.json`,
  );
  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`phone acceptance captured: ${path.relative(root, outPath)}`);
  console.log(`acceptance ready: ${artifact.acceptanceReady ? "true" : "false"}`);

  if (blocked.length > 0) {
    console.log("blocked acceptance items:");
    for (const reason of blocked) console.log(`- ${sanitizeString(reason)}`);
  }
}

main().catch((error) => {
  console.error("phone:acceptance:capture failed");
  console.error(sanitizeString(error instanceof Error ? error.stack || error.message : String(error)));
  process.exit(1);
});
