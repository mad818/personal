// ── lib/sessionFinder ──────────────────────────────────────────────────────
// Session registry + fuzzy search for the SessionFinderConsole.
// Covers all Nexus routes and exact focus panels.

import {
  isExactSessionHref,
  getSessionTargetLabel,
} from "@/lib/exactSessionLinks";

const MEMORY_KEY = "nexus-session-finder-memory";
const MEMORY_MAX = 24;

// ── Types ──────────────────────────────────────────────────────────────────
export interface SessionFinderMemoryEntry {
  href: string;
  title: string;
  openedAt: number;
  count: number;
}

interface SessionRegistryEntry {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: string;
  tags: string[];
  workingContext?: {
    href: string;
    label: string;
    detail: string;
  };
}

export interface SessionFinderEntry extends SessionRegistryEntry {
  exact: boolean;
  targetLabel: string;
  source: string;
  workingTargetLabel: string;
  score: number;
}

// ── Registry ───────────────────────────────────────────────────────────────
const SESSION_REGISTRY: SessionRegistryEntry[] = [
  // ── Vault exact panels ────────────────────────────────────────────────
  {
    id: "finder-vault-export-second-brain",
    title: "Second Brain Export",
    detail:
      "Scoped second-brain export — choose full, compiled, clips, or heartbeat pack.",
    href: "/vault?focus=vault-export-second-brain",
    kind: "exact-panel",
    tags: [
      "second brain",
      "obsidian",
      "vault",
      "export",
      "markdown",
      "knowledge pack",
      "compiled pages",
      "saved clips",
      "heartbeat",
    ],
    workingContext: {
      href: "/resources?view=specs&spec=second-brain-system",
      label: "Open second-brain spec",
      detail: "Review the spec for the second-brain system before exporting.",
    },
  },
  {
    id: "finder-vault-memory-spine",
    title: "Vault Memory Spine",
    detail: "Memory spine posture, search readiness, and durable archive flow.",
    href: "/vault?focus=vault-memory-spine",
    kind: "exact-panel",
    tags: ["vault", "memory", "archive", "spine", "posture"],
  },
  {
    id: "finder-vault-stewardship",
    title: "Vault Stewardship",
    detail:
      "Orphans, stale context, tag coverage, and route continuity for the archive.",
    href: "/vault?focus=vault-stewardship",
    kind: "exact-panel",
    tags: ["vault", "stewardship", "orphans", "tags", "archive", "repair"],
  },
  {
    id: "finder-vault-compiled-pages",
    title: "Vault Compiled Pages",
    detail: "Durable artifacts, continuation chips, and archive provenance.",
    href: "/vault?focus=vault-compiled-pages",
    kind: "exact-panel",
    tags: ["vault", "compiled", "pages", "memory", "artifacts"],
  },
  {
    id: "finder-vault-graph-focus",
    title: "Vault Graph Focus",
    detail: "Topology, linked context, and graph-driven archive exploration.",
    href: "/vault?focus=vault-graph-focus",
    kind: "exact-panel",
    tags: ["vault", "graph", "topology", "nodes", "clusters"],
  },

  // ── Resources exact panels ────────────────────────────────────────────
  {
    id: "finder-resources-second-brain-spec",
    title: "Second Brain Spec",
    detail: "Spec-driven working lane for the second-brain knowledge system.",
    href: "/resources?view=specs&spec=second-brain-system",
    kind: "exact-panel",
    tags: ["spec", "second brain", "obsidian", "knowledge", "export"],
  },
  {
    id: "finder-resources-second-brain-playbook",
    title: "Second Brain Heartbeat Playbook",
    detail: "Reusable playbook for second-brain upkeep and export runs.",
    href: "/resources?view=playbooks&playbook=second-brain-heartbeat",
    kind: "exact-panel",
    tags: ["playbook", "second brain", "heartbeat", "export", "upkeep"],
  },
  // ── Broad routes ──────────────────────────────────────────────────────
  {
    id: "finder-route-home",
    title: "HQ",
    detail: "Agent Office, live intel, and orchestration hub.",
    href: "/home",
    kind: "route",
    tags: ["home", "hq", "agents", "office", "chat", "dispatch"],
  },
  {
    id: "finder-route-command",
    title: "Command",
    detail: "KPI cards, briefings, threat heatmap, and world event map.",
    href: "/command",
    kind: "route",
    tags: ["command", "kpi", "briefing", "overview", "dashboard"],
  },
  {
    id: "finder-route-intel",
    title: "Intel",
    detail:
      "Flight tracker, Polymarket odds, SEC filings, and strategy frameworks.",
    href: "/intel",
    kind: "route",
    tags: ["intel", "flights", "polymarket", "sec", "strategy"],
  },
  {
    id: "finder-route-alpha",
    title: "Alpha",
    detail: "Momentum scanner, price grid, and buy signals.",
    href: "/alpha",
    kind: "route",
    tags: ["alpha", "momentum", "scanner", "prices", "crypto", "markets"],
  },
  {
    id: "finder-route-cyber",
    title: "Cyber",
    detail: "CVE feed, threat intel, CISA advisories, and triage view.",
    href: "/cyber",
    kind: "route",
    tags: ["cyber", "cve", "threat", "security", "cisa", "triage"],
  },
  {
    id: "finder-route-recon",
    title: "Recon",
    detail: "Headers audit, passive DNS, OSINT lookups, and OPSEC panel.",
    href: "/recon",
    kind: "route",
    tags: ["recon", "osint", "dns", "headers", "opsec", "lookup"],
  },
  {
    id: "finder-route-vault",
    title: "Vault",
    detail: "Archive, search, memory graph, and export surfaces.",
    href: "/vault",
    kind: "route",
    tags: ["vault", "archive", "saved", "memory", "export", "search"],
  },
  {
    id: "finder-route-resources",
    title: "Resources",
    detail:
      "Developer field manual, specs, playbooks, system design, and session finder.",
    href: "/resources",
    kind: "route",
    tags: ["resources", "docs", "manual", "specs", "playbooks", "systems"],
  },
  {
    id: "finder-route-skills",
    title: "Skills",
    detail: "Knowledge graph, skill library, and workflow forge.",
    href: "/skills",
    kind: "route",
    tags: ["skills", "knowledge", "graph", "library", "workflows"],
  },
];

// ── Scoring ────────────────────────────────────────────────────────────────
function scoreEntry(entry: SessionRegistryEntry, query: string): number {
  if (!query.trim()) return 50;
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();
  const detail = entry.detail.toLowerCase();
  const tags = entry.tags.join(" ").toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (title.includes(q)) return 80;
  if (detail.includes(q)) return 65;
  if (tags.includes(q)) return 55;

  // Token-level match
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits = tokens.filter(
    (t) => title.includes(t) || detail.includes(t) || tags.includes(t),
  ).length;
  if (hits > 0) return 30 + (hits / tokens.length) * 25;
  return 0;
}

// ── Public API ─────────────────────────────────────────────────────────────
export function buildSessionFinderResults(
  query: string,
  memory: SessionFinderMemoryEntry[],
): SessionFinderEntry[] {
  const scored = SESSION_REGISTRY.map((entry): SessionFinderEntry => {
    const exact = isExactSessionHref(entry.href);
    const targetLabel = getSessionTargetLabel(entry.href);
    const workingTargetLabel = entry.workingContext
      ? getSessionTargetLabel(entry.workingContext.href)
      : "";
    const memoryEntry = memory.find((m) => m.href === entry.href);
    const baseScore = scoreEntry(entry, query);
    const recencyBoost = memoryEntry ? Math.min(10, memoryEntry.count * 2) : 0;
    const exactBoost = exact ? 8 : 0;
    return {
      ...entry,
      exact,
      targetLabel,
      source: memoryEntry ? "memory" : "registry",
      workingTargetLabel,
      score: baseScore + recencyBoost + exactBoost,
    };
  });

  return scored.filter((e) => e.score > 0).sort((a, b) => b.score - a.score);
}

export function readSessionFinderMemory(): SessionFinderMemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionFinderMemoryEntry[];
  } catch {
    return [];
  }
}

export function recordSessionFinderOpen(href: string): void {
  if (typeof window === "undefined") return;
  try {
    const memory = readSessionFinderMemory();
    const existing = memory.find((m) => m.href === href);
    const entry = SESSION_REGISTRY.find((e) => e.href === href);
    if (existing) {
      existing.openedAt = Date.now();
      existing.count += 1;
    } else {
      memory.unshift({
        href,
        title: entry?.title ?? href,
        openedAt: Date.now(),
        count: 1,
      });
    }
    const trimmed = memory.slice(0, MEMORY_MAX);
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
  } catch {
    // silent
  }
}
