// ── lib/specDrivenDevelopment ──────────────────────────────────────────────
// Spec-first working lane templates for the SpecDrivenConsole.
// Each template walks through problem → non-goals → constraints →
// acceptance criteria → verification before any implementation starts.

import type { ActionSessionItem } from "@/components/ui/ActionSessionCluster";
import {
  DEFAULT_SPEC_TEMPLATE_ID,
  resolveSpecTemplateId,
} from "@/lib/resourceSessionRegistry";

// ── Types ──────────────────────────────────────────────────────────────────
export interface SpecSection {
  title: string;
  prompt: string;
}

export interface SpecScopeSignals {
  primaryKeywords: string[];
  driftKeywords: string[];
  driftHint: string;
}

export interface SpecDrivenTemplate {
  id: string;
  title: string;
  objective: string;
  bestFor: string;
  primarySystemId: string;
  impactSeedFile: string;
  specSections: SpecSection[];
  antiPatterns: string[];
  verification: string[];
  followOnActions: ActionSessionItem[];
  scopeSignals?: SpecScopeSignals;
}

// ── Templates ──────────────────────────────────────────────────────────────
export const SPEC_DRIVEN_TEMPLATES: SpecDrivenTemplate[] = [
  {
    id: "second-brain-system",
    title: "Second Brain System",
    objective:
      "Define the export modes, note structure, and MOC design for the Obsidian-ready second-brain pack before any export code is written.",
    bestFor: "Cross-surface knowledge export with multiple output modes",
    primarySystemId: "vault",
    impactSeedFile: "lib/secondBrainExport.ts",
    specSections: [
      {
        title: "Problem",
        prompt:
          "What is broken or missing in the current vault export? Which users and workflows are blocked?",
      },
      {
        title: "Non-goals",
        prompt:
          "What is explicitly out of scope — e.g. real-time sync, cloud storage, or non-Obsidian targets?",
      },
      {
        title: "Constraints",
        prompt:
          "What technical constraints apply — no zip library, localStorage only, browser-only bundle, no server calls?",
      },
      {
        title: "Acceptance criteria",
        prompt:
          "What must be true for this to ship? List the modes (full, compiled, clips, heartbeat), required nav notes, and MOC structure.",
      },
      {
        title: "Verification",
        prompt:
          "How will you verify correctness — tsc passing, manual export test, Obsidian import check, note count assertions?",
      },
    ],
    antiPatterns: [
      "Adding zip compression before the basic file-per-note flow works end-to-end",
      "Mixing compiled-page API data with saved-article data in the same export pass without a clear seam",
      "Skipping the heartbeat note — it is the only file present in every mode",
      "Building MOC links with raw titles that contain Obsidian-illegal characters",
    ],
    verification: [
      "npx tsc --noEmit passes with zero errors",
      "All four modes produce the correct set of files (heartbeat: 3 nav + MOCs only)",
      "safeName() strips illegal chars from all file paths",
      "Index note links to heartbeat, manifest, and Maps folder",
      "Export session link in heartbeat resolves to /vault?focus=vault-export-second-brain",
    ],
    scopeSignals: {
      primaryKeywords: [
        "second brain",
        "obsidian",
        "heartbeat",
        "map of content",
        "moc",
        "export",
        "vault",
        "compiled page",
      ],
      driftKeywords: [
        "api route",
        "connector",
        "auth",
        "middleware",
        "reverse engineering",
        "binary",
        "ghidra",
      ],
      driftHint:
        "This request is mixing second-brain/export work with boundary or reverse-engineering concerns. Keep the current spec scoped to archive/export behavior and split the other concern into a follow-up session.",
    },
    followOnActions: [
      {
        href: "/vault?focus=vault-export-second-brain",
        label: "Open export session",
        detail:
          "Jump directly to the scoped second-brain export — choose full, compiled, clips, or heartbeat pack.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "View compiled pages",
        detail:
          "Review compiled memory pages before deciding which export mode fits best.",
      },
    ],
  },
  {
    id: "reverse-engineering-memory",
    title: "Reverse-Engineering Memory",
    objective:
      "Define how binary triage turns into durable archive memory, analyst briefs, and second-brain export before expanding reverse-engineering features.",
    bestFor:
      "RECON binary triage, reverse-engineering notes, and RE-to-VAULT continuity",
    primarySystemId: "vault",
    impactSeedFile: "lib/binaryTriage.ts",
    specSections: [
      {
        title: "Problem",
        prompt:
          "What reverse-engineering signal is currently getting lost between RECON, VAULT, and the second brain?",
      },
      {
        title: "Non-goals",
        prompt:
          "What is explicitly out of scope — e.g. full disassembler integration, cloud sample upload, or live malware execution?",
      },
      {
        title: "Artifact contract",
        prompt:
          "What must every durable reverse-engineering note or brief contain so it can be reopened, filtered, exported, and promoted safely?",
      },
      {
        title: "Acceptance criteria",
        prompt:
          "Which RECON, VAULT, stewardship, and export behaviors must be true for this work to count as complete?",
      },
      {
        title: "Verification",
        prompt:
          "How will you prove the loop works end-to-end — route checks, exported note inspection, and maintenance-lane validation?",
      },
    ],
    antiPatterns: [
      "Treating binary triage as a one-off panel result instead of a durable artifact.",
      "Mixing reverse-engineering prep notes with generic compiled pages without tags or distinct treatment.",
      "Adding analyst-brief promotion without duplicate-safe reopening rules.",
      "Expanding into cloud sample workflows before the local RE memory loop is reliable.",
    ],
    verification: [
      "RECON can file triage into VAULT without losing route or tag continuity.",
      "VAULT has a distinct reverse-engineering maintenance or repair lane.",
      "Strong prep notes can promote into briefs without duplicate drift.",
      "Second-brain export includes reverse-engineering indexes or heartbeat coverage.",
    ],
    scopeSignals: {
      primaryKeywords: [
        "reverse engineering",
        "binary",
        "ghidra",
        "strings",
        "entropy",
        "ioc",
        "sample",
        "malware",
        "triage",
      ],
      driftKeywords: [
        "api route",
        "auth",
        "middleware",
        "connector",
        "deployment",
        "release",
      ],
      driftHint:
        "This request is widening beyond reverse-engineering continuity into broader platform or boundary work. Keep the RE memory spec focused on triage, briefs, and archive continuity, then spin the platform concern into its own spec.",
    },
    followOnActions: [
      {
        href: "/recon?view=binary&focus=recon-binary",
        label: "Open binary triage",
        detail: "Start from the live reverse-engineering intake surface.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
        label: "Open RE maintenance",
        detail:
          "Check durable reverse-engineering artifacts where archive repair actually happens.",
      },
    ],
  },
  {
    id: "feature-build",
    title: "Feature Build",
    objective:
      "Define scope, data shape, and acceptance criteria for a new Nexus feature before touching any component or store slice.",
    bestFor: "New tab panels, new store slices, or new API routes",
    primarySystemId: "home",
    impactSeedFile: "store/useStore.ts",
    specSections: [
      {
        title: "Problem",
        prompt: "What user need or data gap does this feature address?",
      },
      {
        title: "Non-goals",
        prompt:
          "What related features are explicitly deferred to a later iteration?",
      },
      {
        title: "Data shape",
        prompt: "What types, store slices, and API routes are needed?",
      },
      {
        title: "Acceptance criteria",
        prompt:
          "What must be true — component renders, store updates, tsc passes, no regressions?",
      },
      {
        title: "Verification",
        prompt:
          "How will you prove correctness — manual test, tsc, lint, screenshot?",
      },
    ],
    antiPatterns: [
      "Copying state into local component state when it already lives in the Zustand store",
      "Calling provider APIs directly instead of routing through lib/ai.ts or app/api/",
      "Adding a new tab without updating docs/PROJECT_BIBLE.md surface map",
      "Skipping try/catch on all async fetch calls",
    ],
    verification: [
      "npx tsc --noEmit passes",
      "npm run verify passes (type-check + lint + path safety)",
      "Component renders without console errors on first load",
      "Store slice initialises to correct default values",
    ],
    scopeSignals: {
      primaryKeywords: [
        "feature",
        "component",
        "panel",
        "route",
        "view",
        "store",
        "hook",
        "ui",
      ],
      driftKeywords: [
        "second brain",
        "obsidian",
        "reverse engineering",
        "binary",
        "ghidra",
        "secret",
        "api key",
      ],
      driftHint:
        "This feature request is starting to mix normal build work with a more specialized archive, RE, or boundary concern. Keep the feature spec focused on the primary UX/runtime change and split the specialist concern into a narrower spec.",
    },
    followOnActions: [
      {
        href: "/home",
        label: "Open HQ",
        detail: "Test the feature end-to-end in the running app.",
      },
      {
        href: "/resources?view=playbooks",
        label: "View playbooks",
        detail: "Pick a ship playbook to guide the feature through to commit.",
      },
    ],
  },
  {
    id: "api-integration",
    title: "API Integration",
    objective:
      "Define the key contract, error surface, and fallback behaviour for a new external data source before writing fetch code.",
    bestFor: "New external APIs, new API keys, or new server-side routes",
    primarySystemId: "api",
    impactSeedFile: "lib/apiFetch.ts",
    specSections: [
      {
        title: "Problem",
        prompt:
          "What data gap does this API fill? Which tab or panel consumes it?",
      },
      {
        title: "Non-goals",
        prompt: "What response fields are explicitly ignored in v1?",
      },
      {
        title: "Error surface",
        prompt:
          "What failure modes exist — rate limit, auth, CORS, empty response? How is each handled?",
      },
      {
        title: "Acceptance criteria",
        prompt: "What must the API route return on success and on failure?",
      },
      {
        title: "Verification",
        prompt: "How will you test — curl, browser network tab, tsc, lint?",
      },
    ],
    antiPatterns: [
      "Calling the external API directly from a client component — always proxy through app/api/",
      "Logging the API key or request body that may contain secrets",
      "Returning stack traces or internal paths in the API response",
      "Skipping try/catch around the fetch call in the route handler",
    ],
    verification: [
      "API key stored in .env.local — never in source",
      "Route handler returns a typed response on success and an error shape on failure",
      "npx tsc --noEmit passes",
      "npm audit shows no new high/critical vulnerabilities from any added packages",
    ],
    scopeSignals: {
      primaryKeywords: [
        "api",
        "route",
        "endpoint",
        "fetch",
        "connector",
        "provider",
        "secret",
        "integration",
      ],
      driftKeywords: [
        "second brain",
        "obsidian",
        "reverse engineering",
        "binary",
        "ghidra",
        "map of content",
      ],
      driftHint:
        "This API spec is starting to absorb archive or reverse-engineering behavior. Keep the connector contract and fallback behavior scoped here, then attach the archive or RE work as a separate spec-driven follow-up.",
    },
    followOnActions: [
      {
        href: "/command",
        label: "Open Command",
        detail: "Verify the new data appears in the dashboard KPI strip.",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function getSpecDrivenTemplate(id: string): SpecDrivenTemplate {
  const resolvedId = resolveSpecTemplateId(id) ?? DEFAULT_SPEC_TEMPLATE_ID;
  return (
    SPEC_DRIVEN_TEMPLATES.find((t) => t.id === resolvedId) ??
    SPEC_DRIVEN_TEMPLATES[0]
  );
}

export function buildSpecDrivenBrief(template: SpecDrivenTemplate): string {
  const lines = [
    `# Spec: ${template.title}`,
    ``,
    `**Objective:** ${template.objective}`,
    `**Best for:** ${template.bestFor}`,
    `**Primary system:** ${template.primarySystemId}`,
    `**Impact seed file:** ${template.impactSeedFile}`,
    ``,
    `## Spec sections`,
    ``,
    ...template.specSections.flatMap((s) => [
      `### ${s.title}`,
      ``,
      `> ${s.prompt}`,
      ``,
      `[Write your answer here]`,
      ``,
    ]),
    `## Anti-patterns to avoid`,
    ``,
    ...template.antiPatterns.map((p) => `- ${p}`),
    ``,
    `## Verification checklist`,
    ``,
    ...template.verification.map((v) => `- [ ] ${v}`),
    ``,
  ];
  return lines.join("\n");
}

export function detectSpecScopeDrift(
  template: SpecDrivenTemplate | null | undefined,
  input: string,
) {
  const signals = template?.scopeSignals;
  if (!signals) return null;

  const normalized = input.toLowerCase();
  const hasPrimarySignal = signals.primaryKeywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
  const driftMatches = signals.driftKeywords.filter((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );

  if (!hasPrimarySignal || driftMatches.length === 0) {
    return null;
  }

  return {
    title: "Scope drift watch",
    detail: signals.driftHint,
    matchedSignals: driftMatches.slice(0, 3),
  };
}
