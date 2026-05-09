#!/usr/bin/env node
/* eslint-disable no-console */

import { randomUUID } from "crypto";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { startServer } from "next/dist/server/lib/start-server.js";

const root = process.cwd();
const nextDir = join(root, ".next");
const runtimeIdentityPath = join(root, ".nexus-runtime-identity.json");
const host = process.env.NEXUS_RUNTIME_HOST ?? process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.NEXUS_RUNTIME_PORT ?? process.env.PORT ?? "3100");

if (!Number.isInteger(port) || port <= 0) {
  console.error("nexus-dev-direct: invalid PORT/NEXUS_RUNTIME_PORT");
  process.exit(1);
}

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("nexus-dev-direct: cleared .next for a fresh runtime");
}

if (existsSync(runtimeIdentityPath)) {
  rmSync(runtimeIdentityPath, { force: true });
}

process.env.PORT = String(port);
process.env.HOSTNAME = host;
process.env.NEXUS_STARTED_AT = new Date().toISOString();
process.env.NEXUS_BOOT_ID = process.env.NEXUS_BOOT_ID ?? randomUUID();
process.env.NEXUS_RUNTIME_IDENTITY_PATH =
  process.env.NEXUS_RUNTIME_IDENTITY_PATH ?? runtimeIdentityPath;

console.log(`nexus-dev-direct: starting in-process dev server on http://${host}:${port}`);

try {
  await startServer({
    dir: root,
    port,
    hostname: host,
    isDev: true,
    allowRetry: false,
  });
  setInterval(() => undefined, 60_000);
  await new Promise(() => undefined);
} catch (error) {
  console.error(error);
  process.exit(1);
}
