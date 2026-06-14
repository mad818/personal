#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  HUGGING_FACE_INSPECTION_LIMITS,
  formatHuggingFaceInspection,
  inspectHuggingFaceRepository,
  normalizeHuggingFaceReference,
  readHuggingFaceTextFile,
} from "../lib/huggingFaceInspection.ts";
import { runFeynmanResearch } from "../lib/feynmanResearch.ts";

const datasetReference = normalizeHuggingFaceReference(
  "https://huggingface.co/datasets/acme/research-set",
);
assert.deepEqual(datasetReference, {
  repoType: "dataset",
  repoId: "acme/research-set",
  sourceUrl: "https://huggingface.co/datasets/acme/research-set",
});
assert.deepEqual(normalizeHuggingFaceReference("https://huggingface.co/gpt2"), {
  repoType: "model",
  repoId: "gpt2",
  sourceUrl: "https://huggingface.co/gpt2",
});
assert.throws(() => normalizeHuggingFaceReference("https://example.com/acme/repo"));
assert.throws(() => normalizeHuggingFaceReference("datasets/acme/../secret"));

const requestedUrls = [];
const fixtureFetch = async (url) => {
  const value = String(url);
  requestedUrls.push(value);
  if (value.includes("datasets-server.huggingface.co/info")) {
    return Response.json({
      dataset_info: {
        default: {
          features: Array.from({ length: 45 }, (_, index) => ({
            name: `feature_${index}`,
            dtype: "string",
          })),
          splits: Array.from({ length: 20 }, (_, index) => ({
            name: `split_${index}`,
            num_examples: index + 1,
            num_bytes: 100,
          })),
        },
      },
    });
  }
  if (value.includes("/tree/main")) {
    return Response.json(
      Array.from({ length: 55 }, (_, index) => ({
        path: index === 0 ? "README.md" : `file-${index}.json`,
        type: "file",
        size: 100 + index,
      })),
    );
  }
  return Response.json({
    id: "acme/research-set",
    private: false,
    gated: "manual",
    disabled: false,
    downloads: 42,
    likes: 7,
    tags: ["task_categories:text-classification", "license:mit"],
    cardData: { license: "mit", language: ["en"] },
  });
};

const inspection = await inspectHuggingFaceRepository(datasetReference, {
  fetchImpl: fixtureFetch,
});
assert.equal(inspection.access.gated, true);
assert.equal(inspection.access.private, false);
assert.equal(inspection.files.length, HUGGING_FACE_INSPECTION_LIMITS.maximumFiles);
assert.equal(
  inspection.datasetStructure[0]?.features.length,
  HUGGING_FACE_INSPECTION_LIMITS.maximumFeaturesPerConfiguration,
);
assert.equal(
  inspection.datasetStructure[0]?.splits.length,
  HUGGING_FACE_INSPECTION_LIMITS.maximumSplitsPerConfiguration,
);
assert.match(formatHuggingFaceInspection(inspection), /Access: public, gated/);
assert.ok(requestedUrls.some((url) => url.includes("/api/datasets/acme/research-set")));
assert.ok(requestedUrls.some((url) => url.includes("datasets-server.huggingface.co/info")));
const oversizedReceipt = formatHuggingFaceInspection({
  ...inspection,
  datasetStructure: Array.from(
    { length: HUGGING_FACE_INSPECTION_LIMITS.maximumDatasetConfigurations },
    (_, index) => ({
      name: `configuration-${index}`,
      features: Array.from(
        { length: HUGGING_FACE_INSPECTION_LIMITS.maximumFeaturesPerConfiguration },
        (__, featureIndex) => `feature-${featureIndex}-${"x".repeat(120)}`,
      ),
      splits: inspection.datasetStructure[0]?.splits ?? [],
    }),
  ),
});
assert.ok(
  oversizedReceipt.length <= HUGGING_FACE_INSPECTION_LIMITS.maximumFormattedChars,
);

await assert.rejects(() =>
  readHuggingFaceTextFile(datasetReference, "../secret.txt", { fetchImpl: fixtureFetch }),
);
await assert.rejects(() =>
  readHuggingFaceTextFile(datasetReference, "weights.safetensors", { fetchImpl: fixtureFetch }),
);
await assert.rejects(() =>
  readHuggingFaceTextFile(datasetReference, "README.md", {
    fetchImpl: async () =>
      new Response("x".repeat(HUGGING_FACE_INSPECTION_LIMITS.maximumTextFileBytes + 1), {
        headers: {
          "content-length": String(
            HUGGING_FACE_INSPECTION_LIMITS.maximumTextFileBytes + 1,
          ),
          "content-type": "text/plain",
        },
      }),
  }),
);

let relevantInspections = 0;
const research = await runFeynmanResearch(
  "lit-review",
  "Review https://huggingface.co/datasets/acme/research-set",
  {
    searchPapers: async () => "No papers found today.",
    webSearch: async () => "No results found.",
    fetchUrl: async () => "Could not fetch that URL.",
    inspectHuggingFace: async () => {
      relevantInspections += 1;
      return {
        url: datasetReference.sourceUrl,
        content: formatHuggingFaceInspection(inspection),
      };
    },
    write: async () => {
      throw new Error("offline");
    },
    verify: async () => {
      throw new Error("offline");
    },
    review: async () => {
      throw new Error("offline");
    },
  },
);
assert.equal(relevantInspections, 1);
assert.ok(research.sources.some((source) => source.url === datasetReference.sourceUrl));
assert.ok(research.sources.some((source) => source.accepted));

console.log("ok feynman-hugging-face-runtime (public metadata, dataset structure, bounded files, safe reads, relevant Feynman evidence)");
