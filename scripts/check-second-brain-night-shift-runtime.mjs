#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  NIGHT_SHIFT_MAX_SOURCE_ITEMS,
  NIGHT_SHIFT_MAX_TOTAL_SOURCE_CHARS,
  normalizeNightShiftProposal,
  parseNightShiftProposal,
} from "../lib/secondBrainNightShiftContract.ts";

const originalCwd = process.cwd();
const fixtureRoot = await mkdtemp(path.join(tmpdir(), "nexus-night-shift-"));

try {
  const trackedRoot = path.join(
    fixtureRoot,
    "docs/ideas/second-brain-night-shift",
  );
  await mkdir(path.join(trackedRoot, "playbooks"), { recursive: true });
  await writeFile(path.join(trackedRoot, "house-rules.md"), "# Test rules\n", "utf8");
  for (const name of ["scout", "refinery", "editor", "audit"]) {
    await writeFile(
      path.join(trackedRoot, "playbooks", `${name}.md`),
      `# ${name}\n`,
      "utf8",
    );
  }

  process.chdir(fixtureRoot);
  const store = await import("../lib/secondBrainNightShiftStore.ts");
  await store.ensureNightShiftVault();
  assert.equal(
    await readFile("data/second-brain/house-rules.md", "utf8"),
    "# Test rules\n",
  );

  const capture = await store.captureNightShiftInput({
    title: "Battery cost claim",
    text: "A supplied report claims sodium-ion packs reached a lower cost than LFP.",
    sourceUrl: "https://example.com/report",
  });
  const rawPath = path.join("data/second-brain/0-raw", capture.filename);
  const originalRaw = await readFile(rawPath, "utf8");
  const preparation = await store.prepareNightShift();
  assert.equal(preparation.sources.length, 1);
  assert.equal(preparation.sources[0].id, capture.id);

  const validProposal = {
    outcome: "ready",
    blockReason: "",
    sourceIds: [capture.id],
    atoms: [
      {
        id: "sodium-ion-cost-pressure",
        title: "Sodium-ion pricing pressures the lithium bottleneck thesis",
        certainty: "tentative",
        sourceIds: [capture.id],
        claim: "The supplied report claims a sodium-ion cost advantage over LFP.",
        whyItMatters: "It pressures an existing lithium bottleneck belief.",
        links: [],
        friction: [
          {
            noteId: "lithium-bottleneck-thesis",
            reason: "The supplied price claim weakens a lithium-only constraint.",
          },
        ],
        openThreads: ["Confirm whether the figure is a production cost."],
      },
    ],
    threads: [
      {
        id: "battery-cost-curves",
        title: "Battery Cost Curves",
        summary: "The new cited claim puts pressure on lithium-only cost assumptions.",
        atomIds: ["sodium-ion-cost-pressure"],
      },
    ],
    briefing: {
      attention: "Verify the production basis before changing the thesis.",
      contradictions: ["Lithium bottleneck thesis is under pressure."],
      threadsChanged: ["battery-cost-curves"],
    },
  };
  const normalized = normalizeNightShiftProposal(validProposal, [capture.id]);
  assert.equal(normalized.ok, true);
  assert.equal(
    parseNightShiftProposal(`\`\`\`json\n${JSON.stringify(validProposal)}\n\`\`\``, [
      capture.id,
    ]).ok,
    true,
  );
  assert.equal(
    normalizeNightShiftProposal({ ...validProposal, sourceIds: ["invented"] }, [
      capture.id,
    ]).ok,
    false,
  );

  const staged = await store.stageNightShiftProposal({
    proposal: validProposal,
    sources: preparation.sources.map((source) => ({
      id: source.id,
      fingerprint: source.fingerprint,
    })),
  });
  assert.equal(staged.atomCount, 1);
  await writeFile(rawPath, `${originalRaw}\nchanged`, "utf8");
  await assert.rejects(
    () => store.approveNightShiftProposal(staged.id),
    /source changed/i,
  );
  await writeFile(rawPath, originalRaw, "utf8");

  const promoted = await store.approveNightShiftProposal(staged.id);
  assert.deepEqual(promoted, {
    proposalId: staged.id,
    atoms: 1,
    threads: 1,
    briefings: 1,
  });
  assert.equal(await readFile(rawPath, "utf8"), originalRaw);
  const atomPath = "data/second-brain/2-atoms/sodium-ion-cost-pressure.md";
  const atom = await readFile(atomPath, "utf8");
  assert.match(atom, /\[FRICTION\]/);
  assert.match(atom, /\[ORPHAN\]/);
  assert.match(atom, /sources: \["0-raw\//);

  const secondCapture = await store.captureNightShiftInput({
    title: "Another battery capture",
    text: "A second source repeats the same cost claim.",
  });
  const secondPreparation = await store.prepareNightShift();
  const secondSource = secondPreparation.sources.find(
    (source) => source.id === secondCapture.id,
  );
  assert.ok(secondSource);
  const collisionProposal = {
    ...validProposal,
    sourceIds: [secondCapture.id],
    atoms: validProposal.atoms.map((item) => ({
      ...item,
      sourceIds: [secondCapture.id],
      friction: [],
    })),
  };
  const collisionStage = await store.stageNightShiftProposal({
    proposal: collisionProposal,
    sources: [
      { id: secondSource.id, fingerprint: secondSource.fingerprint },
    ],
  });
  await assert.rejects(
    () => store.approveNightShiftProposal(collisionStage.id),
    /already exists/i,
  );
  await store.rejectNightShiftProposal(collisionStage.id);

  const atomBeforeAudit = await readFile(atomPath, "utf8");
  const audit = await store.runNightShiftAudit();
  assert.equal(audit.reportOnly, true);
  assert.ok(audit.findings >= 1);
  assert.match(
    await readFile(path.join("data/second-brain/briefings", audit.filename), "utf8"),
    /Report only\. No files were repaired or rewritten\./,
  );
  assert.equal(await readFile(atomPath, "utf8"), atomBeforeAudit);

  for (let index = 0; index < NIGHT_SHIFT_MAX_SOURCE_ITEMS + 3; index += 1) {
    await writeFile(
      path.join("data/second-brain/0-raw", `bulk-${index}.md`),
      `# Bulk ${index}\n\n${"x".repeat(8_000)}`,
      "utf8",
    );
  }
  const bounded = await store.prepareNightShift();
  assert.ok(bounded.sources.length <= NIGHT_SHIFT_MAX_SOURCE_ITEMS);
  assert.ok(
    bounded.sources.reduce(
      (total, source) => total + source.loadedCharacterCount,
      0,
    ) <= NIGHT_SHIFT_MAX_TOTAL_SOURCE_CHARS,
  );

  const finalStatus = await store.readNightShiftStatus();
  assert.equal(finalStatus.gitIgnored, true);
  assert.equal(finalStatus.automaticWriteScope, "desk_and_audit_only");
  assert.equal(finalStatus.promotionRequiresHumanApproval, true);
  console.log("ok second-brain-night-shift runtime");
} finally {
  process.chdir(originalCwd);
  await rm(fixtureRoot, { recursive: true, force: true });
}
