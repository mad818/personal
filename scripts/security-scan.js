#!/usr/bin/env node
/**
 * Repo-wide static security scanner for Nexus Prime.
 *
 * Goals:
 * 1. Block tracked-file secret leaks before push.
 * 2. Catch secret-like examples outside app/api and lib.
 * 3. Keep OWASP anti-pattern checks for code files.
 *
 * Usage:
 *   node scripts/security-scan.js
 *   node scripts/security-scan.js --staged
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ARGS = new Set(process.argv.slice(2));
const STAGED_ONLY = ARGS.has("--staged");

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonl",
  ".md",
  ".mdx",
  ".txt",
  ".html",
  ".css",
  ".svg",
  ".yaml",
  ".yml",
  ".sh",
  ".ps1",
  ".psm1",
  ".bat",
  ".cmd",
  ".toml",
  ".ini",
  ".conf",
  ".env",
]);

const SPECIAL_TEXT_BASENAMES = new Set([
  "Dockerfile",
  ".gitignore",
  ".npmrc",
  ".env.example",
  "AGENTS.md",
  "README.md",
  "CLAUDE.md",
]);

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const OWASP_SCAN_ROOTS = [
  "app/",
  "components/",
  "hooks/",
  "lib/",
  "scripts/",
  "store/",
];

const IGNORE_PATH_PATTERNS = [
  /^node_modules\//,
  /^\.next\//,
  /^\.next-e2e\//,
  /^\.next-fresh-runtime\//,
  /^desktop\/src-tauri\/target\//,
  /^dist\//,
  /^out\//,
  /^playwright-report\//,
  /^test-results\//,
  /^coverage\//,
  /^\.git\//,
];

const IGNORE_BASENAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  ".~lock.nexus_master_tracker.xlsx#",
]);

const KNOWN_SECRET_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "GOOGLE_AI_KEY",
  "OPENROUTER_API_KEY",
  "MINIMAX_API_KEY",
  "NEXUS_TOKEN",
  "OPENCLAW_TOKEN",
  "BRAVE_SEARCH_KEY",
  "COINGECKO_KEY",
  "FINNHUB_KEY",
  "GUARDIAN_KEY",
  "NVD_KEY",
  "OTX_KEY",
  "FRED_KEY",
  "AISSTREAM_KEY",
  "FIRMS_MAP_KEY",
  "FIRECRAWL_KEY",
  "HIBP_API_KEY",
  "VT_API_KEY",
  "SHODAN_API_KEY",
  "CEREBRAS_API_KEY",
  "SAMBANOVA_API_KEY",
  "NVIDIA_API_KEY",
  "HYPERBOLIC_API_KEY",
  "TOGETHER_API_KEY",
  "SILICONFLOW_API_KEY",
  "ZAI_API_KEY",
  "IFLOW_API_KEY",
  "DEEPINFRA_API_KEY",
  "FIREWORKS_API_KEY",
  "SCALEWAY_API_KEY",
  "DASHSCOPE_API_KEY",
  "HUGGINGFACE_API_KEY",
  "CODESTRAL_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "PERPLEXITY_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
]);

const SAFE_PLACEHOLDER_PATTERNS = [
  /^$/i,
  /^placeholder$/i,
  /^replace[-_ ]?me$/i,
  /^changeme$/i,
  /^not-needed$/i,
  /^ollama$/i,
  /^<set-in-[a-z0-9._-]+>$/i,
  /^<set-in-.+>$/i,
  /^replace-with-[a-z0-9._-]+$/i,
  /^replace-with-provider-key$/i,
  /^replace-with-long-random-local-token$/i,
  /^replace-in-local-env-only$/i,
  /^set-in-local-env-only$/i,
  /^local-only$/i,
  /^your-key-here$/i,
  /^your-api-key$/i,
  /^your api key$/i,
  /^your_[a-z0-9_]+_here$/i,
  /^your-secret-here$/i,
  /^your token here$/i,
  /^choose-a-random-secret-string$/i,
  /^\.\.\.$/,
];

const SECRET_PATTERNS = [
  { name: "Anthropic key", re: /\bsk-ant-[A-Za-z0-9\-_]{20,}\b/g },
  { name: "OpenAI key", re: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9\-_]{20,}\b/g },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "GitHub token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "Firecrawl key", re: /\bfc-[A-Za-z0-9]{20,}\b/g },
  { name: "Bearer JWT", re: /\bBearer\s+eyJ[A-Za-z0-9._-]{20,}\b/g },
  {
    name: "Private key block",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
];

const OWASP_PATTERNS = [
  {
    name: "A02 - eval() usage",
    re: /\beval\s*\(/g,
    note: "eval() executes arbitrary code. Prefer structured parsers or whitelisted interpreters.",
    severity: "CRITICAL",
  },
  {
    name: "A03 - innerHTML assignment",
    re: /\.innerHTML\s*=/g,
    note: "innerHTML can inject scripts. Prefer textContent or sanitized renderers.",
    severity: "HIGH",
  },
  {
    name: "A06 - Logging secrets",
    re: /console\.(?:log|debug|info)\s*\([^)]*(?:process\.env|authorization|bearer|apiKey|tokenValue|secretValue|passwordValue|cookieValue)[^)]*\)/gi,
    note: "Logging sensitive values leaks them to stdout and aggregators.",
    severity: "HIGH",
  },
  {
    name: "A07 - Path traversal (../ in path.join)",
    re: /path\.join\([^)]*\.\.\//g,
    note: "User-controlled ../ segments can escape the intended directory.",
    severity: "HIGH",
    skipIf: (ctx) => ctx.includes("includes('..')") || ctx.includes('includes("..")'),
  },
  {
    name: "A09 - Stack trace in API response",
    re: /err\.stack/g,
    note: "Do not return stack traces to clients.",
    severity: "MEDIUM",
    skipIf: (ctx) => !ctx.includes("NextResponse") && !ctx.includes("protectedJson"),
  },
  {
    name: "A05 - Debug flag hardcoded true",
    re: /debug\s*[:=]\s*true/gi,
    note: "Hardcoded debug state can expose internal posture unexpectedly.",
    severity: "LOW",
  },
];

function normalizeSlashes(value) {
  return value.replace(/\\/g, "/");
}

function isIgnoredPath(relPath) {
  const normalized = normalizeSlashes(relPath);
  if (IGNORE_BASENAMES.has(path.basename(normalized))) return true;
  return IGNORE_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isTextCandidate(relPath) {
  const normalized = normalizeSlashes(relPath);
  const basename = path.basename(normalized);
  if (SPECIAL_TEXT_BASENAMES.has(basename)) return true;
  return TEXT_EXTS.has(path.extname(basename).toLowerCase());
}

function isCodeFile(relPath) {
  const basename = path.basename(relPath);
  return CODE_EXTS.has(path.extname(basename).toLowerCase());
}

function isOwaspCandidate(relPath) {
  if (!isCodeFile(relPath)) return false;
  const normalized = normalizeSlashes(relPath);
  return OWASP_SCAN_ROOTS.some((prefix) => normalized.startsWith(prefix));
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function listGitFiles() {
  try {
    const output = STAGED_ONLY
      ? runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
      : runGit(["ls-files", "-z"]);
    return output
      .split("\0")
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (isIgnoredPath(rel)) continue;
    if (entry.isDirectory()) {
      results.push(...walk(full));
      continue;
    }
    if (isTextCandidate(rel)) {
      results.push(rel);
    }
  }

  return results;
}

function getCandidateFiles() {
  const fromGit = listGitFiles()
    .filter((relPath) => !isIgnoredPath(relPath))
    .filter(isTextCandidate);

  if (fromGit.length > 0 || STAGED_ONLY) {
    return fromGit;
  }

  return walk(ROOT);
}

function readTextFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.includes(0)) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

function isAllowedPlaceholder(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^['"`]+|['"`.,;:)\]]+$/g, "");
  return SAFE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("<!--")
  );
}

function buildFindingKey(finding) {
  return [finding.file, finding.line, finding.rule, finding.type, finding.snippet].join("::");
}

function scanSecretPatterns(src, relPath, lines) {
  const findings = [];

  for (const { name, re } of SECRET_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(src)) !== null) {
      const lineIdx = src.slice(0, match.index).split("\n").length - 1;
      const line = lines[lineIdx] ?? "";
      if (isAllowedPlaceholder(match[0]) || isAllowedPlaceholder(line)) continue;
      findings.push({
        type: "SECRET",
        severity: "CRITICAL",
        file: relPath,
        line: lineIdx + 1,
        rule: name,
        snippet: line.trim().slice(0, 160) || match[0].slice(0, 80),
      });
    }
  }

  const assignmentRe =
    /\b([A-Z][A-Z0-9_]{2,})\s*=\s*(?![=])("[^"]*"|'[^']*'|[^\s<>{}=]+)/g;

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return;
    assignmentRe.lastIndex = 0;
    let match;
    while ((match = assignmentRe.exec(line)) !== null) {
      const key = match[1];
      const value = match[2].replace(/^['"]|['"]$/g, "");
      const isKnownSecretKey = KNOWN_SECRET_KEYS.has(key);
      const isGenericSecretKey =
        /(API_KEY|ACCESS_KEY|BOT_TOKEN|AUTH_TOKEN|CLIENT_SECRET|SECRET|PASSWORD|TOKEN)$/.test(
          key,
        ) &&
        !/(_STORAGE|_CACHE|_SEGMENT|_NOTICE|_LABEL|_STATUS|_MODE|_PROFILE|_POLICY|_ENDPOINT|_URL)$/.test(
          key,
        );

      if (!isKnownSecretKey && !isGenericSecretKey) continue;
      if (!value || isAllowedPlaceholder(value)) continue;
      if (/^process\.env\./.test(value)) continue;

      findings.push({
        type: "SECRET",
        severity: "CRITICAL",
        file: relPath,
        line: index + 1,
        rule: "Suspicious secret assignment",
        snippet: line.trim().slice(0, 160),
      });
    }
  });

  return findings;
}

function scanOwaspPatterns(src, relPath, lines) {
  if (!isOwaspCandidate(relPath)) return [];
  const normalizedPath = normalizeSlashes(relPath);
  if (
    normalizedPath === "scripts/security-scan.js" ||
    normalizedPath === "components/home/office/prompts.ts"
  ) {
    return [];
  }
  const findings = [];

  for (const rule of OWASP_PATTERNS) {
    rule.re.lastIndex = 0;
    let match;
    while ((match = rule.re.exec(src)) !== null) {
      const lineIdx = src.slice(0, match.index).split("\n").length - 1;
      const line = lines[lineIdx] ?? "";
      if (isCommentLine(line)) continue;
      const ctx = lines.slice(Math.max(0, lineIdx - 4), lineIdx + 6).join("\n");
      if (rule.skipIf && rule.skipIf(ctx)) continue;
      findings.push({
        type: "OWASP",
        severity: rule.severity,
        file: relPath,
        line: lineIdx + 1,
        rule: rule.name,
        note: rule.note,
        snippet: line.trim().slice(0, 160),
      });
    }
  }

  return findings;
}

function scanFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  const src = readTextFile(fullPath);
  if (src === null) return [];

  const lines = src.split(/\r?\n/);
  return [
    ...scanSecretPatterns(src, relPath, lines),
    ...scanOwaspPatterns(src, relPath, lines),
  ];
}

const allFiles = getCandidateFiles();
const dedupedFindings = new Map();

for (const relPath of allFiles) {
  for (const finding of scanFile(relPath)) {
    dedupedFindings.set(buildFindingKey(finding), finding);
  }
}

const allFindings = Array.from(dedupedFindings.values());
const criticals = allFindings.filter((finding) => finding.severity === "CRITICAL");
const highs = allFindings.filter((finding) => finding.severity === "HIGH");
const others = allFindings.filter(
  (finding) => finding.severity !== "CRITICAL" && finding.severity !== "HIGH",
);
const blockingFindings = allFindings.filter((finding) => finding.type === "SECRET");

if (allFindings.length === 0) {
  console.log(
    `✅ security-scan: clean (${STAGED_ONLY ? "staged files" : "tracked repo"})`,
  );
  process.exit(0);
}

console.log(
  `\n🔐 Security scan — ${allFindings.length} finding(s) (${STAGED_ONLY ? "staged files" : "tracked repo"})\n`,
);

for (const finding of [...criticals, ...highs, ...others]) {
  const icon =
    finding.severity === "CRITICAL"
      ? "🚨"
      : finding.severity === "HIGH"
        ? "⚠️ "
        : "💡";
  console.log(`${icon} [${finding.severity}] ${finding.rule}`);
  console.log(`   ${finding.file}:${finding.line}`);
  console.log(`   ${finding.snippet}`);
  if (finding.note) {
    console.log(`   → ${finding.note}`);
  }
  console.log();
}

console.log(
  `Summary: ${criticals.length} critical, ${highs.length} high, ${others.length} medium/low`,
);

if (blockingFindings.length > 0) {
  console.log(
    "\n🚫 Blocking findings — remove or replace tracked secrets with canonical placeholders before commit/push.",
  );
  process.exit(1);
}

console.log("\n✅ No blocking secret findings. Advisory security findings remain for follow-up hardening.");
process.exit(0);
