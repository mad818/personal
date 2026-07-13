#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const [
  gitignore,
  agents,
  index,
  skill,
  skillMetadata,
  houseRules,
  scout,
  refinery,
  editor,
  audit,
  secondBrain,
  ai,
  route,
  serverBoundary,
  store,
  client,
  workbench,
  vault,
  schedulerUtils,
  schedulerRunner,
  packageSource,
] = await Promise.all([
  read(".gitignore"),
  read("AGENTS.md"),
  read("SECOND_BRAIN.md"),
  read("docs/ideas/skills/night-shift-second-brain/SKILL.md"),
  read("docs/ideas/skills/night-shift-second-brain/agents/openai.yaml"),
  read("docs/ideas/second-brain-night-shift/house-rules.md"),
  read("docs/ideas/second-brain-night-shift/playbooks/scout.md"),
  read("docs/ideas/second-brain-night-shift/playbooks/refinery.md"),
  read("docs/ideas/second-brain-night-shift/playbooks/editor.md"),
  read("docs/ideas/second-brain-night-shift/playbooks/audit.md"),
  read("lib/secondBrain.ts"),
  read("lib/ai.ts"),
  read("app/api/second-brain/night-shift/route.ts"),
  read("lib/secondBrainNightShiftServer.ts"),
  read("lib/secondBrainNightShiftStore.ts"),
  read("lib/secondBrainNightShiftClient.ts"),
  read("components/vault/SecondBrainNightShiftWorkbench.tsx"),
  read("components/vault/VaultPublishChamber.tsx"),
  read("components/ui/cronSchedulerPanelUtils.ts"),
  read("components/ui/CronSchedulerRunner.tsx"),
  read("package.json"),
]);

assert.match(gitignore, /^data\/second-brain\/$/m);
assert.match(agents, /night-shift-second-brain\/SKILL\.md/);
assert.match(agents, /0-raw\/.*sources\/.*immutable evidence/s);
assert.match(index, /live Obsidian-ready vault is `data\/second-brain\/`/);
assert.match(index, /Automatic work may stage proposals/);
assert.match(skill, /No source, no note/);
assert.match(skill, /explicit approval/);
assert.match(skill, /\.\.\/\.\.\/second-brain-night-shift\/house-rules\.md/);
assert.match(skillMetadata, /\$night-shift-second-brain/);
assert.match(houseRules, /Automatic work stops at `1-desk\/`/);
assert.match(scout, /Do not fetch logged-in or paywalled pages unattended/);
assert.match(refinery, /Save only to `1-desk\/`/);
assert.match(editor, /Never overwrite/);
assert.match(audit, /Report second-brain integrity without repairing it/);

assert.match(secondBrain, /"night-shift"/);
assert.match(secondBrain, /night-shift-rules/);
assert.match(ai, /secondBrainMode\?:.*"night-shift"/);
assert.match(route, /prepareNightShift/);
assert.match(route, /approveNightShiftProposal/);
assert.match(route, /runNightShiftAudit/);
assert.doesNotMatch(route, /body\.(?:path|directory|root)/);
assert.match(serverBoundary, /import "server-only"/);
assert.match(store, /path\.join\(process\.cwd\(\), "data", "second-brain"\)/);
assert.match(store, /fingerprint/);
assert.match(store, /flag: "wx"/);
assert.match(store, /source changed/i);
assert.match(store, /Report only\. No files were repaired or rewritten/);
assert.match(client, /secondBrainMode: "night-shift"/);
assert.match(client, /buildNightShiftScheduledJobs/);
assert.match(workbench, /Prepare review proposal/);
assert.match(workbench, /Approve promotion/);
assert.match(workbench, /Install overnight schedules/);
assert.match(vault, /SecondBrainNightShiftWorkbench/);
assert.match(schedulerUtils, /second-brain-night-shift/);
assert.match(schedulerUtils, /0 3 \* \* \*/);
assert.match(schedulerUtils, /0 22 \* \* 0/);
assert.match(schedulerRunner, /stagePreparedNightShift/);
assert.match(schedulerRunner, /runNightShiftAuditClient/);

const packageJson = JSON.parse(packageSource);
assert.ok(packageJson.scripts["second-brain-night-shift:check"]);
assert.match(packageJson.scripts.verify, /second-brain-night-shift:check/);

console.log("ok second-brain-night-shift static contract");
