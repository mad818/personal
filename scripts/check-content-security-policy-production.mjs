#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { spawn } from "node:child_process";

const root = process.cwd();
const host = "127.0.0.1";
const port = String(randomInt(31_000, 32_000));
const baseUrl = `http://${host}:${port}`;
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const buildId = join(root, ".next", "BUILD_ID");
async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return;

  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const graceful = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 3_000)),
  ]);
  if (!graceful && child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
}

async function waitForHealth(child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server exited with ${child.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
      });
      if (response.ok) return;
    } catch {
      // The loop owns the bounded retry window while the server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not become healthy on ${baseUrl}.`);
}

function readNonce(policy) {
  const scriptDirective = policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("script-src "));
  assert.ok(scriptDirective, "Missing script-src directive.");
  assert.equal(scriptDirective.includes("'unsafe-inline'"), false);
  assert.equal(scriptDirective.includes("'unsafe-eval'"), false);
  assert.ok(scriptDirective.includes("'strict-dynamic'"));
  const match = scriptDirective.match(/'nonce-([^']+)'/g) ?? [];
  assert.equal(match.length, 1, "Expected exactly one script nonce source.");
  return match[0].slice("'nonce-".length, -1);
}

function assertRenderedScripts(html, nonce) {
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  assert.ok(scriptTags.length > 3, "Expected framework and Nexus script tags.");
  for (const tag of scriptTags) {
    assert.match(tag, new RegExp(`\\snonce=["']${nonce}["']`));
  }
  for (const id of [
    "nexus-persisted-shell-state-boot",
    "nexus-surface-motion-boot",
    "nexus-shell-bootstrap-guard",
  ]) {
    const tag = scriptTags.find((candidate) =>
      candidate.includes(`id="${id}"`),
    );
    assert.ok(tag, `Missing rendered ${id} script.`);
    assert.match(tag, new RegExp(`\\snonce=["']${nonce}["']`));
  }
}

async function readDocument() {
  const response = await fetch(`${baseUrl}/`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = readNonce(policy);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const html = await response.text();
  assertRenderedScripts(html, nonce);
  return { nonce, policy };
}

if (!existsSync(buildId)) {
  console.error("Run npm run build before security:csp:production:check.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [nextCli, "start", "-H", host, "-p", port],
  {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "ignore",
    windowsHide: true,
  },
);

try {
  await waitForHealth(child);
  const first = await readDocument();
  const second = await readDocument();
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.policy, second.policy);

  const apiResponse = await fetch(`${baseUrl}/api/health`, {
    cache: "no-store",
  });
  assert.equal(apiResponse.status, 200);
  const apiPolicy = apiResponse.headers.get("content-security-policy") ?? "";
  const apiNonce = readNonce(apiPolicy);
  assert.notEqual(apiNonce, first.nonce);
  assert.notEqual(apiNonce, second.nonce);

  console.log(
    "ok content-security-policy-production (distinct document/API nonces, nonce-only scripts, matching rendered tags, and preserved security headers)",
  );
} finally {
  await stopProcessTree(child);
}
