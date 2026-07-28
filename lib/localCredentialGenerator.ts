export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSPHRASE_MIN_WORDS = 4;
export const PASSPHRASE_MAX_WORDS = 16;
export const PASSPHRASE_SEPARATOR_MAX_LENGTH = 12;
export const CUSTOM_WORD_LIST_MIN_WORDS = 32;
export const CUSTOM_WORD_LIST_MAX_WORDS = 4_096;
export const CUSTOM_WORD_LIST_MAX_BYTES = 128 * 1_024;
export const CREDENTIAL_RESULT_CLEAR_MS = 2 * 60 * 1_000;

export const PASSWORD_CHARACTER_SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
} as const;

export const PASSWORD_AMBIGUOUS_CHARACTERS = "Il1O0o|`'\"";

const BUILT_IN_WORD_PREFIXES = [
  "amber",
  "apple",
  "arctic",
  "autumn",
  "azure",
  "brave",
  "bright",
  "calm",
  "cedar",
  "clear",
  "cobalt",
  "coral",
  "crisp",
  "dawn",
  "ember",
  "fern",
  "frost",
  "gentle",
  "golden",
  "green",
  "harbor",
  "ivory",
  "lunar",
  "maple",
  "misty",
  "noble",
  "ocean",
  "quiet",
  "rapid",
  "silver",
  "solar",
  "velvet",
] as const;

const BUILT_IN_WORD_SUFFIXES = [
  "anchor",
  "badger",
  "beacon",
  "birch",
  "brook",
  "canyon",
  "comet",
  "crane",
  "delta",
  "eagle",
  "field",
  "flame",
  "forest",
  "garden",
  "harbor",
  "hawk",
  "island",
  "lantern",
  "meadow",
  "mountain",
  "oak",
  "orchid",
  "otter",
  "pine",
  "river",
  "robin",
  "stone",
  "summit",
  "thunder",
  "valley",
  "willow",
  "wind",
] as const;

export const BUILT_IN_PASSPHRASE_WORDS = Object.freeze(
  BUILT_IN_WORD_PREFIXES.flatMap((prefix) =>
    BUILT_IN_WORD_SUFFIXES.map((suffix) => `${prefix}${suffix}`),
  ),
);

export type PasswordCharacterSetName = keyof typeof PASSWORD_CHARACTER_SETS;
export type PassphraseCase = "lower" | "upper" | "title";

export interface PasswordGeneratorOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  requireEverySelectedSet: boolean;
  excludeAmbiguous: boolean;
  excludedCharacters: string;
}

export interface PassphraseGeneratorOptions {
  wordCount: number;
  separator: string;
  case: PassphraseCase;
  customWords?: readonly string[];
}

export interface PasswordGenerationResult {
  value: string;
  entropyBits: number;
  alphabetSize: number;
  selectedSetCount: number;
}

export interface PassphraseGenerationResult {
  value: string;
  entropyBits: number;
  wordListSize: number;
  wordCount: number;
}

type CredentialRandomSource = Pick<Crypto, "getRandomValues">;

function integerInRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${label} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

function requireRandomSource(
  sourceInput?: CredentialRandomSource,
): CredentialRandomSource {
  const source = sourceInput ?? globalThis.crypto;
  if (!source || typeof source.getRandomValues !== "function") {
    throw new Error("Secure browser randomness is unavailable.");
  }
  return source;
}

function randomIndex(
  upperBound: number,
  source: CredentialRandomSource,
): number {
  integerInRange(upperBound, "Random selection bound", 1, 65_536);
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / upperBound) * upperBound;
  const sample = new Uint32Array(1);
  for (let attempt = 0; attempt < 1_024; attempt += 1) {
    source.getRandomValues(sample);
    if (sample[0] < limit) return sample[0] % upperBound;
  }
  throw new Error("Secure random selection could not complete.");
}

function choose(
  values: string | readonly string[],
  source: CredentialRandomSource,
): string {
  return values[randomIndex(values.length, source)] ?? "";
}

function shuffle(values: string[], source: CredentialRandomSource): string[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1, source);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function uniqueCharacters(value: string): string {
  return [...new Set(Array.from(value))].join("");
}

function buildPasswordGroups(options: PasswordGeneratorOptions): string[] {
  for (const [label, value] of [
    ["lowercase", options.lowercase],
    ["uppercase", options.uppercase],
    ["digits", options.digits],
    ["symbols", options.symbols],
    ["requireEverySelectedSet", options.requireEverySelectedSet],
    ["excludeAmbiguous", options.excludeAmbiguous],
  ] as const) {
    if (typeof value !== "boolean") {
      throw new Error(`Password option ${label} must be true or false.`);
    }
  }
  if (typeof options.excludedCharacters !== "string") {
    throw new Error("Custom character exclusions must be text.");
  }
  if (Array.from(options.excludedCharacters).length > 64) {
    throw new Error(
      "Custom character exclusions support at most 64 characters.",
    );
  }
  const excluded = new Set(
    Array.from(
      `${options.excludeAmbiguous ? PASSWORD_AMBIGUOUS_CHARACTERS : ""}${
        options.excludedCharacters
      }`,
    ),
  );
  const selected: PasswordCharacterSetName[] = [];
  if (options.lowercase) selected.push("lowercase");
  if (options.uppercase) selected.push("uppercase");
  if (options.digits) selected.push("digits");
  if (options.symbols) selected.push("symbols");
  if (selected.length === 0) {
    throw new Error("Select at least one password character set.");
  }
  return selected.map((name) => {
    const available = Array.from(PASSWORD_CHARACTER_SETS[name])
      .filter((character) => !excluded.has(character))
      .join("");
    if (!available) {
      throw new Error(`Exclusions removed every ${name} character.`);
    }
    return available;
  });
}

function conservativeRequiredSetEntropy(
  length: number,
  groups: readonly string[],
  poolLength: number,
): number {
  const randomDrawBits =
    groups.reduce((total, group) => total + Math.log2(group.length), 0) +
    Math.max(0, length - groups.length) * Math.log2(poolLength);
  const maximumConstructionCollisions = groups.reduce(
    (total, _group, index) => total + Math.log2(length - index),
    0,
  );
  return Math.max(0, randomDrawBits - maximumConstructionCollisions);
}

export function generatePassword(
  options: PasswordGeneratorOptions,
  sourceInput?: CredentialRandomSource,
): PasswordGenerationResult {
  const length = integerInRange(
    options.length,
    "Password length",
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
  );
  const groups = buildPasswordGroups(options);
  if (options.requireEverySelectedSet && length < groups.length) {
    throw new Error("Password length must cover every selected character set.");
  }
  const source = requireRandomSource(sourceInput);
  const pool = uniqueCharacters(groups.join(""));
  const characters: string[] = [];
  if (options.requireEverySelectedSet) {
    for (const group of groups) characters.push(choose(group, source));
  }
  while (characters.length < length) characters.push(choose(pool, source));
  const value = shuffle(characters, source).join("");
  const entropyBits = options.requireEverySelectedSet
    ? conservativeRequiredSetEntropy(length, groups, pool.length)
    : length * Math.log2(pool.length);
  return {
    value,
    entropyBits,
    alphabetSize: pool.length,
    selectedSetCount: groups.length,
  };
}

function validateWord(word: string, index: number): string {
  const normalized = word.normalize("NFKC").trim();
  const length = Array.from(normalized).length;
  if (
    length < 2 ||
    length > 32 ||
    !/^[\p{L}\p{N}][\p{L}\p{N}'’-]*$/u.test(normalized)
  ) {
    throw new Error(
      `Custom word ${index + 1} must contain 2-32 letters, numbers, apostrophes, or hyphens.`,
    );
  }
  return normalized;
}

export function normalizeCustomWordList(input: readonly string[]): string[] {
  if (!Array.isArray(input)) {
    throw new Error("Custom word list must be an array.");
  }
  if (input.length > CUSTOM_WORD_LIST_MAX_WORDS * 2) {
    throw new Error(
      `Custom word list supports at most ${CUSTOM_WORD_LIST_MAX_WORDS} unique words.`,
    );
  }
  const seen = new Set<string>();
  const words: string[] = [];
  input.forEach((value, index) => {
    if (typeof value !== "string") {
      throw new Error(`Custom word ${index + 1} must be text.`);
    }
    const word = validateWord(value, index);
    const key = word.toLocaleLowerCase("en-US");
    if (seen.has(key)) return;
    seen.add(key);
    words.push(word);
  });
  if (
    words.length < CUSTOM_WORD_LIST_MIN_WORDS ||
    words.length > CUSTOM_WORD_LIST_MAX_WORDS
  ) {
    throw new Error(
      `Custom word list must contain ${CUSTOM_WORD_LIST_MIN_WORDS}-${CUSTOM_WORD_LIST_MAX_WORDS} unique valid words.`,
    );
  }
  return words;
}

export function parseCustomWordList(text: string): string[] {
  if (typeof text !== "string") {
    throw new Error("Custom word list must be text.");
  }
  if (new TextEncoder().encode(text).byteLength > CUSTOM_WORD_LIST_MAX_BYTES) {
    throw new Error(
      `Custom word list must be at most ${CUSTOM_WORD_LIST_MAX_BYTES / 1_024} KiB.`,
    );
  }
  const candidates = text.split(/[\s,;]+/u).filter(Boolean);
  return normalizeCustomWordList(candidates);
}

function normalizeSeparator(separator: string): string {
  if (typeof separator !== "string") {
    throw new Error("Passphrase separator must be text.");
  }
  if (
    Array.from(separator).length > PASSPHRASE_SEPARATOR_MAX_LENGTH ||
    /[\p{Cc}\p{Cf}\p{Cs}\p{Co}]/u.test(separator)
  ) {
    throw new Error(
      `Passphrase separator supports 0-${PASSPHRASE_SEPARATOR_MAX_LENGTH} non-control characters.`,
    );
  }
  return separator;
}

function applyPassphraseCase(word: string, mode: PassphraseCase): string {
  if (mode === "lower") return word.toLocaleLowerCase("en-US");
  if (mode === "upper") return word.toLocaleUpperCase("en-US");
  if (mode !== "title") {
    throw new Error("Passphrase case must be lower, upper, or title.");
  }
  const [first = "", ...rest] = Array.from(word.toLocaleLowerCase("en-US"));
  return `${first.toLocaleUpperCase("en-US")}${rest.join("")}`;
}

export function generatePassphrase(
  options: PassphraseGeneratorOptions,
  sourceInput?: CredentialRandomSource,
): PassphraseGenerationResult {
  const wordCount = integerInRange(
    options.wordCount,
    "Passphrase word count",
    PASSPHRASE_MIN_WORDS,
    PASSPHRASE_MAX_WORDS,
  );
  const separator = normalizeSeparator(options.separator);
  const words = options.customWords
    ? normalizeCustomWordList(options.customWords)
    : BUILT_IN_PASSPHRASE_WORDS;
  const source = requireRandomSource(sourceInput);
  const selected = Array.from({ length: wordCount }, () =>
    applyPassphraseCase(choose(words, source), options.case),
  );
  return {
    value: selected.join(separator),
    entropyBits: wordCount * Math.log2(words.length),
    wordListSize: words.length,
    wordCount,
  };
}

export function formatEntropyBits(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "Unknown";
  return `${value.toFixed(1)} bits`;
}

export function classifyEntropyEstimate(
  value: number,
): "limited" | "moderate" | "strong" | "very-strong" {
  if (!Number.isFinite(value) || value < 64) return "limited";
  if (value < 80) return "moderate";
  if (value < 128) return "strong";
  return "very-strong";
}
