// ── lib/engineeringPlaybooks ───────────────────────────────────────────────
// Reusable engineering workflow cards for the PlaybooksConsole.
// Each playbook provides: start route, core steps, blast radius,
// verification checklist, and jump-off sessions.

import type { ActionSessionItem } from "@/components/ui/ActionSessionCluster";
import {
  DEFAULT_ENGINEERING_PLAYBOOK_ID,
  resolveEngineeringPlaybookId,
} from "@/lib/resourceSessionRegistry";

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
    id: "safe-refactor",
    title: "Safe Refactor",
    objective:
      "Break apart a high-risk Nexus surface without changing behavior by anchoring ownership, blast radius, and verification before every extraction.",
    whenToUse:
      "Large files, overloaded route shells, or UI orchestration paths that are becoming fragile to edit",
    startSurface: "Resources → Playbooks",
    steps: [
      "Open the matching system map and read first files before touching the implementation.",
      "Seed Impact with the primary file so importer and dependent surfaces stay visible.",
      "Extract pure helpers, stable subviews, or exact-session routing first before moving behavior.",
      "Keep layout, routing, and behavior changes separate so regressions are attributable.",
      "Run route-focused smoke checks after each extraction instead of waiting for a large final diff.",
      "Refresh handoff context once the refactor changes the working surface materially.",
    ],
    verification: [
      "Focused route still lands on the correct exact panel after the refactor.",
      "No mission-handoff or playbook links were widened back to generic route tops.",
      "Type-check and verify remain green after each extraction batch.",
      "The target file is materially smaller or thinner than when the refactor started.",
    ],
    followOnActions: [
      {
        href: "/resources?view=system&system=hq-mission-flow",
        label: "Open HQ system map",
        detail: "Start from ownership and failure modes before widening shell edits.",
      },
      {
        href: "/resources?view=impact&file=components/home/office/OfficeCommandCenter.tsx",
        label: "Seed Impact for HQ shell",
        detail: "See likely touched files before extracting more HQ orchestration.",
      },
      {
        href: "/hq?focus=hq-console-shell",
        label: "Open HQ console shell",
        detail: "Validate the live shell and composer after every extraction step.",
      },
    ],
  },
  {
    id: "security-boundary-audit",
    title: "Security Boundary Audit",
    objective:
      "Audit browser-to-server seams, protected routes, secret handling, and degraded behavior before changing connectors or external integrations.",
    whenToUse:
      "Any connector, BYOK setting, auth-sensitive route, or protected browser/server flow change",
    startSurface: "Resources → Playbooks",
    steps: [
      "Identify the exact route and UI surface that cross a trust boundary.",
      "Confirm the request stays behind protected local routes and shared auth wrappers.",
      "Verify secrets never persist in client storage or leak into broad browser state.",
      "Check degraded and unavailable paths so failure is not misread as a clean negative.",
      "Audit stale-link and exact-session behavior if the change touches auth or routing.",
      "Re-test the affected route from the real UI, not only from unit-level helpers.",
    ],
    verification: [
      "No direct third-party browser fetches remain in the touched surface.",
      "Secrets stay server-owned or explicitly session-only.",
      "Protected routes are still registered in route policy and covered by regression checks.",
      "Unavailable or blocked states render as degraded, not authoritative success/clean results.",
    ],
    followOnActions: [
      {
        href: "/recon?view=opsec&focus=recon-opsec",
        label: "Open RECON OPSEC",
        detail: "Validate degraded connector posture and operator-facing trust cues.",
      },
      {
        href: "/resources?view=impact&file=lib/security/routePolicy.ts",
        label: "Seed Impact for route policy",
        detail: "Check what else is affected before changing boundary rules.",
      },
      {
        href: "/security?view=ai&focus=security-ai-surface",
        label: "Open AI surface audit",
        detail: "Review related AI/runtime trust posture if the boundary touches provider flows.",
      },
    ],
  },
  {
    id: "hallucination-hardening",
    title: "Hallucination Hardening Audit",
    objective:
      "Make high-risk AI answers visibly truthful by tightening retrieval, evidence posture, and verification cues before widening prompts or autonomous behavior.",
    whenToUse:
      "Compact AI panels, strategy summaries, HQ chronicle behaviors, or any answer surface that can sound more certain than its evidence",
    startSurface: "Resources → Playbooks",
    steps: [
      "Identify whether the surface is prompt-only, tool-backed, or live-context backed.",
      "Separate observed facts from inferred reasoning and verify-next checks in the rendered answer.",
      "Remove any fabricated tool, web, file, or live-state claims from the final answer surface.",
      "Add or reuse shared evidence rendering instead of inventing one-off posture UI.",
      "Confirm the answer style matches a real assistant for simple questions and verified retrieval for live/current questions.",
      "Audit the surface again from Security so truth posture is tracked, not assumed.",
    ],
    verification: [
      "The UI visibly distinguishes observed, inferred, and verify-next content.",
      "The model cannot imply searches, tool results, or file reads it never actually performed.",
      "Simple operator chat feels conversational instead of like an audit console.",
      "Current/live questions escalate into verified retrieval instead of stale memory summaries.",
    ],
    followOnActions: [
      {
        href: "/security?view=ai&focus=security-ai-surface",
        label: "Open AI surface audit",
        detail: "Track which answer surfaces are still boundary-only versus visibly hardened.",
      },
      {
        href: "/resources?view=system&system=ai-runtime-boundary",
        label: "Open AI runtime map",
        detail: "Review provider, prompt, and retrieval ownership before changing answer behavior.",
      },
      {
        href: "/command?focus=runtime-efficiency",
        label: "Open runtime efficiency",
        detail: "Watch provider and prompt posture while tightening AI behavior.",
      },
    ],
  },
  {
    id: "spec-driven-development",
    title: "Spec-Driven Development",
    objective:
      "Anchor risky work in a written spec before code so AI, humans, and verification all target the same acceptance criteria.",
    whenToUse:
      "Multi-step features, risky refactors, boundary changes, second-brain work, or any change that should not drift into vibe coding",
    startSurface: "Resources → Specs",
    steps: [
      "Choose the closest starter and write the problem before implementation planning.",
      "Define non-goals, constraints, and verification in terms of observable route behavior.",
      "Open the primary system map and Impact seed before finalizing scope.",
      "Keep implementation batches tied back to the spec instead of expanding opportunistically.",
      "Use playbooks only as execution helpers after the spec anchors the work.",
      "Revisit the spec when acceptance changes instead of silently widening the code task.",
    ],
    verification: [
      "A starter exists for the work and its acceptance criteria are concrete.",
      "The corresponding system map and Impact seed are reviewed before implementation.",
      "The final change can point to which acceptance items were satisfied.",
      "Scope expansions are written back into the spec rather than hidden in code.",
    ],
    followOnActions: [
      {
        href: "/resources?view=specs&spec=feature-build",
        label: "Open feature-build spec",
        detail: "Start with the general feature starter when no narrower spec already exists.",
      },
      {
        href: "/resources?view=system&system=hq-mission-flow",
        label: "Open system map",
        detail: "Anchor the spec to a real subsystem before implementation.",
      },
      {
        href: "/resources?view=impact&file=store/useStore.ts",
        label: "Seed Impact",
        detail: "Use a real blast-radius seed before the spec turns into code work.",
      },
    ],
  },
  {
    id: "reverse-engineering-follow-through",
    title: "Reverse-Engineering Follow-Through",
    objective:
      "Turn binary triage into durable research memory, briefs, and second-brain upkeep instead of leaving it as a one-off RECON result.",
    whenToUse:
      "Binary triage, malware prep, suspicious sample analysis, or any RECON-to-VAULT reverse-engineering workflow",
    startSurface: "RECON → Binary triage",
    steps: [
      "Run binary triage from RECON and file the result into VAULT immediately.",
      "Repair route, tag, and archive continuity before the note drifts into generic compiled pages.",
      "Promote strong prep notes into reverse-engineering briefs when the signal is durable enough.",
      "Review VAULT stewardship for thinly linked or weakly tagged reverse-engineering artifacts.",
      "Export the second-brain pack when the RE lane accumulated enough durable learning to share into Obsidian.",
    ],
    verification: [
      "Binary triage artifacts are visually distinct in VAULT and second-brain export.",
      "Reverse-engineering prep notes have route and tag continuity.",
      "Strong prep notes can reopen RE maintenance or promote into briefs without duplicate drift.",
      "The second-brain heartbeat explicitly counts reverse-engineering memory and brief coverage.",
    ],
    followOnActions: [
      {
        href: "/recon?view=binary&focus=recon-binary",
        label: "Open binary triage",
        detail: "Start from the live reverse-engineering intake surface.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
        label: "Open RE maintenance",
        detail: "Repair and promote reverse-engineering prep from the dedicated VAULT lane.",
      },
      {
        href: "/vault?focus=vault-export-second-brain",
        label: "Open second-brain export",
        detail: "Carry durable reverse-engineering memory into the Obsidian-ready pack.",
      },
    ],
  },
  {
    id: "second-brain-heartbeat",
    title: "Second Brain Heartbeat",
    objective:
      "Run a structured second-brain upkeep and export pass — tag audit, mode selection, and fresh export bundle — to keep the Obsidian vault current.",
    whenToUse:
      "Weekly review or any time new compiled pages have accumulated in the vault",
    startSurface: "Vault → Export panel",
    steps: [
      "Open Vault and review the Stewardship panel for orphans and untagged articles.",
      "Check Compiled Pages for any new pages without domain tags or route continuity.",
      "Open the Export section and select the appropriate mode (full, compiled, clips, or heartbeat).",
      "Run the export and download all generated markdown files.",
      "Import the files into your Obsidian vault using the Maps folder as the navigation anchor.",
      "Verify that the heartbeat note and manifest note landed correctly.",
      "Open the heartbeat note and confirm domain counts match expectations.",
    ],
    verification: [
      "Heartbeat note is present in every export.",
      "Export manifest lists correct domain and source counts.",
      "MOC notes exist for every exported domain map.",
      "No Obsidian-illegal characters appear in any file path.",
      "Individual note files include YAML frontmatter with title, source, date, and tags.",
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
    id: "market-review-loop",
    title: "Market Review Loop",
    objective:
      "Keep market journaling thesis-led and durable so operator review, loss review, and setup continuity stay inside ALPHA, HQ, and VAULT without drifting into automation.",
    whenToUse:
      "Post-trade review, thesis review, invalidation review, or when a prior market note should be reopened before forming a new setup",
    startSurface: "ALPHA → Market review",
    steps: [
      "Open the market-review lane from ALPHA and record asset, thesis, setup, invalidation, result, and operator notes in one pass.",
      "File the review into VAULT as a durable compiled page instead of leaving it in transient chat context.",
      "Reopen the strongest prior market review before starting a new note when the asset or topic already matches.",
      "Keep Forecast Lab as a support rail for prep only; do not turn review work into forecast execution.",
    ],
    verification: [
      "The review lands in VAULT under workflowId market-review and route /alpha.",
      "The saved body uses the fixed review headings so export and reopen stay deterministic.",
      "ALPHA still behaves like a support lattice, not an autonomous trading surface.",
      "HQ can stage the exact market-review lane when the operator asks for thesis or postmortem review.",
    ],
    followOnActions: [
      {
        href: "/alpha?view=watchlist&focus=alpha-market-review",
        label: "Open market review",
        detail: "Start from the exact ALPHA thesis-review lane.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=market-review",
        label: "Open market review archive",
        detail: "Reopen prior durable market reviews without leaving the compiled-pages lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail: "Resume assistant continuity once the strongest market review is staged.",
      },
    ],
  },
  {
    id: "osint-casefile-loop",
    title: "OSINT Casefile Loop",
    objective:
      "Keep passive-first investigation compact by turning RECON and CYBER findings into durable casefiles with subject, pivots, and next reviewed move.",
    whenToUse:
      "Passive target investigation, cross-route evidence packaging, or when RECON and CYBER work should land in the same durable archive lane",
    startSurface: "RECON or CYBER support rail",
    steps: [
      "Work the case in the fixed phase order: Intake, Collect, Pivot, Package.",
      "Keep pivots passive-first across identity, social, image or metadata, and infrastructure or headers or passive DNS.",
      "File the case into VAULT through the shared OSINT casefile contract instead of inventing a route-specific note format.",
      "Reopen the strongest prior casefile when the subject or continuity already matches before widening collection.",
    ],
    verification: [
      "The casefile lands in VAULT under workflowId osint-casefile.",
      "RECON-originated notes keep research-workflow governance while CYBER-originated notes keep cyber-triage governance.",
      "The saved body uses the fixed casefile headings so packaging and reopen stay deterministic.",
      "The surface still reads passive-first and does not widen into a tool catalog or offensive automation.",
    ],
    followOnActions: [
      {
        href: "/recon?view=osint&focus=recon-lookup",
        label: "Open RECON lookup",
        detail: "Start from the passive-first lookup lane.",
      },
      {
        href: "/cyber?view=triage&focus=cyber-triage",
        label: "Open CYBER triage",
        detail: "Carry threat-led case packaging back through the governed cyber baseline.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=osint-casefile",
        label: "Open OSINT archive",
        detail: "Review durable casefiles from the filtered compiled-pages lane.",
      },
    ],
  },
  {
    id: "radar-readiness-session",
    title: "Radar Readiness Session",
    objective:
      "Stage later passive radar work as readiness vocabulary, artifact notes, and session-bundle continuity without adding RF control or flight authority.",
    whenToUse:
      "Vehicle artifact planning, passive radar notes, or when a future sensor-fusion session should be filed alongside the existing bundle",
    startSurface: "VEHICLE → Session bundles",
    steps: [
      "Keep the radar lane advisory-only and describe it with the fixed sequence: capture, preprocess, detect, track, review.",
      "Attach optional radar mode, stage, fusion note, and artifact labels inside the existing session bundle instead of inventing a new export shape.",
      "File the resulting session summary to VAULT so later replay and hardware bring-up start from the same readiness note.",
      "Update the bundle after real measurements or later passive-sensor work rather than treating the first note as final.",
    ],
    verification: [
      "Old nexus-vehicle-session-v1 bundles still import cleanly with no radar block.",
      "New bundles with radar data still export, import, and file to VAULT through the existing path.",
      "Radar language stays advisory-only and never implies RF control or flight-critical authority.",
      "VEHICLE still renders one readiness lane plus one artifact lane instead of a new chamber.",
    ],
    followOnActions: [
      {
        href: "/vehicle?focus=vehicle-artifact-convention",
        label: "Open session bundles",
        detail: "Attach radar-readiness notes inside the existing vehicle artifact lane.",
      },
      {
        href: "/vehicle?focus=vehicle-connector-onboarding",
        label: "Open connector onboarding",
        detail: "Keep future hardware and companion posture visible while filing radar notes.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "Open compiled pages",
        detail: "Review the filed vehicle summary once the radar-ready bundle lands in VAULT.",
      },
    ],
  },
  {
    id: "feature-ship",
    title: "Feature Ship",
    objective:
      "Move a finished feature from dev branch to merged commit cleanly — spec checked, type-check green, verify passing, handoff updated.",
    whenToUse:
      "Any time a feature is implementation-complete and needs a final quality pass before commit",
    startSurface: "Resources → Playbooks",
    steps: [
      "Confirm the relevant spec starter exists and acceptance criteria are met.",
      "Run type-check and fix all errors before continuing.",
      "Run verify and fix lint, path-safety, or route-policy failures.",
      "Read the touched files one more time to check for regressions or stale links.",
      "Update docs/SYSTEM_STATE.md to mark the batch complete or move the next slice up.",
      "Refresh handoff so the next session starts from current state, not memory.",
      "Commit with a descriptive message referencing the batch or spec.",
    ],
    verification: [
      "Type-check exits cleanly.",
      "Verify exits cleanly.",
      "Focused route checks still pass on the affected surfaces.",
      "Handoff document was refreshed after the final code change.",
    ],
    followOnActions: [
      {
        href: "/hq",
        label: "Open HQ",
        detail: "Smoke-test the live surface one more time before commit.",
      },
      {
        href: "/resources?view=specs&spec=feature-build",
        label: "Open feature spec",
        detail: "Double-check acceptance and non-goals before shipping.",
      },
    ],
  },
  {
    id: "api-wire",
    title: "API Wire",
    objective:
      "Wire a new external data source end-to-end — route handler, store slice, and UI panel — with correct error handling and no key leakage.",
    whenToUse:
      "Adding any new external API, new API key, or new server-side data route",
    startSurface: "Resources → Playbooks",
    steps: [
      "Add the key to .env.local or secure runtime storage — never to source.",
      "Create the app/api route handler with try/catch and a typed response shape.",
      "Wire the fetch call from the component using apiFetch or a protected local helper, not direct browser fetch.",
      "Add or update the store slice with a sensible default and degraded behavior.",
      "Build the UI panel with loading, retained-state, and silent failure posture.",
      "Run type-check and verify before considering the wire complete.",
    ],
    verification: [
      "API key is not present in any committed file.",
      "Route handler returns a typed success shape and a typed error shape.",
      "No logs include the key, request headers, or secret-bearing payloads.",
      "The component shows graceful fallback on API failure.",
      "Type-check and verify both pass.",
    ],
    followOnActions: [
      {
        href: "/command",
        label: "Open Command",
        detail: "Check the new data source appears in the operator view.",
      },
      {
        href: "/resources?view=specs&spec=api-integration",
        label: "Open API spec",
        detail: "Review the API integration starter before widening the connector surface.",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function getEngineeringPlaybook(id: string | null | undefined): EngineeringPlaybook {
  const resolvedId =
    resolveEngineeringPlaybookId(id) ?? DEFAULT_ENGINEERING_PLAYBOOK_ID;
  return (
    ENGINEERING_PLAYBOOKS.find((playbook) => playbook.id === resolvedId) ??
    ENGINEERING_PLAYBOOKS[0]
  );
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
    ...playbook.steps.map((step, index) => `${index + 1}. ${step}`),
    ``,
    `## Verification checklist`,
    ``,
    ...playbook.verification.map((entry) => `- [ ] ${entry}`),
    ``,
    `## Jump-offs`,
    ``,
    ...playbook.followOnActions.map(
      (action) => `- [${action.label}](${action.href}) — ${action.detail}`,
    ),
    ``,
  ];

  return lines.join("\n");
}
