#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildOrbitQueue,
  buildOrbitReceipt,
  classifyPendingTask,
  formatOrbitQueue,
  getSectionLines,
  parseArgs,
  parseTopLevelPendingTaskBlocks,
} = require("./orbit.js");

const fixture = `# Tasks

## Next Up

- [ ] REMOTE-CI — Confirm remote checks.
  - Progress: remaining closure is remote-only after the local work passes.
  - [ ] This nested step must not become a task.
- [ ] PHONE-PROOF — Finish phone acceptance.
  - Remaining physical phone proof is required.
- [ ] MW6-ARPG-WORK — Expand Aether Reliquary.
  - Build more game content.
- [ ] LOCAL-USEFUL — Improve the local operator queue.
  - Guardrail: no external writes; operator approval and local review remain explicit.
- [x] COMPLETE — Ignore completed work.

## Historical

- [ ] OLD-TASK — This must stay outside the canonical queue.
`;

const lines = fixture.split(/\r?\n/);
const nextUpLines = getSectionLines(lines, "## Next Up");
assert.ok(nextUpLines);
const blocks = parseTopLevelPendingTaskBlocks(nextUpLines);
assert.equal(blocks.length, 4);
assert.deepEqual(
  blocks.map((task) => task.key),
  ["REMOTE-CI", "PHONE-PROOF", "MW6-ARPG-WORK", "LOCAL-USEFUL"],
);
assert.equal(
  blocks.some((task) => task.task.includes("nested step")),
  false,
);
assert.equal(blocks[3].context.includes("COMPLETE"), false);

const classifications = blocks.map(classifyPendingTask);
assert.deepEqual(
  classifications.map((task) => [task.classification, task.reason]),
  [
    ["blocked_or_manual", "remote_state_required"],
    ["blocked_or_manual", "physical_or_manual_proof"],
    ["excluded_rpg", "rpg_scope"],
    ["actionable", "local_ready"],
  ],
);

const queue = buildOrbitQueue(fixture);
assert.equal(queue.source, "next_up");
assert.equal(queue.next.key, "LOCAL-USEFUL");
assert.equal(queue.next.section, "next_up");
assert.deepEqual(queue.counts, {
  total: 4,
  actionable: 1,
  blockedOrManual: 2,
  excludedRpg: 1,
});
assert.equal(
  queue.tasks.some((task) => task.key === "OLD-TASK"),
  false,
);

const human = formatOrbitQueue(queue);
assert.match(human, /ORBIT NEXT ACTIONABLE TASK/);
assert.match(human, /LOCAL-USEFUL/);
assert.doesNotMatch(human, /Aether Reliquary/);
assert.match(human, /1 actionable, 2 blocked\/manual, 1 RPG-excluded/);

const all = formatOrbitQueue(queue, { all: true });
assert.match(all, /QUEUE REVIEW/);
assert.match(all, /REMOTE-CI/);
assert.match(all, /MW6-ARPG-WORK/);

const receipt = buildOrbitReceipt(queue);
assert.equal(receipt.command, "orbit:next");
assert.equal(receipt.next.key, "LOCAL-USEFUL");
assert.equal(receipt.tasks.length, 4);
assert.ok(
  receipt.tasks.every(
    (task) => task.task.length <= 500 && task.key.length <= 500,
  ),
  "receipt task labels must stay bounded",
);

const noActionable = buildOrbitQueue(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.
- [ ] MW6-ARPG — Aether Reliquary production work.
`);
assert.equal(noActionable.next, null);
assert.equal(noActionable.firstBlocker.key, "PHONE");
assert.match(
  formatOrbitQueue(noActionable),
  /No locally actionable non-RPG task is currently proven/,
);

const inProgressFallback = buildOrbitQueue(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.

## In Progress
- [ ] ACTIVE-LOCAL — Continue a useful local feature.
  - Guardrail: no external write and explicit operator review.
`);
assert.equal(inProgressFallback.source, "in_progress");
assert.equal(inProgressFallback.next.key, "ACTIVE-LOCAL");
assert.equal(inProgressFallback.next.section, "in_progress");
assert.deepEqual(inProgressFallback.counts, {
  total: 2,
  actionable: 1,
  blockedOrManual: 1,
  excludedRpg: 0,
});

const fallback = buildOrbitQueue(`# Tasks
## Backlog
- [ ] LOCAL-FALLBACK — Useful local work.
`);
assert.equal(fallback.source, "full_file");
assert.equal(fallback.next.key, "LOCAL-FALLBACK");

assert.deepEqual(parseArgs([]), { all: false, json: false });
assert.deepEqual(parseArgs(["--all", "--json"]), {
  all: true,
  json: true,
});
assert.throws(() => parseArgs(["--unknown"]));

const currentQueue = buildOrbitQueue(fs.readFileSync("tasks/todo.md", "utf8"));
assert.ok(currentQueue.next, "the current queue must expose local work");
assert.equal(currentQueue.next.classification, "actionable");
assert.notEqual(currentQueue.next.key, "CI-GREEN-NODE-RUNTIME");
assert.ok(currentQueue.counts.blockedOrManual >= 1);
assert.ok(currentQueue.counts.excludedRpg >= 1);

console.log(
  `ok orbit-actionable-next-runtime (next=${currentQueue.next.key}, actionable=${currentQueue.counts.actionable}, blocked/manual=${currentQueue.counts.blockedOrManual}, RPG-excluded=${currentQueue.counts.excludedRpg})`,
);
