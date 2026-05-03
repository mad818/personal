export type AssistantFirstSurfaceId =
  | "hq"
  | "command"
  | "intel"
  | "alpha"
  | "cyber"
  | "recon"
  | "vault"
  | "resources";

export type SurfaceModuleRole =
  | "brief"
  | "workspace"
  | "signals"
  | "continuity"
  | "guidance"
  | "overflow";

export type SurfaceModuleDisposition =
  | "primary"
  | "merged"
  | "demoted"
  | "retired";

export interface SurfaceModuleAction {
  label: string;
  href?: string;
  note?: string;
}

export interface SurfaceModuleViewOverride {
  title?: string;
  detail?: string;
  summary?: string;
  strongestAction?: SurfaceModuleAction;
}

export interface SurfaceModuleSpec {
  id: string;
  title: string;
  detail: string;
  summary: string;
  role: SurfaceModuleRole;
  strongestAction?: SurfaceModuleAction;
  viewOverrides?: Record<string, SurfaceModuleViewOverride>;
}

export interface SurfaceBoxRedesignEntry {
  sourceTitle: string;
  disposition: SurfaceModuleDisposition;
  targetModuleId: string;
  note: string;
}

export interface SurfaceRedesignSpec {
  surfaceId: AssistantFirstSurfaceId;
  title: string;
  summary: string;
  modules: SurfaceModuleSpec[];
  boxMatrix: SurfaceBoxRedesignEntry[];
}

export type ResourcesWorkbenchView =
  | "finder"
  | "manual"
  | "study"
  | "surfaces"
  | "playbooks"
  | "specs"
  | "system"
  | "registry"
  | "kits"
  | "impact"
  | "voice-lab"
  | "wins";

export interface ResourcesWorkbenchJobSpec {
  id: string;
  title: string;
  detail: string;
  summary: string;
  recommendedView: ResourcesWorkbenchView;
}

export interface ResourcesWorkbenchViewSpec {
  view: ResourcesWorkbenchView;
  jobId: string;
  introTitle: string;
  introDetail: string;
  introSummary: string;
  panelTitle: string;
  panelDetail: string;
  panelSummary: string;
}

function entry(
  sourceTitle: string,
  disposition: SurfaceModuleDisposition,
  targetModuleId: string,
  note: string,
): SurfaceBoxRedesignEntry {
  return { sourceTitle, disposition, targetModuleId, note };
}

export const SURFACE_REDESIGN_REGISTRY: Record<
  AssistantFirstSurfaceId,
  SurfaceRedesignSpec
> = {
  hq: {
    surfaceId: "hq",
    title: "HQ redesign",
    summary:
      "Reduce the strategium from many adjacent cards into one mission-led assistant shell with a clear brief, a clear next move, and one continuity lane behind the chronicle.",
    modules: [
      {
        id: "mission-brief",
        title: "Mission Brief",
        detail: "What matters now",
        summary:
          "Combine control posture, mission codex, and strategic pressure into one top-level command brief.",
        role: "brief",
        strongestAction: {
          label: "Prime the mission",
          note: "Lead with the active control posture and the codex action that matters most right now.",
        },
      },
      {
        id: "next-move",
        title: "Next Move",
        detail: "What to do next",
        summary:
          "Turn active fronts, verbs, and shortcuts into one action-first lane with one strongest continuation.",
        role: "workspace",
        strongestAction: {
          label: "Open the strongest continuation",
          note: "Keep one visible follow-through and push the rest into contextual overflow.",
        },
      },
      {
        id: "runtime-continuity",
        title: "Runtime & Continuity",
        detail: "Who is active and what should persist",
        summary:
          "Fold agent readiness, command systems, lesson state, and chronicle continuity into one compact support lane.",
        role: "continuity",
        strongestAction: {
          label: "Resume continuity",
          note: "Let runtime, archive, and sanction state explain the command posture without another action band.",
        },
      },
      {
        id: "command-chronicle",
        title: "Issue the next move",
        detail: "Assistant-first command workspace",
        summary:
          "Keep the chronicle and composer as the primary HQ workspace, with guidance and evidence shown only when they materially help the turn.",
        role: "workspace",
        strongestAction: {
          label: "Send the command",
          note: "Demote workflow help into contextual composer hints instead of a standing note band.",
        },
      },
    ],
    boxMatrix: [
      entry("Operational Litany", "merged", "mission-brief", "Merge control posture and mode emphasis into the main brief."),
      entry("Posture", "merged", "mission-brief", "Fold runtime and threat posture into the brief instead of a separate stat card."),
      entry("Mission codex", "merged", "mission-brief", "Keep objective, urgency, evidence, and next move in the same brief module."),
      entry("Active fronts", "merged", "next-move", "Treat fronts as the strongest route choices, not a separate peer panel."),
      entry("Command verbs", "merged", "next-move", "Keep verbs near the strongest continuation, not as another equal-weight card."),
      entry("Operator shortcuts", "merged", "next-move", "Shortcuts become supporting execution hints inside the next-move lane."),
      entry("Command choir", "merged", "runtime-continuity", "Agent readiness belongs with continuity and runtime posture."),
      entry("Command systems", "merged", "runtime-continuity", "System actions become continuity support, not a separate top-level panel."),
      entry("Sanction rail", "merged", "runtime-continuity", "Lesson queue, chronicle recap, and memory sit in the same continuity lane."),
      entry("Command chronicle", "primary", "command-chronicle", "Keep the chronicle/composer as the main workspace."),
      entry("Workflow commands", "demoted", "command-chronicle", "Replace the standing band with contextual composer help."),
      entry("Evidence posture", "demoted", "command-chronicle", "Render only when evidence-sensitive answers require it."),
      entry("Workspace prepared", "demoted", "command-chronicle", "Keep continuation compact and contextual inside the chronicle."),
    ],
  },
  command: {
    surfaceId: "command",
    title: "COMMAND redesign",
    summary:
      "Turn the COMMAND page into one operational overview with posture, active programs, and memory-backed follow-through instead of many equal-weight status cards.",
    modules: [
      {
        id: "system-posture",
        title: "System Posture",
        detail: "Readiness and runtime health",
        summary:
          "Merge offline, network, agent, and runtime signals into one clear operator posture module.",
        role: "brief",
      },
      {
        id: "operational-brief",
        title: "Operational Brief",
        detail: "What changed across the board",
        summary:
          "Combine AI brief, event radar, threat heat, and world posture into one cross-domain command summary.",
        role: "signals",
      },
      {
        id: "programs-workflows",
        title: "Programs & Workflows",
        detail: "Where active work should happen",
        summary:
          "Group builder, risk analysis, and workflow ops into one execution lane instead of separate business and workflow boxes.",
        role: "workspace",
      },
      {
        id: "context-memory",
        title: "Context Memory",
        detail: "What to remember before acting",
        summary:
          "Unify project context, memory spine, and memory recall so COMMAND can stay assistant-led instead of utility-dense.",
        role: "continuity",
      },
    ],
    boxMatrix: [
      entry("Offline readiness", "merged", "system-posture", "Present offline posture as one part of system readiness."),
      entry("Network health", "merged", "system-posture", "Keep connectivity under the shared posture module."),
      entry("Agent health", "merged", "system-posture", "Fold agent readiness into the same posture lens."),
      entry("Runtime efficiency", "merged", "system-posture", "Keep runtime pressure and health together."),
      entry("AI briefing", "merged", "operational-brief", "Combine generated command context with other live signals."),
      entry("Event radar", "merged", "operational-brief", "Treat event change as part of the same brief."),
      entry("Threat heatmap", "merged", "operational-brief", "Threat posture supports the brief."),
      entry("World event map", "merged", "operational-brief", "Map view becomes supporting evidence to the brief."),
      entry("Business builder", "merged", "programs-workflows", "Business planning joins the program lane."),
      entry("Job risk analyzer", "merged", "programs-workflows", "Keep program design and workflow evaluation close."),
      entry("Workflow ops", "merged", "programs-workflows", "Workflow orchestration stays in the execution lane."),
      entry("Vector snapshot", "demoted", "operational-brief", "Snapshot copy becomes supporting brief context."),
      entry("Focus panel", "demoted", "programs-workflows", "Contextual focus belongs inside the active program state."),
      entry("Project stack context", "merged", "context-memory", "Technical context belongs with memory and prior work."),
      entry("Memory spine", "merged", "context-memory", "Memory becomes one continuity lane."),
      entry("Ask memory", "merged", "context-memory", "Memory recall is part of the same continuity lane."),
    ],
  },
  intel: {
    surfaceId: "intel",
    title: "INTEL redesign",
    summary:
      "Shift INTEL from separate feed cards to one operator story: what changed, why it matters, and what to monitor next.",
    modules: [
      {
        id: "news-brief",
        title: "News Brief",
        detail: "What changed",
        summary:
          "Treat headlines, heatmaps, and conflict feed as one first-view change brief.",
        role: "signals",
      },
      {
        id: "theater-posture",
        title: "Theater Posture",
        detail: "Why it matters",
        summary:
          "Group geopolitical and world-state maps into one theater-level posture module.",
        role: "brief",
      },
      {
        id: "cross-domain-impact",
        title: "Cross-Domain Impact",
        detail: "What other lanes this touches",
        summary:
          "Keep market rates, operations overlays, and Alpha Earth as supporting impact evidence to the theater posture.",
        role: "signals",
      },
      {
        id: "forecast-posture",
        title: "Forecast Posture",
        detail: "What to monitor next",
        summary:
          "Bring predictions and macro context together as one forward-looking lane.",
        role: "signals",
      },
      {
        id: "sweep-workbench",
        title: "Sweep Workbench",
        detail: "Operator-led research workspace",
        summary:
          "Keep sweep execution primary, with diagnostics and run posture demoted into guidance.",
        role: "workspace",
      },
    ],
    boxMatrix: [
      entry("Topic heatmap", "merged", "news-brief", "Heatmaps belong under the first-view change brief."),
      entry("Conflict feed", "merged", "news-brief", "Conflict feed is part of what changed."),
      entry("World risk map", "merged", "theater-posture", "World maps become theater evidence."),
      entry("Conflict impact assessment", "merged", "theater-posture", "Impact assessment belongs under theater posture."),
      entry("Market rates", "merged", "cross-domain-impact", "Rates show cross-domain effect, not a separate peer box."),
      entry("Live operations map", "merged", "cross-domain-impact", "Operations overlays support impact context."),
      entry("Alpha Earth", "merged", "cross-domain-impact", "Alpha Earth remains specialist evidence under impact."),
      entry("Prediction markets", "merged", "forecast-posture", "Prediction instruments belong together."),
      entry("Macro rate context", "merged", "forecast-posture", "Macro context stays in the same forecast lane."),
      entry("Sweep engine", "primary", "sweep-workbench", "Keep sweeps as a primary workspace."),
    ],
  },
  alpha: {
    surfaceId: "alpha",
    title: "ALPHA redesign",
    summary:
      "Turn ALPHA into a trade desk flow with one clear market brief, one setup lane, one risk plan, and one tape verification lane.",
    modules: [
      {
        id: "market-brief",
        title: "Market Brief",
        detail: "Where the tape stands now",
        summary:
          "Combine watchlist context and sparklines into one first-view market brief.",
        role: "brief",
      },
      {
        id: "setups",
        title: "Setups",
        detail: "What is actionable",
        summary:
          "Keep signal engine output as the primary setup lane.",
        role: "workspace",
      },
      {
        id: "momentum",
        title: "Momentum",
        detail: "Which names deserve attention",
        summary:
          "Use momentum scanning as supporting selection evidence for the setup lane.",
        role: "signals",
      },
      {
        id: "risk-plan",
        title: "Risk Plan",
        detail: "How to size and control the move",
        summary:
          "Treat position sizing as the explicit risk lane, not a standalone utility tab.",
        role: "workspace",
      },
      {
        id: "market-tape",
        title: "Market Tape",
        detail: "Verify before acting",
        summary:
          "Use the price grid and charts together as the final tape-verification lane.",
        role: "signals",
        viewOverrides: {
          prices: {
            detail: "Broad market verification",
            summary:
              "Use the price grid when you need the fastest broad tape check before you widen into charts.",
            strongestAction: {
              label: "Verify the tape",
              note: "Scan the grid first when you need a fast broad-market read before acting.",
            },
          },
          charts: {
            detail: "Visual follow-through",
            summary:
              "Use the charts lane when the setup needs visual confirmation beyond the broad tape.",
            strongestAction: {
              label: "Inspect the chart",
              note: "Confirm the move visually before escalating from tape to execution.",
            },
          },
        },
      },
      {
        id: "forecast-lab",
        title: "Forecast Lab",
        detail: "Eval-first baseline posture",
        summary:
          "Keep forecast evaluation in a quieter support rail so readiness is visible without turning the tape into a prediction dashboard.",
        role: "continuity",
      },
    ],
    boxMatrix: [
      entry("Watchlist manager", "merged", "market-brief", "Watchlist context opens the market brief."),
      entry("Sparklines", "merged", "market-brief", "Sparklines support the brief instead of living alone."),
      entry("Signal engine", "primary", "setups", "Keep setup generation primary."),
      entry("Momentum scanner", "merged", "momentum", "Momentum becomes supporting selection evidence."),
      entry("Position sizer", "merged", "risk-plan", "Sizing becomes the explicit risk lane."),
      entry("Price grid", "merged", "market-tape", "Use the tape as final verification."),
      entry("Charts", "merged", "market-tape", "Charts belong with the tape confirmation lane."),
      entry("Forecast lab", "demoted", "forecast-lab", "Keep baseline evaluation visible in the support rail, not on top of the tape."),
    ],
  },
  cyber: {
    surfaceId: "cyber",
    title: "CYBER redesign",
    summary:
      "Reframe CYBER around one threat brief, one priority grid, and one shared evidence-feeds lane so the operator sees posture before raw lists.",
    modules: [
      {
        id: "threat-brief",
        title: "Threat Brief",
        detail: "What demands attention",
        summary:
          "Combine triage and threat intelligence signals into one command-first cyber brief.",
        role: "brief",
      },
      {
        id: "priority-grid",
        title: "Priority Grid",
        detail: "How the queue should be ordered",
        summary:
          "Keep the severity matrix as the ranking layer that explains what gets acted on first.",
        role: "signals",
      },
      {
        id: "evidence-feeds",
        title: "Evidence Feeds",
        detail: "What supports the brief",
        summary:
          "Group CVE, OTX, and CISA KEV into one supporting evidence lane.",
        role: "signals",
        viewOverrides: {
          cves: {
            detail: "Raw vulnerability intake",
            summary:
              "Use the CVE lane when you need source-level vulnerability review rather than the ranked triage brief.",
          },
          otx: {
            detail: "Threat-intelligence pulse stream",
            summary:
              "Use the OTX lane when pulse clustering matters more than vulnerability inventory.",
          },
          cisa: {
            detail: "Known exploited review",
            summary:
              "Use the KEV lane when active exploitation status should drive the queue.",
          },
        },
      },
      {
        id: "physical-ops",
        title: "Physical Ops",
        detail: "Specialist compliance lane",
        summary:
          "Keep drone compliance available, but visually subordinate it to the main cyber posture.",
        role: "overflow",
      },
    ],
    boxMatrix: [
      entry("Triage view", "merged", "threat-brief", "Triage becomes the core cyber brief."),
      entry("Threat intelligence signals", "merged", "threat-brief", "Signals belong inside the same brief."),
      entry("Severity matrix", "merged", "priority-grid", "Priority stays explicit, but not as a peer with all other boxes."),
      entry("CVE feed", "merged", "evidence-feeds", "Feed lists support the brief."),
      entry("OTX feed", "merged", "evidence-feeds", "Threat feed evidence belongs together."),
      entry("CISA KEV", "merged", "evidence-feeds", "KEV is a supporting evidence stream."),
      entry("Drone compliance check", "merged", "physical-ops", "Keep compliance accessible but secondary."),
    ],
  },
  recon: {
    surfaceId: "recon",
    title: "RECON redesign",
    summary:
      "Turn RECON into one collection workbench with a target brief above it, while keeping binary analysis and operator safety clearly separate.",
    modules: [
      {
        id: "target-brief",
        title: "Target Brief",
        detail: "What is being investigated",
        summary:
          "Add one first-view recon summary that frames the current target before the operator drops into tools.",
        role: "brief",
      },
      {
        id: "collection-workbench",
        title: "Collection Workbench",
        detail: "Gather the evidence",
        summary:
          "Treat OSINT, passive DNS, headers, and metadata as modes of one evidence-collection workspace.",
        role: "workspace",
        viewOverrides: {
          osint: {
            detail: "Broad passive target lookup",
            summary:
              "Start broad with domain, IP, email, username, or hash lookups before committing to a narrower recon lane.",
          },
          pdns: {
            detail: "Historical infrastructure context",
            summary:
              "Use passive DNS when infrastructure history and reverse-IP context matter more than broad discovery.",
          },
          headers: {
            detail: "Security header posture",
            summary:
              "Use the headers lane when the target is already known and you need fast web-surface posture inspection.",
          },
          metadata: {
            detail: "Local document and file extraction",
            summary:
              "Use metadata extraction when local artifacts can yield context without wider network collection.",
          },
        },
      },
      {
        id: "binary-analysis",
        title: "Binary Analysis",
        detail: "Reverse-engineering follow-through",
        summary:
          "Keep binary triage primary as the dedicated reverse-engineering lane.",
        role: "workspace",
      },
      {
        id: "operator-safety",
        title: "Operator Safety",
        detail: "Do no harm while collecting",
        summary:
          "Keep OPSEC posture visible as a compact safety lane instead of a peer card to every collection tool.",
        role: "guidance",
      },
    ],
    boxMatrix: [
      entry("OSINT lookup", "merged", "collection-workbench", "OSINT becomes a collection mode."),
      entry("Passive DNS", "merged", "collection-workbench", "Passive DNS becomes a collection mode."),
      entry("HTTP headers audit", "merged", "collection-workbench", "Headers audit becomes a collection mode."),
      entry("Metadata extractor", "merged", "collection-workbench", "Metadata becomes a collection mode."),
      entry("Binary triage", "merged", "binary-analysis", "Binary triage stays a dedicated reverse-engineering lane."),
      entry("OPSEC panel", "merged", "operator-safety", "Safety remains visible, but compact and contextual."),
    ],
  },
  vault: {
    surfaceId: "vault",
    title: "VAULT redesign",
    summary:
      "Reframe VAULT around memory posture, archive work, durable artifacts, and relations so the archive feels like one assistant-shaped system, not many maintenance cards.",
    modules: [
      {
        id: "memory-brief",
        title: "Memory Brief",
        detail: "What the archive knows right now",
        summary:
          "Combine memory spine, stewardship cues, offline posture, and memory recall into one archive brief.",
        role: "brief",
      },
      {
        id: "archive-workbench",
        title: "Archive Workbench",
        detail: "Bring new material into the system",
        summary:
          "Unify folders, search, and document intake as the active archive workspace.",
        role: "workspace",
      },
      {
        id: "durable-artifacts",
        title: "Durable Artifacts",
        detail: "What should be reused",
        summary:
          "Treat compiled pages, saved articles, export, and kits as one durability lane with promotion and filing cues.",
        role: "continuity",
      },
      {
        id: "relations",
        title: "Relations",
        detail: "How things connect",
        summary:
          "Group graph focus, librarian context, and the knowledge graph into one relational surface.",
        role: "signals",
      },
    ],
    boxMatrix: [
      entry("Memory spine", "merged", "memory-brief", "Memory readiness belongs in the top archive brief."),
      entry("Stewardship", "merged", "memory-brief", "Stewardship becomes compact archive posture."),
      entry("Offline readiness", "merged", "memory-brief", "Offline archive posture belongs in the same brief."),
      entry("Ask memory", "merged", "memory-brief", "Memory recall is part of the same continuity lane."),
      entry("Folders", "merged", "archive-workbench", "Archive navigation belongs in the active workbench."),
      entry("Search", "merged", "archive-workbench", "Search is part of archive work, not a peer posture card."),
      entry("Document intake", "merged", "archive-workbench", "Intake stays inside the same workbench."),
      entry("Compiled pages", "merged", "durable-artifacts", "Compiled pages lead the durable artifact lane."),
      entry("Saved articles", "merged", "durable-artifacts", "Saved articles belong with durable artifacts."),
      entry("Export", "merged", "durable-artifacts", "Export becomes a continuation action in the durability lane."),
      entry("Registry kits", "merged", "durable-artifacts", "Kits stay near durable outputs."),
      entry("Graph focus", "merged", "relations", "Graph context belongs with the relations lane."),
      entry("Vault librarian", "merged", "relations", "Librarian support is part of relations."),
      entry("Knowledge Graph", "merged", "relations", "Graph remains the main relations workspace."),
    ],
  },
  resources: {
    surfaceId: "resources",
    title: "Resources redesign",
    summary:
      "Turn Resources into an assistant-led field manual where the operator can quickly understand the lane, start safely, understand the system, and open the exact session.",
    modules: [
      {
        id: "how-this-helps",
        title: "How This Helps",
        detail: "Why this page exists",
        summary:
          "Collapse the intro, reminder, and coverage snapshot into one orientation module that explains the four mental jobs of the page.",
        role: "brief",
      },
      {
        id: "find-right-lane",
        title: "Find the right lane",
        detail: "Choose the best route",
        summary:
          "Use Finder and surface guidance to decide where the work should happen before opening a broad route.",
        role: "workspace",
      },
      {
        id: "start-safely",
        title: "Start safely",
        detail: "Use playbooks and specs before implementation",
        summary:
          "Keep playbooks, specs, and the field manual close to the first safe move instead of burying them in reference tabs.",
        role: "workspace",
      },
      {
        id: "learn-review-practice",
        title: "Learn, review, and practice",
        detail: "Guided learning without adding a new tab",
        summary:
          "Use guided-learning entrypoints to teach, review, quiz, and open the strongest study workspace without leaving the assistant-first flow.",
        role: "workspace",
      },
      {
        id: "understand-system",
        title: "Understand the system",
        detail: "Read architecture and surface posture",
        summary:
          "Use Surfaces and System Design to understand ownership, boundaries, and failure modes before widening edits.",
        role: "signals",
      },
      {
        id: "open-exact-session",
        title: "Open the exact session",
        detail: "Leave overview mode quickly",
        summary:
          "Use Impact, Finder, and recovery-oriented actions to jump straight into the seeded working context instead of broad route tops.",
        role: "continuity",
      },
      {
        id: "massive-win-plans",
        title: "Massive Win Plans",
        detail: "Large fixes, improvements, and upgrades",
        summary:
          "Convert big requests into phase-gated, verified win lanes with design posture, route targets, and next safe actions.",
        role: "guidance",
      },
      {
        id: "supporting-utilities",
        title: "Supporting utilities",
        detail: "Reference decks and reusable bundles",
        summary:
          "Keep Registry, Kits, and the manual available without making them equal-weight first-view modules.",
        role: "overflow",
      },
    ],
    boxMatrix: [
      entry("Use this page for", "merged", "how-this-helps", "Intro guidance folds into one orientation module."),
      entry("Operator reminder", "merged", "how-this-helps", "Reminder copy belongs in the same orientation block."),
      entry("Coverage snapshot", "merged", "how-this-helps", "Coverage counts support the same orientation block."),
      entry("Resources workbench", "merged", "open-exact-session", "The workbench remains primary but reframed around four operator jobs."),
      entry("Finder posture", "merged", "find-right-lane", "Finder posture becomes a job-led orientation block."),
      entry("Session finder", "merged", "open-exact-session", "Finder output leads toward exact-session opening."),
      entry("Developer field manual", "merged", "supporting-utilities", "Manual remains available as a supporting utility."),
      entry("Playbook posture", "merged", "start-safely", "Playbook posture belongs with safe starts."),
      entry("Engineering playbooks", "merged", "start-safely", "Playbooks stay in the safe-start lane."),
      entry("Spec posture", "merged", "start-safely", "Spec posture belongs with safe starts."),
      entry("Spec-driven development", "merged", "start-safely", "Specs stay in the safe-start lane."),
      entry("Surface posture", "merged", "understand-system", "Surface guidance explains the system."),
      entry("Surface capabilities", "merged", "understand-system", "Surface audits belong with system understanding."),
      entry("System posture", "merged", "understand-system", "System posture stays in the understanding lane."),
      entry("System design", "merged", "understand-system", "Architecture mapping belongs in the same lane."),
      entry("Impact posture", "merged", "open-exact-session", "Impact is used to leave overview mode quickly."),
      entry("Project impact", "merged", "open-exact-session", "Impact belongs in exact-session staging."),
      entry("Massive win planning", "primary", "massive-win-plans", "Big fix/improvement/upgrade plans become a native Resources lane instead of loose chat intent."),
      entry("Registry posture", "merged", "supporting-utilities", "Registry remains a supporting utility."),
      entry("Registry console", "merged", "supporting-utilities", "Registry remains available without equal visual weight."),
      entry("Registry kits", "merged", "supporting-utilities", "Kits stay in the supporting utilities lane."),
    ],
  },
};

export const RESOURCES_WORKBENCH_JOBS: ResourcesWorkbenchJobSpec[] = [
  {
    id: "find-right-lane",
    title: "Find the right lane",
    detail: "Pick the best surface before you widen the work",
    summary:
      "Use Finder first when you know the problem but not the best place to fix it.",
    recommendedView: "finder",
  },
  {
    id: "start-safely",
    title: "Start safely",
    detail: "Anchor risky or unfamiliar work before implementation",
    summary:
      "Use playbooks, specs, and the manual to define the first safe move instead of improvising from memory.",
    recommendedView: "playbooks",
  },
  {
    id: "learn-review-practice",
    title: "Learn & review",
    detail: "Use tutor and memory lanes together",
    summary:
      "Use the study lane when you want to learn a concept, review prior work, practice with a quiz, or open the exact memory compartment behind the assistant.",
    recommendedView: "study",
  },
  {
    id: "understand-system",
    title: "Understand the system",
    detail: "Read ownership, boundaries, and failure modes",
    summary:
      "Use surface and system maps when you need to know what owns the behavior and what can break next.",
    recommendedView: "system",
  },
  {
    id: "open-exact-session",
    title: "Open the exact session",
    detail: "Leave overview mode as soon as the target is clear",
    summary:
      "Use Impact and Finder to jump directly into the seeded working context instead of landing at a broad route top.",
    recommendedView: "impact",
  },
  {
    id: "massive-win-plans",
    title: "Plan massive wins",
    detail: "Turn broad upgrade energy into verified slices",
    summary:
      "Use Massive Wins when the request is intentionally large and needs phases, design posture, route targets, and release gates before implementation spreads.",
    recommendedView: "wins",
  },
];

export const RESOURCES_WORKBENCH_VIEW_SPECS: Record<
  ResourcesWorkbenchView,
  ResourcesWorkbenchViewSpec
> = {
  finder: {
    view: "finder",
    jobId: "find-right-lane",
    introTitle: "Find the right lane",
    introDetail: "Search before you guess",
    introSummary:
      "Use Finder when you know the problem or noun but need the best exact session, playbook, spec, or surface to start from.",
    panelTitle: "Seed the exact session",
    panelDetail: "Fast route, panel, playbook, spec, and system lookup",
    panelSummary:
      "Finder should leave overview mode quickly by ranking exact working context above broad route tops.",
  },
  manual: {
    view: "manual",
    jobId: "start-safely",
    introTitle: "Read the field manual",
    introDetail: "Pull in the right outside reference",
    introSummary:
      "Use the manual when you need curated external depth without losing the local-first operator workflow.",
    panelTitle: "Developer field manual",
    panelDetail: "Searchable free/open reference deck",
    panelSummary:
      "Keep external references close, but secondary to the assistant-led internal workbench.",
  },
  study: {
    view: "study",
    jobId: "learn-review-practice",
    introTitle: "Learn, review, and practice",
    introDetail: "Assistant-first guided learning",
    introSummary:
      "Use the study lane when the assistant should teach, review what we already know, or turn prior context into a compact quiz or practice loop.",
    panelTitle: "Open the study workspace",
    panelDetail: "Tutor profiles, memory compartments, and compact study continuations",
    panelSummary:
      "Guided learning should reuse Skills and VAULT exact sessions instead of adding a separate classroom UI.",
  },
  playbooks: {
    view: "playbooks",
    jobId: "start-safely",
    introTitle: "Start safely",
    introDetail: "Task-first operating patterns",
    introSummary:
      "Use playbooks when you need the strongest safe starting pattern for real repo work.",
    panelTitle: "Run the playbook",
    panelDetail: "Task-first workflow cards for real repo work",
    panelSummary:
      "Playbooks should move you directly from understanding into the right repair or execution session.",
  },
  specs: {
    view: "specs",
    jobId: "start-safely",
    introTitle: "Start safely",
    introDetail: "Write the narrow contract first",
    introSummary:
      "Use specs for high-risk, refactor, archive, or boundary work before implementation starts widening on its own.",
    panelTitle: "Write the spec",
    panelDetail: "Spec-first starters for high-risk and cross-boundary work",
    panelSummary:
      "Specs should define the problem, constraints, and verification before the code session begins.",
  },
  surfaces: {
    view: "surfaces",
    jobId: "understand-system",
    introTitle: "Understand the system",
    introDetail: "Know what each surface is best at",
    introSummary:
      "Use surface guidance when you need the best lane, its strengths, and the right repair session afterward.",
    panelTitle: "Choose the best surface",
    panelDetail: "Mission, strengths, subsections, posture, and upgrade priorities",
    panelSummary:
      "Surface guidance should explain capability and route fit without feeling like a static reference console.",
  },
  system: {
    view: "system",
    jobId: "understand-system",
    introTitle: "Understand the system",
    introDetail: "Read ownership and failure modes",
    introSummary:
      "Use system maps to understand what owns the behavior, what to read first, and where edits can spill over.",
    panelTitle: "Read the subsystem map",
    panelDetail: "Architecture maps and change-risk anchors",
    panelSummary:
      "System design should move you toward the right read-first files and exact repair sessions quickly.",
  },
  impact: {
    view: "impact",
    jobId: "open-exact-session",
    introTitle: "Open the exact session",
    introDetail: "Trace the blast radius before you widen scope",
    introSummary:
      "Use Impact when a file or route is already in hand and you need to know the next touched sessions before editing.",
    panelTitle: "Trace the blast radius",
    panelDetail: "Imports, importers, likely touched files",
    panelSummary:
      "Impact should narrow the next read or repair session instead of stopping at a file inventory.",
  },
  "voice-lab": {
    view: "voice-lab",
    jobId: "open-exact-session",
    introTitle: "Open the exact session",
    introDetail: "Voice, dictation, and briefing projects",
    introSummary:
      "Use Voice Lab when the assistant answer should become a local audio briefing, a reusable voice project, or a browser-to-runtime dictation loop.",
    panelTitle: "Run Voice Lab",
    panelDetail: "Profiles, projects, dictation, and local-runtime fallback",
    panelSummary:
      "Voice work should stay local-first and assistant-shaped: browser fallback by default, richer runtime rendering only when the local voice lane is reachable.",
  },
  wins: {
    view: "wins",
    jobId: "massive-win-plans",
    introTitle: "Massive wins",
    introDetail: "Big fixes, improvements, and upgrades",
    introSummary:
      "Use Massive Wins when the plan is supposed to carry multiple fixes, upgrades, design adaptations, and verification gates without losing focus.",
    panelTitle: "Massive Win Console",
    panelDetail: "Phase-gated plans with route targets and release checks",
    panelSummary:
      "Massive win plans should turn ambitious requests into bounded lanes that can be executed, measured, and shipped.",
  },
  registry: {
    view: "registry",
    jobId: "supporting-utilities",
    introTitle: "Supporting utility",
    introDetail: "Reusable tools, prompts, and evidence packs",
    introSummary:
      "Use Registry when you need reusable operator assets, not when you need the first route to work in.",
    panelTitle: "Browse the registry",
    panelDetail: "Tools, workflows, prompts, evidence",
    panelSummary:
      "Registry stays available, but visually secondary to the assistant-first working lanes.",
  },
  kits: {
    view: "kits",
    jobId: "supporting-utilities",
    introTitle: "Supporting utility",
    introDetail: "Reusable operator bundles",
    introSummary:
      "Use Kits when you already know the lane and need a reusable bundle to accelerate it.",
    panelTitle: "Reuse the kit",
    panelDetail: "Reusable operator bundles",
    panelSummary:
      "Kits stay supporting and should not compete with the first-view problem-solving paths.",
  },
};

export function getSurfaceRedesignSpec(surfaceId: AssistantFirstSurfaceId) {
  return SURFACE_REDESIGN_REGISTRY[surfaceId];
}

export function getSurfaceModuleSpec(
  surfaceId: AssistantFirstSurfaceId,
  moduleId: string,
  viewId?: string | null,
) {
  const moduleSpec =
    SURFACE_REDESIGN_REGISTRY[surfaceId].modules.find(
      (entry) => entry.id === moduleId,
    ) ?? null;
  if (!moduleSpec) return null;
  if (!viewId) return moduleSpec;
  const override = moduleSpec.viewOverrides?.[viewId];
  if (!override) return moduleSpec;
  return {
    ...moduleSpec,
    ...override,
    strongestAction: override.strongestAction ?? moduleSpec.strongestAction,
  };
}

export function getResourcesWorkbenchViewSpec(view: ResourcesWorkbenchView) {
  return RESOURCES_WORKBENCH_VIEW_SPECS[view];
}

export function getResourcesWorkbenchJob(jobId: string) {
  return RESOURCES_WORKBENCH_JOBS.find((job) => job.id === jobId) ?? null;
}
