#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  assessLocalAccelerationCompletion,
  sanitizeLocalAccelerationAcceptance,
} from "../lib/localAccelerationAcceptance.ts";
import {
  TURBOQUANT_EXEC_CONFIRMATION,
  readLocalAccelerationConfig,
  validateLocalAccelerationEndpoint,
} from "../lib/localAcceleration.ts";
import { findLocalAccelerationPython } from "./local-acceleration-python.mjs";
import { auditLocalTurboQuantCheckout } from "./audit-local-turboquant-checkout.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeArtifact = args.has("--write");
const requireComplete = args.has("--require-complete");
const requireUpstreamRuntime = args.has("--require-upstream-runtime");
const executeTurboQuant = args.has("--execute-turboquant");
const probeRegistry = args.has("--probe-registry");
const staticChecksPassed = args.has("--static-verified");
const debug = args.has("--debug");
const artifactPath = path.join(
  root,
  "docs",
  "metrics",
  "local-acceleration-acceptance.json",
);

function run(command, commandArgs, timeout = 10_000) {
  try {
    const result = spawnSync(command, commandArgs, {
      cwd: root,
      encoding: "utf8",
      timeout,
      windowsHide: true,
    });
    return { ok: result.status === 0, stdout: result.stdout ?? "" };
  } catch {
    return { ok: false, stdout: "" };
  }
}

function pythonModules(python) {
  if (!python) return {};
  const source = [
    "import importlib.util,json",
    "names=['fastapi','uvicorn','numpy','pytest','turbovec','torch','turboquant','vllm']",
    "print(json.dumps({n:importlib.util.find_spec(n) is not None for n in names}))",
  ].join(";");
  const result = run(python.command, [...python.prefix, "-c", source], 20_000);
  try {
    return result.ok ? JSON.parse(result.stdout.trim()) : {};
  } catch {
    return {};
  }
}

function loadCapabilities() {
  const files = [
    path.join(root, "docs", "ideas", "source-parity", "turbovec.json"),
    path.join(root, "docs", "ideas", "source-parity", "turboquant.json"),
  ];
  return files.flatMap((file) => {
    const matrix = JSON.parse(fs.readFileSync(file, "utf8"));
    return matrix.capabilities.map((capability) => ({
      id: `${matrix.id}:${capability.id}`,
      disposition: capability.disposition,
      owner:
        capability.owner ??
        (capability.id.includes("real-")
          ? "environment"
          : capability.id.includes("fused-")
            ? "upstream"
            : "nexus"),
    }));
  });
}

function operationUrl(endpoint, engine, operation, allowTailnet) {
  const url = validateLocalAccelerationEndpoint(endpoint, allowTailnet);
  url.pathname = `/${engine}/${operation}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function fetchJson(url, init = {}, timeoutMs = 8_000) {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const value = await response.json();
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function probeHealth(endpoint, engine, allowTailnet, requiredBackend) {
  try {
    const value = await fetchJson(
      operationUrl(endpoint, engine, "health", allowTailnet),
    );
    const available = value?.status === "ok" || value?.available === true;
    return (
      available &&
      (!requiredBackend || value?.backend === requiredBackend)
    );
  } catch {
    return false;
  }
}

async function probeOllama() {
  const raw = (
    process.env.NEXUS_LOCAL_ACCELERATION_OLLAMA_URL ??
    "http://127.0.0.1:11434"
  ).trim();
  let base;
  try {
    base = validateLocalAccelerationEndpoint(raw, false);
  } catch {
    return { available: false, embedding: false };
  }
  const tags = await fetchJson(new URL("/api/tags", base).toString());
  if (!tags) return { available: false, embedding: false };
  const model = (
    process.env.NEXUS_LOCAL_ACCELERATION_EMBED_MODEL ?? "nomic-embed-text"
  ).trim();
  const embed = await fetchJson(
    new URL("/api/embed", base).toString(),
    {
      method: "POST",
      body: JSON.stringify({ model, input: ["nexus acceptance fixture"] }),
    },
    30_000,
  );
  return {
    available: true,
    embedding:
      Array.isArray(embed?.embeddings) &&
      Array.isArray(embed.embeddings[0]) &&
      embed.embeddings[0].length > 0,
  };
}

async function probePackageRegistry() {
  if (!probeRegistry) return false;
  try {
    const response = await fetch("https://pypi.org/pypi/turbovec/json", {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function turboVecLifecycle(config, requiredBackend = "turbovec") {
  const note = (message) => {
    if (debug) console.error(`[local-acceleration:${requiredBackend}] ${message}`);
  };
  if (
    !(await probeHealth(
      config.turboVec.endpoint,
      requiredBackend,
      config.allowTailnet,
      "turbovec",
    ))
  ) {
    note("health unavailable");
    return false;
  }
  note("health ready");
  const fixtureIds = [
    "nexus-acceptance-vector-alpha",
    "nexus-acceptance-vector-beta",
  ];
  const post = (operation, payload) =>
    fetchJson(
      operationUrl(
        config.turboVec.endpoint,
        "turbovec",
        operation,
        config.allowTailnet,
      ),
      { method: "POST", body: JSON.stringify(payload) },
      60_000,
    );
  try {
    const upsert = await post("upsert", {
      bitWidth: config.turboVec.bitWidth,
      documents: [
        {
          id: fixtureIds[0],
          text: "alpha local semantic retrieval fixture",
          metadata: { route: "/vault", tags: ["acceptance"], domain: "alpha" },
        },
        {
          id: fixtureIds[1],
          text: "beta unrelated storage fixture",
          metadata: { route: "/vault", tags: ["acceptance"], domain: "beta" },
        },
      ],
    });
    if (!upsert?.ok) {
      note("upsert failed");
      return false;
    }
    note("upsert passed");
    const search = await post("search", {
      query: "alpha semantic retrieval",
      limit: 2,
      allowlist: [fixtureIds[0]],
      filters: { domains: ["alpha"] },
    });
    if (
      !Array.isArray(search?.matches) ||
      search.matches.length !== 1 ||
      search.matches[0]?.id !== fixtureIds[0]
    ) {
      note("filtered search failed");
      return false;
    }
    note("filtered search passed");
    for (const operation of ["prepare", "persist", "reload", "rebuild"]) {
      const result = await post(operation, { bitWidth: config.turboVec.bitWidth });
      if (!result?.ok) {
        note(`${operation} failed`);
        return false;
      }
      note(`${operation} passed`);
    }
    note("lifecycle passed");
    return true;
  } finally {
    await post("remove", { ids: fixtureIds });
  }
}

async function localFallbackLifecycle(python) {
  if (!python) return false;
  return run(
    python.command,
    [
      ...python.prefix,
      path.join(root, "scripts", "check-local-acceleration-service.py"),
    ],
    30_000,
  ).ok;
}

async function turboQuantReceipt(config, operation) {
  return fetchJson(
    operationUrl(
      config.turboQuant.endpoint,
      "turboquant",
      operation,
      config.allowTailnet,
    ),
    {
      method: "POST",
      body: JSON.stringify({
        mode: config.turboQuant.mode,
        keyBits: config.turboQuant.keyBits,
        valueBits: config.turboQuant.valueBits,
        confirmation: TURBOQUANT_EXEC_CONFIRMATION,
      }),
    },
    120_000,
  );
}

async function turboQuantGpuAcceptance(config, reviewedCheckoutAvailable) {
  if (!executeTurboQuant || !reviewedCheckoutAvailable) return false;
  if (
    !(await probeHealth(
      config.turboQuant.endpoint,
      "turboquant",
      config.allowTailnet,
    ))
  ) {
    return false;
  }
  for (const operation of ["proof", "benchmark"]) {
    const receipt = await turboQuantReceipt(config, operation);
    if (receipt?.succeeded !== true) return false;
  }
  try {
    const endpoint = validateLocalAccelerationEndpoint(
      config.turboQuant.openAiEndpoint,
      config.allowTailnet,
    );
    endpoint.pathname = endpoint.pathname.replace(/\/chat\/completions\/?$/, "/models");
    const models = await fetchJson(endpoint.toString(), {}, 15_000);
    return Array.isArray(models?.data);
  } catch {
    return false;
  }
}

const config = readLocalAccelerationConfig();
const python = findLocalAccelerationPython({
  home: os.homedir(),
  root,
  run,
});
const modules = pythonModules(python);
const ollama = await probeOllama();
const embedMode = (
  process.env.NEXUS_LOCAL_ACCELERATION_EMBED_MODE ?? "auto"
)
  .trim()
  .toLowerCase();
const embeddingAvailable =
  embedMode === "hash" || embedMode === "auto" || ollama.embedding;
const [packageRegistryAvailable, turboVecService, turboQuantService] =
  await Promise.all([
    probePackageRegistry(),
    probeHealth(config.turboVec.endpoint, "turbovec", config.allowTailnet),
    probeHealth(config.turboQuant.endpoint, "turboquant", config.allowTailnet),
  ]);
const turboVecLifecyclePassed = await turboVecLifecycle(config);
const localFallbackLifecyclePassed = await localFallbackLifecycle(python);
const gpuPresent = run("nvidia-smi", ["-L"]).ok;
const linuxRuntimeAvailable =
  process.platform !== "win32" || run("wsl", ["--status"]).ok;
let turboQuantCheckoutAvailable = false;
try {
  turboQuantCheckoutAvailable = auditLocalTurboQuantCheckout(
    process.env.NEXUS_TURBOQUANT_ROOT,
  ).valid;
} catch {
  turboQuantCheckoutAvailable = false;
}
const turboQuantGpuPassed = await turboQuantGpuAcceptance(
  config,
  turboQuantCheckoutAvailable,
);

const completion = assessLocalAccelerationCompletion({
  capabilities: loadCapabilities(),
  evidence: {
    staticChecksPassed,
    localFallbackLifecyclePassed,
    turboVecLifecyclePassed,
    turboQuantCheckoutPassed: turboQuantCheckoutAvailable,
    turboQuantGpuPassed,
  },
});
const artifact = sanitizeLocalAccelerationAcceptance({
  generatedAt: new Date().toISOString(),
  platform: process.platform,
  machine: {
    gpuPresent,
    linuxRuntimeAvailable,
    pythonAvailable: Boolean(python),
    turboVecPackageAvailable: modules.turbovec === true,
    turboQuantCheckoutAvailable,
    ollamaAvailable: ollama.available,
    embeddingAvailable,
    outboundPackageRegistryAvailable: packageRegistryAvailable,
  },
  completion,
  probes: {
    safeStatus: completion.status,
    staticChecks: staticChecksPassed,
    localFallbackLifecycle: localFallbackLifecyclePassed,
    turboVecService,
    turboVecLifecycle: turboVecLifecyclePassed,
    turboQuantService,
    turboQuantCheckout: turboQuantCheckoutAvailable,
    turboQuantGpu: turboQuantGpuPassed,
    ollama: ollama.available,
    embedding: embeddingAvailable,
    packageRegistry: packageRegistryAvailable,
  },
});

if (writeArtifact) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: artifact.completion.status,
      nexusOwnedPercent: artifact.completion.nexusOwnedPercent,
      offlineOperationalPercent: artifact.completion.offlineOperationalPercent,
      integrationAcceptancePercent:
        artifact.completion.integrationAcceptancePercent,
      optionalUpstreamRuntimePercent:
        artifact.completion.optionalUpstreamRuntimePercent,
      optionalUpstreamStatus: artifact.completion.optionalUpstreamStatus,
      sourceParityPercent: artifact.completion.sourceParityPercent,
      blockers: artifact.completion.blockers,
      optionalUpstreamGaps: artifact.completion.optionalUpstreamGaps,
      machine: artifact.machine,
      probes: artifact.probes,
      artifactWritten: writeArtifact,
    },
    null,
    2,
  ),
);

if (requireComplete && artifact.completion.status !== "complete") process.exit(1);
if (
  requireUpstreamRuntime &&
  artifact.completion.optionalUpstreamRuntimePercent !== 100
) {
  process.exit(1);
}
