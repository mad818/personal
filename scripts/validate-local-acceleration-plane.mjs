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
const launcher = readRequired("scripts", "start-local-acceleration-service.mjs");
const installer = readRequired("scripts", "install-local-turbovec-wheel.mjs");
const turboQuantAudit = readRequired("scripts", "audit-local-turboquant-checkout.mjs");
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
  "HTTP_BACKEND",
  "ThreadingHTTPServer",
  "NEXUS_LOCAL_ACCELERATION_EMBED_MODE",
  "NEXUS_LOCAL_ACCELERATION_VECTOR_BACKEND",
  "_hash_embed",
  "class LocalVectorIndex",
  '@app.post("/turbovec/upsert")',
  '@app.post("/turbovec/search")',
  '@app.post("/turbovec/remove")',
  '@app.post("/turbovec/prepare")',
  '@app.post("/turbovec/persist")',
  '@app.post("/turbovec/reload")',
  '@app.post("/turbovec/rebuild")',
  '@app.get("/turboquant/capabilities")',
  '@app.get("/turboquant/limitations")',
  '@app.post("/turboquant/proof")',
  '@app.post("/turboquant/benchmark")',
  "EXEC_CONFIRMATION",
  "shell=False",
]) {
  requireText(service, needle, "loopback companion service");
}
if (service.includes("shell=True")) fail("companion service must never use shell=True");
for (const forbidden of [
  '@app.post("/turboquant/validate")',
  '@app.post("/turboquant/audit")',
  '@app.post("/turboquant/test")',
  'NEXUS_TURBOQUANT_BENCHMARK_SCRIPT',
]) {
  if (service.includes(forbidden)) {
    fail(`loopback companion service contains unavailable or arbitrary ${forbidden}`);
  }
}
for (const needle of [
  "findLocalAccelerationPython",
  "NEXUS_LOCAL_ACCELERATION_PYTHON",
  "local-acceleration-service.py",
  "--check",
]) {
  requireText(launcher, needle, "companion service launcher");
}
for (const needle of [
  "INSTALL_VERIFIED_TURBOVEC_LOCAL_WHEEL",
  "verifyLocalTurboVecWheel",
  "--no-index",
  "--no-deps",
  "sha256File",
  ".nexus",
]) {
  requireText(installer, needle, "reviewed local TurboVec installer");
}
for (const forbidden of ["https://", "http://", "shell: true", "npm install"]) {
  if (installer.includes(forbidden)) {
    fail(`reviewed local TurboVec installer contains forbidden ${forbidden}`);
  }
}
for (const needle of [
  "auditLocalTurboQuantCheckout",
  "TURBOQUANT_REVIEWED_COMMIT",
  "7ac9b8d165a3f7d5e6df33b0450bc1f88ec0d4d5",
  "spawnSync",
  "--porcelain=v1",
  "--ignored=matching",
  "GNU GENERAL PUBLIC LICENSE",
  "Version 3",
  "validate_paper.py",
  "audit_claims.py",
  "proof.py",
  "benchmark.py",
  "test_modular.py",
  "test_turboquant.py",
  "turboquant/integration/vllm.py",
  "isSymbolicLink",
]) {
  requireText(turboQuantAudit, needle, "reviewed local TurboQuant checkout audit");
}

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
requireText(env, "NEXUS_LOCAL_ACCELERATION_PYTHON", "environment contract");
requireText(env, "NEXUS_LOCAL_ACCELERATION_EMBED_MODE", "environment contract");
requireText(env, "NEXUS_LOCAL_ACCELERATION_VECTOR_BACKEND", "environment contract");
requireText(deployment, "Tailscale", "deployment topology");
requireText(deployment, "local-acceleration-service.py", "companion service operations");
requireText(spec, "TurboQuant GPL code remains outside Nexus", "license guardrail");

if (
  packageJson.scripts?.["local:acceleration:service:check"] !==
  "node scripts/check-local-acceleration-launcher.mjs && node scripts/start-local-acceleration-service.mjs --check"
) {
  fail("package.json is missing local:acceleration:service:check");
}
if (
  packageJson.scripts?.["local:acceleration:turbovec:install"] !==
  "node scripts/install-local-turbovec-wheel.mjs"
) {
  fail("package.json is missing local:acceleration:turbovec:install");
}
if (
  packageJson.scripts?.["local:acceleration:turbovec:install:check"] !==
  "node scripts/check-local-turbovec-installer.mjs"
) {
  fail("package.json is missing local:acceleration:turbovec:install:check");
}
if (
  packageJson.scripts?.["local:acceleration:turboquant:audit:check"] !==
  "node scripts/check-local-turboquant-checkout.mjs"
) {
  fail("package.json is missing local:acceleration:turboquant:audit:check");
}
if (
  packageJson.scripts?.["local:acceleration:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-local-acceleration-runtime.mjs"
) {
  fail("package.json is missing local:acceleration:runtime:check");
}
if (
  packageJson.scripts?.["local:acceleration:check"] !==
  "node scripts/validate-local-acceleration-plane.mjs && npm run local:acceleration:turbovec:install:check && npm run local:acceleration:turboquant:audit:check && npm run local:acceleration:service:check && npm run local:acceleration:runtime:check && npm run local:acceleration:acceptance:check"
) {
  fail("package.json is missing local:acceleration:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run local:acceleration:check",
  "verify wiring",
);

console.log("ok local-acceleration-plane (protected controls, VAULT retrieval, TurboQuant provider, parity)");
