export const PROMPT_THREAT_SOURCE_FAMILIES = [
  "cl4r1t4s",
  "l1b3rt4s",
  "g0dm0d3",
  "v3sp3r",
  "obliteratus",
] as const;

export type PromptThreatSourceFamily =
  (typeof PROMPT_THREAT_SOURCE_FAMILIES)[number];

export const PROMPT_THREAT_FAMILIES = [
  "system_prompt_extraction",
  "authority_spoofing",
  "context_reset",
  "boundary_inversion",
  "obfuscated_text",
  "invisible_unicode",
  "multi_model_jailbreak_racing",
  "unsafe_hardware_tool_control",
] as const;

export type PromptThreatFamily = (typeof PROMPT_THREAT_FAMILIES)[number];
export type PromptThreatRisk = "low" | "medium" | "high" | "critical";
export type PromptThreatSeverity = "low" | "medium" | "high" | "critical";

export interface NormalizedPromptThreatInput {
  plain: string;
  asciiFolded: string;
  leetFolded: string;
  invisibleCount: number;
  suspiciousUnicodeCount: number;
  rawLength: number;
}

export interface PromptThreatSignal {
  family: PromptThreatFamily;
  severity: PromptThreatSeverity;
  label: string;
  evidence: string;
}

export interface PromptThreatAssessment {
  risk: PromptThreatRisk;
  score: number;
  families: PromptThreatFamily[];
  signals: PromptThreatSignal[];
  normalized: NormalizedPromptThreatInput;
  recommendedPosture: string;
}

export const SAFE_MODEL_LAB_THREAT_FAMILIES: Array<{
  id: string;
  label: string;
  threatFamily: PromptThreatFamily;
  sourceFamilies: PromptThreatSourceFamily[];
}> = [
  {
    id: "boundary inversion",
    label: "Boundary inversion",
    threatFamily: "boundary_inversion",
    sourceFamilies: ["g0dm0d3", "l1b3rt4s"],
  },
  {
    id: "authority spoofing",
    label: "Authority spoofing",
    threatFamily: "authority_spoofing",
    sourceFamilies: ["cl4r1t4s", "g0dm0d3"],
  },
  {
    id: "encoded prompts",
    label: "Encoded prompts",
    threatFamily: "obfuscated_text",
    sourceFamilies: ["l1b3rt4s", "g0dm0d3"],
  },
  {
    id: "obfuscated trigger words",
    label: "Obfuscated trigger words",
    threatFamily: "obfuscated_text",
    sourceFamilies: ["l1b3rt4s"],
  },
  {
    id: "context reset",
    label: "Context reset",
    threatFamily: "context_reset",
    sourceFamilies: ["g0dm0d3", "cl4r1t4s"],
  },
  {
    id: "multi-model racing",
    label: "Multi-model racing",
    threatFamily: "multi_model_jailbreak_racing",
    sourceFamilies: ["g0dm0d3"],
  },
  {
    id: "unsafe tool control",
    label: "Unsafe tool control",
    threatFamily: "unsafe_hardware_tool_control",
    sourceFamilies: ["v3sp3r"],
  },
];

const INVISIBLE_RANGES: Array<[number, number]> = [
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
  [0xe0000, 0xe007f],
];

const SUSPICIOUS_UNICODE_RANGES: Array<[number, number]> = [
  [0x0300, 0x036f],
  [0x0591, 0x05bd],
  [0x05bf, 0x05bf],
  [0x05c1, 0x05c2],
  [0x05c4, 0x05c5],
  [0x0610, 0x061a],
  [0x064b, 0x065f],
  [0x1d00, 0x1d7f],
  [0x2460, 0x24ff],
  [0x2800, 0x28ff],
];

const SYSTEM_PROMPT_PATTERNS = [
  /\b(system|developer|hidden|internal)\s+(prompt|instruction|instructions|message|policy)\b/i,
  /\b(reveal|print|show|export|dump|summari[sz]e)\b.{0,80}\b(system|developer|hidden|internal)\s+(prompt|instruction|instructions|message|policy)\b/i,
  /\b(prompt|instruction)\s+(leak|extraction|dump)\b/i,
];

const AUTHORITY_SPOOFING_PATTERNS = [
  /\b(admin|administrator|developer|system|root)\s+(override|update|directive|authority|message)\b/i,
  /\b(policy|safety|guardrail)\s+override\b/i,
  /\btrusted\s+(operator|admin|developer|system)\b/i,
];

const CONTEXT_RESET_PATTERNS = [
  /\b(ignore|forget|discard|bypass)\b.{0,40}\b(previous|prior|above|earlier)\b.{0,40}\b(instruction|instructions|context|message|rule|rules)\b/i,
  /\b(new|fresh)\s+(session|context|instruction set|ruleset)\b/i,
  /\breset\s+(context|memory|rules|instructions)\b/i,
];

const BOUNDARY_INVERSION_PATTERNS = [
  /\b(reverse|invert|opposite|disable)\b.{0,40}\b(rule|rules|boundary|policy|guardrail|guardrails)\b/i,
  /\b(dev|developer|god|unlocked)\s*mode\b/i,
  /\bjailbreak\b/i,
];

const OBFUSCATION_PATTERNS = [
  /\b(base64|hex|rot13|morse|braille|leetspeak|l33t|unicode lookalike|encoded text)\b/i,
  /\b[rx]3v[e3]a[l1]\b/i,
];

const MULTI_MODEL_PATTERNS = [
  /\b(multi[- ]?model|several models|model race|prompt race|bypass label|bypass winner)\b/i,
  /\b(compare|race|try)\b.{0,60}\b(models|assistants|providers)\b.{0,60}\b(bypass|winner|break|override)\b/i,
];

const UNSAFE_TOOL_PATTERNS = [
  /\b(badusb|flipper|subghz|sub-ghz|rf transmit|nfc emulate|rfid clone|radio payload|hid payload|keystroke injection|hardware control|wireless attack)\b/i,
  /\b(reverse shell|payload deploy|exfiltrate|credential dump)\b/i,
];

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "2": "z",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
};

function inRanges(codePoint: number, ranges: Array<[number, number]>) {
  return ranges.some(([start, end]) => codePoint >= start && codePoint <= end);
}

function stripInvisible(input: string) {
  return Array.from(input)
    .filter((char) => !inRanges(char.codePointAt(0) ?? 0, INVISIBLE_RANGES))
    .join("");
}

function countRanges(input: string, ranges: Array<[number, number]>) {
  return Array.from(input).filter((char) =>
    inRanges(char.codePointAt(0) ?? 0, ranges),
  ).length;
}

function foldLeet(input: string) {
  return Array.from(input)
    .map((char) => LEET_MAP[char] ?? char)
    .join("");
}

function foldAscii(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]+/g, " ");
}

// ASSERT: given text with zero-width markers, returns marker counts and plain text without those markers.
export function normalizePromptThreatInput(
  input: string,
): NormalizedPromptThreatInput {
  const normalized = String(input ?? "").normalize("NFKC").toLowerCase();
  const invisibleCount = countRanges(normalized, INVISIBLE_RANGES);
  const plain = stripInvisible(normalized).replace(/\s+/g, " ").trim();
  const asciiFolded = foldAscii(plain).replace(/\s+/g, " ").trim();
  const leetFolded = foldLeet(asciiFolded).replace(/\s+/g, " ").trim();

  return {
    plain,
    asciiFolded,
    leetFolded,
    invisibleCount,
    suspiciousUnicodeCount: countRanges(normalized, SUSPICIOUS_UNICODE_RANGES),
    rawLength: String(input ?? "").length,
  };
}

function matchesAny(input: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(input));
}

function pushSignal(
  signals: PromptThreatSignal[],
  signal: PromptThreatSignal,
) {
  if (signals.some((item) => item.family === signal.family && item.label === signal.label)) {
    return;
  }
  signals.push(signal);
}

function riskFromScore(score: number): PromptThreatRisk {
  if (score >= 90) return "critical";
  if (score >= 55) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function severityScore(severity: PromptThreatSeverity) {
  switch (severity) {
    case "critical":
      return 70;
    case "high":
      return 42;
    case "medium":
      return 24;
    default:
      return 10;
  }
}

function postureForRisk(risk: PromptThreatRisk) {
  switch (risk) {
    case "critical":
      return "Block the request, preserve evidence, and require explicit operator review before any related tool path is used.";
    case "high":
      return "Do not execute tools or reveal protected context; continue only with safe, high-level refusal or defensive analysis.";
    case "medium":
      return "Treat as a prompt-injection pressure test; keep execution disabled and answer with sanitized defensive guidance only.";
    default:
      return "Continue normal operation while keeping the standard injection guard active.";
  }
}

// ASSERT: given benign examples of prompt leakage, authority spoofing, context reset, encoded text, invisible text, and unsafe tool control, returns the matching threat families without storing raw corpora.
export function assessPromptThreat(input: string): PromptThreatAssessment {
  const normalized = normalizePromptThreatInput(input);
  const scanText = [
    normalized.plain,
    normalized.asciiFolded,
    normalized.leetFolded,
  ].join("\n");
  const signals: PromptThreatSignal[] = [];

  if (matchesAny(scanText, SYSTEM_PROMPT_PATTERNS)) {
    pushSignal(signals, {
      family: "system_prompt_extraction",
      severity: "high",
      label: "System or developer prompt disclosure pressure",
      evidence: "Matched protected-instruction disclosure wording.",
    });
  }
  if (matchesAny(scanText, AUTHORITY_SPOOFING_PATTERNS)) {
    pushSignal(signals, {
      family: "authority_spoofing",
      severity: "medium",
      label: "Spoofed admin or system authority",
      evidence: "Matched authority override language.",
    });
  }
  if (matchesAny(scanText, CONTEXT_RESET_PATTERNS)) {
    pushSignal(signals, {
      family: "context_reset",
      severity: "medium",
      label: "Context reset or prior-instruction bypass attempt",
      evidence: "Matched reset or ignore-prior-instruction wording.",
    });
  }
  if (matchesAny(scanText, BOUNDARY_INVERSION_PATTERNS)) {
    pushSignal(signals, {
      family: "boundary_inversion",
      severity: "high",
      label: "Boundary inversion or unlocked-mode framing",
      evidence: "Matched rule inversion, guardrail bypass, or jailbreak wording.",
    });
  }
  if (
    matchesAny(scanText, OBFUSCATION_PATTERNS) ||
    normalized.leetFolded !== normalized.asciiFolded
  ) {
    pushSignal(signals, {
      family: "obfuscated_text",
      severity: "medium",
      label: "Encoded or obfuscated instruction pattern",
      evidence: "Detected encoded wording, leetspeak folding, or obfuscation markers.",
    });
  }
  if (normalized.invisibleCount > 0) {
    pushSignal(signals, {
      family: "invisible_unicode",
      severity: "medium",
      label: "Invisible Unicode marker",
      evidence: `${normalized.invisibleCount} invisible marker(s) detected.`,
    });
  }
  if (matchesAny(scanText, MULTI_MODEL_PATTERNS)) {
    pushSignal(signals, {
      family: "multi_model_jailbreak_racing",
      severity: "medium",
      label: "Multi-model jailbreak racing pressure",
      evidence: "Matched model-race or bypass-winner wording.",
    });
  }
  if (matchesAny(scanText, UNSAFE_TOOL_PATTERNS)) {
    pushSignal(signals, {
      family: "unsafe_hardware_tool_control",
      severity: "critical",
      label: "Unsafe hardware or tool-control intent",
      evidence: "Matched hardware-control, payload, or offensive execution wording.",
    });
  }

  const score = Math.min(
    100,
    signals.reduce((total, signal) => total + severityScore(signal.severity), 0),
  );
  const risk = riskFromScore(score);

  return {
    risk,
    score,
    families: signals.map((signal) => signal.family),
    signals,
    normalized,
    recommendedPosture: postureForRisk(risk),
  };
}

export function promptThreatFamilyLabel(family: PromptThreatFamily) {
  switch (family) {
    case "system_prompt_extraction":
      return "system-prompt extraction";
    case "authority_spoofing":
      return "authority spoofing";
    case "context_reset":
      return "context reset";
    case "boundary_inversion":
      return "boundary inversion";
    case "obfuscated_text":
      return "obfuscated or encoded text";
    case "invisible_unicode":
      return "invisible Unicode";
    case "multi_model_jailbreak_racing":
      return "multi-model jailbreak racing";
    case "unsafe_hardware_tool_control":
      return "unsafe hardware/tool-control";
  }
}

export function buildPromptThreatSummary() {
  return [
    "Defensive prompt-threat taxonomy:",
    PROMPT_THREAT_FAMILIES.map(promptThreatFamilyLabel).join(", "),
    "Keep tests sanitized, local-only, and evidence-only. Read-only analysis can continue; writes require review; destructive, exec, model-mutation, telemetry, and unsafe hardware/tool-control requests stay blocked unless represented as harmless simulations.",
  ].join(" ");
}
