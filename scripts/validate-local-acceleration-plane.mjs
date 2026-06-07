#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x local-acceleration: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

const client = readRequired("lib", "localAcceleration.ts");
const service = readRequired("scripts", "local-acceleration-service.py");
const route = readRequired("app", "api", "local-acceleration", "route.ts");
const memory = readRequired("lib", "memoryPagesStore.ts");
const memoryRoute = readRequired("app", "api", "memory", "pages", "route.ts");
const aiRoute = readRequired("app", "api", "ai", "route.ts");
const providerHealth = readRequired("app", "api", "health", "providers", "route.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const env = readRequired(".env.example");
const deployment = readRequired("docs", "deployment", "local-acceleration-plane.md");
const spec = readRequired("specs", "features", "local-acceleration-plane.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "readLocalAccelerationConfig",
  "validateLocalAccelerationEndpoint",
  "getLocalAccelerationStatus",
  "turboVecUpsert",
  "turboVecSearch",
  "turboVecRemove",
  "turboVecControl",
  "turboQuantControl",
  "off",
  "capture_only",
  "hybrid",
  "TURBOQUANT_EXEC_CONFIRMATION",
]) {
  requireText(client, needle, "client");
}

for (const needle of [
  'HOST = os.getenv("NEXUS_LOCAL_ACCELERATION_HOST", "127.0.0.1")',
  "Local acceleration service refuses non-loopback bind hosts.",
  "TurboVec",
  "IdMapIndex",
  "add_with_ids",
  'getattr(_index, "write", None)',
  '"allowlist"',
  "class ReadWriteLock",
  "with _index_gate.read():",
  "OLLAMA_BASE_URL",
  '@app.post("/turbovec/upsert")',
  '@app.post("/turbovec/search")',
  '@app.post("/turbovec/remove")',
  '@app.post("/turbovec/prepare")',
  '@app.post("/turbovec/persist")',
  '@app.post("/turbovec/reload")',
  '@app.post("/turbovec/rebuild")',
  '@app.get("/turboquant/capabilities")',
  '@app.get("/turboquant/limitations")',
  '@app.post("/turboquant/validate")',
  '@app.post("/turboquant/audit")',
  '@app.post("/turboquant/test")',
  '@app.post("/turboquant/benchmark")',
  "EXEC_CONFIRMATION",
  "shell=False",
]) {
  requireText(service, needle, "loopback companion service");
}
if (service.includes("shell=True")) fail("companion service must never use shell=True");

for (const needle of [
  "getLocalAccelerationStatus",
  "turboVecSearch",
  "turboVecUpsert",
  "turboVecRemove",
  "turboVecControl",
  "turboQuantControl",
]) {
  requireText(route, needle, "protected route");
}

requireText(routePolicy, 'prefix: "/api/local-acceleration"', "route policy");
requireText(memory, "indexCompiledMemoryPage", "VAULT auto-index hook");
requireText(memoryRoute, "turboVecSearch", "VAULT semantic search route");
requireText(aiRoute, "turboquant", "AI provider route");
requireText(providerHealth, "turboquant", "provider health");
requireText(env, "NEXUS_TURBOVEC_ENDPOINT", "environment contract");
requireText(env, "NEXUS_TURBOQUANT_ENABLED", "environment contract");
requireText(deployment, "Tailscale", "deployment topology");
requireText(deployment, "local-acceleration-service.py", "companion service operations");
requireText(spec, "TurboQuant GPL code remains outside Nexus", "license guardrail");

if (
  packageJson.scripts?.["local:acceleration:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-local-acceleration-runtime.mjs"
) {
  fail("package.json is missing local:acceleration:runtime:check");
}
if (
  packageJson.scripts?.["local:acceleration:check"] !==
  "node scripts/validate-local-acceleration-plane.mjs && npm run local:acceleration:runtime:check"
) {
  fail("package.json is missing local:acceleration:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run local:acceleration:check",
  "verify wiring",
);

console.log("ok local-acceleration-plane (protected controls, VAULT retrieval, TurboQuant provider, parity)");
