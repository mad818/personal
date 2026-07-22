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
- [ ] MW6-ARPG-WORK — Expand Aether Reliquary.
  - Build more game content.
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
assert.equal(blocks.length, 5);
assert.deepEqual(
  blocks.map((task) => task.key),
  [
    "REMOTE-CI",
    "PHONE-PROOF",
    "MW6-ARPG-WORK",
    "DECLARED-SANDBOX",
    "LOCAL-USEFUL",
  ],
);
assert.equal(
  blocks.some((task) => task.task.includes("nested step")),
  false,
);
assert.equal(blocks[4].context.includes("COMPLETE"), false);

const classifications = blocks.map(classifyPendingTask);
assert.deepEqual(
  classifications.map((task) => [task.classification, task.reason]),
  [
    ["blocked_or_manual", "remote_state_required"],
    ["blocked_or_manual", "physical_or_manual_proof"],
    ["excluded_rpg", "rpg_scope"],
    ["blocked_or_manual", "declared_external_prerequisite"],
    ["actionable", "local_ready"],
  ],
);

const queue = buildOrbitQueue(fixture);
assert.equal(queue.source, "next_up");
assert.equal(queue.next.key, "LOCAL-USEFUL");
assert.equal(queue.next.section, "next_up");
assert.deepEqual(queue.counts, {
  total: 5,
  actionable: 1,
  blockedOrManual: 3,
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
assert.match(human, /1 actionable, 3 blocked\/manual, 1 RPG-excluded/);

const all = formatOrbitQueue(queue, { all: true });
assert.match(all, /QUEUE REVIEW/);
assert.match(all, /REMOTE-CI/);
assert.match(all, /MW6-ARPG-WORK/);

const receipt = buildOrbitReceipt(queue);
assert.equal(receipt.command, "orbit:next");
assert.equal(receipt.next.key, "LOCAL-USEFUL");
assert.equal(receipt.tasks.length, 5);
assert.ok(
  receipt.tasks.every(
    (task) => task.task.length <= 500 && task.key.length <= 500,
  ),
  "receipt task labels must stay bounded",
);

const mixedHandoff = getHandoffQueueLines(fixture).join("\n");
assert.match(mixedHandoff, /LOCAL-USEFUL/);
assert.doesNotMatch(mixedHandoff, /REMOTE-CI|PHONE-PROOF|MW6-ARPG-WORK/);
assert.match(mixedHandoff, /1 actionable, 3 blocked\/manual tasks/);
assert.match(mixedHandoff, /1 RPG tasks are excluded/);
assert.match(mixedHandoff, /npm run orbit:next -- --all/);

const noActionable = buildOrbitQueue(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.
- [ ] SANDBOX — Execute the approved experiment.
  - Queue posture: blocked_external — sandbox evidence is absent.
- [ ] DEVICE — Complete device review.
  - Queue posture: blocked_manual — physical acceptance is required.
- [ ] MW6-ARPG — Aether Reliquary production work.
`);
assert.equal(noActionable.next, null);
assert.equal(noActionable.firstBlocker.key, "PHONE");
assert.equal(
  noActionable.tasks.find((task) => task.key === "SANDBOX")?.reason,
  "declared_external_prerequisite",
);
assert.equal(
  noActionable.tasks.find((task) => task.key === "DEVICE")?.reason,
  "declared_manual_prerequisite",
);
assert.match(
  formatOrbitQueue(noActionable),
  /No locally actionable non-RPG task is currently proven/,
);
const blockedHandoff = getHandoffQueueLines(`## Next Up
- [ ] PHONE — Remaining manual acceptance is required.
- [ ] MW6-ARPG — Aether Reliquary production work.
`).join("\n");
assert.match(
  blockedHandoff,
  /No locally actionable non-RPG task is currently proven/,
);
assert.match(blockedHandoff, /0 actionable, 1 blocked\/manual tasks/);
assert.match(blockedHandoff, /1 RPG tasks are excluded/);
assert.doesNotMatch(blockedHandoff, /PHONE —|MW6-ARPG/);

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
assert.match(cappedHandoff, /Additional actionable work — 1 more/);

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
const currentReconciliation = currentQueue.tasks.find(
  (task) => task.key === "DETACHED-COMPONENT-RECONCILIATION",
);
if (currentReconciliation) {
  assert.equal(currentReconciliation.classification, "actionable");
  assert.equal(currentReconciliation.reason, "local_ready");
  assert.equal(currentQueue.next?.key, "DETACHED-COMPONENT-RECONCILIATION");
  assert.equal(currentQueue.counts.actionable, 1);
} else {
  assert.equal(
    currentQueue.next,
    null,
    "the current queue must not invent local work after the reconciliation task closes",
  );
  assert.equal(currentQueue.counts.actionable, 0);
}
const currentFeynman = currentQueue.tasks.find(
  (task) => task.key === "FEYNMAN-SOURCE-PARITY",
);
assert.equal(currentFeynman?.classification, "blocked_or_manual");
assert.equal(currentFeynman?.reason, "declared_external_prerequisite");
assert.ok(currentQueue.counts.blockedOrManual >= 1);
assert.ok(currentQueue.counts.excludedRpg >= 1);

console.log(
  `ok orbit-actionable-next-runtime (next=${currentQueue.next?.key ?? "none"}, actionable=${currentQueue.counts.actionable}, blocked/manual=${currentQueue.counts.blockedOrManual}, RPG-excluded=${currentQueue.counts.excludedRpg})`,
);
