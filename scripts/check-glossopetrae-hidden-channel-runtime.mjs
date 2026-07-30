import assert from "node:assert/strict";
import { detectUnicodeHiddenPromptSmuggling } from "../lib/skillSpectrumPolicy.ts";

const character = (codePoint) => String.fromCodePoint(codePoint);

for (const [category, codePoint] of [
  ["unicode_tag", 0xe0061],
  ["bidi_control", 0x202e],
  ["bidi_control", 0x2067],
  ["zero_width_format", 0x200b],
  ["zero_width_format", 0x3164],
  ["private_use", 0xe123],
  ["private_use", 0xf0001],
  ["private_use", 0x100001],
]) {
  const findings = detectUnicodeHiddenPromptSmuggling(
    `visible\nreview${character(codePoint)}this`,
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, category);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].column, 7);
  assert.match(findings[0].excerpt, /<U\+[0-9A-F]+>/);
  assert.equal(findings[0].excerpt.includes(character(codePoint)), false);
}

assert.deepEqual(
  detectUnicodeHiddenPromptSmuggling(
    "Café · العربية · 中文 · देवनागरी · 👩‍💻 · ❤️ · e\u0301",
  ),
  [],
);
assert.deepEqual(detectUnicodeHiddenPromptSmuggling("\ufeff# Valid BOM"), []);
assert.equal(
  detectUnicodeHiddenPromptSmuggling(`inside${character(0xfeff)}text`)[0]
    .category,
  "zero_width_format",
);
assert.equal(
  detectUnicodeHiddenPromptSmuggling(character(0xe0061).repeat(80)).length,
  50,
);

console.log(
  "ok glossopetrae-hidden-channel-runtime (tag, bidi, zero-width, private-use, supplementary planes, benign Unicode, bounded findings)",
);
