import assert from "node:assert/strict";
import {
  BUILT_IN_PASSPHRASE_WORDS,
  classifyEntropyEstimate,
  CUSTOM_WORD_LIST_MAX_BYTES,
  CUSTOM_WORD_LIST_MIN_WORDS,
  generatePassphrase,
  generatePassword,
  parseCustomWordList,
  PASSWORD_AMBIGUOUS_CHARACTERS,
} from "../lib/localCredentialGenerator.ts";

function createSeededRandom(seed) {
  let state = seed >>> 0;
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    getRandomValues(values) {
      calls += 1;
      for (let index = 0; index < values.length; index += 1) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        values[index] = state >>> 0;
      }
      return values;
    },
  };
}

const defaultPasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  requireEverySelectedSet: true,
  excludeAmbiguous: true,
  excludedCharacters: "",
};

const passwordRandom = createSeededRandom(0xabc123);
const password = generatePassword(defaultPasswordOptions, passwordRandom);
assert.equal(password.value.length, 20);
assert.match(password.value, /[a-z]/);
assert.match(password.value, /[A-Z]/);
assert.match(password.value, /[0-9]/);
assert.match(password.value, /[^a-zA-Z0-9]/);
assert.equal(
  Array.from(PASSWORD_AMBIGUOUS_CHARACTERS).some((character) =>
    password.value.includes(character),
  ),
  false,
);
assert.equal(password.selectedSetCount, 4);
assert.ok(password.alphabetSize > 50);
assert.ok(password.entropyBits >= 80);
assert.ok(passwordRandom.calls > 0);

const repeatedA = generatePassword(
  { ...defaultPasswordOptions, excludedCharacters: "aA2!" },
  createSeededRandom(73),
);
const repeatedB = generatePassword(
  { ...defaultPasswordOptions, excludedCharacters: "aA2!" },
  createSeededRandom(73),
);
assert.equal(repeatedA.value, repeatedB.value);
for (const excluded of ["a", "A", "2", "!"]) {
  assert.equal(repeatedA.value.includes(excluded), false);
}

const digitsOnly = generatePassword(
  {
    ...defaultPasswordOptions,
    length: 12,
    lowercase: false,
    uppercase: false,
    digits: true,
    symbols: false,
    requireEverySelectedSet: false,
    excludeAmbiguous: false,
  },
  createSeededRandom(99),
);
assert.match(digitsOnly.value, /^\d{12}$/);
assert.equal(digitsOnly.entropyBits, 12 * Math.log2(10));

assert.throws(
  () =>
    generatePassword(
      {
        ...defaultPasswordOptions,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
      },
      createSeededRandom(1),
    ),
  /Select at least one/,
);
assert.throws(
  () =>
    generatePassword(
      { ...defaultPasswordOptions, length: 7 },
      createSeededRandom(1),
    ),
  /8 to 128/,
);
assert.throws(
  () =>
    generatePassword(
      {
        ...defaultPasswordOptions,
        lowercase: false,
        uppercase: false,
        symbols: false,
        excludedCharacters: "0123456789",
      },
      createSeededRandom(1),
    ),
  /removed every digits/,
);
assert.throws(
  () =>
    generatePassword(
      { ...defaultPasswordOptions, lowercase: "yes" },
      createSeededRandom(1),
    ),
  /must be true or false/,
);

assert.equal(BUILT_IN_PASSPHRASE_WORDS.length, 1_024);
assert.equal(new Set(BUILT_IN_PASSPHRASE_WORDS).size, 1_024);
const passphraseRandom = createSeededRandom(0x77aa55);
const passphrase = generatePassphrase(
  {
    wordCount: 8,
    separator: "-",
    case: "lower",
  },
  passphraseRandom,
);
assert.equal(passphrase.value.split("-").length, 8);
assert.equal(passphrase.wordListSize, 1_024);
assert.equal(passphrase.entropyBits, 80);
assert.ok(
  passphrase.value
    .split("-")
    .every((word) => BUILT_IN_PASSPHRASE_WORDS.includes(word)),
);
assert.ok(passphraseRandom.calls > 0);

const customText = Array.from(
  { length: CUSTOM_WORD_LIST_MIN_WORDS },
  (_, index) => `word${String(index).padStart(2, "0")}`,
).join("\n");
const customWords = parseCustomWordList(customText);
assert.equal(customWords.length, CUSTOM_WORD_LIST_MIN_WORDS);
const customPassphrase = generatePassphrase(
  {
    wordCount: 4,
    separator: "::",
    case: "upper",
    customWords,
  },
  createSeededRandom(802),
);
assert.equal(customPassphrase.value.split("::").length, 4);
assert.equal(
  customPassphrase.value,
  customPassphrase.value.toLocaleUpperCase("en-US"),
);
assert.equal(customPassphrase.entropyBits, 20);

const titlePassphrase = generatePassphrase(
  {
    wordCount: 4,
    separator: " ",
    case: "title",
  },
  createSeededRandom(44),
);
assert.ok(
  titlePassphrase.value.split(" ").every((word) => /^[A-Z][a-z]+$/.test(word)),
);

assert.throws(() => parseCustomWordList("same\n".repeat(64)), /32-4096 unique/);
assert.throws(
  () => parseCustomWordList("x".repeat(CUSTOM_WORD_LIST_MAX_BYTES + 1)),
  /128 KiB/,
);
assert.throws(
  () =>
    generatePassphrase(
      { wordCount: 3, separator: "-", case: "lower" },
      createSeededRandom(1),
    ),
  /4 to 16/,
);
assert.throws(
  () =>
    generatePassphrase(
      { wordCount: 4, separator: "\n", case: "lower" },
      createSeededRandom(1),
    ),
  /non-control/,
);
assert.throws(
  () =>
    generatePassphrase(
      { wordCount: 4, separator: "\u200b", case: "lower" },
      createSeededRandom(1),
    ),
  /non-control/,
);
assert.equal(classifyEntropyEstimate(50), "limited");
assert.equal(classifyEntropyEstimate(70), "moderate");
assert.equal(classifyEntropyEstimate(100), "strong");
assert.equal(classifyEntropyEstimate(140), "very-strong");

console.log(
  "ok local-credential-generator-runtime (Web Crypto source, password sets/exclusions, 1024 compound words, custom lists, case/separator, bounded failures, conservative estimates)",
);
