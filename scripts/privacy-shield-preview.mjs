#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";

const PRIVACY_SHIELD_PREVIEW_FIELDS = [
  "dispatchMode",
  "protectedCount",
  "classCounts",
  "blockedReason",
  "safePreview",
];

const CLASS_ORDER = [
  "credential",
  "internal_host",
  "protected_path",
  "sensitive_evidence",
];

const SAMPLE_PAYLOAD = [
  "token=exampleSecretValue1234567890",
  "open localhost:11434 for local model checks",
  "path C:\\Users\\mario\\Desktop\\personal\\secrets\\vault.txt",
  "operator-only incident evidence must stay local",
  "api_key=anotherSecretValue123456",
].join("\n");

const SENSITIVE_EVIDENCE_PATTERNS = [
  /\b(?:operator-only|operator only|for operator eyes only|internal incident evidence|sensitive incident evidence|chain[- ]of[- ]custody|do not send upstream|never send upstream)\b/gi,
];

const CREDENTIAL_REPLACEMENTS = [
  [/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "Bearer [redacted-token]"],
  [
    /\b(api[_ -]?key|access[_ -]?key|secret|password|token|cookie|session|client secret|refresh token)\s*[:=]\s*([^\s,;]+)/gi,
    "$1=[redacted]",
  ],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted-access-key]"],
  [/\bghp_[A-Za-z0-9]{16,}\b/g, "[redacted-token]"],
  [/\bsk-[A-Za-z0-9]{16,}\b/gi, "[redacted-key]"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gi, "[redacted-token]"],
];

const INTERNAL_HOST_REPLACEMENTS = [
  [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/[^\s"'`<>]*)?/gi,
    "[local-service]",
  ],
  [
    /https?:\/\/[A-Za-z0-9.-]+\.(?:local|internal)(?::\d+)?(?:\/[^\s"'`<>]*)?/gi,
    "[internal-service]",
  ],
  [
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[A-Za-z0-9.-]+\.local|[A-Za-z0-9.-]+\.internal)\b(?::\d+)?/gi,
    "[internal-host]",
  ],
];

const PROTECTED_PATH_REPLACEMENTS = [
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:\.ssh|secrets?|credentials?|keys?|certs?|private)(?:[\\/][^\s"'`<>]*)?/gi,
    "[protected-path]",
  ],
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:\.git|\.next|node_modules)(?:[\\/][^\s"'`<>]*)?/gi,
    "[repo-path]",
  ],
  [
    /(?:[A-Za-z]:\\|\/)(?:[^\\/\s"'`<>]+[\\/])*(?:app|components|lib|store|hooks|scripts|tests|docs)(?:[\\/][^\s"'`<>]*)/gi,
    "[repo-path]",
  ],
  [/\b\.env(?:\.[A-Za-z0-9_-]+)?\b/gi, "[protected-env]"],
];

function createState() {
  return {
    classCounts: Object.fromEntries(CLASS_ORDER.map((className) => [className, 0])),
    blockedReason: null,
  };
}

function bumpCount(state, className, count) {
  if (count <= 0) return;
  state.classCounts[className] += count;
}

function replaceAndCount(value, pattern, replacement) {
  const count = value.match(pattern)?.length ?? 0;
  return {
    next: value.replace(pattern, replacement),
    count,
  };
}

function sanitizeString(value, state) {
  let next = value;

  for (const pattern of SENSITIVE_EVIDENCE_PATTERNS) {
    const result = replaceAndCount(next, pattern, "[sensitive-evidence-marker]");
    next = result.next;
    bumpCount(state, "sensitive_evidence", result.count);
    if (result.count > 0) {
      state.blockedReason =
        state.blockedReason ??
        "Sensitive incident or operator-only evidence markers were detected.";
    }
  }

  for (const [pattern, replacement] of CREDENTIAL_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "credential", result.count);
  }

  for (const [pattern, replacement] of INTERNAL_HOST_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "internal_host", result.count);
  }

  for (const [pattern, replacement] of PROTECTED_PATH_REPLACEMENTS) {
    const result = replaceAndCount(next, pattern, replacement);
    next = result.next;
    bumpCount(state, "protected_path", result.count);
  }

  return next;
}

function buildStatus(state) {
  const protectedKinds = CLASS_ORDER.filter(
    (className) => state.classCounts[className] > 0,
  );
  const protectedCount = protectedKinds.reduce(
    (sum, className) => sum + state.classCounts[className],
    0,
  );
  const dispatchMode = state.blockedReason ? "blocked" : "redacted";
  const classSummary =
    protectedKinds
      .map((className) => `${className}:${state.classCounts[className]}`)
      .join(", ") || "none";

  return {
    active: protectedCount > 0,
    dispatchMode,
    protectedKinds,
    protectedCount,
    classCounts: state.classCounts,
    blockedReason: state.blockedReason,
    summary:
      dispatchMode === "blocked"
        ? `Privacy shield would block cloud dispatch after detecting ${classSummary}.`
        : `Privacy shield would redact ${protectedCount} value${protectedCount === 1 ? "" : "s"} across ${classSummary}.`,
  };
}

function buildPreview(input) {
  const state = createState();
  const safePreview = sanitizeString(input, state);
  return {
    ...buildStatus(state),
    safePreview,
  };
}

function printText(preview) {
  console.log("Nexus Privacy Shield preview");
  console.log("No network calls are made. Nothing is sent to an AI provider.");
  console.log(`Dispatch mode: ${preview.dispatchMode}`);
  console.log(`Protected values: ${preview.protectedCount}`);
  console.log(
    `Class counts: ${CLASS_ORDER.map((className) => `${className}=${preview.classCounts[className]}`).join(", ")}`,
  );
  if (preview.blockedReason) {
    console.log(`Blocked reason: ${preview.blockedReason}`);
  }
  console.log("");
  console.log("Safe preview:");
  console.log(preview.safePreview || "[empty]");
}

function parseArgs(argv) {
  const args = {
    check: false,
    json: false,
    sample: false,
    stdin: false,
    text: null,
  };

  for (const arg of argv) {
    if (arg === "--check") args.check = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--sample") args.sample = true;
    else if (arg === "--stdin") args.stdin = true;
    else if (arg.startsWith("--text=")) args.text = arg.slice("--text=".length);
  }

  return args;
}

function resolveInput(args) {
  if (args.stdin) {
    return readFileSync(0, "utf8");
  }
  if (args.text !== null) return args.text;
  if (args.sample || args.check) return SAMPLE_PAYLOAD;
  return SAMPLE_PAYLOAD;
}

function runCheck() {
  const preview = buildPreview(SAMPLE_PAYLOAD);
  const required = {
    credential: 2,
    internal_host: 1,
    protected_path: 1,
    sensitive_evidence: 1,
  };

  for (const [className, expectedMinimum] of Object.entries(required)) {
    if ((preview.classCounts[className] ?? 0) < expectedMinimum) {
      console.error(`missing ${className} preview evidence`);
      process.exit(1);
    }
  }

  if (preview.dispatchMode !== "blocked" || !preview.blockedReason) {
    console.error("sensitive evidence should block cloud dispatch");
    process.exit(1);
  }

  for (const leaked of [
    "exampleSecretValue1234567890",
    "anotherSecretValue123456",
    "C:\\Users\\mario\\Desktop\\personal\\secrets\\vault.txt",
  ]) {
    if (preview.safePreview.includes(leaked)) {
      console.error(`raw sample leaked: ${leaked}`);
      process.exit(1);
    }
  }

  printText(preview);
  console.log("");
  console.log("ok privacy-shield-preview");
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));

if (args.check) {
  runCheck();
}

const preview = buildPreview(resolveInput(args));
if (args.json) {
  console.log(JSON.stringify(preview, null, 2));
} else {
  printText(preview);
}

process.exit(0);
