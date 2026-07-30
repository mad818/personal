#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  CENTRAL_ORCHESTRATOR_MAX_WORKERS,
  buildSpecialistWorkerMessages,
  normalizeCentralOrchestratorWorker,
  normalizeSpecialistMission,
  parseSpecialistHandoff,
} from "../lib/centralOrchestrator.ts";

assert.equal(CENTRAL_ORCHESTRATOR_MAX_WORKERS, 3);
assert.equal(normalizeCentralOrchestratorWorker("ORBIT"), "orbit");
assert.equal(normalizeCentralOrchestratorWorker("jansky"), null);

const mission = normalizeSpecialistMission({
  worker: "cipher",
  taskId: "audit-1",
  mission: "Review the supplied trust boundary.",
  context: "A route accepts a bounded JSON body and calls the internal AI wrapper.",
  expectedOutput: "Risk verdict and verification steps.",
});
assert.ok(mission);
assert.equal(mission.worker, "cipher");

const messages = buildSpecialistWorkerMessages(mission);
assert.equal(messages.length, 2);
assert.match(messages[0].content, /no tools/i);
assert.match(messages[0].content, /Return ONLY one valid JSON object/);

const parsed = parseSpecialistHandoff(
  JSON.stringify({
    taskId: "wrong-id",
    worker: "orbit",
    status: "completed",
    summary: "Boundary is reviewable.",
    deliverable: "No direct mutation path was supplied.",
    codeProposal: null,
    files: ["app/api/tools/route.ts"],
    evidence: ["The supplied context names the internal wrapper."],
    notes: [],
    risks: ["Runtime auth still needs verification."],
    verification: ["Run the focused orchestrator check."],
    nextAction: "MAX should verify the route policy.",
  }),
  mission,
);
assert.equal(parsed.taskId, "audit-1");
assert.equal(parsed.worker, "cipher");
assert.equal(parsed.status, "completed");
assert.equal(parsed.files.length, 1);

const degraded = parseSpecialistHandoff("not json", mission);
assert.equal(degraded.status, "degraded");
assert.match(degraded.deliverable, /not json/);

assert.equal(
  normalizeSpecialistMission({ worker: "orbit", mission: "" }),
  null,
);

console.log("ok central-orchestrator runtime");
