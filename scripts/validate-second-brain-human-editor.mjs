#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  indexSource,
  agentsSource,
  skillSource,
  skillMetadata,
  aiRouteSource,
  statusRouteSource,
  editorSource,
  skillsPageSource,
  vaultSource,
  packageSource,
] = await Promise.all([
  readFile("SECOND_BRAIN.md", "utf8"),
  readFile("AGENTS.md", "utf8"),
  readFile("docs/ideas/skills/human-editor/SKILL.md", "utf8"),
  readFile("docs/ideas/skills/human-editor/agents/openai.yaml", "utf8"),
  readFile("app/api/ai/route.ts", "utf8"),
  readFile("app/api/second-brain/route.ts", "utf8"),
  readFile("components/skills/HumanEditorWorkbench.tsx", "utf8"),
  readFile("app/skills/page.tsx", "utf8"),
  readFile("components/vault/VaultPublishChamber.tsx", "utf8"),
  readFile("package.json", "utf8"),
]);

assert.match(indexSource, /Files are the durable record\. AI memory is a recall aid\./);
assert.match(indexSource, /docs\/ideas\/skills\/human-editor\/SKILL\.md/);
assert.match(agentsSource, /Read `SECOND_BRAIN\.md` at the start/);
assert.match(agentsSource, /skills\/human-editor\/SKILL\.md/);

for (const heading of [
  "Human Editor Mode",
  "Natural Thought Flow",
  "AI Pattern Breaker",
  "Ban the Fluff Words",
  "Reader-First Rewrite",
  "Mega",
]) {
  assert.match(skillSource, new RegExp(heading));
}
assert.doesNotMatch(skillSource, /@NextGenAi5|5:55 AM|1,733|Views/);
assert.match(skillMetadata, /Use \$human-editor/);

assert.match(aiRouteSource, /buildSecondBrainSystemBlock/);
assert.match(aiRouteSource, /X-Second-Brain-Mode/);
assert.match(aiRouteSource, /second_brain_unavailable/);
assert.match(aiRouteSource, /system: effectiveSystem/);
assert.match(statusRouteSource, /readSecondBrainStatus/);
assert.doesNotMatch(statusRouteSource, /content:/);

assert.match(editorSource, /secondBrainMode: "human-editor"/);
assert.match(editorSource, /Session only/);
assert.match(editorSource, /No auto-save/);
assert.match(skillsPageSource, /HumanEditorWorkbench/);
assert.match(vaultSource, /SecondBrainFileStatus/);

const packageJson = JSON.parse(packageSource);
assert.ok(packageJson.scripts["second-brain:check"]);
assert.match(packageJson.scripts.verify, /second-brain:check/);

console.log("ok second-brain-human-editor static contract");
