#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const fixtureRoot = resolve(root, "tmp-codex-runtime", "rate-limit-ledger-validator");
const fixtureRelativePath = relative(
  resolve(root, "tmp-codex-runtime"),
  fixtureRoot,
);

if (
  !fixtureRelativePath ||
  fixtureRelativePath.startsWith("..") ||
  isAbsolute(fixtureRelativePath)
) {
  throw new Error("Rate-limit validator fixture escaped tmp-codex-runtime.");
}

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function requireText(source, value, label) {
  assert.ok(source.includes(value), `${label} is missing ${value}`);
}

function fixtureKey(label) {
  return `api-fixture:${createHash("sha256").update(label).digest("hex")}`;
}

rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(fixtureRoot, { recursive: true });

try {
  const storeSource = readProjectFile("lib/security/rateLimitStore.ts");
  const compiledPath = join(fixtureRoot, "rate-limit-store.cjs");
  const transpiled = ts.transpileModule(storeSource, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "rateLimitStore.ts",
    reportDiagnostics: true,
  });
  assert.equal(
    transpiled.diagnostics?.length ?? 0,
    0,
    "rateLimitStore.ts should transpile without diagnostics",
  );
  writeFileSync(compiledPath, transpiled.outputText, "utf8");
  const require = createRequire(import.meta.url);
  const { PersistentRateLimitStore } = require(compiledPath);

  let now = Date.UTC(2026, 6, 14, 12, 0, 0);
  const nowProvider = () => now;
  const ledgerPath = join(fixtureRoot, "restart", "ledger.json");
  const privateIdentity = "198.51.100.10:fixture-bearer-value";
  const key = fixtureKey(privateIdentity);
  const config = { maxAttempts: 2, windowMs: 60_000 };

  const firstStore = new PersistentRateLimitStore({ ledgerPath, now: nowProvider });
  assert.deepEqual(firstStore.consume(key, config), {
    ok: true,
    remaining: 1,
    persistence: "persistent",
  });
  const firstLedger = readFileSync(ledgerPath, "utf8");
  assert.ok(!firstLedger.includes("198.51.100.10"));
  assert.ok(!firstLedger.includes("fixture-bearer-value"));
  assert.ok(firstLedger.includes(key));

  const restartedStore = new PersistentRateLimitStore({
    ledgerPath,
    now: nowProvider,
  });
  assert.deepEqual(restartedStore.consume(key, config), {
    ok: true,
    remaining: 0,
    persistence: "persistent",
  });
  const blockedAfterRestart = new PersistentRateLimitStore({
    ledgerPath,
    now: nowProvider,
  }).consume(key, config);
  assert.equal(blockedAfterRestart.ok, false);
  assert.equal(blockedAfterRestart.reason, "limit");
  assert.equal(blockedAfterRestart.retryAfterSec, 60);

  now += 60_000;
  const reopenedAfterExpiry = new PersistentRateLimitStore({
    ledgerPath,
    now: nowProvider,
  });
  assert.deepEqual(reopenedAfterExpiry.consume(key, config), {
    ok: true,
    remaining: 1,
    persistence: "persistent",
  });

  copyFileSync(ledgerPath, `${ledgerPath}.previous`);
  writeFileSync(ledgerPath, "not-json", "utf8");
  const recoveredStore = new PersistentRateLimitStore({
    ledgerPath,
    now: nowProvider,
  });
  assert.deepEqual(recoveredStore.getStatus(), {
    mode: "persistent",
    event: "previous_snapshot_recovered",
    entryCount: 1,
    maxEntries: 10_000,
  });
  assert.ok(!existsSync(`${ledgerPath}.previous`));

  writeFileSync(ledgerPath, "not-json", "utf8");
  const resetStore = new PersistentRateLimitStore({
    ledgerPath,
    now: nowProvider,
  });
  assert.deepEqual(resetStore.getStatus(), {
    mode: "persistent",
    event: "invalid_ledger_reset",
    entryCount: 0,
    maxEntries: 10_000,
  });
  assert.equal(JSON.parse(readFileSync(ledgerPath, "utf8")).version, 1);

  const blockedParent = join(fixtureRoot, "unwritable-parent");
  writeFileSync(blockedParent, "file-not-directory", "utf8");
  const degradedStore = new PersistentRateLimitStore({
    ledgerPath: join(blockedParent, "ledger.json"),
    now: nowProvider,
  });
  const degradedDecision = degradedStore.consume(fixtureKey("degraded"), config);
  assert.equal(degradedDecision.ok, true);
  assert.equal(degradedDecision.persistence, "memory_degraded");
  assert.equal(degradedStore.getStatus().event, "persistence_unavailable");

  const lanFailure = spawnSync(
    process.execPath,
    [join(root, "scripts", "phone-lan-start.mjs")],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        NEXUS_RATE_LIMIT_LEDGER_PATH: join(blockedParent, "lan-ledger.json"),
      },
      timeout: 10_000,
    },
  );
  assert.equal(lanFailure.status, 1);
  assert.match(
    lanFailure.stderr,
    /durable rate-limit storage is unavailable/,
  );

  const memoryPath = join(fixtureRoot, "memory", "ledger.json");
  const memoryStore = new PersistentRateLimitStore({
    ledgerPath: memoryPath,
    persistence: "memory",
    now: nowProvider,
  });
  const memoryDecision = memoryStore.consume(fixtureKey("memory"), config);
  assert.equal(memoryDecision.ok, true);
  assert.equal(memoryDecision.persistence, "memory_disabled");
  assert.equal(existsSync(memoryPath), false);

  const capacityPath = join(fixtureRoot, "capacity", "ledger.json");
  const capacityStore = new PersistentRateLimitStore({
    ledgerPath: capacityPath,
    maxEntries: 2,
    now: nowProvider,
  });
  const capacityKeyA = fixtureKey("capacity-a");
  const capacityKeyB = fixtureKey("capacity-b");
  capacityStore.consume(capacityKeyA, config);
  capacityStore.consume(capacityKeyB, config);
  const capacityDecision = capacityStore.consume(fixtureKey("capacity-c"), config);
  assert.equal(capacityDecision.ok, false);
  assert.equal(capacityDecision.reason, "capacity");
  assert.equal(capacityStore.getStatus().entryCount, 2);
  assert.deepEqual(capacityStore.consume(capacityKeyA, config), {
    ok: true,
    remaining: 0,
    persistence: "persistent",
  });

  const rateLimitSource = readProjectFile("lib/security/rateLimit.ts");
  const statusRoute = readProjectFile("app/api/status/route.ts");
  const envExample = readProjectFile(".env.example");
  const lanLauncher = readProjectFile("scripts/phone-lan-start.mjs");
  const dockerfile = readProjectFile("Dockerfile");
  const phoneRunbook = readProjectFile(
    "docs/deployment/phone-access-free-local.md",
  );
  const packageJson = JSON.parse(readProjectFile("package.json"));
  const todo = readProjectFile("tasks/todo.md");
  const spec = readProjectFile("specs/features/persistent-rate-limit-ledger.md");

  requireText(storeSource, "DEFAULT_RATE_LIMIT_MAX_ENTRIES = 10_000", "store");
  requireText(storeSource, "previous_snapshot_recovered", "store");
  requireText(storeSource, "persistence_unavailable", "store");
  requireText(rateLimitSource, "createDefaultRateLimitStore", "rate-limit helper");
  requireText(rateLimitSource, '"X-RateLimit-Store"', "rate-limit headers");
  requireText(statusRoute, "readRateLimitStoreStatus", "protected status route");
  requireText(envExample, "NEXUS_RATE_LIMIT_LEDGER_PATH", "env example");
  requireText(envExample, "NEXUS_RATE_LIMIT_PERSISTENCE", "env example");
  requireText(lanLauncher, "durable rate-limit storage is unavailable", "LAN launcher");
  requireText(lanLauncher, "openSync(rateLimitProbePath", "LAN launcher");
  requireText(dockerfile, "chown nextjs:nodejs /app/.nexus", "Dockerfile");
  requireText(phoneRunbook, "Restart-resistant rate limits", "phone runbook");
  requireText(phoneRunbook, "X-RateLimit-Store", "phone runbook");
  requireText(todo, "PERSISTENT-RATE-LIMIT-LEDGER", "task queue");
  requireText(spec, "Multiple Node processes or replicas", "feature spec");
  requireText(spec, "Complete.", "feature spec status");
  assert.equal(
    packageJson.scripts?.["security:rate-limit"],
    "node scripts/validate-persistent-rate-limit-ledger.mjs",
  );
  requireText(
    packageJson.scripts?.verify ?? "",
    "npm run security:rate-limit && npm run security:boundaries",
    "canonical verify",
  );

  console.log(
    "Persistent rate-limit ledger OK (restart durability, private identities, recovery, bounded capacity, degraded posture, LAN gate, and canonical wiring).",
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
