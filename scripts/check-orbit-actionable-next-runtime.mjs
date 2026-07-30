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
const { getHandoffQueueLines } = require("./generate-handoff.js");

const fixture = `# Tasks

## Next Up

- [ ] REMOTE-CI — Confirm remote checks.
  - Progress: remaining closure is remote-only after the local work passes.
  - [ ] This nested step must not become a task.
- [ ] PHONE-PROOF — Finish phone acceptance.
  - Remaining physical phone proof is required.
- [ ] DECLARED-SANDBOX — Run an approved sandbox experiment.
  - Queue posture: blocked_external — the required sandbox is absent.
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
assert.deepEqual(
  blocks.map((task) => task.key),
  ["REMOTE-CI", "PHONE-PROOF", "DECLARED-SANDBOX", "LOCAL-USEFUL"],
);
assert.equal(
  blocks.some((task) => task.task.includes("nested step")),
  false,
);

const classifications = blocks.map(classifyPendingTask);
assert.deepEqual(
  classifications.map((task) => [task.classification, task.reason]),
  [
    ["blocked_or_manual", "remote_state_required"],
    ["blocked_or_manual", "physical_or_manual_proof"],
    ["blocked_or_manual", "declared_external_prerequisite"],
    ["actionable", "local_ready"],
  ],
);

const queue = buildOrbitQueue(fixture);
assert.equal(queue.next.key, "LOCAL-USEFUL");
assert.deepEqual(queue.counts, {
  total: 4,
  actionable: 1,
  blockedOrManual: 3,
});

const human = formatOrbitQueue(queue);
assert.match(human, /ORBIT NEXT ACTIONABLE TASK/);
assert.match(human, /LOCAL-USEFUL/);
assert.match(human, /1 actionable, 3 blocked\/manual/);

const all = formatOrbitQueue(queue, { all: true });
assert.match(all, /QUEUE REVIEW/);
assert.match(all, /REMOTE-CI/);

const receipt = buildOrbitReceipt(queue);
assert.equal(receipt.command, "orbit:next");
assert.equal(receipt.next.key, "LOCAL-USEFUL");
assert.ok(
  receipt.tasks.every(
    (task) => task.task.length <= 500 && task.key.length <= 500,
  ),
);

const mixedHandoff = getHandoffQueueLines(fixture).join("\n");
assert.match(mixedHandoff, /LOCAL-USEFUL/);
assert.doesNotMatch(mixedHandoff, /REMOTE-CI|PHONE-PROOF/);
assert.match(mixedHandoff, /1 actionable and 3 blocked\/manual tasks/);

const noActionable = buildOrbitQueue(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.
- [ ] SANDBOX — Execute the approved experiment.
  - Queue posture: blocked_external — sandbox evidence is absent.
`);
assert.equal(noActionable.next, null);
assert.equal(noActionable.firstBlocker.key, "PHONE");
assert.match(
  formatOrbitQueue(noActionable),
  /No locally actionable task is currently proven/,
);

const cappedHandoff = getHandoffQueueLines(`## Next Up
- [ ] LOCAL-ONE — First actionable task.
- [ ] LOCAL-TWO — Second actionable task.
- [ ] LOCAL-THREE — Third actionable task.
- [ ] LOCAL-FOUR — Fourth actionable task.
`).join("\n");
assert.match(cappedHandoff, /LOCAL-ONE/);
assert.match(cappedHandoff, /LOCAL-TWO/);
assert.match(cappedHandoff, /LOCAL-THREE/);
assert.doesNotMatch(cappedHandoff, /LOCAL-FOUR/);

const inProgressFallback = buildOrbitQueue(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.

## In Progress
- [ ] ACTIVE-LOCAL — Continue a useful local feature.
`);
assert.equal(inProgressFallback.next.key, "ACTIVE-LOCAL");
assert.deepEqual(inProgressFallback.counts, {
  total: 2,
  actionable: 1,
  blockedOrManual: 1,
});

assert.deepEqual(parseArgs([]), { all: false, json: false });
assert.throws(() => parseArgs(["--unknown"]));

const currentQueue = buildOrbitQueue(fs.readFileSync("tasks/todo.md", "utf8"));
const currentActionableTasks = currentQueue.tasks.filter(
  (task) => task.classification === "actionable",
);
assert.equal(currentQueue.counts.actionable, currentActionableTasks.length);
assert.equal(currentQueue.next?.key, currentActionableTasks[0]?.key);

console.log(
  `ok orbit-actionable-next-runtime (next=${currentQueue.next?.key ?? "none"}, actionable=${currentQueue.counts.actionable}, blocked/manual=${currentQueue.counts.blockedOrManual})`,
);
