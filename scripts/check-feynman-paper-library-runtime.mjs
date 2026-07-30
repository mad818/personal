#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FEYNMAN_PAPER_LIBRARY_LIMITS,
  FeynmanPaperLibraryError,
  addFeynmanPaperToLibrary,
  listFeynmanPaperLibrary,
  normalizeFeynmanPaperAnnotation,
  normalizeFeynmanPaperQuery,
  normalizeFeynmanPaperTags,
  searchFeynmanPaperLibrary,
  updateFeynmanPaperAnnotation,
} from "../lib/feynmanPaperLibrary.ts";

function accelerationStatus({ enabled = true, available = true } = {}) {
  return {
    turboVec: {
      enabled,
      available,
      endpointClass: "loopback",
      engine: "turbovec",
      bitWidth: 4,
      stats: { embeddingMode: "ollama" },
      error: null,
    },
    turboQuant: {
      enabled: false,
      available: false,
      endpointClass: "loopback",
      engine: "turboquant",
      mode: "off",
      keyBits: 3,
      valueBits: 4,
      stats: null,
      error: null,
    },
  };
}

function fixtureInspection(reference, requestedSections, title) {
  return {
    ...reference,
    title,
    authors: ["Ada Example", "Lin Researcher"],
    publishedAt: "2026-01-02",
    categories: ["cs.AI"],
    requestedSections,
    availableSections: ["abstract", "methodology", "results"],
    missingSections: requestedSections.filter(
      (section) => !["abstract", "methodology", "results"].includes(section),
    ),
    sections: {
      abstract: "A retrieval system for related concepts and useful evidence.",
      methodology: "The method uses bounded local embeddings.",
      results: "Evaluation reports improved recall.",
    },
    repositoryLinks: ["https://github.com/example/paper-code"],
    fullTextStatus: "available",
    warnings: [],
  };
}

const root = await mkdtemp(path.join(os.tmpdir(), "nexus-feynman-papers-"));
const dataFile = path.join(root, "paper-library.json");
const vectorDocuments = [];
let now = 1_000;
let inspectionCount = 0;

const deps = {
  dataFile,
  now: () => ++now,
  inspect: async (reference, sections) => {
    inspectionCount += 1;
    return fixtureInspection(
      reference,
      sections,
      inspectionCount === 1 ? "Local Retrieval Systems" : "Refreshed Retrieval Systems",
    );
  },
  vectorStatus: async () => accelerationStatus(),
  vectorUpsert: async (documents) => {
    vectorDocuments.push(...documents);
    return { ok: true };
  },
  vectorSearch: async ({ allowlist }) => [
    { id: allowlist[0], score: 0.91 },
  ],
};

try {
  assert.deepEqual(normalizeFeynmanPaperTags(" Agents, agents, RAG!, Eval "), [
    "agents",
    "rag",
    "eval",
  ]);
  assert.throws(
    () =>
      normalizeFeynmanPaperAnnotation(
        "x".repeat(FEYNMAN_PAPER_LIBRARY_LIMITS.maximumAnnotationChars + 1),
      ),
    FeynmanPaperLibraryError,
  );
  assert.throws(
    () =>
      normalizeFeynmanPaperQuery(
        "x".repeat(FEYNMAN_PAPER_LIBRARY_LIMITS.maximumQueryChars + 1),
      ),
    FeynmanPaperLibraryError,
  );

  const added = await addFeynmanPaperToLibrary("2601.12345", deps);
  assert.equal(added.refreshed, false);
  assert.equal(added.indexed, true);
  assert.equal(added.paper.arxivId, "2601.12345");
  assert.equal(vectorDocuments.length, 1);
  assert.match(vectorDocuments[0].text, /bounded local embeddings/i);

  const annotated = await updateFeynmanPaperAnnotation(
    {
      id: added.paper.id,
      annotation: "Connect this to the private raven evaluation.",
      tags: "retrieval, local, RETRIEVAL",
    },
    deps,
  );
  assert.equal(annotated.indexed, true);
  assert.deepEqual(annotated.paper.tags, ["retrieval", "local"]);
  assert.match(vectorDocuments.at(-1).text, /private raven evaluation/i);

  const refreshed = await addFeynmanPaperToLibrary(
    "https://arxiv.org/abs/2601.12345",
    deps,
  );
  assert.equal(refreshed.refreshed, true);
  assert.equal(refreshed.paper.title, "Refreshed Retrieval Systems");
  assert.equal(
    refreshed.paper.annotation,
    "Connect this to the private raven evaluation.",
  );
  assert.deepEqual(refreshed.paper.tags, ["retrieval", "local"]);

  const recent = await listFeynmanPaperLibrary({ limit: 10 }, deps);
  assert.equal(recent.retrieval, "recent");
  assert.equal(recent.papers.length, 1);
  assert.equal(recent.acceleration.embeddingMode, "ollama");

  const semantic = await searchFeynmanPaperLibrary(
    "conceptual similarity",
    { limit: 10 },
    deps,
  );
  assert.equal(semantic.retrieval, "local_vector");
  assert.equal(semantic.papers[0].id, added.paper.id);

  const fallback = await searchFeynmanPaperLibrary(
    "raven",
    { limit: 10 },
    {
      ...deps,
      vectorStatus: async () =>
        accelerationStatus({ enabled: false, available: false }),
      vectorSearch: async () => {
        throw new Error("disabled vector search must not run");
      },
    },
  );
  assert.equal(fallback.retrieval, "keyword_fallback");
  assert.equal(fallback.papers[0].id, added.paper.id);

  await assert.rejects(
    () =>
      updateFeynmanPaperAnnotation(
        { id: "feynman-paper:missing", annotation: "", tags: [] },
        deps,
      ),
    (error) =>
      error instanceof FeynmanPaperLibraryError && error.kind === "not_found",
  );

  const stored = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(stored.version, 1);
  assert.equal(stored.papers.length, 1);
  assert.equal(stored.papers[0].annotation.includes("raven"), true);

  await writeFile(dataFile, '{"version":1,"papers":"corrupt"}', "utf8");
  await assert.rejects(
    () => listFeynmanPaperLibrary({}, deps),
    (error) =>
      error instanceof FeynmanPaperLibraryError && error.kind === "storage",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(
  "ok feynman-paper-library-runtime (bounded local persistence, annotation preservation, vector ordering, honest keyword fallback, corrupt-store rejection)",
);
