#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const strictMode = process.argv.includes("--strict");

const HISTORY_RULES = [
  {
    name: "Tracked secret env assignments",
    pattern:
      "(NEXUS_TOKEN|OPENCLAW_TOKEN|ANTHROPIC_API_KEY|OPENAI_API_KEY|GROQ_API_KEY|GOOGLE_AI_KEY|OPENROUTER_API_KEY|MINIMAX_API_KEY|BRAVE_SEARCH_KEY|FIRECRAWL_KEY|COINGECKO_KEY|FINNHUB_KEY|NVD_KEY|OTX_KEY|FRED_KEY|AISSTREAM_KEY|FIRMS_MAP_KEY|HIBP_API_KEY|VT_API_KEY|SHODAN_API_KEY|CEREBRAS_API_KEY|SAMBANOVA_API_KEY|NVIDIA_API_KEY|HYPERBOLIC_API_KEY|TOGETHER_API_KEY|SILICONFLOW_API_KEY|ZAI_API_KEY|IFLOW_API_KEY|DEEPINFRA_API_KEY|FIREWORKS_API_KEY|SCALEWAY_API_KEY|DASHSCOPE_API_KEY|HUGGINGFACE_API_KEY|CODESTRAL_API_KEY|CLOUDFLARE_API_TOKEN|PERPLEXITY_API_KEY)[[:space:]]*=",
  },
  {
    name: "Provider key prefixes",
    pattern: "(sk-ant-|sk-proj-|ghp_|github_pat_|AKIA|xox[baprs]-|fc-)",
  },
  {
    name: "Private key material",
    pattern: "BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY",
  },
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function searchHistory(pattern) {
  try {
    const output = runGit([
      "log",
      "--all",
      "--pickaxe-regex",
      "-G",
      pattern,
      "--date=short",
      "--format=%H\t%ad\t%s",
      "--",
      ".",
    ]);

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const findings = HISTORY_RULES.map((rule) => ({
  ...rule,
  hits: searchHistory(rule.pattern),
})).filter((rule) => rule.hits.length > 0);

if (findings.length === 0) {
  console.log("✅ security-history-audit: no historical matches found");
  process.exit(0);
}

console.log("\n🕰️  Security history audit — possible historical secret exposure\n");
for (const finding of findings) {
  console.log(`⚠️  ${finding.name}`);
  for (const hit of finding.hits.slice(0, 10)) {
    console.log(`   ${hit}`);
  }
  if (finding.hits.length > 10) {
    console.log(`   … ${finding.hits.length - 10} more matching commit(s)`);
  }
  console.log();
}

console.log(
  "Next steps: rotate any live credentials first, then decide whether history rewrite and downstream notification are required.",
);

if (strictMode) {
  process.exit(1);
}

process.exit(0);
