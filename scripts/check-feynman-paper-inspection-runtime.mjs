#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  FEYNMAN_PAPER_INSPECTION_LIMITS,
  annotatePaper,
  askPaperQuestion,
  extractPaperCodeReferences,
  fetchPaperMetadata,
  findPaperReference,
  formatPaperInspection,
  normalizePaperReference,
  readPaperSection,
  searchPapers,
} from "../lib/feynmanPaperInspection.ts";

// ── normalizePaperReference ───────────────────────────────────────────────────
const absRef = normalizePaperReference("https://arxiv.org/abs/2301.07041");
assert.equal(absRef.arxivId, "2301.07041");
assert.equal(absRef.doi, null);
assert.equal(absRef.sourceUrl, "https://arxiv.org/abs/2301.07041");

const versionedRef = normalizePaperReference("https://arxiv.org/abs/2301.07041v2");
assert.equal(versionedRef.arxivId, "2301.07041");

const bareIdRef = normalizePaperReference("2301.07041");
assert.equal(bareIdRef.arxivId, "2301.07041");

const doiRef = normalizePaperReference("https://doi.org/10.1145/3478535");
assert.equal(doiRef.doi, "10.1145/3478535");
assert.equal(doiRef.arxivId, null);

assert.throws(() => normalizePaperReference(""));
assert.throws(() => normalizePaperReference("https://example.com/some/paper"));
assert.throws(() => normalizePaperReference("not-a-paper"));
assert.throws(() => normalizePaperReference("../secret"));

// ── findPaperReference ────────────────────────────────────────────────────────
const found = findPaperReference("See https://arxiv.org/abs/2301.07041 for details.");
assert.ok(found !== null);
assert.equal(found.arxivId, "2301.07041");

assert.equal(findPaperReference("no reference here"), null);
assert.equal(findPaperReference("https://huggingface.co/bert"), null);

// ── fixture fetch (no network) ────────────────────────────────────────────────
const FIXTURE_ARXIV_ID = "2301.07041";
const FIXTURE_GITHUB_URL = "https://github.com/acme/research-code";
const FIXTURE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/${FIXTURE_ARXIV_ID}v1</id>
    <title>Test Paper: Understanding Language Model Behavior</title>
    <summary>This paper investigates language model behavior. Code at ${FIXTURE_GITHUB_URL} and further analysis follows. We examine scaling laws and emergent capabilities across model sizes.</summary>
    <published>2023-01-17T00:00:00Z</published>
    <updated>2023-01-20T00:00:00Z</updated>
    <author><name>Alice Researcher</name></author>
    <author><name>Bob Scientist</name></author>
    <author><name>Carol Engineer</name></author>
  </entry>
</feed>`;

const fixtureFetch = async (url) => {
  return new Response(FIXTURE_ATOM, {
    status: 200,
    headers: { "content-type": "application/atom+xml" },
  });
};

const reference = normalizePaperReference(`https://arxiv.org/abs/${FIXTURE_ARXIV_ID}`);
const metadata = await fetchPaperMetadata(reference, { fetchImpl: fixtureFetch });

assert.equal(metadata.arxivId, FIXTURE_ARXIV_ID);
assert.equal(metadata.title, "Test Paper: Understanding Language Model Behavior");
assert.equal(metadata.authors.length, 3);
assert.equal(metadata.authors[0].name, "Alice Researcher");
assert.equal(metadata.githubUrl, FIXTURE_GITHUB_URL);
assert.equal(metadata.publishedAt, "2023-01-17");
assert.equal(metadata.sourceUrl, `https://arxiv.org/abs/${FIXTURE_ARXIV_ID}`);

// ── readPaperSection ──────────────────────────────────────────────────────────
const abstractSection = readPaperSection(metadata, "abstract");
assert.equal(abstractSection.kind, "abstract");
assert.ok(abstractSection.content.includes("language model"));

const fullSection = readPaperSection(metadata, "full");
assert.equal(fullSection.kind, "full");
assert.ok(fullSection.content.includes("Abstract:"));
assert.ok(fullSection.content.includes(FIXTURE_GITHUB_URL));

// ── extractPaperCodeReferences ────────────────────────────────────────────────
const codeRefs = extractPaperCodeReferences(metadata);
assert.ok(codeRefs.length >= 1);
assert.ok(codeRefs.includes(FIXTURE_GITHUB_URL));
assert.ok(codeRefs.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumCodeReferences);

// ── formatPaperInspection ─────────────────────────────────────────────────────
const inspection = {
  ...metadata,
  section: fullSection,
  codeReferences: codeRefs,
  warnings: [],
};
const receipt = formatPaperInspection(inspection);
assert.ok(receipt.includes("Paper inspection"));
assert.ok(receipt.includes(FIXTURE_ARXIV_ID));
assert.ok(receipt.includes("Alice Researcher"));
assert.ok(receipt.includes(FIXTURE_GITHUB_URL));
assert.ok(receipt.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars);

// ── truncation guard ──────────────────────────────────────────────────────────
const oversizedReceipt = formatPaperInspection({
  ...inspection,
  section: {
    kind: "full",
    content: "x".repeat(FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars + 1000),
    truncated: false,
  },
  warnings: Array.from({ length: 100 }, (_, i) => `warning ${i}: ${"x".repeat(80)}`),
});
assert.ok(
  oversizedReceipt.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars,
);

// ── askPaperQuestion ──────────────────────────────────────────────────────────
const question = askPaperQuestion("What are the main contributions?", metadata);
assert.ok(question.includes("What are the main contributions?"));
assert.ok(question.includes(metadata.title));
assert.ok(question.includes("Paper context:"));

// ── annotatePaper ─────────────────────────────────────────────────────────────
const annotation = annotatePaper(reference, "Key paper for scaling laws review.", "2026-01-01T00:00:00.000Z");
assert.equal(annotation.arxivId, FIXTURE_ARXIV_ID);
assert.equal(annotation.note, "Key paper for scaling laws review.");
assert.equal(annotation.annotatedAt, "2026-01-01T00:00:00.000Z");

// ── searchPapers fixture ──────────────────────────────────────────────────────
const FIXTURE_SEARCH_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.07041v1</id>
    <title>Test Paper: Understanding Language Model Behavior</title>
    <summary>Search result abstract for language models.</summary>
    <published>2023-01-17T00:00:00Z</published>
    <author><name>Alice Researcher</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2302.00001v1</id>
    <title>Another Test Paper on Scaling</title>
    <summary>Second search result abstract.</summary>
    <published>2023-02-01T00:00:00Z</published>
    <author><name>Bob Scientist</name></author>
  </entry>
</feed>`;

const searchFixtureFetch = async () =>
  new Response(FIXTURE_SEARCH_ATOM, {
    status: 200,
    headers: { "content-type": "application/atom+xml" },
  });

const searchResults = await searchPapers("language models", 5, {
  fetchImpl: searchFixtureFetch,
});
assert.ok(searchResults.length >= 1);
assert.ok(searchResults.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSearchResults);
assert.ok(searchResults[0].title.includes("Test Paper"));

// ── searchPapers bounded ──────────────────────────────────────────────────────
const bigSearchResults = await searchPapers(
  "test",
  FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSearchResults + 100,
  { fetchImpl: searchFixtureFetch },
);
assert.ok(
  bigSearchResults.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSearchResults,
);

// ── error handling ────────────────────────────────────────────────────────────
await assert.rejects(() => searchPapers("", 5, { fetchImpl: searchFixtureFetch }));
await assert.rejects(() =>
  fetchPaperMetadata({ arxivId: null, doi: "10.1/test", sourceUrl: "https://doi.org/10.1/test" }),
);
await assert.rejects(() =>
  fetchPaperMetadata(reference, {
    fetchImpl: async () => new Response("Not found", { status: 404 }),
  }),
);

console.log("ok feynman-paper-inspection (bounded public arxiv inspection, fixture fetch, evidence receipt, code references, progressive integration)");
