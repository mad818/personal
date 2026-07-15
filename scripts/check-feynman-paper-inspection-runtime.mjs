#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  FEYNMAN_PAPER_INSPECTION_LIMITS,
  extractFeynmanPaperMetadata,
  extractFeynmanPaperRepositoryLinks,
  extractFeynmanPaperSections,
  formatFeynmanPaperInspection,
  inspectFeynmanPaper,
  normalizeFeynmanPaperReference,
  parseFeynmanPaperSections,
} from "../lib/feynmanPaperInspection.ts";

const modern = normalizeFeynmanPaperReference("2401.12345");
assert.deepEqual(modern, {
  id: "2401.12345",
  sourceUrl: "https://arxiv.org/abs/2401.12345",
  pdfUrl: "https://arxiv.org/pdf/2401.12345",
  htmlUrl: "https://arxiv.org/html/2401.12345",
});
assert.equal(
  normalizeFeynmanPaperReference(
    "https://arxiv.org/pdf/2401.12345v2.pdf",
  ).id,
  "2401.12345v2",
);
assert.equal(
  normalizeFeynmanPaperReference("arXiv:hep-th/9901001v3").id,
  "hep-th/9901001v3",
);
assert.equal(
  normalizeFeynmanPaperReference("https://www.arxiv.org/abs/math.GT/0309136")
    .id,
  "math.GT/0309136",
);
for (const invalid of [
  "http://arxiv.org/abs/2401.12345",
  "https://example.com/abs/2401.12345",
  "https://user@arxiv.org/abs/2401.12345",
  "https://arxiv.org:444/abs/2401.12345",
  "https://arxiv.org/abs/2401.12345?download=1",
  "https://arxiv.org/abs/../admin",
  "not-a-paper",
]) {
  assert.throws(() => normalizeFeynmanPaperReference(invalid));
}

assert.deepEqual(parseFeynmanPaperSections("results, abstract, results"), [
  "results",
  "abstract",
]);
assert.equal(parseFeynmanPaperSections("all").length, 8);
assert.throws(() => parseFeynmanPaperSections("abstract,unknown"));
assert.throws(() => parseFeynmanPaperSections("all,abstract"));

const metadataHtml = `<!doctype html>
<html><head>
<meta name="citation_title" content="A &amp; B Paper">
${Array.from(
  { length: 14 },
  (_, index) => `<meta name="citation_author" content="Author ${index + 1}">`,
).join("\n")}
<meta name="citation_date" content="2026/07/15">
<meta name="citation_keywords" content="cs.AI; cs.LG">
<meta name="citation_abstract" content="A direct bounded abstract with a repository https://github.com/acme/paper-code.">
</head><body></body></html>`;

const fullTextHtml = `<!doctype html><html><body>
<h2>1 Introduction</h2><p>${"Intro evidence. ".repeat(200)}</p>
<h2>2 Proposed Method</h2><p>Method evidence.</p>
<h3>2.1 Architecture</h3><p>Architecture evidence remains under methodology.</p>
<h2>3 Experiments and Results</h2><p>Measured results with code at <a href="https://github.com/acme/paper-code/tree/main">GitHub</a>.</p>
<h2>4 Discussion</h2><p>Discussion evidence.</p>
<h2>5 Conclusion</h2><p>Conclusion evidence.</p>
<h2>References</h2><p>This content must not enter the conclusion.</p>
</body></html>`;

const metadata = extractFeynmanPaperMetadata(metadataHtml, modern);
assert.equal(metadata.title, "A & B Paper");
assert.equal(
  metadata.authors.length,
  FEYNMAN_PAPER_INSPECTION_LIMITS.maximumAuthors,
);
assert.deepEqual(metadata.categories, ["cs.AI", "cs.LG"]);

const extracted = extractFeynmanPaperSections(fullTextHtml);
assert.match(extracted.introduction ?? "", /Intro evidence/);
assert.ok(
  (extracted.introduction?.length ?? 0) <=
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSectionChars,
);
assert.match(extracted.methodology ?? "", /Architecture evidence/);
assert.match(extracted.experiments ?? "", /Measured results/);
assert.match(extracted.results ?? "", /Measured results/);
assert.doesNotMatch(extracted.conclusion ?? "", /References/);
assert.deepEqual(
  extractFeynmanPaperRepositoryLinks(metadataHtml, fullTextHtml),
  ["https://github.com/acme/paper-code"],
);

const requestedUrls = [];
const fixtureFetch = async (url) => {
  const value = String(url);
  requestedUrls.push(value);
  if (value === modern.sourceUrl) {
    return new Response(metadataHtml, { headers: { "content-type": "text/html" } });
  }
  if (value === modern.htmlUrl) {
    return new Response(fullTextHtml, { headers: { "content-type": "text/html" } });
  }
  return new Response("not found", { status: 404 });
};

const requestedSections = parseFeynmanPaperSections("all");
const inspection = await inspectFeynmanPaper(modern, requestedSections, {
  fetchImpl: fixtureFetch,
});
assert.equal(inspection.fullTextStatus, "available");
assert.ok(inspection.availableSections.includes("abstract"));
assert.ok(inspection.availableSections.includes("methodology"));
assert.ok(inspection.missingSections.includes("limitations"));
assert.equal(inspection.repositoryLinks[0], "https://github.com/acme/paper-code");
assert.deepEqual(requestedUrls, [modern.sourceUrl, modern.htmlUrl]);
const formatted = formatFeynmanPaperInspection(inspection);
assert.match(formatted, /No paper Q&A, annotation, persistence/);
assert.match(formatted, /Requested sections not found: limitations/);
assert.ok(
  formatted.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars,
);

let abstractOnlyFetches = 0;
const abstractOnly = await inspectFeynmanPaper(modern, ["abstract"], {
  fetchImpl: async (url) => {
    abstractOnlyFetches += 1;
    assert.equal(String(url), modern.sourceUrl);
    return new Response(metadataHtml);
  },
});
assert.equal(abstractOnlyFetches, 1);
assert.equal(abstractOnly.fullTextStatus, "not_requested");

const degraded = await inspectFeynmanPaper(
  modern,
  ["abstract", "introduction"],
  {
    fetchImpl: async (url) =>
      String(url) === modern.sourceUrl
        ? new Response(metadataHtml)
        : new Response("missing", { status: 404 }),
  },
);
assert.equal(degraded.fullTextStatus, "unavailable");
assert.deepEqual(degraded.availableSections, ["abstract"]);
assert.deepEqual(degraded.missingSections, ["introduction"]);
assert.match(degraded.warnings.join(" "), /preserved metadata evidence/);

const hugeSection = `<!doctype html><h2>Introduction</h2><p>${"x".repeat(
  FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFullTextBytes + 32,
)}</p>`;
const truncated = await inspectFeynmanPaper(
  modern,
  ["abstract", "introduction"],
  {
    fetchImpl: async (url) =>
      new Response(String(url) === modern.sourceUrl ? metadataHtml : hugeSection),
  },
);
assert.equal(truncated.fullTextStatus, "truncated");
assert.match(truncated.warnings.join(" "), /2 MiB evidence cap/);
assert.ok(
  (truncated.sections.introduction?.length ?? 0) <=
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSectionChars,
);

console.log(
  "ok feynman-paper-inspection-runtime (arXiv normalization, bounded sections, missing receipts, repository links, degradation)",
);
