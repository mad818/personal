#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_RELEASE_CANDIDATE_TAG,
  resolveLocalReleaseCandidate,
} from "./release-candidate.mjs";

export const DOCKER_PROOF_SCHEMA_VERSION = "nexus-docker-release-proof.v1";
export const EXPECTED_RELEASE_TAG = ACTIVE_RELEASE_CANDIDATE_TAG;

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const nexusTempRoot = path.join(projectRoot, ".nexus");
const artifactPath = path.join(
  projectRoot,
  "docs",
  "metrics",
  "docker-release-proof-latest.json",
);
const RELEASE_ENVIRONMENT_SCHEMA_VERSION = "nexus-runtime-env.v1";
const COMMAND_BUFFER_BYTES = 16 * 1024 * 1024;
const BUILD_TIMEOUT_MS = 30 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 90 * 1000;
const RELEASE_SMOKE_TIMEOUT_MS = 3 * 60 * 1000;

export function classifyImmutableReleaseContract({
  dockerfile,
  identityRoute,
}) {
  const dockerSource = String(dockerfile ?? "");
  const identitySource = String(identityRoute ?? "");
  const missing = [
    ["Docker build commit argument", "NEXUS_BUILD_COMMIT_SHA", dockerSource],
    [
      "OCI source revision label",
      "org.opencontainers.image.revision",
      dockerSource,
    ],
    ["protected runtime release identity", "releaseIdentity", identitySource],
  ]
    .filter(([, token, source]) => !source.includes(token))
    .map(([label]) => label);
  return {
    ready: missing.length === 0,
    missing,
    blocker:
      missing.length === 0
        ? null
        : `Tagged candidate ${EXPECTED_RELEASE_TAG} lacks the release-proof contract (${missing.join(", ")}); do not move the tag, and prepare another candidate only after separate approval.`,
  };
}

export function isContainedPath(rootPath, candidatePath) {
  if (!rootPath || !candidatePath) return false;
  const root = path.resolve(rootPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export function isContentAddressedImageId(value) {
  return /^sha256:[a-f0-9]{64}$/.test(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

export function isNonRootUser(value) {
  const principal = String(value ?? "")
    .trim()
    .split(":", 1)[0]
    .toLowerCase();
  if (!principal || principal === "root" || principal === "0") return false;
  if (/^\d+$/.test(principal)) return Number(principal) > 0;
  return true;
}

export function cleanupCommandPassed(status, stderr, resource) {
  if (status === 0) return true;
  const pattern =
    resource === "container" ? /no such container/i : /no such image/i;
  return pattern.test(String(stderr ?? ""));
}

export function isLocalDockerEndpoint(value) {
  const endpoint = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!endpoint) return false;
  if (endpoint.startsWith("unix://")) return true;
  if (endpoint.startsWith("npipe://")) {
    return (
      endpoint.startsWith("npipe:////./pipe/") ||
      endpoint.startsWith("npipe:////localhost/pipe/")
    );
  }
  if (!endpoint.startsWith("tcp://")) return false;
  try {
    const parsed = new URL(`http://${endpoint.slice("tcp://".length)}`);
    return (
      !parsed.username &&
      !parsed.password &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
        parsed.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

function replaceAllLiteral(value, needle, replacement) {
  return needle ? value.split(needle).join(replacement) : value;
}

function sanitizeString(value, secrets) {
  let sanitized = value;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    sanitized = replaceAllLiteral(sanitized, secret, "<redacted>");
  }
  return sanitized
    .replace(/\bBearer\s+[A-Za-z0-9._~-]{8,}\b/gi, "Bearer <redacted>")
    .replace(
      /\b(token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi,
      "$1=<redacted>",
    )
    .replace(/\bhttps?:\/\/[^\s/]+/gi, (origin) => {
      try {
        const parsed = new URL(origin);
        const hostname = parsed.hostname.toLowerCase();
        if (["127.0.0.1", "localhost", "::1"].includes(hostname)) {
          return `${parsed.protocol}//127.0.0.1:<ephemeral-port>`;
        }
      } catch {
        // The fixed replacement below is safer than preserving malformed origins.
      }
      return "https://<redacted-host>";
    })
    .replace(/\b[A-Za-z]:\\Users\\[^\r\n"'`]+/g, "<redacted-path>")
    .replace(/(?:^|\s)\/(?:Users|home)\/[^\s"'`]+/g, " <redacted-path>");
}

export function sanitizeArtifact(value, options = {}, key = "") {
  const secrets = (options.secrets ?? [])
    .filter((entry) => typeof entry === "string" && entry.length > 0)
    .map((entry) => String(entry));
  if (
    /token|secret|password|authorization|cookie|credential|hostname|(?:^|temp)path|containername|imageref|runid/i.test(
      key,
    )
  ) {
    if (typeof value === "boolean" || value === null) return value;
    return "<redacted>";
  }
  if (typeof value === "string") return sanitizeString(value, secrets);
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeArtifact(entry, { secrets }));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([nestedKey, nestedValue]) => [
      nestedKey,
      sanitizeArtifact(nestedValue, { secrets }, nestedKey),
    ]),
  );
}

function addBlocker(blockers, message) {
  if (message && !blockers.includes(message)) blockers.push(message);
}

export function classifyDockerProof(inputs) {
  const blockers = [];
  const source = inputs?.source;
  const cleanup = inputs?.cleanup;

  if (source?.ready !== true) {
    addBlocker(
      blockers,
      source?.blocker ??
        `Local annotated tag ${EXPECTED_RELEASE_TAG} is unavailable; no source fallback is allowed.`,
    );
  } else if (inputs?.docker?.cliAvailable !== true) {
    addBlocker(blockers, "Docker CLI is unavailable.");
  } else if (inputs?.docker?.localEndpoint !== true) {
    addBlocker(blockers, "Docker endpoint is not proven local.");
  } else if (inputs?.docker?.engineAvailable !== true) {
    addBlocker(blockers, "Docker engine is unavailable.");
  } else {
    const archive = inputs?.archive;
    if (archive?.created !== true) {
      addBlocker(blockers, "Exact-tag source archive was not created.");
    }
    if (archive?.contained !== true) {
      addBlocker(
        blockers,
        "Exact-tag source archive was not contained in the ignored proof area.",
      );
    }
    if (archive?.ignored !== true) {
      addBlocker(
        blockers,
        "Docker proof temporary area is not ignored by Git.",
      );
    }
    if (archive?.dockerfileFromTag !== true) {
      addBlocker(
        blockers,
        "The exact tag does not provide the Dockerfile used for the build.",
      );
    }

    if (blockers.length === 0) {
      if (inputs?.build?.attempted !== true || inputs?.build?.passed !== true) {
        addBlocker(blockers, "Exact-tag Docker image build did not pass.");
      }
    }

    if (blockers.length === 0) {
      const image = inputs?.image;
      if (image?.inspected !== true) {
        addBlocker(blockers, "Built image inspection did not complete.");
      }
      if (
        image?.contentAddressed !== true ||
        !isContentAddressedImageId(image?.imageId)
      ) {
        addBlocker(
          blockers,
          "Built image lacks a content-addressed sha256 image ID.",
        );
      }
      if (image?.labelsMatch !== true) {
        addBlocker(
          blockers,
          "Built image labels do not match the frozen candidate identity.",
        );
      }
      if (image?.nonRoot !== true || !isNonRootUser(image?.configuredUser)) {
        addBlocker(
          blockers,
          "Built image is not configured to run as a non-root user.",
        );
      }
    }

    if (blockers.length === 0) {
      const runtime = inputs?.runtime;
      if (runtime?.attempted !== true || runtime?.started !== true) {
        addBlocker(blockers, "Owned Docker container did not start.");
      }
      if (runtime?.loopbackOnly !== true) {
        addBlocker(
          blockers,
          "Owned Docker container was not published on loopback only.",
        );
      }
      if (runtime?.healthPassed !== true) {
        addBlocker(
          blockers,
          "Owned Docker container did not pass the bounded health poll.",
        );
      }
      if (runtime?.identityMatches !== true) {
        addBlocker(
          blockers,
          "Container health identity does not match the frozen candidate image.",
        );
      }
      if (
        inputs?.image?.containerImageMatches !== true ||
        !Number.isInteger(inputs?.image?.runtimeUid) ||
        inputs.image.runtimeUid <= 0
      ) {
        addBlocker(
          blockers,
          "Running container image or non-root runtime identity did not match.",
        );
      }
    }

    if (blockers.length === 0) {
      if (inputs?.smoke?.attempted !== true || inputs?.smoke?.passed !== true) {
        addBlocker(
          blockers,
          "Release smoke did not pass against the owned container.",
        );
      }
    }
  }

  if (cleanup?.passed !== true) {
    addBlocker(
      blockers,
      "Owned Docker or temporary resources were not fully cleaned.",
    );
  }

  return {
    proofReady: blockers.length === 0,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
  };
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    windowsHide: true,
    timeout: options.timeoutMs ?? 30_000,
    maxBuffer: options.maxBuffer ?? COMMAND_BUFFER_BYTES,
  });
}

function resolveSourceTag() {
  const source = resolveLocalReleaseCandidate({
    cwd: projectRoot,
    candidateTag: EXPECTED_RELEASE_TAG,
    runGit: (args) => runCommand("git", args, { timeoutMs: 15_000 }),
  });
  if (!source.ready) return source;
  const dockerfile = runCommand(
    "git",
    ["show", `${source.peeledCommit}:Dockerfile`],
    { timeoutMs: 15_000 },
  );
  const identityRoute = runCommand(
    "git",
    ["show", `${source.peeledCommit}:app/api/diagnostics/route.ts`],
    { timeoutMs: 15_000 },
  );
  const contract = classifyImmutableReleaseContract({
    dockerfile: dockerfile.status === 0 ? dockerfile.stdout : "",
    identityRoute: identityRoute.status === 0 ? identityRoute.stdout : "",
  });
  return contract.ready
    ? { ...source, contract }
    : {
        ...source,
        ready: false,
        state: "contract-incompatible",
        blocker: contract.blocker,
        contract,
      };
}

function detectDocker() {
  const cli = runCommand("docker", ["--version"], { timeoutMs: 15_000 });
  if (cli.status !== 0) {
    return {
      cliAvailable: false,
      engineAvailable: false,
      localEndpoint: false,
    };
  }
  let endpoint = process.env.DOCKER_HOST?.trim() ?? "";
  if (!endpoint) {
    const context = runCommand(
      "docker",
      ["context", "inspect", "--format", "{{json .Endpoints.docker.Host}}"],
      { timeoutMs: 15_000 },
    );
    if (context.status === 0) {
      try {
        endpoint = JSON.parse(context.stdout.trim());
      } catch {
        endpoint = "";
      }
    }
  }
  const localEndpoint = isLocalDockerEndpoint(endpoint);
  if (!localEndpoint) {
    return { cliAvailable: true, engineAvailable: false, localEndpoint: false };
  }
  const engine = runCommand(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    { timeoutMs: 30_000 },
  );
  return {
    cliAvailable: true,
    engineAvailable: engine.status === 0 && Boolean(engine.stdout.trim()),
    localEndpoint: true,
  };
}

function dockerProofAreaIsIgnored() {
  const result = runCommand(
    "git",
    [
      "check-ignore",
      "--quiet",
      "--no-index",
      "--",
      ".nexus/docker-release-proof-probe",
    ],
    { timeoutMs: 15_000 },
  );
  return result.status === 0;
}

function createContainedTempDirectory() {
  const repositoryRealPath = realpathSync(projectRoot);
  mkdirSync(nexusTempRoot, { recursive: true });
  const nexusRealPath = realpathSync(nexusTempRoot);
  if (!isContainedPath(repositoryRealPath, nexusRealPath)) {
    throw new Error("unsafe-temp-root");
  }
  const tempDirectory = mkdtempSync(
    path.join(nexusTempRoot, "docker-release-proof-"),
  );
  const tempRealPath = realpathSync(tempDirectory);
  if (!isContainedPath(nexusRealPath, tempRealPath)) {
    throw new Error("unsafe-temp-directory");
  }
  return { tempDirectory, tempRealPath, nexusRealPath };
}

function createExactSourceArchive(archivePath, source) {
  const dockerfile = runCommand(
    "git",
    ["cat-file", "-e", `${source.peeledCommit}:Dockerfile`],
    { timeoutMs: 15_000 },
  );
  if (dockerfile.status !== 0)
    return { created: false, dockerfileFromTag: false };

  const archive = runCommand(
    "git",
    ["archive", "--format=tar", `--output=${archivePath}`, source.peeledCommit],
    { timeoutMs: 2 * 60 * 1000 },
  );
  const created =
    archive.status === 0 &&
    existsSync(archivePath) &&
    statSync(archivePath).isFile() &&
    statSync(archivePath).size > 0;
  return { created, dockerfileFromTag: true };
}

function inspectImage(imageReference, source) {
  const result = runCommand("docker", ["image", "inspect", imageReference], {
    timeoutMs: 30_000,
  });
  if (result.status !== 0) return null;
  try {
    const [inspection] = JSON.parse(result.stdout);
    if (!inspection || typeof inspection !== "object") return null;
    const imageId = String(inspection.Id ?? "")
      .trim()
      .toLowerCase();
    const configuredUser = String(inspection.Config?.User ?? "").trim();
    const labels = inspection.Config?.Labels ?? {};
    return {
      imageId,
      configuredUser,
      contentAddressed: isContentAddressedImageId(imageId),
      nonRoot: isNonRootUser(configuredUser),
      labelsMatch:
        labels["org.opencontainers.image.revision"] === source.peeledCommit &&
        labels["org.opencontainers.image.version"] === source.tag,
    };
  } catch {
    return null;
  }
}

function parseLoopbackPort(value) {
  for (const line of String(value ?? "").split(/\r?\n/)) {
    const match = line.trim().match(/^127\.0\.0\.1:(\d{1,5})$/);
    if (!match) continue;
    const port = Number(match[1]);
    if (Number.isInteger(port) && port >= 1 && port <= 65_535) return port;
  }
  return null;
}

async function readBoundedContainerJson(baseUrl, pathname, headers) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(3_000),
  });
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > 128 * 1024) {
    await response.body?.cancel();
    return { ok: false, payload: null };
  }
  const reader = response.body?.getReader();
  const chunks = [];
  let byteLength = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > 128 * 1024) {
        await reader.cancel();
        return { ok: false, payload: null };
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return {
      ok: response.ok,
      payload: JSON.parse(new TextDecoder().decode(bytes) || "null"),
    };
  } catch {
    return { ok: false, payload: null };
  }
}

async function pollContainerHealth(baseUrl, imageId, token, source) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const health = await readBoundedContainerJson(baseUrl, "/api/health");
      if (health.ok && health.payload?.status === "ok") {
        const diagnostics = await readBoundedContainerJson(
          baseUrl,
          "/api/diagnostics",
          { "x-nexus-internal-auth": token },
        );
        const identity = diagnostics.payload?.releaseIdentity;
        const identityMatches =
          diagnostics.ok &&
          identity?.complete === true &&
          identity?.sourceCommit === source.peeledCommit &&
          identity?.releaseTag === source.tag &&
          identity?.imageDigest === imageId &&
          /^deployment-[a-f0-9]{16}$/.test(identity?.deploymentId ?? "") &&
          identity?.deploymentProfile === "web-self-hosted" &&
          identity?.environmentSchemaVersion ===
            RELEASE_ENVIRONMENT_SCHEMA_VERSION;
        return { passed: true, identityMatches, attempts };
      }
    } catch {
      // Startup connection failures are expected until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return { passed: false, identityMatches: false, attempts };
}

function createRuntimeEnvFile(filePath, ephemeralToken, imageId, source) {
  const lines = [
    `NEXUS_TOKEN=${ephemeralToken}`,
    "NEXUS_DEPLOYMENT_PROFILE=web-self-hosted",
    "NEXUS_NETWORK_MODE=isolated",
    "NEXUS_TOOL_POLICY_MODE=strict",
    "NEXUS_ENABLE_HIGH_RISK_TOOLS=false",
    "NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true",
    "NEXUS_ALLOW_PAID_APIS=false",
    "NEXUS_PHONE_LAN_ENABLED=false",
    "NEXUS_TRUST_PROXY=false",
    "NEXUS_RUNTIME_IDENTITY_PATH=/app/.nexus/runtime-identity.json",
    `NEXUS_BUILD_COMMIT_SHA=${source.peeledCommit}`,
    `NEXUS_RELEASE_TAG=${source.tag}`,
    `NEXUS_IMAGE_DIGEST=${imageId}`,
    "NEXUS_DEPLOYMENT_ID=local-docker-release-proof",
  ];
  writeFileSync(filePath, `${lines.join("\n")}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

function initialProofState(source) {
  return {
    source,
    docker: {
      cliAvailable: false,
      engineAvailable: false,
      localEndpoint: false,
    },
    archive: {
      created: false,
      contained: false,
      ignored: false,
      dockerfileFromTag: false,
    },
    build: { attempted: false, passed: false },
    runtime: {
      attempted: false,
      started: false,
      loopbackOnly: false,
      healthPassed: false,
      identityMatches: false,
      healthPollAttempts: 0,
      policy: {
        deploymentProfile: "web-self-hosted",
        networkMode: "isolated",
        toolPolicyMode: "strict",
        highRiskToolsEnabled: false,
        writesRequireApproval: true,
        paidApisAllowed: false,
      },
    },
    smoke: { attempted: false, passed: false },
    image: {
      inspected: false,
      imageId: null,
      contentAddressed: false,
      configuredUser: null,
      runtimeUid: null,
      nonRoot: false,
      containerImageMatches: false,
      labelsMatch: false,
    },
    cleanup: {
      containerRemoved: null,
      imageRemoved: null,
      tempRemoved: null,
      passed: true,
    },
    failureStage: null,
  };
}

function writeProofArtifact(state, secrets = []) {
  const classification = classifyDockerProof(state);
  const artifact = sanitizeArtifact(
    {
      schemaVersion: DOCKER_PROOF_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      ...classification,
      source: state.source,
      docker: state.docker,
      archive: state.archive,
      build: state.build,
      runtime: state.runtime,
      smoke: state.smoke,
      image: state.image,
      cleanup: state.cleanup,
      failureStage: state.failureStage,
    },
    { secrets },
  );
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return classification;
}

function printVerdict(classification) {
  if (classification.proofReady) {
    console.log("Docker release proof passed for the frozen candidate source.");
    return;
  }
  for (const blocker of classification.blockers) {
    console.error(`Docker release proof blocked: ${blocker}`);
  }
}

async function executeNormalProof(source) {
  const state = initialProofState(source);
  const secrets = [];
  let tempDirectory = null;
  let tempRealPath = null;
  let nexusRealPath = null;
  let imageReference = null;
  let containerName = null;

  state.docker = detectDocker();
  if (!state.docker.cliAvailable || !state.docker.engineAvailable) {
    const classification = writeProofArtifact(state);
    printVerdict(classification);
    return classification;
  }

  try {
    state.archive.ignored = dockerProofAreaIsIgnored();
    if (!state.archive.ignored) {
      state.failureStage = "temp-area";
      throw new Error("temp-area-not-ignored");
    }

    const temp = createContainedTempDirectory();
    tempDirectory = temp.tempDirectory;
    tempRealPath = temp.tempRealPath;
    nexusRealPath = temp.nexusRealPath;
    secrets.push(tempDirectory, tempRealPath);
    state.cleanup.tempRemoved = false;

    const archivePath = path.join(tempDirectory, "source.tar");
    state.archive.contained = isContainedPath(tempRealPath, archivePath);
    if (!state.archive.contained) {
      state.failureStage = "archive-containment";
      throw new Error("archive-not-contained");
    }
    const archived = createExactSourceArchive(archivePath, source);
    state.archive.created = archived.created;
    state.archive.dockerfileFromTag = archived.dockerfileFromTag;
    if (!archived.created || !archived.dockerfileFromTag) {
      state.failureStage = "source-archive";
      throw new Error("archive-failed");
    }

    const suffix = randomBytes(12).toString("hex");
    imageReference = `nexus-prime:docker-release-proof-${suffix}`;
    containerName = `nexus-docker-release-proof-${suffix}`;
    secrets.push(imageReference, containerName);

    console.log("Building the frozen candidate archive with its Dockerfile.");
    state.build.attempted = true;
    state.cleanup.imageRemoved = false;
    const build = runCommand(
      "docker",
      [
        "build",
        "--quiet",
        "--tag",
        imageReference,
        "--build-arg",
        `NEXUS_BUILD_COMMIT_SHA=${source.peeledCommit}`,
        "--build-arg",
        `NEXUS_RELEASE_TAG=${source.tag}`,
        "--file",
        "Dockerfile",
        "-",
      ],
      {
        input: readFileSync(archivePath),
        timeoutMs: BUILD_TIMEOUT_MS,
        maxBuffer: COMMAND_BUFFER_BYTES,
      },
    );
    state.build.passed = build.status === 0;
    if (!state.build.passed) {
      state.failureStage = "image-build";
      throw new Error("build-failed");
    }

    const inspectedImage = inspectImage(imageReference, source);
    if (inspectedImage) {
      Object.assign(state.image, inspectedImage, { inspected: true });
    }
    if (
      !state.image.inspected ||
      !state.image.contentAddressed ||
      !state.image.nonRoot ||
      !state.image.labelsMatch
    ) {
      state.failureStage = "image-inspection";
      throw new Error("image-inspection-failed");
    }

    const ephemeralToken = randomBytes(32).toString("base64url");
    secrets.push(ephemeralToken);
    const envFile = path.join(tempDirectory, "runtime.env");
    createRuntimeEnvFile(envFile, ephemeralToken, state.image.imageId, source);

    console.log("Starting the owned container on an ephemeral loopback port.");
    state.runtime.attempted = true;
    state.cleanup.containerRemoved = false;
    const run = runCommand(
      "docker",
      [
        "run",
        "--detach",
        "--name",
        containerName,
        "--label",
        "com.nexus.release-proof.owner=local-candidate-proof",
        "--publish",
        "127.0.0.1::3000",
        "--env-file",
        envFile,
        "--read-only",
        "--tmpfs",
        "/app/.nexus:rw,noexec,nosuid,size=64m",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        state.image.imageId,
      ],
      { timeoutMs: 60_000 },
    );
    state.runtime.started = run.status === 0;
    if (!state.runtime.started) {
      state.failureStage = "container-start";
      throw new Error("container-start-failed");
    }

    const portResult = runCommand(
      "docker",
      ["port", containerName, "3000/tcp"],
      { timeoutMs: 30_000 },
    );
    const loopbackPort =
      portResult.status === 0 ? parseLoopbackPort(portResult.stdout) : null;
    state.runtime.loopbackOnly = Boolean(loopbackPort);
    if (!loopbackPort) {
      state.failureStage = "loopback-publication";
      throw new Error("loopback-port-missing");
    }

    const baseUrl = `http://127.0.0.1:${loopbackPort}`;
    const health = await pollContainerHealth(
      baseUrl,
      state.image.imageId,
      ephemeralToken,
      source,
    );
    state.runtime.healthPassed = health.passed;
    state.runtime.identityMatches = health.identityMatches;
    state.runtime.healthPollAttempts = health.attempts;
    if (!health.passed || !health.identityMatches) {
      state.failureStage = "health";
      throw new Error("health-failed");
    }

    const containerInspection = runCommand(
      "docker",
      ["container", "inspect", containerName],
      { timeoutMs: 30_000 },
    );
    if (containerInspection.status === 0) {
      try {
        const [inspection] = JSON.parse(containerInspection.stdout);
        state.image.containerImageMatches =
          String(inspection?.Image ?? "").toLowerCase() === state.image.imageId;
      } catch {
        state.image.containerImageMatches = false;
      }
    }

    const uid = runCommand("docker", ["exec", containerName, "id", "-u"], {
      timeoutMs: 30_000,
    });
    const runtimeUid =
      uid.status === 0 ? Number(uid.stdout.trim()) : Number.NaN;
    state.image.runtimeUid = Number.isInteger(runtimeUid) ? runtimeUid : null;
    state.image.nonRoot =
      state.image.nonRoot && Number.isInteger(runtimeUid) && runtimeUid > 0;
    if (!state.image.containerImageMatches || !state.image.nonRoot) {
      state.failureStage = "runtime-inspection";
      throw new Error("runtime-inspection-failed");
    }

    console.log("Running release smoke against the owned loopback container.");
    state.smoke.attempted = true;
    const smoke = runCommand(
      process.execPath,
      [path.join(projectRoot, "scripts", "release-smoke.mjs")],
      {
        env: {
          ...process.env,
          NEXUS_RELEASE_BASE_URL: baseUrl,
          NEXUS_TOKEN: ephemeralToken,
        },
        timeoutMs: RELEASE_SMOKE_TIMEOUT_MS,
      },
    );
    state.smoke.passed = smoke.status === 0;
    if (!state.smoke.passed) {
      state.failureStage = "release-smoke";
      throw new Error("release-smoke-failed");
    }
  } catch {
    if (!state.failureStage) state.failureStage = "unexpected";
  } finally {
    if (containerName && state.runtime.attempted) {
      const removed = runCommand("docker", ["rm", "--force", containerName], {
        timeoutMs: 60_000,
      });
      state.cleanup.containerRemoved = cleanupCommandPassed(
        removed.status,
        removed.stderr,
        "container",
      );
    }
    if (imageReference && state.build.attempted) {
      const removed = runCommand(
        "docker",
        ["image", "rm", "--force", imageReference],
        { timeoutMs: 60_000 },
      );
      state.cleanup.imageRemoved = cleanupCommandPassed(
        removed.status,
        removed.stderr,
        "image",
      );
    }
    if (tempDirectory) {
      try {
        if (existsSync(tempDirectory)) {
          const cleanupRealPath = realpathSync(tempDirectory);
          if (
            !nexusRealPath ||
            !tempRealPath ||
            cleanupRealPath !== tempRealPath ||
            !isContainedPath(nexusRealPath, cleanupRealPath)
          ) {
            throw new Error("unsafe-cleanup-path");
          }
          rmSync(tempDirectory, { recursive: true, force: true });
        }
        state.cleanup.tempRemoved = !existsSync(tempDirectory);
      } catch {
        state.cleanup.tempRemoved = false;
      }
    }
    state.cleanup.passed = [
      state.cleanup.containerRemoved,
      state.cleanup.imageRemoved,
      state.cleanup.tempRemoved,
    ].every((result) => result !== false);
  }

  const classification = writeProofArtifact(state, secrets);
  printVerdict(classification);
  return classification;
}

function parseArguments(argv) {
  const args = new Set(argv);
  if (args.size !== argv.length) throw new Error("duplicate-option");
  for (const arg of args) {
    if (arg !== "--preflight") throw new Error("unknown-option");
  }
  return { preflight: args.has("--preflight") };
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch {
    console.error("Docker release proof blocked: unsupported command option.");
    process.exitCode = 2;
    return;
  }

  const source = resolveSourceTag();
  if (options.preflight) {
    if (source.ready) {
      console.log(
        `Docker release proof preflight ready: annotated tag ${source.tag} is frozen at tag object ${source.tagObject} and commit ${source.peeledCommit}.`,
      );
      return;
    }
    console.error(`Docker release proof preflight blocked: ${source.blocker}`);
    process.exitCode = 2;
    return;
  }

  if (!source.ready) {
    const state = initialProofState(source);
    const classification = writeProofArtifact(state);
    printVerdict(classification);
    process.exitCode = 2;
    return;
  }

  const classification = await executeNormalProof(source);
  if (!classification.proofReady) process.exitCode = 1;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath);
if (isMain) {
  main().catch(() => {
    console.error(
      "Docker release proof blocked: unexpected internal failure; no sensitive details were printed.",
    );
    process.exitCode = 1;
  });
}
