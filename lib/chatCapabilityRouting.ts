// Centralized chat intent -> route mapping.
// This is shared by Home chat and HQ chat so capability routing stays consistent.

export type NexusRoute =
  | "/hq"
  | "/command"
  | "/resources"
  | "/labs/signals"
  | "/alpha"
  | "/labs/ops"
  | "/intel"
  | "/cyber"
  | "/recon"
  | "/labs/security"
  | "/internal/skills"
  | "/internal/vehicle"
  | "/internal/iot"
  | "/vault";

const KEYWORD_ROUTE_HINTS: Array<{ route: NexusRoute; keywords: string[] }> = [
  {
    route: "/command",
    keywords: [
      "provider health",
      "operator readiness",
      "switch operator",
      "run operator mode",
      "run the next local tranche",
      "/operator",
    ],
  },
  {
    route: "/resources",
    keywords: [
      "voice lab",
      "voice profile",
      "voice project",
      "audio briefing",
      "render as audio",
      "dictation",
      "microphone",
      "impact graph",
      "dependency graph",
      "blast radius",
      "ownership",
      "hotspots",
      "security scan",
      "architecture intelligence",
      "codeflow",
    ],
  },
  {
    route: "/cyber",
    keywords: [
      "cve",
      "vulnerability review",
      "vulnerability",
      "security review",
      "appsec",
      "threat intel",
      "otx",
      "security advisory",
      "threat feed",
      "malware",
      "threat hunt",
      "evidence pack",
      "incident triage",
      "drone compliance",
      "faa",
      "part 107",
      "laanc",
      "remote id",
      "airspace authorization",
      "municipal drone law",
      "/threat-hunt",
      "/evidence-pack",
    ],
  },
  {
    route: "/recon",
    keywords: [
      "github repo",
      "github dependency",
      "repo intel",
      "repo assimilation",
      "assimilate repo",
      "public repo",
      "reference repo",
      "oss competitor",
      "assess this dependency",
      "/assimilate-repo",
    ],
  },
  {
    route: "/labs/security",
    keywords: [
      "camera",
      "perimeter",
      "security posture",
      "alert timeline",
      "guards",
    ],
  },
  {
    route: "/alpha",
    keywords: [
      "price",
      "btc",
      "eth",
      "crypto",
      "market",
      "momentum",
      "buy signal",
      "watchlist",
      "sparklines",
    ],
  },
  {
    route: "/labs/signals",
    keywords: [
      "news",
      "headlines",
      "sentiment",
      "guardian",
      "gdelt",
      "articles",
      "trending",
    ],
  },
  {
    route: "/labs/ops",
    keywords: [
      "earthquake",
      "conflict",
      "world risk",
      "ops map",
      "fires",
      "flights",
      "maritime",
      "fx",
    ],
  },
  {
    route: "/intel",
    keywords: [
      "strategy",
      "vrio",
      "porter",
      "bcg",
      "jtbd",
      "polymarket",
      "sec filing",
      "framework",
      "deep research",
      "lit review",
      "literature review",
      "compare matrix",
      "research brief",
      "/deepresearch",
      "/lit-review",
      "/compare",
    ],
  },
  {
    route: "/internal/skills",
    keywords: [
      "lyra",
      "prompt optimizer",
      "prompt optimization",
      "optimize prompt",
      "optimize this prompt",
      "improve prompt",
      "improve my prompt",
      "rewrite prompt",
      "prompt forge",
      "human editor",
      "natural thought flow",
      "ai pattern breaker",
      "ban the fluff",
      "reader-first rewrite",
      "mega prompt",
      "humanize this",
      "rewrite this post",
      "rewrite this text",
      "skill",
      "learning",
      "knowledge graph",
      "system brain",
      "knowledge base",
    ],
  },
  {
    route: "/internal/vehicle",
    keywords: [
      "drone",
      "f450",
      "pixhawk",
      "ardupilot",
      "mavlink",
      "mission planner",
      "qgroundcontrol",
      "mavproxy",
      "pixhawk setup",
      "ardupilot onboarding",
      "vehicle",
      "telemetry",
      "telemetry bridge",
      "bridge stub",
      "bench checklist",
      "first hardware day",
      "flight session bundle",
      "props off",
      "rtl",
      "loiter",
      "failsafe",
      "sortie",
      "sensor fusion",
      "radar sweep",
      "camera array",
    ],
  },
  {
    route: "/internal/iot",
    keywords: [
      "iot",
      "mqtt",
      "device",
      "automation rule",
      "sensor dashboard",
      "weather timeline",
    ],
  },
  {
    route: "/vault",
    keywords: ["vault", "saved article", "bookmark", "export"],
  },
];

const TOOL_TO_ROUTE: Record<string, NexusRoute | null> = {
  web_search: "/labs/signals",
  fetch_url: "/labs/signals",
  calculate: "/alpha",
  remember: "/internal/skills",
  recall: "/internal/skills",
  write_file: "/vault",
  read_file: "/vault",
  list_files: "/vault",
  read_project_file: "/internal/skills",
  list_project_files: "/internal/skills",
  list_design_skills: "/internal/skills",
  resolve_design_skill: "/internal/skills",
  patch_project_file: "/internal/skills",
  create_project_file: "/internal/skills",
  propose_project_edit: "/internal/skills",
  ask_max: "/hq",
  delegate_specialist: "/hq",
  navigate_to: "/hq",
  read_current_tab: "/hq",
  click_element: "/hq",
  type_text: "/hq",
  analyze_repo: "/recon",
  assimilate_repo: "/recon",
  compare_repos: "/recon",
};

export function detectRouteFromPrompt(prompt: string): NexusRoute | null {
  const lower = prompt.toLowerCase();
  let best: { route: NexusRoute; score: number; specificity: number } | null =
    null;

  for (const item of KEYWORD_ROUTE_HINTS) {
    const matchedKeywords = item.keywords.filter((keyword) =>
      lower.includes(keyword),
    );
    const score = matchedKeywords.length;
    const specificity = matchedKeywords.reduce(
      (max, keyword) => Math.max(max, keyword.length),
      0,
    );
    if (score <= 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && specificity > best.specificity)
    ) {
      best = { route: item.route, score, specificity };
    }
  }

  return best?.route ?? null;
}

export function detectRouteFromTool(toolName?: string): NexusRoute | null {
  if (!toolName) return null;
  return TOOL_TO_ROUTE[toolName] ?? null;
}
