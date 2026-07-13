#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [aiSource, settingsSource, paritySource] = await Promise.all([
  readFile("lib/ai.ts", "utf8"),
  readFile("components/settings/SettingsDrawer.tsx", "utf8"),
  readFile("docs/ideas/source-parity/tinyhumansai-openhuman.json", "utf8"),
]);

assert.match(aiSource, /buildPersonalAIProfilePromptBlock/);
assert.doesNotMatch(aiSource, /buildDirectCallProfileBlock/);
assert.match(settingsSource, /personal-ai-profile-status/);
assert.match(settingsSource, /Personal AI Profile/);

const parity = JSON.parse(paritySource);
assert.equal(parity.source.license, "GPL-3.0");
const profileCapability = parity.capabilities.find(
  (capability) => capability.id === "explicit-personal-ai-profile",
);
assert.equal(profileCapability?.disposition, "adapted");

console.log("ok personal-ai-profile static contract");
