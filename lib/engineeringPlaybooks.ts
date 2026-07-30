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
        detail:
          "Start from ownership and failure modes before widening shell edits.",
      },
      {
        href: "/resources?view=impact&file=components/home/office/OfficeCommandCenter.tsx",
        label: "Seed Impact for HQ shell",
        detail:
          "See likely touched files before extracting more HQ orchestration.",
      },
      {
        href: "/hq?focus=hq-console-shell",
        label: "Open HQ console shell",
        detail:
          "Validate the live shell and composer after every extraction step.",
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
        detail:
          "Validate degraded connector posture and operator-facing trust cues.",
      },
      {
        href: "/resources?view=impact&file=lib/security/routePolicy.ts",
        label: "Seed Impact for route policy",
        detail: "Check what else is affected before changing boundary rules.",
      },
      {
        href: "/security?view=ai&focus=security-ai-surface",
        label: "Open AI surface audit",
        detail:
          "Review related AI/runtime trust posture if the boundary touches provider flows.",
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
        detail:
          "Track which answer surfaces are still boundary-only versus visibly hardened.",
      },
      {
        href: "/resources?view=system&system=ai-runtime-boundary",
        label: "Open AI runtime map",
        detail:
          "Review provider, prompt, and retrieval ownership before changing answer behavior.",
      },
      {
        href: "/command?focus=runtime-efficiency",
        label: "Open runtime efficiency",
        detail:
          "Watch provider and prompt posture while tightening AI behavior.",
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
        detail:
          "Start with the general feature starter when no narrower spec already exists.",
      },
      {
        href: "/resources?view=system&system=hq-mission-flow",
        label: "Open system map",
        detail: "Anchor the spec to a real subsystem before implementation.",
      },
      {
        href: "/resources?view=impact&file=store/useStore.ts",
        label: "Seed Impact",
        detail:
          "Use a real blast-radius seed before the spec turns into code work.",
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
        detail:
          "Repair and promote reverse-engineering prep from the dedicated VAULT lane.",
      },
      {
        href: "/vault?focus=vault-export-second-brain",
        label: "Open second-brain export",
        detail:
          "Carry durable reverse-engineering memory into the Obsidian-ready pack.",
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
        detail:
          "Review orphans and tag coverage before exporting to keep the pack clean.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "View compiled pages",
        detail:
          "Check compiled pages for newly accumulated artifacts before running the pack.",
      },
    ],
  },
  {
    id: "market-review-loop",
    title: "Market Review Loop",
    objective:
      "Keep market journaling thesis-led, durable, and lesson-capturing so operator review, loss review, and next-rule continuity stay inside ALPHA, HQ, and VAULT without drifting into automation or an external tooling lane.",
    whenToUse:
      "Post-trade review, thesis review, invalidation review, or when a prior market note should be reopened before forming a new setup",
    startSurface: "ALPHA → Market review",
    steps: [
      "Open the market-review lane from ALPHA and record asset, thesis, setup, invalidation, result, emotional posture, and operator notes in one pass.",
      "Capture what to repeat, what to avoid, and the next rule before filing the review so the next setup reopens a lesson, not only a result.",
      "File the review into VAULT as a durable compiled page instead of leaving it in transient chat context.",
      "Reuse the strongest prior market review before starting a new note when the asset or topic already matches, so continuity and source refs stay compact.",
      "Keep Forecast Lab as a support rail for prep only; do not turn review work into forecast execution.",
    ],
    verification: [
      "The review lands in VAULT under workflowId market-review and route /alpha.",
      "The saved body uses the fixed review headings so export and reopen stay deterministic.",
      "Repeat, avoid, and next-rule guidance survive reuse and exact reopen without requiring a separate dashboard.",
      "Explicit reuse of a prior review keeps a vault-artifact source trail on the next saved note.",
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
        detail:
          "Reopen prior durable market reviews without leaving the compiled-pages lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Resume assistant continuity once the strongest market review is staged.",
      },
    ],
  },
  {
    id: "osint-casefile-loop",
    title: "OSINT Casefile Loop",
    objective:
      "Keep passive-first investigation compact and project-local by turning RECON and CYBER findings into durable casefiles with subject, pivots, evidence posture, and next reviewed move.",
    whenToUse:
      "Passive target investigation, cross-route evidence packaging, or when RECON and CYBER work should land in the same durable archive lane",
    startSurface: "RECON or CYBER support rail",
    steps: [
      "Work the case in the fixed phase order: Intake, Collect, Pivot, Package.",
      "Keep pivots passive-first across identity, social, image or metadata, and infrastructure or headers or passive DNS.",
      "File the case into VAULT through the shared OSINT casefile contract instead of inventing a route-specific note format.",
      "Reuse the strongest prior casefile when the subject or continuity already matches before widening collection.",
    ],
    verification: [
      "The casefile lands in VAULT under workflowId osint-casefile.",
      "RECON-originated notes keep research-workflow governance while CYBER-originated notes keep cyber-triage governance.",
      "The saved body uses the fixed casefile headings so packaging and reopen stay deterministic.",
      "Evidence strength, citation/source counts, and pivot cues stay visible from the compiled-pages lane.",
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
        detail:
          "Carry threat-led case packaging back through the governed cyber baseline.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=osint-casefile",
        label: "Open OSINT archive",
        detail:
          "Review durable casefiles from the filtered compiled-pages lane.",
      },
    ],
  },
  {
    id: "deep-research-briefing",
    title: "Deep Research Briefing",
    objective:
      "Run an explicit multi-source deep-research mission through NOVA so the result stays structured, contradiction-aware, and durable inside INTEL plus VAULT without widening into a separate research product.",
    whenToUse:
      "Explicit /deepresearch requests, deep dives, full reports, or research briefs that should gather more than a single search result before filing a durable artifact",
    startSurface: "INTEL → NOVA lane",
    steps: [
      "Use /deepresearch or explicit deep-brief wording so the bounded deep_research tool runs instead of the lighter search path.",
      "Let the pipeline gather one paper sweep, targeted web angles, optional feed signal, and the strongest source-page reads before synthesizing.",
      "Keep the final output in the fixed six-section brief so the result is comparable, promotable, and easy to reopen later.",
      "File only explicit deep-research runs into VAULT through the existing research-workflow artifact path.",
      "Reopen the durable brief from VAULT when the operator needs continuity instead of re-running the whole sweep from scratch.",
    ],
    verification: [
      "The final brief uses the exact sections Scope, Core claim, Evidence ledger, Counter-signals, Operator takeaway, and Confidence & Gaps.",
      "The deep-research run stays inside the existing INTEL and VAULT spine with no extra dashboard surface.",
      "Explicit deep-research runs file durable compiled pages while generic research replies remain transient.",
      "The brief includes honest contradiction or evidence-gap language rather than a one-sided synthesis.",
    ],
    followOnActions: [
      {
        href: "/intel",
        label: "Open INTEL",
        detail:
          "Run the explicit deep-research mission from the existing NOVA lane.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=deepresearch",
        label: "Open deep-research archive",
        detail:
          "Review durable deep-research briefs from the filtered compiled-pages lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Carry the finished brief back into the assistant-first command flow once the research pass is complete.",
      },
    ],
  },
  {
    id: "repo-assimilation-briefing",
    title: "Repo Assimilation Briefing",
    objective:
      "Turn public GitHub repo intel into a bounded local fit brief so Nexus adapts only the useful pattern, files the decision durably, and hands ORBIT a safe planning constraint set instead of raw upstream code.",
    whenToUse:
      "Explicit repo assimilation, adopt-this-repo reviews, reference-library fit checks, or any OSS pattern assessment that should end in a durable local brief before implementation",
    startSurface: "RECON → Repo intel",
    steps: [
      "Start in RECON repo intel and assess the public repo metadata first instead of jumping straight into adaptation.",
      "Run explicit repo assimilation only when the operator wants fit, adoption, or reference-pattern guidance rather than a lighter metadata brief.",
      "Keep the brief in the fixed six-section format so the repo snapshot, fit map, safe adoption points, and ORBIT handoff stay comparable later.",
      "File the finished assimilation into VAULT under repo-assimilation so the decision can reopen exactly before new implementation work starts.",
      "Hand the saved brief to ORBIT for local planning instead of mirroring the upstream tree, code, or product shape.",
    ],
    verification: [
      "The repo stays public-safe and metadata-only with no arbitrary source ingestion or private GitHub assumptions.",
      "The brief lands in VAULT under workflowId repo-assimilation and route /recon.",
      "RECON continues to host repo assimilation as an explicit module action inside OSINT rather than a new tab or product.",
      "Brief ORBIT uses the saved assimilation brief when available instead of falling back to raw repo metadata.",
    ],
    followOnActions: [
      {
        href: "/recon?view=osint&focus=recon-repo-intel",
        label: "Open RECON repo intel",
        detail:
          "Assess first, then run explicit repo assimilation from the same OSINT lane.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=repo-assimilation",
        label: "Open repo assimilation archive",
        detail:
          "Review durable repo-fit briefs from the filtered compiled-pages lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Hand the saved assimilation brief to ORBIT once the fit and boundaries are explicit.",
      },
    ],
  },
  {
    id: "repo-compare-briefing",
    title: "Repo Compare Briefing",
    objective:
      "Compare 2 or 3 public GitHub repos as candidate patterns for the same Nexus problem, then file one durable recommendation into VAULT before ORBIT plans the local implementation slice.",
    whenToUse:
      "Repo-versus-repo questions, which-should-we-adopt decisions, or multi-candidate OSS assessment that should end in one bounded recommendation instead of open-ended comparison chatter",
    startSurface: "RECON → Repo intel",
    steps: [
      "Start from the same repo-intel lane and keep the compare set to exactly 2 or 3 public repos.",
      "Assess candidates with metadata-only GitHub intel first; do not widen into arbitrary source fetches or code execution.",
      "Run explicit repo compare only when the operator wants one recommended pick with clear differences and boundaries, not just single-repo assessment.",
      "File the finished compare brief into VAULT under repo-compare so the recommendation can reopen exactly later.",
      "Hand the saved compare brief to ORBIT so local implementation planning starts from the recommendation, shared fit, and explicit no-copy boundaries.",
    ],
    verification: [
      "The compare stays public-safe and metadata-first with no private GitHub assumptions or arbitrary source ingestion.",
      "The saved brief lands in VAULT under workflowId repo-compare and route /recon.",
      "RECON still hosts repo compare inside the repo-intel module rather than widening into a new sub-view or tab.",
      "Brief ORBIT prefers the saved repo-compare brief, then falls back to saved assimilation or lighter repo intel only if no comparison exists yet.",
    ],
    followOnActions: [
      {
        href: "/recon?view=osint&focus=recon-repo-intel",
        label: "Open RECON repo compare",
        detail:
          "Assess candidates, build the compare set, and file one durable recommendation from the existing repo-intel lane.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=repo-compare",
        label: "Open repo compare archive",
        detail:
          "Reopen durable compare briefs from the filtered compiled-pages lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Carry the saved recommendation into ORBIT once the compare brief is filed.",
      },
    ],
  },
  {
    id: "repo-intel-briefing",
    title: "Repo Intel Briefing",
    objective:
      "Assess a public GitHub repo as a read-only reference so dependency, competitor, and pattern-review work stays metadata-grounded before ORBIT widens into local implementation planning.",
    whenToUse:
      "Reference-library assessment, OSS competitor review, dependency inspection, or GitHub repo triage before adapting patterns locally",
    startSurface: "RECON → OSINT workbench",
    steps: [
      "Normalize the repo as owner/repo or a GitHub root URL and keep the request inside the repo-intel lane.",
      "Review only public metadata: description, topics, top-level tree, README excerpt, language hints, and the deterministic implementation brief.",
      "Treat the result as read-only reconnaissance rather than code ingestion or execution.",
      "Hand the brief to ORBIT only if the repo looks worth adapting into local Nexus work, or escalate into full repo assimilation when the operator needs a durable fit map first.",
    ],
    verification: [
      "The request stays on public GitHub metadata only, with no raw source execution or client-side third-party fetches.",
      "RECON continues to present repo intel as one compact OSINT module, not a new dashboard wall or sub-view.",
      "The ORBIT handoff stays explicit and implementation planning remains local to the active repo.",
      "Rate limits and degraded GitHub responses render honestly instead of masquerading as a full brief.",
    ],
    followOnActions: [
      {
        href: "/recon?view=osint&focus=recon-repo-intel",
        label: "Open RECON repo intel",
        detail: "Start from the metadata-only GitHub assessment lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Hand the brief to ORBIT only after the metadata view is worth local planning.",
      },
      {
        href: "/resources?view=system&system=recon-boundary",
        label: "Open RECON system map",
        detail:
          "Keep the repo-intel module aligned to RECON’s existing passive-first boundaries.",
      },
    ],
  },
  {
    id: "radar-readiness-session",
    title: "Radar Readiness Session",
    objective:
      "Stage later passive radar work as project-local readiness vocabulary, artifact notes, and session-bundle continuity without adding RF control or flight authority.",
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
      "VAULT continuity can reopen the latest session summary, render brief, and radar-attached bundle summary from VEHICLE.",
      "Radar language stays advisory-only and never implies RF control or flight-critical authority.",
      "VEHICLE still renders one readiness lane plus one artifact lane instead of a new chamber.",
    ],
    followOnActions: [
      {
        href: "/vehicle?focus=vehicle-artifact-convention",
        label: "Open session bundles",
        detail:
          "Attach radar-readiness notes inside the existing vehicle artifact lane.",
      },
      {
        href: "/vehicle?focus=vehicle-connector-onboarding",
        label: "Open connector onboarding",
        detail:
          "Keep future hardware and companion posture visible while filing radar notes.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "Open compiled pages",
        detail:
          "Review the filed vehicle summary once the radar-ready bundle lands in VAULT.",
      },
    ],
  },
  {
    id: "voice-lab-local",
    title: "Voice Lab Local",
    objective:
      "Keep Nexus voice work local-first by pairing browser fallback speech with an optional richer local runtime for dictation, profile management, and rendered briefing projects.",
    whenToUse:
      "Voice dictation, audio briefing playback, local voice-profile work, or any operator request that should become a reusable audio project instead of one-off TTS",
    startSurface: "Resources → Voice Lab",
    steps: [
      "Start in Voice Lab and check runtime status before assuming clone, effect, or render features are available.",
      "Use browser speech and dictation as the zero-dependency baseline whenever the local runtime is unavailable.",
      "Keep voice profiles, projects, and generated audio local-only instead of filing audio assets into repo-tracked state.",
      "Reopen HQ or VAULT from the saved voice project only after the briefing content is stable enough to render.",
    ],
    verification: [
      "Voice Lab degrades cleanly into browser speech when the local runtime is unavailable.",
      "Profile and project metadata stay local while generated audio remains outside repo-tracked state.",
      "HQ and VAULT can reopen the relevant voice project or use browser readback without breaking the main workflow.",
    ],
    followOnActions: [
      {
        href: "/resources?view=voice-lab",
        label: "Open Voice Lab",
        detail:
          "Stage local dictation, profile, and rendering work in one bounded lane.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Turn the current reply into a spoken briefing once the content is stable.",
      },
      {
        href: "/vault",
        label: "Open VAULT",
        detail:
          "Use readback or a saved voice project when replaying archived material.",
      },
    ],
  },
  {
    id: "architecture-intelligence-lane",
    title: "Architecture Intelligence Lane",
    objective:
      "Turn the existing Impact helper into a local-first architecture workbench for graph shape, ownership, hotspots, blast radius, and lightweight security signals before risky code changes.",
    whenToUse:
      "Blast-radius analysis, dependency graph review, ownership or hotspot questions, high-coupling investigation, or local security scanning before implementation",
    startSurface: "Resources → Impact",
    steps: [
      "Seed Impact with a real repo-relative file when the change has a clear starting point.",
      "Use graph mode for structure, ownership mode for stewardship, hotspots mode for churn, and security mode for risky sinks and secret patterns.",
      "Keep the analysis local-only; do not upload repo code or rely on remote parsing services.",
      "Escalate into CYBER vulnerability review only when the architecture pass suggests a real defensive review lane is warranted.",
    ],
    verification: [
      "Graph, ownership, hotspots, and security all resolve through the protected local /api/project sections.",
      "No remote code egress or third-party parsing service is introduced by the analysis path.",
      "Security findings stay heuristic and bounded until a defensive review brief confirms the issue and repair lane.",
    ],
    followOnActions: [
      {
        href: "/resources?view=impact&impactMode=graph",
        label: "Open Impact graph",
        detail: "Inspect structure, blast radius, and likely touch-set first.",
      },
      {
        href: "/resources?view=impact&impactMode=security",
        label: "Open Impact security",
        detail:
          "Review heuristic sinks, secrets, and risky boundaries from the same local workbench.",
      },
      {
        href: "/cyber?view=vuln-review&focus=cyber-vuln-review",
        label: "Open vulnerability review",
        detail:
          "Escalate into the defensive review lane once the architecture signal is concrete enough.",
      },
    ],
  },
  {
    id: "privacy-shield-posture",
    title: "Privacy Shield Posture",
    objective:
      "Protect sensitive identifiers on cloud-bound HQ, CYBER, and RECON turns by masking them locally, preserving a reversible surrogate map, and exposing only compact operator posture cues in the UI.",
    whenToUse:
      "Sensitive cyber or recon analysis, anonymization checks, provider-bound privacy review, or any request that should verify what Nexus protects before a cloud model sees it",
    startSurface: "COMMAND → Provider health",
    steps: [
      "Apply the privacy shield only when the provider is cloud-bound, the turn is sensitive, and the operator has not forced raw dispatch.",
      "Use deterministic regex masking first, then local contextual entity detection only when it improves protection.",
      "Keep surrogate maps local and session-scoped, and reverse-map the answer before it reaches the shared UI.",
      "Use the provider-health posture cues to explain what was protected without revealing the raw original identifiers.",
    ],
    verification: [
      "Local-only runs stay raw unless the operator explicitly asks for masking.",
      "Shared HQ and COMMAND surfaces show compact privacy posture without leaking secrets or raw identifiers.",
      "The operator can distinguish between local runtime issues, missing keys, and active anonymization without a second provider-routing system.",
    ],
    followOnActions: [
      {
        href: "/command?focus=provider-health",
        label: "Open provider health",
        detail:
          "Check runtime reachability, cloud posture, and privacy-shield status together.",
      },
      {
        href: "/hq?focus=hq-chronicle",
        label: "Open HQ chronicle",
        detail:
          "Return to the assistant-first lane once the privacy posture is clear.",
      },
      {
        href: "/resources?view=system&system=ai-runtime-boundary",
        label: "Open AI runtime boundary",
        detail:
          "Review the existing provider and route boundary before widening privacy logic.",
      },
    ],
  },
  {
    id: "vulnerability-review-loop",
    title: "Vulnerability Review Loop",
    objective:
      "Run a defensive local code review that combines architecture context, static security heuristics, and structured LLM reasoning, then file one durable vuln-review brief into VAULT with an exact repair lane.",
    whenToUse:
      "AppSec review, injection or SSRF checks, auth or workflow-boundary mistakes, unsafe file access, XSS review, or any local code path that deserves a durable defensive brief",
    startSurface: "CYBER → Vulnerability review",
    steps: [
      "Pick one repo-relative file and keep the threat question explicit before the review starts.",
      "Gather impact, graph, ownership, hotspots, and security signals from the local project workbench before asking for reasoning.",
      "Keep the response operator-grade and defensive: issue, severity, exploitability, affected files, evidence, confidence, and exact repair lane.",
      "File the finished review into VAULT under vuln-review so the repair lane and evidence can reopen exactly later.",
    ],
    verification: [
      "The review stays defensive-only with no autonomous exploitation or auto-fix merge path.",
      "The durable brief lands in VAULT under workflowId vuln-review and route /cyber.",
      "CYBER can reopen the exact repair lane and VAULT can reopen the saved brief through filtered compiled pages.",
    ],
    followOnActions: [
      {
        href: "/cyber?view=vuln-review&focus=cyber-vuln-review",
        label: "Open CYBER vulnerability review",
        detail: "Run the local defensive review from the dedicated CYBER lane.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&workflowId=vuln-review",
        label: "Open vuln-review archive",
        detail:
          "Reopen saved defensive briefs and exact repair lanes from VAULT.",
      },
      {
        href: "/resources?view=impact&impactMode=security",
        label: "Open Impact security",
        detail:
          "Inspect the local security heuristics and likely blast radius before the next repair step.",
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
    id: "runtime-finalize-loop",
    title: "Runtime Finalize Loop",
    objective:
      "Close a visual or shell update by actively looking for route, console, media, hydration, and handoff failures before calling the work done.",
    whenToUse:
      "Premium visual changes, shell/auth route work, CSP/media updates, or any local update where the page can look healthy while the browser is still logging errors",
    startSurface: "Resources → Playbooks",
    steps: [
      "Run type-check first and fix every TypeScript error before trusting browser behavior.",
      "Run verify so design, source integrity, lint, path safety, security, and Tauri posture are checked together.",
      "Stop the live dev runtime before a production build so `.next` is not being mutated by two processes.",
      "Run build, then restart the direct `3100` runtime and confirm `/api/health` returns 200.",
      "Check the affected routes with HTTP status probes, including the public landing and any protected redirect path.",
      "Run a browser probe that records console errors, page errors, request failures, and unhandled rejections.",
      "Fix any blocked resource, hydration, route, or runtime issue found by the probes, then rerun the focused checks.",
      "Update `docs/SYSTEM_STATE.md`, `tasks/todo.md`, and handoff only after the live surface is proven.",
    ],
    verification: [
      "`npm run type-check` exits cleanly.",
      "`npm run verify` exits cleanly, with only known non-blocking warnings if any.",
      "`npm run build` exits cleanly after the dev runtime is stopped.",
      "Fresh `3100` runtime returns 200 for `/api/health` and the affected routes.",
      "Browser probe reports zero console errors, page errors, request failures, and unhandled rejections.",
      "`npm run handoff:write` and `npm run handoff:check` pass after state notes change.",
    ],
    followOnActions: [
      {
        href: "/command?focus=agent-health",
        label: "Open agent health",
        detail:
          "Start from the runtime health lane before trusting higher-level shell signals.",
      },
      {
        href: "/resources?view=impact",
        label: "Open Impact",
        detail:
          "Seed the local blast-radius workbench for the files touched by the update.",
      },
      {
        href: "/resources?view=playbooks&playbook=feature-ship",
        label: "Open feature ship",
        detail:
          "Move from local proof into commit/PR readiness after the runtime checks are quiet.",
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
        detail:
          "Review the API integration starter before widening the connector surface.",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function getEngineeringPlaybook(
  id: string | null | undefined,
): EngineeringPlaybook {
  const resolvedId =
    resolveEngineeringPlaybookId(id) ?? DEFAULT_ENGINEERING_PLAYBOOK_ID;
  return (
    ENGINEERING_PLAYBOOKS.find((playbook) => playbook.id === resolvedId) ??
    ENGINEERING_PLAYBOOKS[0]
  );
}

export function buildEngineeringPlaybookBrief(
  playbook: EngineeringPlaybook,
): string {
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
