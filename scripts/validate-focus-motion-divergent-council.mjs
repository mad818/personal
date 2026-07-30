#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import {
  applyCappedCouncilIdeationFrames,
  buildPinnedCouncilAdoptDraft,
  buildPinnedCouncilMergeDraft,
  COUNCIL_IDEATION_FRAMES,
  getCouncilIdeationFrameLabel,
  isCappedDivergentCouncilRequest,
} from "../lib/councilDivergence.ts";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(`focus-motion-divergent-council validation failed: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

for (const input of [
  "/diverge improve the release plan",
  "diverge: improve the release plan",
  "Run a divergent council on this",
  "brainstorm wide before deciding",
  "ideate widely about the constraint",
]) {
  if (!isCappedDivergentCouncilRequest(input)) {
    fail(`explicit trigger was not recognized: ${input}`);
  }
}

for (const input of [
  "Brainstorm a release plan",
  "Give me options",
  "Review this normal Council request",
]) {
  if (isCappedDivergentCouncilRequest(input)) {
    fail(`ordinary request triggered divergence: ${input}`);
  }
}

if (COUNCIL_IDEATION_FRAMES.length !== 3) {
  fail(`expected exactly 3 frames, found ${COUNCIL_IDEATION_FRAMES.length}`);
}
if (new Set(COUNCIL_IDEATION_FRAMES.map((frame) => frame.id)).size !== 3) {
  fail("Council frames must be unique");
}
for (const frame of COUNCIL_IDEATION_FRAMES) {
  if (getCouncilIdeationFrameLabel(frame.id) !== frame.label) {
    fail(`frame label lookup drifted for ${frame.id}`);
  }
}

const framedMembers = applyCappedCouncilIdeationFrames(
  [
    { agent: "orbit", persona: "formal" },
    { agent: "jansky", persona: "direct" },
    { agent: "cipher", persona: "deep" },
    { agent: "nova", persona: "deep" },
  ],
  "/diverge test the release plan",
);
if (framedMembers.length !== 3) fail("framed member runtime exceeded 3");
if (new Set(framedMembers.map((member) => member.frame)).size !== 3) {
  fail("framed member runtime did not preserve three isolated frames");
}

const fixtureResults = framedMembers.map((member, index) => ({
  ...member,
  answer: `option ${index + 1}`,
}));
const mergeDraft = buildPinnedCouncilMergeDraft(fixtureResults);
const adoptDraft = buildPinnedCouncilAdoptDraft(fixtureResults[0]);
if (!mergeDraft.startsWith("@jansky:")) fail("merge draft is not pinned");
if (!adoptDraft.startsWith("@jansky:")) fail("adopt draft is not pinned");
for (const needle of [
  "novelty",
  "viability",
  "evidence quality",
  "Nexus fit",
  "cluster duplicates",
  "traps",
  "non-obvious trade-offs",
  "one concrete first step",
]) {
  if (!mergeDraft.includes(needle)) fail(`critic draft missing ${needle}`);
}

const persona = read("lib/personaEngine.ts");
const office = read("components/home/office/OfficeCommandCenter.tsx");
const modeBar = read("components/home/office/PersonaModeBar.tsx");
const resultsPanel = read("components/home/office/CouncilResultsPanel.tsx");
const companyMap = read("lib/nexusCompanyMap.ts");

for (const [needle, label] of [
  ["members.slice(0, 3)", "three-call cap"],
  ["Promise.allSettled", "parallel isolated dispatch"],
  ["COUNCIL IDEATION FRAME", "frame prompt"],
  ["buildPinnedCouncilMergeDraft", "single-agent merge path"],
  ["Do not infer or mention a diagnosis", "diagnosis boundary"],
  ["keep any list to five items or fewer", "focus list limit"],
  ["End with one concrete next action", "next-action contract"],
]) {
  requireText(persona, needle, label);
}

requireText(office, "input: agentInput", "explicit trigger input");
requireText(office, "getCouncilIdeationFrameLabel", "frame visibility");
requireText(
  modeBar,
  "3 parallel calls; Merge adds 1 pinned JANSKY call",
  "usage disclosure",
);
requireText(
  resultsPanel,
  "Divergent Council Results",
  "divergent result state",
);
requireText(resultsPanel, "One pinned JANSKY call", "merge disclosure");
requireText(companyMap, "ayghri/i-have-adhd", "focus-output source");
requireText(companyMap, "UditAkhourii/adhd", "capped-divergence source");

for (const relativePath of [
  "docs/ideas/source-parity/ayghri-i-have-adhd.json",
  "docs/ideas/source-parity/uditakhourii-adhd.json",
  "docs/ideas/repo-analysis/ayghri-i-have-adhd/REPO_CONTEXT.md",
  "docs/ideas/repo-analysis/uditakhourii-adhd/REPO_CONTEXT.md",
]) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`missing source evidence ${relativePath}`);
  }
}

console.log(
  "Focus output, motion, and capped divergent Council validation OK.",
);
