#!/usr/bin/env node
/* eslint-disable no-console */

import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv, parse as parseEnv } from "dotenv";

const FAST_GATE_SCRIPTS = [
  "publication:safety:check",
  "security-scan",
  "security:boundaries",
];
const MIN_TOKEN_LENGTH = 24;
const PLACEHOLDER_TOKEN_PATTERNS = [
  /^your[-_ ]?token$/i,
  /^change[-_ ]?me$/i,
  /^replace[-_ ]?me$/i,
  /^example/i,
  /^token$/i,
  /^password$/i,
];

function validateToken(tokenValue) {
  const token = String(tokenValue || "").trim();
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(`NEXUS_TOKEN must contain at least ${MIN_TOKEN_LENGTH} characters.`);
  }
  if (PLACEHOLDER_TOKEN_PATTERNS.some((pattern) => pattern.test(token))) {
    throw new Error("NEXUS_TOKEN must not use a placeholder value.");
  }
  if (new Set(token).size < 8) {
    throw new Error("NEXUS_TOKEN must contain more character variety.");
  }
  return token;
}

function validatePort(portValue) {
  const port = String(portValue || "3000").trim();
  if (!/^\d{1,5}$/.test(port)) throw new Error("Runtime port must be numeric.");
  const numericPort = Number.parseInt(port, 10);
  if (numericPort < 1 || numericPort > 65_535) {
    throw new Error("Runtime port must be between 1 and 65535.");
  }
  return String(numericPort);
}

function tokenSatisfiesPolicy(token) {
  try {
    validateToken(token);
    return true;
  } catch {
    return false;
  }
}

export function initializeSecureToken(envPath = ".env.local") {
  const targetPath = resolve(envPath);
  const existingText = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const existingToken = parseEnv(existingText).NEXUS_TOKEN;
  if (tokenSatisfiesPolicy(existingToken)) {
    return { changed: false, reason: "already-strong" };
  }

  const generatedToken = randomBytes(32).toString("base64url");
  const tokenAssignment = ["NEXUS_TOKEN", generatedToken].join("=");
  const lines = existingText.split(/\r?\n/);
  const tokenLinePattern = /^\s*(?:export\s+)?NEXUS_TOKEN\s*=/i;
  const nextLines = [];
  let tokenWritten = false;
  for (const line of lines) {
    if (!tokenLinePattern.test(line)) {
      nextLines.push(line);
      continue;
    }
    if (!tokenWritten) {
      nextLines.push(tokenAssignment);
      tokenWritten = true;
    }
  }
  if (!tokenWritten) {
    if (nextLines.length > 0 && nextLines.at(-1) !== "") nextLines.push("");
    nextLines.push(tokenAssignment);
  }
  while (nextLines.length > 1 && nextLines.at(-1) === "") nextLines.pop();
  const nextText = `${nextLines.join("\n")}\n`;
  const tempPath = `${targetPath}.nexus-secure-init-tmp`;
  const previousPath = `${targetPath}.nexus-secure-init-previous`;
  if (existsSync(tempPath) || existsSync(previousPath)) {
    throw new Error("Secure token initialization staging files already exist.");
  }

  writeFileSync(tempPath, nextText, { encoding: "utf8", mode: 0o600 });
  if (!existsSync(targetPath)) {
    renameSync(tempPath, targetPath);
  } else {
    renameSync(targetPath, previousPath);
    try {
      renameSync(tempPath, targetPath);
      rmSync(previousPath, { force: true });
    } catch (error) {
      rmSync(tempPath, { force: true });
      if (existsSync(previousPath) && !existsSync(targetPath)) {
        renameSync(previousPath, targetPath);
      }
      throw error;
    }
  }
  return {
    changed: true,
    reason: existingToken ? "weak-token" : "missing-token",
  };
}

export function buildSecureRuntimeProfile(options = {}) {
  const profile = String(options.profile || "local").trim().toLowerCase();
  if (profile !== "local" && profile !== "tailnet") {
    throw new Error("Secure runtime profile must be local or tailnet.");
  }
  if (profile === "tailnet" && options.confirmPrivateNetwork !== true) {
    throw new Error(
      "Tailnet/private-network binding requires --confirm-private-network.",
    );
  }

  const token = validateToken(options.token);
  const port = validatePort(options.port);
  const host = profile === "tailnet" ? "0.0.0.0" : "127.0.0.1";
  return {
    profile,
    host,
    port,
    localUrl: `http://127.0.0.1:${port}`,
    privateNetworkBinding: profile === "tailnet",
    env: {
      NEXUS_TOKEN: token,
      NEXUS_DEPLOYMENT_PROFILE:
        profile === "tailnet" ? "secure-tailnet" : "secure-local",
      NEXUS_NETWORK_MODE: "isolated",
      NEXUS_ALLOW_PAID_APIS: "false",
      NEXUS_ENABLE_HIGH_RISK_TOOLS: "false",
      NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL: "true",
      NEXUS_RUNTIME_HOST: host,
      HOSTNAME: host,
      PORT: port,
      NEXUS_PHONE_LAN_ENABLED: profile === "tailnet" ? "true" : "false",
      NEXUS_PHONE_LAN_PORT: port,
    },
  };
}

export function inspectProductionBuild(rootPath, nextDistDir = ".next") {
  const root = resolve(rootPath);
  const distRoot = join(root, nextDistDir);
  const standaloneServer = join(distRoot, "standalone", "server.js");
  const buildId = join(distRoot, "BUILD_ID");
  if (existsSync(standaloneServer)) {
    return { ready: true, mode: "standalone", distRoot };
  }
  if (existsSync(buildId)) {
    return { ready: true, mode: "next-start", distRoot };
  }
  throw new Error(
    "Production build is missing. Run npm run build before secure startup.",
  );
}

function normalizeLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> "))
    .filter((line) => !line.startsWith("npm warn config production"));
}

function summarizeGateOutput(result) {
  const lines = [
    ...normalizeLines(result.stdout),
    ...normalizeLines(result.stderr),
  ];
  return lines.at(-1) || "No output captured.";
}

function runNpmScript(script, env) {
  const startedAt = Date.now();
  const result = spawnSync(`npm run ${script}`, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
    windowsHide: true,
  });
  return {
    script,
    passed: result.status === 0,
    status: result.status,
    durationMs: Date.now() - startedAt,
    summary: result.error
      ? `Unable to run ${script}.`
      : summarizeGateOutput(result),
  };
}

export function runSecureStartupGates(options = {}) {
  const env = options.env || {};
  const scripts = options.fullVerify ? ["verify"] : FAST_GATE_SCRIPTS;
  const results = scripts.map((script) => runNpmScript(script, env));
  const failures = results.filter((result) => !result.passed);
  if (failures.length > 0) {
    const failedNames = failures.map((result) => result.script).join(", ");
    throw new Error(`Secure startup blocked by failed gate(s): ${failedNames}.`);
  }
  return results;
}

function parseArgs(argv) {
  const readValue = (name) => {
    const direct = argv.find((arg) => arg.startsWith(`${name}=`));
    if (direct) return direct.slice(name.length + 1);
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    profile: readValue("--profile") || "local",
    port: readValue("--port") || "3000",
    confirmPrivateNetwork: argv.includes("--confirm-private-network"),
    checkOnly: argv.includes("--check"),
    fullVerify: argv.includes("--full-verify"),
    initToken: argv.includes("--init-token"),
  };
}

function printPosture(profile, build, fullVerify) {
  console.log("Nexus secure runtime gate");
  console.log(`profile: ${profile.profile}`);
  console.log(`bind: ${profile.host}:${profile.port}`);
  console.log(`production build: ${build.mode}`);
  console.log("network mode: isolated");
  console.log("paid APIs: blocked");
  console.log("high-risk tools: blocked");
  console.log("high-risk writes: approval required");
  console.log(`startup gate: ${fullVerify ? "full verify" : "fast safety checks"}`);
  if (profile.privateNetworkBinding) {
    console.log(
      "private-network note: 0.0.0.0 is not Tailscale-only; keep firewall and tailnet access policy restricted.",
    );
  }
}

async function launchRuntime(env) {
  const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  const onSigint = () => forwardSignal("SIGINT");
  const onSigterm = () => forwardSignal("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  return new Promise((resolvePromise, rejectPromise) => {
    const cleanup = () => {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    };
    child.on("error", (error) => {
      cleanup();
      rejectPromise(error);
    });
    child.on("exit", (code, signal) => {
      cleanup();
      if (signal) {
        process.exitCode = signal === "SIGINT" ? 130 : 143;
        resolvePromise(process.exitCode);
        return;
      }
      resolvePromise(code ?? 0);
    });
  });
}

async function main() {
  loadEnv({ path: ".env.local", override: false });
  const args = parseArgs(process.argv.slice(2));
  if (args.initToken) {
    const result = initializeSecureToken(".env.local");
    console.log(
      result.changed
        ? "Secure local token initialized without printing its value."
        : "Existing secure local token preserved.",
    );
    loadEnv({ path: ".env.local", override: true });
  }
  const profile = buildSecureRuntimeProfile({
    profile: args.profile,
    port: args.port,
    token: process.env.NEXUS_TOKEN,
    confirmPrivateNetwork: args.confirmPrivateNetwork,
  });
  const nextDistDir = process.env.NEXUS_NEXT_DIST_DIR || ".next";
  const build = inspectProductionBuild(process.cwd(), nextDistDir);
  const runtimeEnv = { ...process.env, ...profile.env };

  printPosture(profile, build, args.fullVerify);
  console.log("");
  console.log("Running startup safety gate...");
  const gates = runSecureStartupGates({
    env: runtimeEnv,
    fullVerify: args.fullVerify,
  });
  for (const gate of gates) {
    console.log(
      `[OK] ${gate.script} (${(gate.durationMs / 1000).toFixed(1)}s) - ${gate.summary}`,
    );
  }

  if (args.checkOnly) {
    console.log("");
    console.log(`Secure startup check passed. Runtime was not started.`);
    return;
  }

  console.log("");
  console.log(`Starting Nexus at ${profile.localUrl}`);
  if (profile.privateNetworkBinding) {
    console.log("Private-network access uses operator-managed Tailscale/firewall policy.");
  }
  const exitCode = await launchRuntime(runtimeEnv);
  process.exitCode = exitCode;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(
      `x secure-runtime-gate: ${error instanceof Error ? error.message : "Unknown failure."}`,
    );
    process.exitCode = 1;
  });
}
