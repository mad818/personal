#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  PROJECT_FILE_CONTEXT_LIMITS,
  buildProjectFileContext,
  chunkProjectFileContent,
} from "../lib/projectFileContext.ts";

function buildSection(index, marker = "") {
  const lines = Array.from(
    { length: 125 },
    (_, line) =>
      `  const module${index}Line${line} = "${marker || `bounded-${index}-${line}`}";`,
  );
  return [
    `export function module${index}Boundary() {`,
    ...lines,
    `  return module${index}Line0;`,
    "}",
    "",
  ].join("\n");
}

const small = "export const ready = true;\r\n";
assert.deepEqual(buildProjectFileContext(small), {
  text: small,
  chunkCount: 1,
  selectedChunkIndexes: [1],
  contextual: false,
});
assert.equal(
  buildProjectFileContext(small, {
    extension: ".ts",
    focus: "ready",
    chunk: "1",
  }).text,
  small,
);
assert.throws(
  () => buildProjectFileContext(small, { chunk: "2" }),
  /between 1 and 1/,
);

const large = Array.from({ length: 14 }, (_, index) =>
  buildSection(
    index + 1,
    index === 10 ? "authentication-session-sentinel" : "",
  ),
).join("");
assert.ok(large.length > PROJECT_FILE_CONTEXT_LIMITS.maximumResponseChars);

const chunks = chunkProjectFileContent(large, ".ts");
assert.ok(chunks.length > 4);
assert.equal(
  chunks.map((chunk) => chunk.content).join(""),
  large,
  "semantic chunks must reconstruct the exact source",
);
assert.ok(
  chunks.every(
    (chunk) =>
      chunk.characters <= PROJECT_FILE_CONTEXT_LIMITS.maximumChunkChars,
  ),
);
assert.match(chunks[0].label, /module1Boundary/);
assert.ok(
  chunks.every(
    (chunk, index) =>
      chunk.index === index + 1 &&
      chunk.startLine >= 1 &&
      chunk.endLine >= chunk.startLine,
  ),
);

const focused = buildProjectFileContext(large, {
  extension: ".ts",
  focus: "authentication session sentinel",
});
const markerChunk = chunks.find((chunk) =>
  chunk.content.includes("authentication-session-sentinel"),
);
assert.ok(markerChunk);
assert.equal(focused.contextual, true);
assert.ok(focused.selectedChunkIndexes.includes(markerChunk.index));
assert.match(focused.text, /focus-ranked locally/);
assert.match(focused.text, /authentication-session-sentinel/);
assert.ok(
  focused.text.length <= PROJECT_FILE_CONTEXT_LIMITS.maximumResponseChars,
);

const exact = buildProjectFileContext(large, {
  extension: ".ts",
  focus: "ignored because chunk wins",
  chunk: String(markerChunk.index),
});
assert.deepEqual(exact.selectedChunkIndexes, [markerChunk.index]);
assert.match(exact.text, /exact chunk selection/);
assert.match(exact.text, /authentication-session-sentinel/);
assert.doesNotMatch(exact.text, /module1Line0/);

const unmatched = buildProjectFileContext(large, {
  extension: ".ts",
  focus: "zzzz-no-such-declaration",
});
assert.match(unmatched.text, /focus had no match; leading semantic context/);

const crlfLarge = large.replaceAll("\n", "\r\n");
const crlfChunks = chunkProjectFileContent(crlfLarge, ".ts");
assert.equal(
  crlfChunks.map((chunk) => chunk.content).join(""),
  crlfLarge,
  "CRLF source must reconstruct exactly",
);

for (const options of [
  { chunk: "0" },
  { chunk: "1.5" },
  { chunk: String(chunks.length + 1) },
  { focus: "line one\nline two" },
  { focus: "x".repeat(PROJECT_FILE_CONTEXT_LIMITS.maximumFocusChars + 1) },
]) {
  assert.throws(() =>
    buildProjectFileContext(large, {
      extension: ".ts",
      ...options,
    }),
  );
}

console.log(
  `ok project-file-context-runtime (chunks=${chunks.length}; exact reconstruction; semantic focus; selector bounds; CRLF)`,
);
