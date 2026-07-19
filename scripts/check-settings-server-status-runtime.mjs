#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  loadSettingsServerSnapshot,
  SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE,
} from "../lib/settingsServerStatus.ts";

const success = await loadSettingsServerSnapshot(async () =>
  Response.json({
    status: { OPENAI_API_KEY: true, BRAVE_SEARCH_KEY: false },
    config: { NEXUS_NETWORK_MODE: "internal" },
    release: { buildChannel: "stable" },
  }),
);
assert.equal(success.ok, true);
if (success.ok) {
  assert.deepEqual(success.snapshot.status, {
    OPENAI_API_KEY: true,
    BRAVE_SEARCH_KEY: false,
  });
  assert.equal(success.snapshot.config?.NEXUS_NETWORK_MODE, "internal");
}

const failures = await Promise.all([
  loadSettingsServerSnapshot(async () =>
    Response.json({ error: "rate limited" }, { status: 429 }),
  ),
  loadSettingsServerSnapshot(
    async () => new Response("not-json", { status: 200 }),
  ),
  loadSettingsServerSnapshot(async () => Response.json({ config: {} })),
  loadSettingsServerSnapshot(async () =>
    Response.json({ status: { OPENAI_API_KEY: "yes" } }),
  ),
  loadSettingsServerSnapshot(async () => Response.json({ status: {} })),
  loadSettingsServerSnapshot(async () => {
    throw new Error("network unavailable");
  }),
]);

for (const result of failures) {
  assert.deepEqual(result, {
    ok: false,
    message: SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE,
  });
}

console.log(
  "ok settings-server-status-runtime (success, http, json, payload, network)",
);
