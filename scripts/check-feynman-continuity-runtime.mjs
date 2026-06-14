#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "nexus-feynman-continuity-"));
process.env.NEXUS_FEYNMAN_DATA_DIR = tempRoot;

const continuity = await import("../lib/feynmanContinuity.ts");
const store = await import("../lib/feynmanContinuityStore.ts");

const sessionId = continuity.createFeynmanSessionId(
  "deepresearch",
  "Collision-safe continuity fixture",
  Date.UTC(2026, 5, 13, 12, 30, 45),
  "abcdef12-3456-7890-abcd-ef1234567890",
);
assert.equal(
  sessionId,
  "20260613T123045-deepresearch-collision-safe-continuity-fixture-abcdef12",
);
assert.equal(continuity.isSafeFeynmanSessionId(sessionId), true);
assert.equal(continuity.isSafeFeynmanSessionId("../escape"), false);

const session = await store.startFeynmanContinuitySession({
  workflow: "deepresearch",
  topic: "Collision-safe continuity fixture",
  now: Date.UTC(2026, 5, 13, 12, 30, 45),
  nonce: "abcdef12-3456-7890-abcd-ef1234567890",
});
await store.appendFeynmanNotebookEntry(session.id, {
  at: "2026-06-13T12:30:46.000Z",
  stage: "researcher",
  status: "complete",
  note: "Read two direct sources.",
});

const completed = await store.completeFeynmanContinuitySession(session.id, {
  workflow: "deepresearch",
  topic: "Collision-safe continuity fixture",
  report:
    "# Continuity fixture\n\n## Open Questions\n\nWhich source should be read next?\n\nhttps://example.com/source",
  sources: [
    {
      id: "S1",
      title: "Fixture source",
      url: "https://example.com/source",
      kind: "official",
      confidence: "high",
      keyClaim: "The fixture has a direct source.",
      accepted: true,
    },
  ],
  claims: [
    {
      id: "C1",
      claim: "The fixture has a direct source.",
      sourceIds: ["S1"],
      verdict: "supported",
      rationale: "S1 was read directly.",
    },
  ],
  reviewFindings: [
    {
      severity: "minor",
      issue: "Fixture coverage is bounded.",
      recommendation: "Read another source.",
    },
  ],
  failures: [],
  stageStatus: {
    researcher: "complete",
    writer: "complete",
    verifier: "complete",
    reviewer: "complete",
  },
  approvalRequired: false,
});

assert.equal(completed.status, "complete");
for (const artifact of [
  "plan",
  "notebook",
  "report",
  "evidence",
  "claims",
  "review",
  "provenance",
  "preview",
  "pdf",
]) {
  assert.ok(
    completed.artifacts.some((entry) => entry.kind === artifact),
    `missing ${artifact} artifact`,
  );
}

const notebook = await readFile(path.join(tempRoot, session.id, "notebook.md"), "utf8");
assert.match(notebook, /Read two direct sources/);
const provenance = JSON.parse(
  await readFile(path.join(tempRoot, session.id, "provenance.json"), "utf8"),
);
assert.equal(provenance.sources[0].id, "S1");
const preview = await store.readFeynmanContinuityArtifact(session.id, "preview");
assert.equal(preview.contentType, "text/html; charset=utf-8");
assert.match(preview.buffer.toString("utf8"), /Continuity fixture/);
const pdf = await store.readFeynmanContinuityArtifact(session.id, "pdf");
assert.equal(pdf.contentType, "application/pdf");
assert.equal(pdf.buffer.subarray(0, 5).toString("ascii"), "%PDF-");

const searchResults = await store.searchFeynmanContinuitySessions("direct source", {
  limit: 5,
});
assert.equal(searchResults[0]?.id, session.id);
const resume = continuity.buildFeynmanResumeContext(completed);
assert.match(resume, /Resume Feynman session/);
assert.match(resume, /Which source should be read next/);
assert.match(resume, new RegExp(session.id));

await assert.rejects(
  () => store.readFeynmanContinuityArtifact("../escape", "report"),
  /Unsafe Feynman session ID/,
);

await rm(tempRoot, { recursive: true, force: true });
console.log("ok feynman-continuity-runtime (safe sessions, notebook, search/resume, sidecar, preview, pdf)");
