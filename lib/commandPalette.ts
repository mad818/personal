export type NexusCommandGroup =
  | "Command"
  | "Intelligence"
  | "Markets"
  | "Security"
  | "Knowledge"
  | "Build";

export type NexusCommand = {
  id: string;
  label: string;
  description: string;
  group: NexusCommandGroup;
  href: `/${string}`;
  keywords: readonly string[];
  priority: number;
};

export type RankedNexusCommand = {
  command: NexusCommand;
  score: number;
};

const MAX_COMMAND_RESULTS = 9;
const SAFE_LOCAL_HREF = /^\/[a-z0-9/_-]*(?:\?[a-z0-9=&_-]+)?$/i;

export const NEXUS_COMMANDS: readonly NexusCommand[] = [
  {
    id: "open-hq",
    label: "Open Citadel HQ",
    description: "Return to the primary command and assistant workplane.",
    group: "Command",
    href: "/hq",
    keywords: ["home", "citadel", "assistant", "strategium"],
    priority: 10,
  },
  {
    id: "open-command",
    label: "Open Vector Command",
    description: "Review operations, network posture, and mission controls.",
    group: "Command",
    href: "/command",
    keywords: ["vector", "operations", "mission", "network"],
    priority: 20,
  },
  {
    id: "open-intel-world",
    label: "Open Spectra World",
    description: "Inspect the global intelligence map and current events.",
    group: "Intelligence",
    href: "/intel?view=world",
    keywords: ["intel", "spectra", "map", "events", "global"],
    priority: 30,
  },
  {
    id: "open-intel-sweeps",
    label: "Run Spectra Sweeps",
    description: "Open the bundled intelligence sweep workspace.",
    group: "Intelligence",
    href: "/intel?view=sweeps",
    keywords: ["intel", "research", "scan", "feeds", "bundle"],
    priority: 31,
  },
  {
    id: "open-intel-markets",
    label: "Open Spectra Markets",
    description: "Move to intelligence-led market context and signals.",
    group: "Intelligence",
    href: "/intel?view=markets",
    keywords: ["intel", "macro", "market", "signals"],
    priority: 32,
  },
  {
    id: "open-alpha-watchlist",
    label: "Open Quant Watchlist",
    description: "Review tracked assets and current market posture.",
    group: "Markets",
    href: "/alpha?view=watchlist",
    keywords: ["alpha", "quant", "assets", "prices", "portfolio"],
    priority: 40,
  },
  {
    id: "open-alpha-signals",
    label: "Open Quant Signals",
    description: "Inspect the active technical and market signal workspace.",
    group: "Markets",
    href: "/alpha?view=signals",
    keywords: ["alpha", "quant", "indicators", "trading"],
    priority: 41,
  },
  {
    id: "open-alpha-scanner",
    label: "Open Quant Scanner",
    description: "Scan markets and prepare a bounded trade thesis.",
    group: "Markets",
    href: "/alpha?view=scanner",
    keywords: ["alpha", "quant", "momentum", "thesis", "trade"],
    priority: 42,
  },
  {
    id: "open-cyber-triage",
    label: "Open Bastion Triage",
    description: "Prioritize current defensive security findings.",
    group: "Security",
    href: "/cyber?view=triage",
    keywords: ["cyber", "bastion", "security", "threats", "findings"],
    priority: 50,
  },
  {
    id: "open-cyber-cves",
    label: "Open Bastion CVEs",
    description: "Review known vulnerability evidence and remediation posture.",
    group: "Security",
    href: "/cyber?view=cves",
    keywords: ["cyber", "bastion", "vulnerabilities", "cve"],
    priority: 51,
  },
  {
    id: "open-security-doctrine",
    label: "Open Control Doctrine",
    description: "Inspect security controls, policy, and defensive posture.",
    group: "Security",
    href: "/security?view=doctrine",
    keywords: ["control", "security", "policy", "governance", "doctrine"],
    priority: 52,
  },
  {
    id: "open-vault",
    label: "Open Archive Vault",
    description: "Review saved evidence, dossiers, papers, and memory.",
    group: "Knowledge",
    href: "/vault",
    keywords: ["archive", "memory", "saved", "evidence", "papers"],
    priority: 60,
  },
  {
    id: "open-resources",
    label: "Open Field Manual",
    description: "Browse reusable resources, registries, and operator tools.",
    group: "Knowledge",
    href: "/resources",
    keywords: ["manual", "resources", "registry", "tools", "reference"],
    priority: 61,
  },
  {
    id: "open-skills-forge",
    label: "Open Skills Forge",
    description: "Author and refine reusable Nexus workflows.",
    group: "Build",
    href: "/skills?view=forge",
    keywords: ["skills", "workflow", "author", "build", "orbit"],
    priority: 70,
  },
  {
    id: "open-skills-library",
    label: "Open Skill Library",
    description: "Search project-owned procedures and capability contracts.",
    group: "Build",
    href: "/skills?view=library",
    keywords: ["skills", "library", "procedures", "capabilities", "atlas"],
    priority: 71,
  },
  {
    id: "open-skills-blacksite",
    label: "Open Skills Blacksite",
    description: "Inspect isolated prompt mutation and model comparisons.",
    group: "Build",
    href: "/skills?view=blacksite",
    keywords: ["skills", "experiments", "prompts", "models", "compare"],
    priority: 72,
  },
  {
    id: "open-skills-brain",
    label: "Open Skills Brain",
    description: "Review skill memory, dependencies, and operating context.",
    group: "Build",
    href: "/skills?view=brain",
    keywords: ["skills", "brain", "memory", "dependencies", "context"],
    priority: 73,
  },
] as const;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreSubsequence(needle: string, haystack: string): number | null {
  let needleIndex = 0;
  let firstMatch = -1;
  let previousMatch = -1;
  let gaps = 0;

  for (
    let haystackIndex = 0;
    haystackIndex < haystack.length && needleIndex < needle.length;
    haystackIndex += 1
  ) {
    if (haystack[haystackIndex] !== needle[needleIndex]) continue;
    if (firstMatch === -1) firstMatch = haystackIndex;
    if (previousMatch >= 0) gaps += haystackIndex - previousMatch - 1;
    previousMatch = haystackIndex;
    needleIndex += 1;
  }

  if (needleIndex !== needle.length) return null;
  return Math.max(20, 120 - firstMatch * 3 - gaps * 2);
}

function scoreToken(
  token: string,
  label: string,
  labelWords: readonly string[],
  searchable: string,
): number | null {
  if (label === token) return 1000;
  if (label.startsWith(token)) return 760 - Math.min(100, label.length);

  const wordIndex = labelWords.findIndex((word) => word.startsWith(token));
  if (wordIndex >= 0) return 620 - wordIndex * 12;

  const directIndex = searchable.indexOf(token);
  if (directIndex >= 0) return 420 - Math.min(200, directIndex);

  return scoreSubsequence(token, searchable);
}

export function validateNexusCommandRegistry(
  commands: readonly NexusCommand[] = NEXUS_COMMANDS,
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const hrefs = new Set<string>();

  for (const command of commands) {
    if (ids.has(command.id)) issues.push(`duplicate id: ${command.id}`);
    ids.add(command.id);

    if (hrefs.has(command.href)) issues.push(`duplicate href: ${command.href}`);
    hrefs.add(command.href);

    if (!SAFE_LOCAL_HREF.test(command.href)) {
      issues.push(`unsafe href: ${command.id}`);
    }
    if (!command.label.trim() || !command.description.trim()) {
      issues.push(`missing copy: ${command.id}`);
    }
    if (
      !Number.isInteger(command.priority) ||
      command.priority < 0 ||
      command.priority > 999
    ) {
      issues.push(`invalid priority: ${command.id}`);
    }
  }

  return issues;
}

export function searchNexusCommands(
  query: string,
  limit = MAX_COMMAND_RESULTS,
  commands: readonly NexusCommand[] = NEXUS_COMMANDS,
): RankedNexusCommand[] {
  const boundedLimit = Math.max(
    1,
    Math.min(MAX_COMMAND_RESULTS, Math.trunc(limit) || MAX_COMMAND_RESULTS),
  );
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [...commands]
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          left.label.localeCompare(right.label),
      )
      .slice(0, boundedLimit)
      .map((command) => ({ command, score: 0 }));
  }

  const queryTokens = normalizedQuery.split(" ");
  const ranked: RankedNexusCommand[] = [];

  for (const command of commands) {
    const label = normalizeSearchText(command.label);
    const labelWords = label.split(" ");
    const searchable = normalizeSearchText(
      [
        command.label,
        command.description,
        command.group,
        ...command.keywords,
      ].join(" "),
    );

    let score = searchable.includes(normalizedQuery) ? 500 : 0;
    let matched = true;
    for (const token of queryTokens) {
      const tokenScore = scoreToken(token, label, labelWords, searchable);
      if (tokenScore === null) {
        matched = false;
        break;
      }
      score += tokenScore;
    }
    if (!matched) continue;

    ranked.push({
      command,
      score: score + Math.max(0, 100 - command.priority) / 100,
    });
  }

  return ranked
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.command.priority - right.command.priority ||
        left.command.label.localeCompare(right.command.label),
    )
    .slice(0, boundedLimit);
}
