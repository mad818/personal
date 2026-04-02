// Centralized chat intent -> route mapping.
// This is shared by Home chat and HQ chat so capability routing stays consistent.

export type NexusRoute =
  | "/hq"
  | "/labs/signals"
  | "/alpha"
  | "/labs/ops"
  | "/intel"
  | "/cyber"
  | "/labs/security"
  | "/internal/skills"
  | "/internal/vehicle"
  | "/internal/iot"
  | "/vault";

const KEYWORD_ROUTE_HINTS: Array<{ route: NexusRoute; keywords: string[] }> = [
  {
    route: "/cyber",
    keywords: [
      "cve",
      "vulnerability",
      "threat intel",
      "otx",
      "security advisory",
      "threat feed",
      "malware",
    ],
  },
  {
    route: "/labs/security",
    keywords: [
      "camera",
      "drone",
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
    ],
  },
  {
    route: "/internal/skills",
    keywords: [
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
      "vehicle",
      "telemetry",
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
  patch_project_file: "/internal/skills",
  create_project_file: "/internal/skills",
  propose_project_edit: "/internal/skills",
  ask_max: "/hq",
  navigate_to: "/hq",
  read_current_tab: "/hq",
  click_element: "/hq",
  type_text: "/hq",
};

export function detectRouteFromPrompt(prompt: string): NexusRoute | null {
  const lower = prompt.toLowerCase();
  let best: { route: NexusRoute; score: number } | null = null;

  for (const item of KEYWORD_ROUTE_HINTS) {
    const score = item.keywords.reduce(
      (acc, k) => (lower.includes(k) ? acc + 1 : acc),
      0,
    );
    if (score <= 0) continue;
    if (!best || score > best.score) best = { route: item.route, score };
  }

  return best?.route ?? null;
}

export function detectRouteFromTool(toolName?: string): NexusRoute | null {
  if (!toolName) return null;
  return TOOL_TO_ROUTE[toolName] ?? null;
}
