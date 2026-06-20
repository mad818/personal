#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  FEYNMAN_PAPER_CODE_AUDIT_LIMITS,
  auditClaimsAgainstCode,
  extractClaimTerms,
  fetchFileSnippet,
  fetchRepoFileTree,
  fetchRepoReadme,
  formatPaperCodeAuditReport,
  normalizeGitHubRepo,
  resolveRepoFromPaperMetadata,
  runPaperCodeAudit,
  selectClaimAlignedFiles,
} from "../lib/feynmanPaperCodeAudit.ts";

// ── normalizeGitHubRepo ───────────────────────────────────────────────────────
const coords = normalizeGitHubRepo("https://github.com/openai/gpt-2");
assert.ok(coords !== null);
assert.equal(coords.owner, "openai");
assert.equal(coords.repo, "gpt-2");
assert.equal(coords.repoUrl, "https://github.com/openai/gpt-2");

const coordsWithPath = normalizeGitHubRepo(
  "https://github.com/acme/research-code/tree/main/src",
);
assert.ok(coordsWithPath !== null);
assert.equal(coordsWithPath.owner, "acme");
assert.equal(coordsWithPath.repo, "research-code");

const coordsGit = normalizeGitHubRepo("https://github.com/acme/myrepo.git");
assert.ok(coordsGit !== null);
assert.equal(coordsGit.repo, "myrepo");

assert.equal(normalizeGitHubRepo("https://arxiv.org/abs/2301.07041"), null);
assert.equal(normalizeGitHubRepo("https://huggingface.co/bert"), null);
assert.equal(normalizeGitHubRepo(""), null);

// ── resolveRepoFromPaperMetadata ──────────────────────────────────────────────
const mockMetadata = {
  arxivId: "2301.07041",
  doi: null,
  title: "Test Paper",
  authors: [{ name: "Alice" }],
  abstract:
    "We release the code at https://github.com/acme/test-repo for reproducibility.",
  publishedAt: "2023-01-17",
  updatedAt: null,
  githubUrl: "https://github.com/acme/test-repo",
  sourceUrl: "https://arxiv.org/abs/2301.07041",
};

const resolved = resolveRepoFromPaperMetadata(mockMetadata);
assert.ok(resolved !== null);
assert.equal(resolved.owner, "acme");
assert.equal(resolved.repo, "test-repo");

// No GitHub URL → null
const noRepoMetadata = { ...mockMetadata, githubUrl: null, abstract: "No code link." };
assert.equal(resolveRepoFromPaperMetadata(noRepoMetadata), null);

// ── extractClaimTerms ─────────────────────────────────────────────────────────
const terms = extractClaimTerms(
  "We propose a Transformer-based language model with RLHF fine-tuning. " +
    "The model achieves state-of-the-art results on natural language understanding tasks. " +
    "We introduce LoRA adapters and a novel training methodology.",
);
assert.ok(terms.length >= 1);
assert.ok(terms.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumClaimTerms);
// Should find at least some technical terms
const termSet = new Set(terms.map((t) => t.toLowerCase()));
assert.ok(
  termSet.has("transformer") ||
    termSet.has("rlhf") ||
    termSet.has("lora") ||
    termSet.has("fine-tuning") ||
    terms.some((t) => t.length >= 4),
);

// Empty abstract → no crash, returns array
const emptyTerms = extractClaimTerms("");
assert.ok(Array.isArray(emptyTerms));

// ── selectClaimAlignedFiles ───────────────────────────────────────────────────
const tree = [
  "README.md",
  "train.py",
  "model.py",
  "transformer_model.py",
  "rlhf/train_rlhf.py",
  "lora/adapter.py",
  "utils/helpers.py",
  "docs/methodology.md",
];

const claimTerms = ["Transformer", "RLHF", "LoRA"];
const selected = selectClaimAlignedFiles(claimTerms, tree, 3);
assert.ok(selected.length <= 3);
// Files matching claim terms should be preferred
assert.ok(
  selected.some(
    (f) =>
      f.toLowerCase().includes("transformer") ||
      f.toLowerCase().includes("rlhf") ||
      f.toLowerCase().includes("lora"),
  ),
);

// Empty tree → empty result
assert.deepEqual(selectClaimAlignedFiles(claimTerms, [], 3), []);

// Non-code files filtered out
const nonCodeTree = ["image.png", "binary.bin", "weights.pt"];
assert.deepEqual(selectClaimAlignedFiles(claimTerms, nonCodeTree, 3), []);

// ── auditClaimsAgainstCode ────────────────────────────────────────────────────
const readme = "This repository implements a Transformer model with RLHF fine-tuning.";
const snippets = [
  {
    path: "lora/adapter.py",
    url: "https://raw.githubusercontent.com/acme/test/HEAD/lora/adapter.py",
    chars: 100,
    content: "class LoRA:\n    def __init__(self):\n        pass\n",
    truncated: false,
  },
];

const auditedClaims = auditClaimsAgainstCode(
  ["Transformer", "RLHF", "LoRA"],
  readme,
  snippets,
);
assert.equal(auditedClaims.length, 3);

const transformerClaim = auditedClaims.find((c) => c.term === "Transformer");
assert.ok(transformerClaim !== undefined);
assert.ok(
  transformerClaim.status === "confirmed" ||
    transformerClaim.status === "readme_only",
);

const loraClaim = auditedClaims.find((c) => c.term === "LoRA");
assert.ok(loraClaim !== undefined);
assert.ok(
  loraClaim.status === "confirmed",
  "LoRA found in snippet → confirmed",
);

// ── formatPaperCodeAuditReport ────────────────────────────────────────────────
const mockReport = {
  arxivId: "2301.07041",
  paperUrl: "https://arxiv.org/abs/2301.07041",
  repoUrl: "https://github.com/acme/test-repo",
  readme: "This repo implements Transformer with RLHF.",
  readmeTruncated: false,
  snippets,
  claimTerms: ["Transformer", "RLHF", "LoRA"],
  auditedClaims,
  warnings: [],
};

const formatted = formatPaperCodeAuditReport(mockReport);
assert.ok(formatted.includes("Paper-code audit"));
assert.ok(formatted.includes("arxiv.org/abs/2301.07041"));
assert.ok(formatted.includes("github.com/acme/test-repo"));
assert.ok(formatted.includes("Transformer"));
assert.ok(formatted.includes("LoRA"));
assert.ok(
  formatted.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumFormattedChars,
);

// Truncation guard
const oversizedReport = {
  ...mockReport,
  readme: "x".repeat(FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumFormattedChars + 2000),
  warnings: Array.from({ length: 50 }, (_, i) => `warning ${i}: ${"x".repeat(60)}`),
};
const oversized = formatPaperCodeAuditReport(oversizedReport);
assert.ok(
  oversized.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumFormattedChars,
);

// ── fixture fetch (no network) ────────────────────────────────────────────────
const FIXTURE_REPO_COORDS = { owner: "acme", repo: "test-repo", repoUrl: "https://github.com/acme/test-repo" };
const FIXTURE_README = "# Test Repo\n\nThis repo implements a Transformer model with RLHF fine-tuning and LoRA adapters.";
const FIXTURE_TREE_RESPONSE = {
  tree: [
    { path: "README.md", type: "blob" },
    { path: "transformer_model.py", type: "blob" },
    { path: "rlhf/train.py", type: "blob" },
    { path: "lora/adapter.py", type: "blob" },
    { path: "utils/helpers.py", type: "blob" },
  ],
};
const FIXTURE_SNIPPET = "class TransformerModel:\n    pass\n";

function makeFixtureFetch(readmeContent, treeResponse, snippetContent) {
  return async (url) => {
    if (url.includes("raw.githubusercontent.com") && url.includes("README")) {
      return new Response(readmeContent, { status: 200 });
    }
    if (url.includes("api.github.com") && url.includes("trees")) {
      return new Response(JSON.stringify(treeResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("raw.githubusercontent.com")) {
      return new Response(snippetContent, { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  };
}

const fixtureFetch = makeFixtureFetch(
  FIXTURE_README,
  FIXTURE_TREE_RESPONSE,
  FIXTURE_SNIPPET,
);

// fetchRepoReadme
const readmeResult = await fetchRepoReadme(FIXTURE_REPO_COORDS, {
  fetchImpl: fixtureFetch,
});
assert.ok(readmeResult.content.includes("Transformer"));
assert.equal(readmeResult.truncated, false);

// fetchRepoReadme — 404 → empty (no crash)
const notFoundFetch = async () => new Response("Not found", { status: 404 });
const emptyReadme = await fetchRepoReadme(FIXTURE_REPO_COORDS, {
  fetchImpl: notFoundFetch,
});
assert.equal(emptyReadme.content, "");
assert.equal(emptyReadme.truncated, false);

// fetchRepoFileTree
const treeResult = await fetchRepoFileTree(FIXTURE_REPO_COORDS, {
  fetchImpl: fixtureFetch,
});
assert.ok(treeResult.length >= 1);
assert.ok(treeResult.some((f) => f.includes(".py") || f.includes(".md")));

// fetchRepoFileTree — failure → empty array (no crash)
const failingFetch = async () => { throw new Error("Network error"); };
const emptyTree = await fetchRepoFileTree(FIXTURE_REPO_COORDS, {
  fetchImpl: failingFetch,
});
assert.deepEqual(emptyTree, []);

// fetchFileSnippet
const snippet = await fetchFileSnippet(
  FIXTURE_REPO_COORDS,
  "transformer_model.py",
  { fetchImpl: fixtureFetch },
);
assert.ok(snippet.content.includes("Transformer") || snippet.content.length > 0);
assert.equal(snippet.path, "transformer_model.py");

// ── runPaperCodeAudit ─────────────────────────────────────────────────────────
const auditResult = await runPaperCodeAudit(mockMetadata, {
  fetchImpl: fixtureFetch,
});
assert.ok(auditResult.repoUrl.includes("github.com"));
assert.ok(Array.isArray(auditResult.claimTerms));
assert.ok(Array.isArray(auditResult.auditedClaims));
assert.ok(Array.isArray(auditResult.snippets));
assert.ok(Array.isArray(auditResult.warnings));
assert.ok(auditResult.claimTerms.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumClaimTerms);
assert.ok(auditResult.snippets.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumSnippetFiles);

// runPaperCodeAudit — no repo → throws
const noRepoMeta = { ...mockMetadata, githubUrl: null, abstract: "No code." };
await assert.rejects(() => runPaperCodeAudit(noRepoMeta, { fetchImpl: fixtureFetch }));

console.log("ok feynman-paper-code-audit (bounded github audit, no AI, fixture fetch, claim audit, receipt formatting, progressive integration)");
