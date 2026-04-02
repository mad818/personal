import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type SharedRuntimeIdentity = {
  bootId: string;
  startedAt: string;
};

const RUNTIME_IDENTITY_PATH =
  process.env.NEXUS_RUNTIME_IDENTITY_PATH ??
  join(process.cwd(), ".nexus-runtime-identity.json");

declare global {
  // eslint-disable-next-line no-var
  var __NEXUS_RUNTIME_IDENTITY__: SharedRuntimeIdentity | undefined;
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function readPersistedRuntimeIdentity(): SharedRuntimeIdentity | null {
  if (!existsSync(RUNTIME_IDENTITY_PATH)) return null;

  try {
    const raw = readFileSync(RUNTIME_IDENTITY_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SharedRuntimeIdentity>;
    if (isNonEmpty(parsed.bootId) && isNonEmpty(parsed.startedAt)) {
      return {
        bootId: parsed.bootId,
        startedAt: parsed.startedAt,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function persistRuntimeIdentity(identity: SharedRuntimeIdentity) {
  try {
    writeFileSync(RUNTIME_IDENTITY_PATH, JSON.stringify(identity), "utf-8");
  } catch {
    // Ignore write failures; runtime responses can still fall back to env/global state.
  }
}

function ensureRuntimeIdentity(): SharedRuntimeIdentity {
  if (!globalThis.__NEXUS_RUNTIME_IDENTITY__) {
    const persisted = readPersistedRuntimeIdentity();
    const startedAt = isNonEmpty(process.env.NEXUS_STARTED_AT)
      ? process.env.NEXUS_STARTED_AT
      : persisted?.startedAt ?? new Date().toISOString();
    const bootId = isNonEmpty(process.env.NEXUS_BOOT_ID)
      ? process.env.NEXUS_BOOT_ID
      : persisted?.bootId ?? randomUUID();
    const identity = { bootId, startedAt };

    process.env.NEXUS_STARTED_AT = identity.startedAt;
    process.env.NEXUS_BOOT_ID = identity.bootId;
    persistRuntimeIdentity(identity);
    globalThis.__NEXUS_RUNTIME_IDENTITY__ = identity;
  }

  return globalThis.__NEXUS_RUNTIME_IDENTITY__;
}

export function readRuntimeIdentity() {
  const { bootId, startedAt } = ensureRuntimeIdentity();
  const ageMs = Math.max(0, Date.now() - new Date(startedAt).getTime());

  return {
    bootId,
    startedAt,
    ageMs,
    ageSeconds: Math.floor(ageMs / 1000),
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

export function applyNoStoreHeaders(headers: Headers) {
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
}
