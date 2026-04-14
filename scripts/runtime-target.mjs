#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const LOCAL_RUNTIME_OPT_IN = "NEXUS_ASSUME_LOCAL_RUNTIME";
const RELEASE_BASE_URL_ENV = "NEXUS_RELEASE_BASE_URL";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

// Target-runtime checks should pick up operator-local staging config from repo root.
loadEnv({ path: join(repoRoot, ".env.local"), override: false });

function isTruthy(value) {
  return /^(1|true|yes)$/i.test(value ?? "");
}

export function resolveRuntimeTarget({
  scriptName,
  defaultPort = 3000,
} = {}) {
  const explicitBaseUrl = process.env[RELEASE_BASE_URL_ENV]?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (isTruthy(process.env[LOCAL_RUNTIME_OPT_IN])) {
    return `http://127.0.0.1:${defaultPort}`;
  }

  const localHint = `http://127.0.0.1:${defaultPort}`;
  console.error(
    `❌ ${scriptName}: no target runtime specified. Set ${RELEASE_BASE_URL_ENV} to the container/staged host, or set ${LOCAL_RUNTIME_OPT_IN}=true to intentionally run against ${localHint}.`,
  );
  process.exit(1);
}
