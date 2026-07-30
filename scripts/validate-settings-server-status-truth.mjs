#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x settings-server-status-truth: ${message}`);
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

function requireNormalizedText(source, needle, label) {
  const normalizedSource = source.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  requireText(normalizedSource, normalizedNeedle, label);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const spec = readRequired(
  "specs",
  "features",
  "settings-server-status-truth.md",
);
const loader = readRequired("lib", "settingsServerStatus.ts");
const drawer = readRequired("components", "settings", "SettingsDrawer.tsx");
const runtime = readRequired(
  "scripts",
  "check-settings-server-status-runtime.mjs",
);
const todo = readRequired("tasks", "todo.md");
const lessons = readRequired("tasks", "lessons.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "failed `GET /api/settings`",
  "malformed JSON",
  "unknown state",
  "stale request cannot overwrite a newer refresh",
  "Do not touch phone/PWA acceptance or RPG paths",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "response.ok",
  "isBooleanRecord(payload.status)",
  "Object.keys(value).length > 0",
  "SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE",
]) {
  requireText(loader, needle, "settings loader");
}

for (const needle of [
  "loadSettingsServerSnapshot",
  "serverSettingsRequestRef",
  'setServerSettingsStatus("loading")',
  'setServerSettingsStatus("error")',
  'setServerSettingsStatus("ready")',
  "Retry server status",
  "Key state is unknown",
  'const refreshed = await refreshServerSettings()',
  'serverSettingsStatus === "ready"',
]) {
  requireText(drawer, needle, "settings drawer");
}
requireNormalizedText(
  drawer,
  'serverSettingsStatus === "error" ? "alert" : "status"',
  "settings drawer",
);

forbidText(drawer, '.catch(() => {})', "settings drawer");
forbidText(
  drawer,
  'apiFetch("/api/settings")\n      .then',
  "settings drawer",
);

for (const needle of [
  "status: { OPENAI_API_KEY: true, BRAVE_SEARCH_KEY: false }",
  "status: { OPENAI_API_KEY: \"yes\" }",
  "status: {}",
  "network unavailable",
]) {
  requireText(runtime, needle, "runtime fixtures");
}

requireText(todo, "SETTINGS-SERVER-STATUS-TRUTH", "task queue");
requireText(
  lessons,
  "failed settings read is unknown state",
  "correction lesson",
);

const expected = {
  "settings:server-status:runtime:check":
    "node --no-warnings --experimental-strip-types scripts/check-settings-server-status-runtime.mjs",
  "settings:server-status:check":
    "node scripts/validate-settings-server-status-truth.mjs && npm run settings:server-status:runtime:check",
};
for (const [name, command] of Object.entries(expected)) {
  if (packageJson.scripts?.[name] !== command) {
    fail(`package.json ${name} must equal ${command}`);
  }
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run settings:server-status:check",
  "canonical verify command",
);

console.log(
  "ok settings-server-status-truth (loader, honest states, retry, accessibility, verification)",
);
