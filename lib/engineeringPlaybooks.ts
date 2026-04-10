// ── lib/engineeringPlaybooks ───────────────────────────────────────────────
// Reusable engineering workflow cards for the PlaybooksConsole.
// Each playbook provides: start route, core steps, blast radius,
// verification checklist, and jump-off sessions.

import type { ActionSessionItem } from "@/components/ui/ActionSessionCluster";

// ── Types ──────────────────────────────────────────────────────────────────
export interface EngineeringPlaybook {
  id: string;
  title: string;
  objective: string;
  whenToUse: string;
  startSurface: string;
  steps: string[];
  verification: string[];
  followOnActions: ActionSessionItem[];
}

// ── Playbooks ──────────────────────────────────────────────────────────────
export const ENGINEERING_PLAYBOOKS: EngineeringPlaybook[] = [
  {
    id: "second-brain-heartbeat",
    title: "Second Brain Heartbeat",
    objective:
      "Run a structured second-brain upkeep and export pass — tag audit, mode selection, and fresh export bundle — to keep the Obsidian vault current.",
    whenToUse: "Weekly review or any time new compiled pages have accumulated in the vault",
    startSurface: "Vault → Export panel",
    steps: [
      "Open Vault and review the Stewardship panel for orphans and untagged articles",
      "Check Compiled Pages for any new pages without domain tags",
      "Open the Export section and select the appropriate mode (full, compiled, clips, or heartbeat)",
      "Run the export and download all generated markdown files",
      "Import the files into your Obsidian vault using the Maps folder as the navigation anchor",
      "Verify that the heartbeat note and manifest note landed correctly",
      "Open the heartbeat note and confirm domain counts match expectations",
    ],
    verification: [
      "Heartbeat note (01 Second Brain Heartbeat.md) is present in every export",
      "Export Manifest (04 Export Manifest.md) lists correct domain and source counts",
      "MOC notes exist for every domain in Maps/Domain — *.md",
      "No Obsidian-illegal characters appear in any file path",
      "Individual note files include YAML frontmatter with title, source, date, tags",
    ],
    followOnActions: [
      {
        href: "/vault?focus=vault-export-second-brain",
        label: "Open export session",
        detail:
          "Go directly to the scoped second-brain export — choose full, compiled, clips, or heartbeat pack to match the current upkeep goal.",
      },
      {
        href: "/vault?focus=vault-stewardship",
        label: "Open stewardship",
        detail: "Review orphans and tag coverage before exporting to keep the pack clean.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "View compiled pages",
        detail: "Check compiled pages for newly accumulated artifacts before running the pack.",
      },
    ],
  },
  {
    id: "feature-ship",
    title: "Feature Ship",
    objective:
      "Move a finished feature from dev branch to merged commit cleanly — spec checked, tsc green, verify passing, handoff updated.",
    whenToUse: "Any time a feature is dev-complete and needs a final quality pass before commit",
    startSurface: "Resources → Playbooks",
    steps: [
      "Confirm the spec in specs/features/ is present and acceptance criteria are met",
      "Run npx tsc --noEmit — fix all errors before continuing",
      "Run npm run verify — fix lint and path safety failures",
      "Read the patched files one more time to check for regressions",
      "Update tasks/todo.md to mark tasks complete",
      "Run npm run handoff:write to refresh the agent handoff document",
      "Commit with a descriptive message referencing the task IDs",
    ],
    verification: [
      "npx tsc --noEmit exits with code 0",
      "npm run verify exits with code 0",
      "git status shows only intended files staged",
      "Commit message references the spec or task IDs",
      "Handoff document is current (npm run handoff:write ran after last code change)",
    ],
    followOnActions: [
      {
        href: "/home",
        label: "Open HQ",
        detail: "Final smoke test of the feature in the running app before commit.",
      },
      {
        href: "/resources?view=specs",
        label: "Open specs",
        detail: "Verify the spec is complete and acceptance criteria are checked off.",
      },
    ],
  },
  {
    id: "api-wire",
    title: "API Wire",
    objective:
      "Wire a new external data source end-to-end — route handler, store slice, and UI panel — with correct error handling and no key leakage.",
    whenToUse: "Adding any new external API, new API key, or new server-side data route",
    startSurface: "Resources → Playbooks",
    steps: [
      "Add the key to .env.local (never to source) and to DEFAULT_CFG / settings store",
      "Create the app/api/ route handler with try/catch and typed response shape",
      "Wire the fetch call from the component using apiFetch, not fetch directly",
      "Add the store slice for the new data with a sensible default",
      "Build the UI panel with a loading state and silent error fallback",
      "Run npx tsc --noEmit and fix all errors",
      "Run npm run verify and confirm lint and path safety pass",
    ],
    verification: [
      "API key is not present in any committed file",
      "Route handler returns a typed success shape and a typed error shape",
      "No console.log statements include the key, request headers, or response body with secrets",
      "Component shows a graceful fallback on API failure — no uncaught exceptions",
      "npx tsc --noEmit and npm run verify both pass",
    ],
    followOnActions: [
      {
        href: "/command",
        label: "Open Command",
        detail: "Check the new data source appears in the dashboard overview.",
      },
      {
        href: "/resources?view=specs&spec=api-integration",
        label: "Open API spec",
        detail: "Review the API integration spec to confirm all acceptance criteria are met.",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function getEngineeringPlaybook(id: string): EngineeringPlaybook {
  return ENGINEERING_PLAYBOOKS.find((p) => p.id === id) ?? ENGINEERING_PLAYBOOKS[0];
}

export function buildEngineeringPlaybookBrief(playbook: EngineeringPlaybook): string {
  const lines = [
    `# Playbook: ${playbook.title}`,
    ``,
    `**Objective:** ${playbook.objective}`,
    `**When to use:** ${playbook.whenToUse}`,
    `**Start surface:** ${playbook.startSurface}`,
    ``,
    `## Core steps`,
    ``,
    ...playbook.steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `## Verification checklist`,
    ``,
    ...playbook.verification.map((v) => `- [ ] ${v}`),
    ``,
    `## Jump-offs`,
    ``,
    ...playbook.followOnActions.map((a) => `- [${a.label}](${a.href}) — ${a.detail}`),
    ``,
  ];
  return lines.join("\n");
}
