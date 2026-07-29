#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import {
  buildOperationalReadiness,
  classifyHealthProbe,
  openLocalBrowser,
  parseOperationalArgs,
  probeNexusHealth,
  waitForHealthyRuntime,
} from "./operational-start.mjs";
import {
  PROJECT_SKILLS,
  buildProjectSkillRoutingBlock,
  getProjectSkillsForAgent,
} from "../lib/projectSkillRegistry.ts";

const root = process.cwd();
const runtimeCredential = [
  "operational",
  "runtime",
  "fixture",
  "with",
  "sufficient",
  "variety",
].join("-");

function buildEnvText(value) {
  return `${["NEXUS", "TOKEN"].join("_")}=${value}\n`;
}

function assertThrowsMessage(run, expected) {
  assert.throws(run, (error) => {
    assert.match(String(error?.message ?? error), expected);
    return true;
  });
}

const defaults = parseOperationalArgs([]);
assert.deepEqual(defaults, {
  check: false,
  json: false,
  openBrowser: true,
  port: 3000,
  smoke: false,
  timeoutMs: 90_000,
});

assert.deepEqual(
  parseOperationalArgs([
    "--check",
    "--json",
    "--no-open",
    "--smoke",
    "--port=3100",
    "--timeout-ms=12000",
  ]),
  {
    check: true,
    json: true,
    openBrowser: false,
    port: 3100,
    smoke: true,
    timeoutMs: 12_000,
  },
);
assertThrowsMessage(() => parseOperationalArgs(["--port=0"]), /port/i);
assertThrowsMessage(
  () => parseOperationalArgs(["--timeout-ms=999"]),
  /timeout/i,
);
assertThrowsMessage(() => parseOperationalArgs(["--surprise"]), /unknown/i);

const exactHealth = {
  status: "ok",
  service: "homefront",
  runtime: {
    bootId: "boot-123",
    startedAt: "2026-07-28T00:00:00.000Z",
    ageSeconds: 2,
  },
};

assert.equal(
  classifyHealthProbe({ reachable: true, status: 200, payload: exactHealth }),
  "nexus_healthy",
);
assert.equal(
  classifyHealthProbe({
    reachable: true,
    status: 200,
    payload: { status: "ok", service: "another-app" },
  }),
  "occupied_non_nexus",
);
assert.equal(
  classifyHealthProbe({ reachable: false, code: "ECONNREFUSED" }),
  "available",
);
assert.equal(
  classifyHealthProbe({ reachable: false, code: "ETIMEDOUT" }),
  "occupied_unhealthy",
);

const nonNexusServer = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ status: "ok", service: "another-app" }));
});
await new Promise((resolvePromise, rejectPromise) => {
  nonNexusServer.once("error", rejectPromise);
  nonNexusServer.listen(0, "127.0.0.1", resolvePromise);
});
const nonNexusAddress = nonNexusServer.address();
assert.notEqual(nonNexusAddress, null);
assert.equal(typeof nonNexusAddress, "object");
const nonNexusProbe = await probeNexusHealth(
  `http://127.0.0.1:${nonNexusAddress.port}/api/health`,
);
assert.equal(classifyHealthProbe(nonNexusProbe), "occupied_non_nexus");
await new Promise((resolvePromise) => nonNexusServer.close(resolvePromise));

const ready = buildOperationalReadiness({
  nodeVersion: "v24.18.0",
  npmVersion: "11.16.0",
  nextCliExists: true,
  envText: buildEnvText(runtimeCredential),
  port: 3000,
  runtimeMode: "development",
  existingProbe: { reachable: false, code: "ECONNREFUSED" },
});
assert.equal(ready.ready, true);
assert.equal(ready.runtimeState, "available");
assert.equal(JSON.stringify(ready).includes(runtimeCredential), false);

const reusable = buildOperationalReadiness({
  nodeVersion: "v24.18.0",
  npmVersion: "11.16.0",
  nextCliExists: true,
  envText: buildEnvText(runtimeCredential),
  port: 3000,
  runtimeMode: "development",
  existingProbe: { reachable: true, status: 200, payload: exactHealth },
});
assert.equal(reusable.ready, true);
assert.equal(reusable.runtimeState, "nexus_healthy");

const blocked = buildOperationalReadiness({
  nodeVersion: "v23.9.0",
  npmVersion: "10.9.0",
  nextCliExists: false,
  envText: buildEnvText("short"),
  port: 3000,
  runtimeMode: "development",
  existingProbe: {
    reachable: true,
    status: 200,
    payload: { status: "ok", service: "another-app" },
  },
});
assert.equal(blocked.ready, false);
assert.deepEqual(
  blocked.issues.map((issue) => issue.id),
  ["node", "npm", "dependencies", "token", "port"],
);
assert.equal(
  blocked.issues.some((issue) =>
    issue.recovery.includes("secure:start -- --init-token --check"),
  ),
  true,
);

assert.equal(PROJECT_SKILLS.length, 4);
assert.equal(new Set(PROJECT_SKILLS.map((skill) => skill.id)).size, 4);
for (const skill of PROJECT_SKILLS) {
  assert.equal(
    fs.existsSync(path.join(root, skill.path)),
    true,
    `${skill.path} must exist`,
  );
  assert.equal(skill.trigger.trim().length > 12, true);
  assert.equal(skill.agents.length > 0, true);
}

assert.deepEqual(
  getProjectSkillsForAgent("cipher").map((skill) => skill.id),
  ["review-external-agent-skill"],
);
assert.match(
  buildProjectSkillRoutingBlock("orbit"),
  /concise-technical-output/,
);
assert.match(buildProjectSkillRoutingBlock("orbit"), /run-status-summary/);
assert.doesNotMatch(
  buildProjectSkillRoutingBlock("flux"),
  /deterministic-media-production/,
);

let terminated = false;
await assert.rejects(
  waitForHealthyRuntime({
    healthUrl: "http://127.0.0.1:3000/api/health",
    timeoutMs: 15,
    intervalMs: 1,
    childState: () => ({ exited: false, exitCode: null, signal: null }),
    probe: async () => ({ reachable: false, code: "ECONNREFUSED" }),
    terminate: async () => {
      terminated = true;
    },
  }),
  /timed out/i,
);
assert.equal(terminated, true);

const fakeBrowserProcess = new EventEmitter();
const browserFallback = openLocalBrowser("http://127.0.0.1:3000/hq", {
  platform: "win32",
  env: { ComSpec: "cmd.exe" },
  spawnImpl: (executable, args, options) => {
    assert.equal(executable, "cmd.exe");
    assert.deepEqual(args, [
      "/d",
      "/s",
      "/c",
      "start",
      '""',
      "http://127.0.0.1:3000/hq",
    ]);
    assert.equal(options.windowsHide, true);
    queueMicrotask(() => fakeBrowserProcess.emit("exit", 1));
    return fakeBrowserProcess;
  },
});
assert.deepEqual(await browserFallback, {
  opened: false,
  error: "browser opener exited with code 1",
});

await assert.rejects(
  waitForHealthyRuntime({
    healthUrl: "http://127.0.0.1:3000/api/health",
    timeoutMs: 100,
    intervalMs: 1,
    childState: () => ({ exited: true, exitCode: 7, signal: null }),
    probe: async () => ({ reachable: false, code: "ECONNREFUSED" }),
    terminate: async () => {
      throw new Error("must not terminate an already exited child");
    },
  }),
  /exited with code 7/i,
);

await assert.rejects(
  waitForHealthyRuntime({
    healthUrl: "http://127.0.0.1:3000/api/health",
    timeoutMs: 100,
    intervalMs: 1,
    childState: () => ({
      exited: true,
      exitCode: null,
      signal: null,
      error: "spawn ENOENT",
    }),
    probe: async () => ({ reachable: false, code: "ECONNREFUSED" }),
    terminate: async () => {
      throw new Error("must not terminate a failed spawn");
    },
  }),
  /failed to start: spawn ENOENT/i,
);

console.log(
  "ok operational-start-runtime (readiness, health classification, timeout cleanup, and 4 linked project skills)",
);
