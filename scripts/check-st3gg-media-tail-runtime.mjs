import assert from "node:assert/strict";
import {
  buildBinaryTriageNotes,
  buildBinaryTriageVaultDraft,
  detectBinaryFormat,
  detectBinaryMediaTailIndicators,
} from "../lib/binaryTriage.ts";

const concat = (...parts) =>
  Uint8Array.from(parts.flatMap((part) => Array.from(part)));
const text = (value) => new TextEncoder().encode(value);
const pngChunk = (type, data = new Uint8Array()) => {
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, data.length, false);
  return concat(length, text(type), data, new Uint8Array(4));
};

const png = concat(
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk("IHDR"),
  pngChunk("IEND"),
);
assert.deepEqual(detectBinaryMediaTailIndicators(png), []);

const pngZip = concat(png, Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));
const [pngFinding] = detectBinaryMediaTailIndicators(pngZip);
assert.equal(pngFinding?.category, "png_after_iend");
assert.equal(pngFinding?.offset, png.length);
assert.equal(pngFinding?.trailingBytes, 4);
assert.equal(pngFinding?.embeddedFormat, "ZIP archive");
assert.doesNotMatch(JSON.stringify(pngFinding), /payload|preview|content/i);

const malformedPng = concat(
  png.slice(0, 8),
  Uint8Array.from([0xff, 0xff, 0xff, 0xff]),
  text("IEND"),
  new Uint8Array(4),
);
assert.deepEqual(detectBinaryMediaTailIndicators(malformedPng), []);

const jpeg = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0x00, 0x22, 0xff, 0xd9,
]);
assert.deepEqual(detectBinaryMediaTailIndicators(jpeg), []);
const jpegTail = concat(jpeg, Uint8Array.from([0x4d, 0x5a]));
const [jpegFinding] = detectBinaryMediaTailIndicators(jpegTail);
assert.equal(jpegFinding?.category, "jpeg_after_eoi");
assert.equal(jpegFinding?.embeddedFormat, "PE executable");

const pdf = text("%PDF-1.7\n1 0 obj\nendobj\n%%EOF\r\n \t");
assert.deepEqual(detectBinaryMediaTailIndicators(pdf), []);
assert.equal(
  detectBinaryMediaTailIndicators(concat(pdf, Uint8Array.from([0x00])))[0]
    ?.trailingBytes,
  1,
);
const pdfZip = concat(pdf, Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));
const [pdfFinding] = detectBinaryMediaTailIndicators(pdfZip);
assert.equal(pdfFinding?.category, "pdf_after_eof");
assert.equal(pdfFinding?.offset, pdf.length);
assert.equal(pdfFinding?.trailingBytes, 4);
assert.equal(pdfFinding?.embeddedFormat, "ZIP archive");

assert.deepEqual(
  detectBinaryMediaTailIndicators(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])),
  [],
);

const format = detectBinaryFormat(pngZip, "sample.png", "image/png");
const notes = buildBinaryTriageNotes({
  format,
  entropy: 2,
  printableStringCount: 0,
  iocs: { urls: [], domains: [], ipv4: [], emails: [] },
  sampleBytes: pngZip.length,
  totalBytes: pngZip.length,
  mediaTailIndicators: [pngFinding],
});
assert.match(notes[0] ?? "", /review indicator, not proof/i);

const draft = buildBinaryTriageVaultDraft({
  fileName: "sample.png",
  fileType: "image/png",
  fileSize: pngZip.length,
  sha256: "a".repeat(64),
  sha1: "b".repeat(40),
  format,
  entropy: 2,
  sampleBytes: pngZip.length,
  printableStrings: [],
  iocs: { urls: [], domains: [], ipv4: [], emails: [] },
  mediaTailIndicators: [pngFinding],
  notes,
});
assert.ok(draft.tags.includes("media-tail-indicator"));
assert.match(draft.content, /nested signature: ZIP archive/i);
assert.match(draft.content, /raw sample was not uploaded/i);

console.log(
  "ST3GG media-tail runtime OK (clean/malformed PNG, JPEG, PDF whitespace, bounded nested-signature indicators).",
);
