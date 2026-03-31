// Centralized chat intent -> route mapping.
// This is shared by Home chat and HQ chat so capability routing stays consistent.

export type NexusRoute =
  | "/home"
  | "/signals"
  | "/alpha"
  | "/ops"
  | "/intel"
  | "/cyber"
  | "/security"
  | "/skills"
  | "/vehicle"
  | "/iot"
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
    route: "/security",
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
    route: "/signals",
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
    route: "/ops",
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
    route: "/skills",
    keywords: [
      "skill",
      "learning",
      "knowledge graph",
      "system brain",
      "knowledge base",
    ],
  },
  {
    route: "/vehicle",
    keywords: [
      "vehicle",
      "telemetry",
      "sensor fusion",
      "radar sweep",
      "camera array",
    ],
  },
  {
    route: "/iot",
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
  web_search: "/signals",
  fetch_url: "/signals",
  calculate: "/alpha",
  remember: "/skills",
  recall: "/skills",
  write_file: "/vault",
  read_file: "/vault",
  list_files: "/vault",
  read_project_file: "/skills",
  list_project_files: "/skills",
  patch_project_file: "/skills",
  create_project_file: "/skills",
  propose_project_edit: "/skills",
  ask_max: "/home",
  navigate_to: "/home",
  read_current_tab: "/home",
  click_element: "/home",
  type_text: "/home",
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
