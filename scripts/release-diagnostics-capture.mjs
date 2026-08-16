#!/usr/bin/env node
/* eslint-disable no-console */

import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_RELEASE_CANDIDATE_TAG,
  resolveLocalReleaseCandidate,
} from "./release-candidate.mjs";

const root = process.cwd();
const envLocalPath = path.join(root, ".env.local");
const metricsDir = path.join(root, "docs", "metrics");
const matrixPath = path.join(root, "lib", "release-matrix.json");
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const MAX_RESPONSE_BYTES = 256 * 1024;
const EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EXPECTED_PROFILE = "web-self-hosted";
const EXPECTED_ENV_SCHEMA = "nexus-runtime-env.v1";

const releaseMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const gaRoutes = releaseMatrix.surfaces
  .filter((surface) => surface.tier === "ga")
  .map((surface) => surface.href);

export const DEFAULT_DIAGNOSTIC_ROUTES = Object.freeze([
  "/api/health",
  "/",
  ...gaRoutes,
  "/api/status",
  "/api/diagnostics",
]);

export function validateDiagnosticRoute(value) {
  const route = String(value ?? "");
  if (!route || route !== route.trim()) {
    throw new Error("Diagnostic routes must be non-empty absolute paths.");
  }
  if (!route.startsWith("/") || route.startsWith("//")) {
    throw new Error(
      "Diagnostic routes must begin with exactly one forward slash.",
    );
  }
  if (route.includes("?") || route.includes("#")) {
    throw new Error("Diagnostic routes must not contain a query or fragment.");
  }

  let decoded;
  try {
    decoded = decodeURIComponent(route);
  } catch {
    throw new Error("Diagnostic routes must use valid URL encoding.");
  }
  if (
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("@") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    throw new Error("Diagnostic route contains an unsafe path sequence.");
  }
  return route;
}

export function resolveDiagnosticRoute(origin, route) {
  const validatedRoute = validateDiagnosticRoute(route);
  const resolved = new URL(validatedRoute, origin);
  if (resolved.origin !== origin) {
    throw new Error(
      "Diagnostic route must remain on the release target origin.",
    );
  }
  return resolved.href;
}

function parseArgs(argv) {
  const args = {
    requireStaged: false,
    releaseTag: ACTIVE_RELEASE_CANDIDATE_TAG,
  };

  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      args.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--routes=")) {
      args.routes = arg
        .slice("--routes=".length)
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean)
        .map(validateDiagnosticRoute);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = arg.slice("--out-dir=".length);
    } else if (arg.startsWith("--release-tag=")) {
      args.releaseTag = arg.slice("--release-tag=".length);
    } else if (arg === "--require-staged") {
      args.requireStaged = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
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

export function parseReleaseTarget(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Release target is missing.");

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Release target must be a valid HTTP(S) origin.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Release target must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Release target must not contain credentials.");
  }
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
    throw new Error(
      "Release target must be an origin without path, query, or fragment.",
    );
  }

  const hostname = url.hostname.toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  if (!local && url.protocol !== "https:") {
    throw new Error("Remote staging targets must use HTTPS.");
  }

  return {
    origin: url.origin,
    local,
    staged: !local,
    protocol: url.protocol.slice(0, -1),
  };
}

export function buildTargetId(value, evidenceKey = "") {
  const { origin, local } = parseReleaseTarget(value);
  if (local) return "local-loopback";
  if (String(evidenceKey).length < 16) {
    throw new Error(
      "A private evidence key is required for staged target identity.",
    );
  }
  return `staging-${createHmac("sha256", String(evidenceKey))
    .update(origin)
    .digest("hex")
    .slice(0, 16)}`;
}

export function classifyReleaseTarget(value, { evidenceKey = "" } = {}) {
  const parsed = parseReleaseTarget(value);
  return {
    kind: parsed.local ? "local" : "staged",
    local: parsed.local,
    staged: parsed.staged,
    protocol: parsed.protocol,
    targetId: buildTargetId(parsed.origin, evidenceKey),
    display: parsed.local ? parsed.origin : "https://<staging-target>",
  };
}

function sanitizeString(value) {
  return String(value ?? "")
    .replace(
      /\b(https?):\/\/([A-Za-z0-9.-]+)(?::\d+)?/gi,
      (match, protocol, hostname) => {
        const normalized = hostname.toLowerCase();
        if (normalized === "localhost" || normalized === "127.0.0.1") {
          return match;
        }
        return `${protocol.toLowerCase()}://<staging-target>`;
      },
    )
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted>")
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g, "<repo-root>");
}

export function sanitizeDiagnosticValue(value, key = "") {
  if (/token|secret|password|key|authorization/i.test(key)) {
    return Boolean(value);
  }
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value))
    return value.map((entry) => sanitizeDiagnosticValue(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([nestedKey, nested]) => [
      nestedKey,
      sanitizeDiagnosticValue(nested, nestedKey),
    ]),
  );
}

async function readBoundedBody(response) {
  if (!response.body) return { text: "", byteLength: 0, withinLimit: true };
  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_RESPONSE_BYTES) {
      await reader.cancel("response exceeded diagnostics byte limit");
      return { text: "", byteLength, withinLimit: false };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    text: new TextDecoder().decode(merged),
    byteLength,
    withinLimit: true,
  };
}

async function safeBody(response, contentType) {
  try {
    const bounded = await readBoundedBody(response);
    if (!bounded.withinLimit) {
      return {
        body: null,
        byteLength: bounded.byteLength,
        withinLimit: false,
        error: `response exceeded ${MAX_RESPONSE_BYTES} bytes`,
      };
    }
    if (contentType.includes("application/json")) {
      try {
        return {
          body: sanitizeDiagnosticValue(JSON.parse(bounded.text || "null")),
          byteLength: bounded.byteLength,
          withinLimit: true,
          error: null,
        };
      } catch {
        return {
          body: null,
          byteLength: bounded.byteLength,
          withinLimit: false,
          error: "invalid JSON response",
        };
      }
    }
    return {
      body: bounded.text
        ? { received: true, byteLength: bounded.byteLength }
        : null,
      byteLength: bounded.byteLength,
      withinLimit: true,
      error: null,
    };
  } catch (error) {
    return {
      body: null,
      byteLength: 0,
      withinLimit: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function allowlistedJsonBody(route, body) {
  if (!body || typeof body !== "object") return body;
  if (route === "/api/health") {
    return {
      status: body.status ?? null,
      runtime: { bootId: body.runtime?.bootId ?? null },
    };
  }
  if (route === "/api/status" || route === "/api/diagnostics") {
    return {
      runtime: {
        bootId: body.runtime?.bootId ?? body.readiness?.runtime?.bootId ?? null,
      },
      releaseIdentity: body.releaseIdentity ?? null,
      release: {
        profile:
          body.release?.deploymentProfile ??
          body.release?.profile ??
          body.readiness?.release?.profile ??
          null,
      },
    };
  }
  return null;
}

function selectedHeaders(response) {
  return {
    cacheControl: response.headers.get("cache-control"),
    contentSecurityPolicy: response.headers.get("content-security-policy"),
    strictTransportSecurity: response.headers.get("strict-transport-security"),
    xContentTypeOptions: response.headers.get("x-content-type-options"),
    xFrameOptions: response.headers.get("x-frame-options"),
    referrerPolicy: response.headers.get("referrer-policy"),
  };
}

async function fetchRoute(origin, route, token) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const requestUrl = resolveDiagnosticRoute(origin, route);
    const headers = token ? { [INTERNAL_AUTH_HEADER]: token } : undefined;
    const response = await fetch(requestUrl, {
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const bodyResult = await safeBody(response, contentType);
    const redirected = response.status >= 300 && response.status < 400;
    return {
      route,
      ok: (response.ok || redirected) && bodyResult.withinLimit,
      status: response.status,
      redirected,
      contentType,
      durationMs: Date.now() - startedAt,
      responseBytes: bodyResult.byteLength,
      bodyWithinLimit: bodyResult.withinLimit,
      headers: selectedHeaders(response),
      body: contentType.includes("application/json")
        ? allowlistedJsonBody(route, bodyResult.body)
        : bodyResult.body,
      error: bodyResult.error,
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      redirected: false,
      contentType: null,
      durationMs: Date.now() - startedAt,
      responseBytes: 0,
      bodyWithinLimit: false,
      headers: null,
      body: null,
      error:
        error instanceof Error
          ? sanitizeString(error.message)
          : "request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function routeByPath(routes, route) {
  return routes.find((entry) => entry.route === route) ?? null;
}

export function buildSecurityPosture(target, routes) {
  if (!target.staged) {
    return {
      required: false,
      passed: false,
      checks: [],
      blocked: ["HTTPS security-header proof requires a real staged target."],
    };
  }

  const rootRoute = routeByPath(routes, "/");
  const csp = rootRoute?.headers?.contentSecurityPolicy ?? "";
  const hsts = rootRoute?.headers?.strictTransportSecurity ?? "";
  const xFrameOptions =
    rootRoute?.headers?.xFrameOptions?.trim().toUpperCase() ?? "";
  const hstsMaxAge = /(?:^|;)\s*max-age\s*=\s*(\d+)/i.exec(hsts)?.[1];
  const hstsEffective = Boolean(hstsMaxAge) && Number(hstsMaxAge) >= 86_400;
  const cspEffective =
    Boolean(csp) &&
    /(?:^|;)\s*default-src\s+/i.test(csp) &&
    !/(?:^|;)\s*default-src\s+\*(?:\s|;|$)/i.test(csp);
  const frameProtected =
    ["DENY", "SAMEORIGIN"].includes(xFrameOptions) ||
    /(?:^|;)\s*frame-ancestors\s+(?:'none'|'self')(?:\s|;|$)/i.test(csp);
  const checks = [
    {
      id: "https",
      passed: target.protocol === "https",
      reason: "Remote target uses HTTPS.",
    },
    {
      id: "hsts",
      passed: hstsEffective,
      reason:
        "Root response enforces Strict-Transport-Security for at least one day.",
    },
    {
      id: "csp",
      passed: cspEffective,
      reason:
        "Root response exposes a non-wildcard default Content-Security-Policy.",
    },
    {
      id: "frame-protection",
      passed: frameProtected,
      reason: "Root response prevents untrusted framing.",
    },
    {
      id: "mime-protection",
      passed:
        rootRoute?.headers?.xContentTypeOptions?.toLowerCase() === "nosniff",
      reason: "Root response exposes X-Content-Type-Options: nosniff.",
    },
    ...["/api/status", "/api/diagnostics"].map((route) => {
      const cacheControl =
        routeByPath(routes, route)?.headers?.cacheControl ?? "";
      return {
        id: `no-store:${route}`,
        passed: /(?:^|,)\s*no-store(?:,|$)/i.test(cacheControl),
        reason: `${route} exposes Cache-Control: no-store.`,
      };
    }),
  ];
  const blocked = checks
    .filter((check) => !check.passed)
    .map((check) => `Security header check failed: ${check.id}.`);
  return { required: true, passed: blocked.length === 0, checks, blocked };
}

function readPath(value, paths) {
  for (const pathParts of paths) {
    let current = value;
    for (const part of pathParts) current = current?.[part];
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return null;
}

export function buildIdentityPosture(routes, releaseCandidate = null) {
  const diagnostics = routeByPath(routes, "/api/diagnostics")?.body ?? null;
  const status = routeByPath(routes, "/api/status")?.body ?? null;
  const candidateResolved =
    releaseCandidate?.ready === true &&
    releaseCandidate?.tag === ACTIVE_RELEASE_CANDIDATE_TAG &&
    /^[a-f0-9]{40}$/.test(releaseCandidate?.peeledCommit ?? "") &&
    /^[a-f0-9]{40}$/.test(releaseCandidate?.tagObject ?? "") &&
    releaseCandidate?.objectType === "tag";
  const expectedSourceCommit = candidateResolved
    ? releaseCandidate.peeledCommit
    : null;
  const expectedReleaseTag = ACTIVE_RELEASE_CANDIDATE_TAG;
  const sourceCommit = readPath(diagnostics, [
    ["releaseIdentity", "sourceCommit"],
    ["release", "identity", "sourceCommit"],
  ]);
  const releaseTag = readPath(diagnostics, [
    ["releaseIdentity", "releaseTag"],
    ["release", "identity", "releaseTag"],
  ]);
  const imageDigest = readPath(diagnostics, [
    ["releaseIdentity", "imageDigest"],
    ["release", "identity", "imageDigest"],
  ]);
  const deploymentId = readPath(diagnostics, [
    ["releaseIdentity", "deploymentId"],
    ["release", "identity", "deploymentId"],
  ]);
  const environmentSchemaVersion = readPath(diagnostics, [
    ["releaseIdentity", "environmentSchemaVersion"],
    ["release", "identity", "environmentSchemaVersion"],
  ]);
  const profile =
    readPath(diagnostics, [
      ["releaseIdentity", "deploymentProfile"],
      ["release", "profile"],
    ]) ?? readPath(status, [["readiness", "release", "profile"]]);
  const runtimeClaimsPresent = Boolean(
    sourceCommit || releaseTag || imageDigest || deploymentId,
  );
  const identityMode = runtimeClaimsPresent
    ? "runtime-claims-unverified"
    : "unavailable";
  const checks = [
    {
      id: "trusted-candidate-tag-resolution",
      passed: candidateResolved,
      expected: `local annotated ${ACTIVE_RELEASE_CANDIDATE_TAG} resolved and frozen before probing`,
      actual: candidateResolved
        ? {
            tag: releaseCandidate.tag,
            tagObject: releaseCandidate.tagObject,
            peeledCommit: releaseCandidate.peeledCommit,
          }
        : null,
      reason:
        releaseCandidate?.blocker ??
        "Candidate tag provenance was not supplied by the local Git resolver.",
    },
    {
      id: "independent-platform-provenance",
      passed: false,
      expected:
        "direct provider, registry, or Docker-inspect verification bound to the staged target",
      actual: null,
      reason:
        "Runtime environment strings and locally editable JSON are not independent provenance.",
    },
    {
      id: "runtime-source-claim",
      passed:
        candidateResolved && sourceCommit === releaseCandidate.peeledCommit,
      expected: expectedSourceCommit,
      actual: sourceCommit,
    },
    {
      id: "runtime-release-tag-claim",
      passed: releaseTag === expectedReleaseTag,
      expected: expectedReleaseTag,
      actual: releaseTag,
    },
    {
      id: "runtime-image-digest-claim",
      passed: /^sha256:[a-f0-9]{64}$/i.test(imageDigest ?? ""),
      expected: "runtime-reported immutable digest",
      actual: imageDigest,
    },
    {
      id: "runtime-deployment-id-claim",
      passed: /^deployment-[a-f0-9]{16}$/i.test(deploymentId ?? ""),
      expected: "runtime-reported sanitized deployment identifier",
      actual: deploymentId,
    },
    {
      id: "runtime-environment-schema-claim",
      passed: environmentSchemaVersion === EXPECTED_ENV_SCHEMA,
      expected: EXPECTED_ENV_SCHEMA,
      actual: environmentSchemaVersion,
    },
    {
      id: "runtime-deployment-profile-claim",
      passed: profile === EXPECTED_PROFILE,
      expected: EXPECTED_PROFILE,
      actual: profile,
    },
  ];
  const blocked = checks
    .filter((check) => !check.passed)
    .map((check) => `Deployment identity check failed: ${check.id}.`);
  return {
    expectedSourceCommit,
    expectedReleaseTag,
    identityMode,
    actual: sanitizeDiagnosticValue({
      sourceCommit,
      releaseTag,
      imageDigest,
      deploymentId,
      environmentSchemaVersion,
      deploymentProfile: profile,
    }),
    checks: sanitizeDiagnosticValue(checks),
    passed: blocked.length === 0,
    blocked,
  };
}

function writeArtifact(artifact, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "release-diagnostics-latest.json");
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(sanitizeDiagnosticValue(artifact), null, 2)}\n`,
  );
  console.log(`release diagnostics captured: ${path.relative(root, outPath)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnvFile(envLocalPath);
  const configuredBaseUrl =
    args.baseUrl ?? envValue("NEXUS_RELEASE_BASE_URL", fileEnv);
  const hasReleaseBaseUrl = Boolean(configuredBaseUrl);
  const rawBaseUrl = configuredBaseUrl || DEFAULT_BASE_URL;
  const token = envValue("NEXUS_TOKEN", fileEnv);
  const hasToken = Boolean(token);
  const evidenceKey = envValue("NEXUS_EVIDENCE_KEY", fileEnv);
  const hasEvidenceKey = evidenceKey.length >= 16;
  const routes = args.routes ?? DEFAULT_DIAGNOSTIC_ROUTES;
  const capturedAt = new Date();
  const outDir = args.outDir ? path.resolve(root, args.outDir) : metricsDir;
  const releaseCandidate = resolveLocalReleaseCandidate({
    candidateTag: args.releaseTag,
    cwd: root,
  });

  let parsedTarget;
  let target;
  try {
    parsedTarget = parseReleaseTarget(rawBaseUrl);
    if (parsedTarget.staged && !hasEvidenceKey) {
      throw new Error(
        "NEXUS_EVIDENCE_KEY is required for stable staged target identity.",
      );
    }
    target = classifyReleaseTarget(rawBaseUrl, { evidenceKey });
    if (!releaseCandidate.ready) {
      throw new Error(releaseCandidate.blocker);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid release target.";
    const artifact = {
      schemaVersion: "nexus-release-diagnostics.v1",
      capturedAt: capturedAt.toISOString(),
      expiresAt: new Date(
        capturedAt.getTime() + EVIDENCE_MAX_AGE_MS,
      ).toISOString(),
      evidenceMaxAgeMs: EVIDENCE_MAX_AGE_MS,
      target: null,
      candidate: releaseCandidate,
      routes: [],
      security: null,
      identity: null,
      blocked: [message],
      diagnosticsReady: false,
      releaseProofReady: false,
    };
    writeArtifact(artifact, outDir);
    console.error(`release-diagnostics:capture blocked: ${message}`);
    process.exit(2);
  }

  console.log(`Release diagnostics target: ${target.display}`);
  console.log(`Target identity: ${target.targetId}`);
  const routeResults = [];
  for (const route of routes) {
    const result = await fetchRoute(parsedTarget.origin, route, token);
    routeResults.push(result);
    const label = result.status === 0 ? "ERR" : result.status;
    console.log(`${route} ${label} ${result.durationMs}ms`);
  }

  const security = buildSecurityPosture(target, routeResults);
  const identity = buildIdentityPosture(routeResults, releaseCandidate);
  const blocked = [];
  if (!hasReleaseBaseUrl) {
    blocked.push(
      "NEXUS_RELEASE_BASE_URL is missing; capture used local fallback.",
    );
  }
  if (!hasToken) {
    blocked.push("NEXUS_TOKEN is missing; protected diagnostics are unproven.");
  }
  for (const route of routeResults.filter((entry) => !entry.ok)) {
    blocked.push(
      `Route check failed: ${route.route} (${route.status || "request error"}).`,
    );
  }
  if (target.staged) {
    blocked.push(...security.blocked, ...identity.blocked);
  } else {
    blocked.push("A real HTTPS staged target is required for release proof.");
  }

  const diagnosticsReady =
    routeResults.length === routes.length &&
    routeResults.every((route) => route.ok);
  const releaseProofReady =
    releaseCandidate.ready &&
    target.staged &&
    hasToken &&
    hasEvidenceKey &&
    diagnosticsReady &&
    security.passed &&
    identity.passed &&
    blocked.length === 0;
  const artifact = {
    schemaVersion: "nexus-release-diagnostics.v1",
    capturedAt: capturedAt.toISOString(),
    expiresAt: new Date(
      capturedAt.getTime() + EVIDENCE_MAX_AGE_MS,
    ).toISOString(),
    evidenceMaxAgeMs: EVIDENCE_MAX_AGE_MS,
    candidate: releaseCandidate,
    target,
    baseUrl: target.local ? parsedTarget.origin : null,
    baseUrlSource: hasReleaseBaseUrl
      ? "NEXUS_RELEASE_BASE_URL"
      : "local-fallback",
    routes: routeResults,
    environment: {
      hasReleaseBaseUrl,
      hasToken,
      hasEvidenceKey,
      stagedTarget: target.staged,
      independentPlatformProofAvailable: false,
      candidateResolved: releaseCandidate.ready,
      node: process.version,
      platform: process.platform,
    },
    security,
    identity,
    blocked: Array.from(new Set(blocked)),
    diagnosticsReady,
    releaseProofReady,
  };

  writeArtifact(artifact, outDir);
  if (artifact.blocked.length > 0) {
    console.log("blocked prerequisites:");
    for (const reason of artifact.blocked) console.log(`- ${reason}`);
  }
  if (args.requireStaged && !releaseProofReady) process.exit(1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error("release-diagnostics:capture failed");
    console.error(
      error instanceof Error ? sanitizeString(error.message) : "unknown error",
    );
    process.exit(1);
  });
}
