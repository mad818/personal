import {
  DEFAULT_SURFACE_CAPABILITY_ID,
  resolveSurfaceCapabilityId,
} from "@/lib/resourceSessionRegistry";

export type SurfaceCapabilityCategory = "core" | "support" | "internal";

export interface SurfaceCapabilitySubsection {
  label: string;
  detail: string;
  href?: string;
}

export interface SurfaceCapabilityAction {
  label: string;
  href: string;
  detail: string;
}

export interface SurfaceCapability {
  id: string;
  title: string;
  route: string;
  category: SurfaceCapabilityCategory;
  tagline: string;
  mission: string;
  strongestAbilities: string[];
  bestFor: string[];
  subsections: SurfaceCapabilitySubsection[];
  costPosture: string;
  offlinePosture: string;
  upgradePriorities: string[];
  upgradeActions: SurfaceCapabilityAction[];
  jumpActions: SurfaceCapabilityAction[];
}

export const SURFACE_CAPABILITY_CATEGORY_LABELS: Record<
  SurfaceCapabilityCategory,
  string
> = {
  core: "Core route",
  support: "Support workbench",
  internal: "Internal lab",
};

export const SURFACE_CAPABILITIES: SurfaceCapability[] = [
  {
    id: "hq",
    title: "HQ",
    route: "/hq",
    category: "core",
    tagline: "Mission start, routing, and operator continuity",
    mission:
      "Start here when the task is still fuzzy. HQ is the best place to translate intent into the right surface, preserve mission continuity, and keep agent output connected to the rest of Nexus.",
    strongestAbilities: [
      "Mission-first entry with Observe / Investigate / Automate / Archive / Launch routing.",
      "Agent chronicle that can hand useful results into memory, VAULT, scheduler, or live routes.",
      "Best cross-surface starting point when you know the objective but not the right tab yet.",
    ],
    bestFor: [
      "Starting a new task without committing to a route too early.",
      "Turning an answer into the next action instead of dead-ending in chat.",
      "Monitoring current operator posture while moving between surfaces.",
    ],
    subsections: [
      {
        label: "Mission rail",
        detail:
          "Intent-first launch actions that route into the right working lane.",
        href: "/hq?focus=hq-strategium",
      },
      {
        label: "Prelude posture",
        detail: "Mission and system posture summary before you start typing.",
        href: "/hq?focus=hq-strategium",
      },
      {
        label: "Chronicle",
        detail:
          "Agent exchange and continuation actions back into the rest of the app.",
        href: "/hq?focus=hq-chronicle",
      },
      {
        label: "Scheduler drawer",
        detail: "Human-gated recurring work without leaving the shell.",
        href: "/hq?focus=hq-scheduler-governance",
      },
    ],
    costPosture:
      "Local-first by default. Optional paid providers remain opt-in and should never become the assumed path.",
    offlinePosture:
      "The shell still works when the browser loses internet, but live feeds degrade and local runtime health becomes the real dependency to watch.",
    upgradePriorities: [
      "Keep shrinking the remaining HQ orchestration file so mission routing and send logic are easier to audit.",
      "Add more exact panel-level deep links so playbooks and missions land inside the right working block, not just the right route.",
      "Continue reducing always-visible copy in the chronicle shell now that continuation actions are stronger.",
    ],
    upgradeActions: [
      {
        label: "Open safe refactor",
        href: "/resources?view=playbooks&playbook=safe-refactor",
        detail:
          "Use the existing HQ-safe split workflow before widening shell changes.",
      },
      {
        label: "Open HQ chronicle",
        href: "/hq?focus=hq-chronicle",
        detail:
          "Keep the live chronicle block visible while checking HQ continuity and text density.",
      },
      {
        label: "Open HQ impact",
        href: "/resources?view=impact&file=components/home/office/OfficeCommandCenter.tsx",
        detail:
          "Inspect the current blast radius around the HQ shell before reshaping it.",
      },
    ],
    jumpActions: [
      {
        label: "Open HQ",
        href: "/hq",
        detail: "Start the task in the main mission shell.",
      },
      {
        label: "Open chronicle",
        href: "/hq?focus=hq-chronicle",
        detail:
          "Jump directly into the live chronicle when the route is already known.",
      },
      {
        label: "Open system map",
        href: "/resources?view=system&system=hq-mission-flow",
        detail: "Review HQ ownership, guardrails, and failure modes first.",
      },
      {
        label: "Open impact seed",
        href: "/resources?view=impact&file=components/home/office/OfficeCommandCenter.tsx",
        detail: "Inspect the current blast radius around the HQ shell.",
      },
    ],
  },
  {
    id: "command",
    title: "COMMAND",
    route: "/command",
    category: "core",
    tagline: "Decision support, runtime posture, and operator readiness",
    mission:
      "Use COMMAND when you need one tactical board for world posture, runtime health, memory readiness, and action-support signals instead of a single narrow data feed.",
    strongestAbilities: [
      "Combines live risk context, AI briefing, world events, runtime efficiency, and agent health on one route.",
      "Best route for seeing whether the app itself is healthy before trusting higher-level outputs.",
      "Strong focused-session entry points for runtime efficiency, agent health, and memory posture.",
    ],
    bestFor: [
      "Checking whether Nexus is healthy enough to trust before deeper work.",
      "Getting a high-level operational read across markets, cyber, and world risk.",
      "Reviewing prompt waste, verification drift, and agent/tool posture.",
    ],
    subsections: [
      {
        label: "Vector snapshot",
        detail: "KPI stack and readiness ring for the live shell.",
        href: "/command",
      },
      {
        label: "AI briefing",
        detail: "Narrative synthesis and decision support.",
        href: "/command",
      },
      {
        label: "Runtime efficiency",
        detail: "Prompt size, tool-pack posture, and waste guidance.",
        href: "/command?focus=runtime-efficiency",
      },
      {
        label: "Agent health",
        detail:
          "Runtime regressions, verification posture, and failure signals.",
        href: "/command?focus=agent-health",
      },
      {
        label: "Memory spine",
        detail: "Local memory readiness and sync posture.",
        href: "/command?focus=memory-spine",
      },
    ],
    costPosture:
      "Free-first public feeds stay primary, with explicit freshness and last-known-local posture instead of silently assuming remote freshness.",
    offlinePosture:
      "Remote panels degrade into retained local state with freshness hints while local runtime panels remain useful.",
    upgradePriorities: [
      "Tighten the mobile information hierarchy so the top half of COMMAND surfaces the most important state faster.",
      "Keep adding focused-session entry points so playbooks can land on the exact panel that matters.",
      "Continue trimming repeated explanatory copy now that badges and focus strips communicate posture more clearly.",
    ],
    upgradeActions: [
      {
        label: "Open runtime focus",
        href: "/command?focus=runtime-efficiency",
        detail:
          "Start on the panel that best shows runtime waste, tool-pack drift, and verification posture.",
      },
      {
        label: "Open agent health",
        href: "/command?focus=agent-health",
        detail:
          "Jump directly into the panel that catches COMMAND regressions fastest.",
      },
      {
        label: "Open finalize loop",
        href: "/resources?view=playbooks&playbook=runtime-finalize-loop",
        detail:
          "Use the browser/runtime proof lane before calling visual or shell changes done.",
      },
    ],
    jumpActions: [
      {
        label: "Open COMMAND",
        href: "/command",
        detail: "Land on the main decision-support board.",
      },
      {
        label: "Open runtime focus",
        href: "/command?focus=runtime-efficiency",
        detail: "Start with prompt/tool efficiency and drift posture.",
      },
      {
        label: "Open finalize loop",
        href: "/resources?view=playbooks&playbook=runtime-finalize-loop",
        detail: "Run the update proof loop before trusting the live shell.",
      },
    ],
  },
  {
    id: "intel",
    title: "INTEL",
    route: "/intel",
    category: "core",
    tagline: "Narrative, geopolitical, prediction, and sweep intelligence",
    mission:
      "Use INTEL when the task is about external narrative posture, geopolitical change, market consensus, or evidence-oriented sweep work rather than internal app health.",
    strongestAbilities: [
      "Clear segmented modes for news, world posture, prediction markets, and sweeps.",
      "Blends signal density, conflict mapping, operations overlays, and odds-based consensus.",
      "Best route for answering what is happening outside the app and why it matters.",
    ],
    bestFor: [
      "Narrative and geopolitical monitoring.",
      "Comparing market consensus with world-event context.",
      "Launching evidence-oriented sweep workflows.",
    ],
    subsections: [
      {
        label: "News",
        detail: "Topic clustering and conflict-source monitoring.",
        href: "/intel?view=news&focus=intel-news",
      },
      {
        label: "World",
        detail: "Global posture, conflict impact, ops map, and macro context.",
        href: "/intel?view=world&focus=intel-world",
      },
      {
        label: "Markets",
        detail: "Prediction markets plus supporting rate context.",
        href: "/intel?view=markets&focus=intel-markets",
      },
      {
        label: "Sweeps",
        detail: "Structured bundle runs and before/after evidence review.",
        href: "/intel?view=sweeps&focus=intel-sweeps",
      },
    ],
    costPosture:
      "Free/open feeds remain the baseline, with richer synthesis coming from route composition rather than hidden paid dependencies.",
    offlinePosture:
      "World and market panels should be treated as last-known local state when offline; freshness indicators matter more than the raw cards.",
    upgradePriorities: [
      "Make the relationship between the four INTEL modes even clearer with stronger mode-to-mode continuation hints.",
      "Add more panel-level focused sessions for sweeps and world posture.",
      "Continue standardizing retained-data language so stale remote panels never feel fresh by accident.",
    ],
    upgradeActions: [
      {
        label: "Open sweeps",
        href: "/intel?view=sweeps&focus=intel-sweeps",
        detail:
          "Start on the structured evidence-run lane instead of the broad route top.",
      },
      {
        label: "Open world focus",
        href: "/intel?view=world&focus=intel-world",
        detail:
          "Go straight to the geopolitical posture panel when tuning INTEL density or continuity.",
      },
      {
        label: "Open INTEL impact",
        href: "/resources?view=impact&file=app/intel/page.tsx",
        detail:
          "Inspect the route shell and adjacent mode logic before reshaping the lane.",
      },
    ],
    jumpActions: [
      {
        label: "Open INTEL",
        href: "/intel",
        detail: "Land on the default narrative monitoring route.",
      },
      {
        label: "Open sweeps",
        href: "/intel?view=sweeps&focus=intel-sweeps",
        detail: "Go straight to evidence-oriented sweep work.",
      },
      {
        label: "Open impact seed",
        href: "/resources?view=impact&file=app/intel/page.tsx",
        detail: "Inspect the route shell and likely touched files.",
      },
    ],
  },
  {
    id: "alpha",
    title: "ALPHA",
    route: "/alpha",
    category: "core",
    tagline: "Execution support for public-market monitoring",
    mission:
      "Use ALPHA when the question is about watchlists, momentum, sizing, or public-market context and you want a fast execution-support lattice rather than broad intelligence synthesis.",
    strongestAbilities: [
      "Segmented flow for watchlist, signals, scanner, sizing, price grid, and charts.",
      "Fast public-data market support without making paid data the default assumption.",
      "Useful when you need tactical execution context more than broad external narrative monitoring.",
    ],
    bestFor: [
      "Scanning setups and prioritizing watchlist candidates.",
      "Sizing positions quickly from fixed-risk and Kelly framing.",
      "Getting public-market context without leaving Nexus.",
    ],
    subsections: [
      {
        label: "Watchlist",
        detail: "Tracked assets plus compact 7-day motion context.",
        href: "/alpha?view=watchlist&focus=alpha-watchlist",
      },
      {
        label: "Signals",
        detail: "Buy / sell signal board for quick directional posture.",
        href: "/alpha?view=signals&focus=alpha-signals",
      },
      {
        label: "Scanner",
        detail: "Momentum and setup detection.",
        href: "/alpha?view=scanner&focus=alpha-scanner",
      },
      {
        label: "Sizer",
        detail: "Risk-aware position sizing.",
        href: "/alpha?view=sizer&focus=alpha-sizer",
      },
      {
        label: "Prices",
        detail: "Fast market overview grid.",
        href: "/alpha?view=prices&focus=alpha-prices",
      },
      {
        label: "Charts",
        detail: "Legacy chart embeds for visual follow-through.",
        href: "/alpha?view=charts&focus=alpha-charts",
      },
    ],
    costPosture:
      "Public price data stays primary, with the route positioned as execution support instead of a premium terminal clone.",
    offlinePosture:
      "When offline, treat price and chart panels as retained context only; the route is most trustworthy when freshness is visible.",
    upgradePriorities: [
      "Strengthen mission continuity between ALPHA and COMMAND/INTEL so trade context can bounce more naturally between routes.",
      "Reduce chart-mode dead space and make mode intent clearer on smaller screens.",
      "Add more explicit retained-data cues on the heavier market panels.",
    ],
    upgradeActions: [
      {
        label: "Open scanner",
        href: "/alpha?view=scanner&focus=alpha-scanner",
        detail:
          "Use the most action-oriented ALPHA lane when tightening execution support flow.",
      },
      {
        label: "Open signals",
        href: "/alpha?view=signals&focus=alpha-signals",
        detail:
          "Check the compact trade-signal surface when refining density and recommendation posture.",
      },
      {
        label: "Open prices",
        href: "/alpha?view=prices&focus=alpha-prices",
        detail:
          "Review retained-data cues on the broader market grid directly.",
      },
    ],
    jumpActions: [
      {
        label: "Open ALPHA",
        href: "/alpha",
        detail: "Land on the market execution lattice.",
      },
      {
        label: "Open scanner",
        href: "/alpha?view=scanner&focus=alpha-scanner",
        detail: "Go directly to setup and momentum triage.",
      },
      {
        label: "Open impact seed",
        href: "/resources?view=impact&file=app/alpha/page.tsx",
        detail: "Inspect the route shell and adjacent market components.",
      },
    ],
  },
  {
    id: "cyber",
    title: "CYBER",
    route: "/cyber",
    category: "core",
    tagline: "Threat triage, feed correlation, and drone compliance posture",
    mission:
      "Use CYBER when the task is about vulnerability posture, feed correlation, or compliance/risk framing rather than raw reconnaissance or general security controls.",
    strongestAbilities: [
      "Strong triage-first view that correlates CVE, OTX, and KEV signal posture.",
      "Governed cyber-triage baseline now keeps approval posture, domain tags, and exact-session follow-through explicit.",
      "Clear segmented access to raw feeds without losing the higher-level action framing.",
      "Drone compliance lane keeps FAA and operational review separate from vehicle telemetry work.",
    ],
    bestFor: [
      "Prioritizing cyber risk instead of just reading raw feeds.",
      "Checking exploited-vulnerability posture quickly.",
      "Running drone compliance review without mixing it into flight operations.",
    ],
    subsections: [
      {
        label: "Triage",
        detail: "Priority queue plus correlated cyber signal posture.",
        href: "/cyber?view=triage&focus=cyber-triage",
      },
      {
        label: "Matrix",
        detail: "Severity correlation across CVE and OTX.",
        href: "/cyber?view=matrix&focus=cyber-matrix",
      },
      {
        label: "CVEs",
        detail: "Raw NVD-style feed access.",
        href: "/cyber?view=cves&focus=cyber-cves",
      },
      {
        label: "OTX",
        detail: "AlienVault pulse monitoring.",
        href: "/cyber?view=otx&focus=cyber-otx",
      },
      {
        label: "CISA KEV",
        detail: "Known exploited vulnerability tracking.",
        href: "/cyber?view=cisa&focus=cyber-cisa",
      },
      {
        label: "Drone ops",
        detail: "FAA/state/local compliance review for later aircraft work.",
        href: "/cyber?view=drone&focus=cyber-drone",
      },
    ],
    costPosture:
      "Free-first feed posture is explicit, with public sources and retained local state favored over hidden premium coupling.",
    offlinePosture:
      "Triage remains useful with retained local copies, but feed freshness must be trusted over raw count or severity visual weight.",
    upgradePriorities: [
      "Keep the cyber-triage baseline authoritative so RECON and VAULT follow-through stay explicit and operator staged.",
      "Add more focused-session links into the triage and drone lanes.",
      "Keep raw feed views visually secondary to the triage-first path so the route stays action-oriented.",
    ],
    upgradeActions: [
      {
        label: "Open triage",
        href: "/cyber?view=triage&focus=cyber-triage",
        detail:
          "Work from the highest-signal action lane when improving cyber flow.",
      },
      {
        label: "Open drone compliance",
        href: "/cyber?view=drone&focus=cyber-drone",
        detail:
          "Tune the paired drone review lane without mixing it into flight operations.",
      },
      {
        label: "Open RECON OPSEC",
        href: "/recon?view=opsec&focus=recon-opsec",
        detail:
          "Carry cross-surface cyber findings into boundary-aware recon validation.",
      },
    ],
    jumpActions: [
      {
        label: "Open CYBER",
        href: "/cyber",
        detail: "Land on the triage-first cyber lane.",
      },
      {
        label: "Open drone compliance",
        href: "/cyber?view=drone&focus=cyber-drone",
        detail: "Go straight to compliance review for future aircraft work.",
      },
      {
        label: "Open impact seed",
        href: "/resources?view=impact&file=app/cyber/page.tsx",
        detail: "Inspect the route shell and likely touched panels.",
      },
    ],
  },
  {
    id: "recon",
    title: "RECON",
    route: "/recon",
    category: "core",
    tagline: "Free-first reconnaissance and OPSEC verification",
    mission:
      "Use RECON when you need target-led lookup, passive DNS, metadata extraction, headers review, or OPSEC posture with explicit browser/server boundary discipline.",
    strongestAbilities: [
      "Protected-route boundary for external lookups instead of browser-direct secret leakage.",
      "Segmented flow for lookup, passive DNS, headers, metadata, and OPSEC checks.",
      "Local-only binary triage lane for hashes, file signatures, entropy, strings, and IOC candidates before deeper reverse engineering.",
      "Strong degraded semantics: failures should read as degraded or unavailable, not as clean negatives.",
    ],
    bestFor: [
      "Quick target-led recon without leaving the protected Nexus shell.",
      "OPSEC and exposure checks before a wider investigation.",
      "Fast reverse-engineering prep on a suspicious file without uploading the sample anywhere.",
      "Headers and metadata review with retained good-state behavior.",
    ],
    subsections: [
      {
        label: "OSINT lookup",
        detail: "Target-led domain, IP, email, username, and hash lookup.",
        href: "/recon?view=osint&focus=recon-lookup",
      },
      {
        label: "Passive DNS",
        detail: "Historical and reverse-IP context.",
        href: "/recon?view=pdns",
      },
      {
        label: "Headers audit",
        detail:
          "Security header posture with retained results on rerun failure.",
        href: "/recon?view=headers&focus=recon-headers",
      },
      {
        label: "Metadata",
        detail: "Local extraction-only path.",
        href: "/recon?view=metadata",
      },
      {
        label: "Binary triage",
        detail:
          "Local-only hashes, entropy, strings, IOC hints, and reverse-engineering prep.",
        href: "/recon?view=binary&focus=recon-binary",
      },
      {
        label: "OPSEC",
        detail: "Tor, exposure, and trust-boundary checks.",
        href: "/recon?view=opsec&focus=recon-opsec",
      },
    ],
    costPosture:
      "Free-by-default reconnaissance is the baseline, with BYOK lookups remaining optional and explicitly bounded.",
    offlinePosture:
      "Local surfaces remain readable offline, but external lookup lanes should be treated as retained or unavailable rather than live.",
    upgradePriorities: [
      "Add more continuity into follow-on investigation flows so RECON results push naturally into VAULT and HQ.",
      "Keep replacing any remaining boundary ambiguities with explicit degraded states and server-owned connector posture.",
      "Improve grouped result summarization so large lookup outputs stay readable on smaller screens.",
    ],
    upgradeActions: [
      {
        label: "Open OPSEC focus",
        href: "/recon?view=opsec&focus=recon-opsec",
        detail:
          "Start with trust-boundary posture when tightening degraded and availability semantics.",
      },
      {
        label: "Open lookup lane",
        href: "/recon?view=osint&focus=recon-lookup",
        detail:
          "Use the target-led surface directly when refining lookup flow or summarization.",
      },
      {
        label: "Open binary triage",
        href: "/recon?view=binary&focus=recon-binary",
        detail:
          "Strengthen local reverse-engineering prep without breaking the free-first boundary.",
      },
      {
        label: "Open security audit",
        href: "/resources?view=playbooks&playbook=security-boundary-audit",
        detail:
          "Run the shared browser/server boundary workflow before connector changes.",
      },
    ],
    jumpActions: [
      {
        label: "Open RECON",
        href: "/recon",
        detail: "Land on the recon shell.",
      },
      {
        label: "Open binary triage",
        href: "/recon?view=binary&focus=recon-binary",
        detail: "Go directly to the local suspicious-file triage lane.",
      },
      {
        label: "Open OPSEC focus",
        href: "/recon?view=opsec&focus=recon-opsec",
        detail: "Go directly to exposure and trust-boundary checks.",
      },
      {
        label: "Open system map",
        href: "/resources?view=system&system=recon-boundary",
        detail: "Review the browser/server boundary before deeper changes.",
      },
    ],
  },
  {
    id: "vault",
    title: "VAULT",
    route: "/vault",
    category: "core",
    tagline: "Archive, memory, graph context, and durable operator artifacts",
    mission:
      "Use VAULT when the work needs to persist: compiled memory pages, saved articles, graph context, document intake, export, and archive flow.",
    strongestAbilities: [
      "Brings together durable memory, saved research, graph context, and export flows on one route.",
      "Compiled pages are no longer dead ends; they now reopen useful continuation actions.",
      "List and graph modes give both artifact browsing and relationship browsing without leaving the same surface.",
    ],
    bestFor: [
      "Finding or filing durable research and operator artifacts.",
      "Moving from an answer into archived, searchable memory.",
      "Inspecting relationships between saved articles and compiled pages.",
    ],
    subsections: [
      {
        label: "Memory spine",
        detail: "Local durable-memory posture and related navigation.",
        href: "/vault?focus=vault-memory-spine",
      },
      {
        label: "Stewardship",
        detail:
          "Archive health, orphan posture, tag coverage, and route continuity.",
        href: "/vault?focus=vault-stewardship",
      },
      {
        label: "Compiled pages",
        detail: "Durable compiled memory and research artifacts.",
        href: "/vault?focus=vault-compiled-pages",
      },
      {
        label: "Graph mode",
        detail:
          "Knowledge graph with filtered topology and focused drill-down.",
        href: "/vault?focus=vault-graph-focus",
      },
      {
        label: "Document intake",
        detail: "Local-only filing for future OCR-ready document work.",
        href: "/vault",
      },
      {
        label: "Export and kits",
        detail: "Archive handoff and reusable bundle paths.",
        href: "/vault",
      },
    ],
    costPosture:
      "Pure local-first archive behavior by default, with durable artifacts kept inside Nexus unless the operator explicitly exports them.",
    offlinePosture:
      "One of the strongest offline surfaces: most value remains local and durable even with no internet connectivity.",
    upgradePriorities: [
      "Continue simplifying the outer route shell so the list/graph decision feels lighter.",
      "Keep extending repair-first archive flows so stewardship can open the exact filtered or focused view that fixes the issue.",
      "Strengthen exact panel focus links inside graph and compiled-page flows.",
    ],
    upgradeActions: [
      {
        label: "Open stewardship",
        href: "/vault?focus=vault-stewardship",
        detail:
          "Start with archive health before widening into browsing or graph review.",
      },
      {
        label: "Repair route-less pages",
        href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
        detail:
          "Open the exact compiled-page repair session for missing route continuity.",
      },
      {
        label: "Recover orphans",
        href: "/vault?focus=vault-graph-focus&graphAudit=orphans",
        detail:
          "Jump straight into graph-mode orphan recovery instead of a broad archive sweep.",
      },
    ],
    jumpActions: [
      {
        label: "Open VAULT",
        href: "/vault",
        detail: "Land on the main archive route.",
      },
      {
        label: "Open stewardship",
        href: "/vault?focus=vault-stewardship",
        detail: "Start with archive health before browsing the wider vault.",
      },
      {
        label: "Repair route-less pages",
        href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
        detail:
          "Jump directly into compiled pages that still need route continuity.",
      },
      {
        label: "Open graph focus",
        href: "/vault?focus=vault-graph-focus",
        detail: "Go straight to graph-mode drill-down.",
      },
      {
        label: "Recover orphans",
        href: "/vault?focus=vault-graph-focus&graphAudit=orphans",
        detail: "Open graph mode with orphan recovery in focus.",
      },
      {
        label: "Open system map",
        href: "/resources?view=system&system=memory-spine",
        detail:
          "Review the memory/compiled-page boundary before deeper changes.",
      },
    ],
  },
  {
    id: "vehicle",
    title: "VEHICLE",
    route: "/vehicle",
    category: "internal",
    tagline: "Future hardware readiness, telemetry staging, and artifact prep",
    mission:
      "Use VEHICLE to prepare for future drone and airframe work before hardware arrives. The route is about readiness, telemetry staging, compliance handoff, and artifact packaging, not pretending flight-critical control already lives here.",
    strongestAbilities: [
      "Simulation and readiness infrastructure that makes arrival day boring instead of improvised.",
      "Clear boundary that Nexus is an operator console, not the flight-critical controller.",
      "Strong artifact and render-brief preparation path for future hardware sessions and parts work.",
    ],
    bestFor: [
      "Future hardware onboarding before the aircraft exists.",
      "Bench planning, bridge posture, and first-hardware-day recovery flow.",
      "Packaging session summaries, imported bundles, and render briefs into VAULT.",
    ],
    subsections: [
      {
        label: "Connector onboarding",
        detail: "Future Pixhawk / ArduPilot profile and bring-up prep.",
        href: "/vehicle?focus=vehicle-connector-onboarding",
      },
      {
        label: "Bench checklist",
        detail: "Persistent props-off validation path.",
        href: "/vehicle?focus=vehicle-bench-checklist",
      },
      {
        label: "Bridge status",
        detail:
          "Passive telemetry bridge posture without making Nexus flight-critical.",
        href: "/vehicle?focus=vehicle-bridge-status",
      },
      {
        label: "Launchpad",
        detail: "Bench -> bridge -> compliance -> archive workflow.",
        href: "/vehicle",
      },
      {
        label: "Artifacts",
        detail:
          "Session bundles, render briefs, and future hardware prep artifacts.",
        href: "/vehicle?focus=vehicle-artifact-convention",
      },
    ],
    costPosture:
      "Local-first and simulation-first. No hardware or paid flight tooling is required for the current readiness lane to be useful.",
    offlinePosture:
      "Mostly local and durable. The route should stay useful offline because readiness and artifacts are local concerns first.",
    upgradePriorities: [
      "Add more exact deep links into hardware-day and artifact subflows.",
      "Keep making readiness language explicit so operators never mistake the route for flight-critical control.",
      "Strengthen vehicle artifact filtering and continuity once more future hardware prep artifacts accumulate.",
    ],
    upgradeActions: [
      {
        label: "Open onboarding",
        href: "/vehicle?focus=vehicle-connector-onboarding",
        detail: "Jump directly into future Pixhawk / ArduPilot prep.",
      },
      {
        label: "Open artifacts",
        href: "/vehicle?focus=vehicle-artifact-convention",
        detail:
          "Go straight to bundles, render briefs, and archive continuity.",
      },
      {
        label: "Open compliance",
        href: "/cyber?view=drone&focus=cyber-drone",
        detail:
          "Keep the paired FAA and operational review lane close to readiness work.",
      },
    ],
    jumpActions: [
      {
        label: "Open VEHICLE",
        href: "/vehicle",
        detail: "Land on the future hardware readiness route.",
      },
      {
        label: "Open compliance",
        href: "/cyber?view=drone&focus=cyber-drone",
        detail: "Jump to the paired drone compliance lane.",
      },
      {
        label: "Open system map",
        href: "/resources?view=system&system=vehicle-bridge",
        detail: "Review the passive-bridge and readiness boundary first.",
      },
    ],
  },
  {
    id: "iot",
    title: "IOT",
    route: "/iot",
    category: "internal",
    tagline: "Sensor posture, device registry, and automation review",
    mission:
      "Use IOT when the task is about local sensors, device health, MQTT posture, and automation rules that should remain operator-owned and visible before anything touches the physical world.",
    strongestAbilities: [
      "Keeps live sensor posture, device registry, and automation rules in one internal workbench.",
      "Useful for Homefront perimeter thinking because it separates signal intake from response authority.",
      "Makes retained device state readable when live adapters or external services are offline.",
    ],
    bestFor: [
      "Checking sensor and device readiness before automating anything.",
      "Reviewing MQTT and local automation posture.",
      "Staging future camera/perimeter integrations without widening response authority.",
    ],
    subsections: [
      {
        label: "MQTT posture",
        detail: "Broker availability and adapter readiness.",
        href: "/iot?focus=iot-mqtt",
      },
      {
        label: "Sensor grid",
        detail: "Temperature, motion, weather, and status telemetry.",
        href: "/iot?focus=iot-sensors",
      },
      {
        label: "Device matrix",
        detail: "Local device registry and health posture.",
        href: "/iot?focus=iot-devices",
      },
      {
        label: "Automation review",
        detail: "Rules stay visible and operator-owned.",
        href: "/iot?focus=iot-automation",
      },
    ],
    costPosture:
      "Internal and local-first. No paid device cloud or remote service is required for the current workbench.",
    offlinePosture:
      "Retained device and rule state should remain readable offline; live telemetry should clearly degrade when adapters are unavailable.",
    upgradePriorities: [
      "Move remaining old panel chrome into shared shell primitives.",
      "Add exact focus anchors for MQTT, device registry, and automation rules.",
      "Keep physical-world automation review-gated and visible.",
    ],
    upgradeActions: [
      {
        label: "Open MQTT",
        href: "/iot?focus=iot-mqtt",
        detail: "Start with broker and adapter posture before device work.",
      },
      {
        label: "Open device matrix",
        href: "/iot?focus=iot-devices",
        detail: "Review local device health and registry state.",
      },
      {
        label: "Open automation",
        href: "/iot?focus=iot-automation",
        detail: "Check rule posture before enabling or expanding automations.",
      },
    ],
    jumpActions: [
      {
        label: "Open IOT",
        href: "/iot",
        detail: "Land on the internal sensor operations workbench.",
      },
      {
        label: "Open device matrix",
        href: "/iot?focus=iot-devices",
        detail: "Go directly to the device registry posture.",
      },
      {
        label: "Open automation review",
        href: "/iot?focus=iot-automation",
        detail: "Go directly to local automation review.",
      },
    ],
  },
  {
    id: "resources",
    title: "RESOURCES",
    route: "/resources",
    category: "support",
    tagline: "External references plus internal architecture and workflow maps",
    mission:
      "Use RESOURCES when you need orientation: external references, repeatable playbooks, system maps, impact analysis, registry content, and a surface-by-surface capability audit.",
    strongestAbilities: [
      "One place for external references and internal engineering guidance without leaving the Nexus shell.",
      "Connects playbooks, spec-first starters, architecture context, blast radius, and now surface capabilities.",
      "Now includes a fast local finder for exact repair sessions and likely next work lanes.",
      "Best route for reducing wandering before touching unfamiliar code or product surfaces.",
    ],
    bestFor: [
      "Finding the right exact repair session faster than scanning every console by hand.",
      "Getting oriented before editing or navigating a new subsystem.",
      "Starting risky work from a compact spec instead of implementation drift.",
      "Turning docs, architecture, and blast radius into a working session.",
      "Auditing what the app can do without reverse-engineering every route.",
    ],
    subsections: [
      {
        label: "Finder",
        detail:
          "Fast local search across exact sessions, specs, playbooks, systems, and surfaces.",
        href: "/resources?view=finder",
      },
      {
        label: "Field manual",
        detail: "Curated external references and study material.",
        href: "/resources?view=manual",
      },
      {
        label: "Source intelligence",
        detail:
          "Govern external repos, posts, and tooling ideas before promotion.",
        href: "/resources?view=sources",
      },
      {
        label: "Surfaces",
        detail: "Cross-tab capability and upgrade audit for the live product.",
        href: "/resources?view=surfaces",
      },
      {
        label: "Playbooks",
        detail:
          "Repeatable engineering workflows with jump-offs, including the runtime finalize loop.",
        href: "/resources?view=playbooks",
      },
      {
        label: "Specs",
        detail:
          "Spec-first starters with problem, constraints, acceptance, and verification.",
        href: "/resources?view=specs",
      },
      {
        label: "System design",
        detail: "Subsystem maps, boundaries, and guardrails.",
        href: "/resources?view=system",
      },
      {
        label: "Impact",
        detail:
          "Local-only blast radius, graph, hotspots, ownership, and security workbench.",
        href: "/resources?view=impact",
      },
      {
        label: "Voice Lab",
        detail:
          "Local-first voice profiles, dictation, and audio briefing projects.",
        href: "/resources?view=voice-lab",
      },
      {
        label: "Registry and kits",
        detail: "Reusable tools, prompts, bundles, and operator kits.",
        href: "/resources?view=registry",
      },
    ],
    costPosture:
      "Mostly local and reference-oriented, with explicit external-link posture in the field-manual lane instead of hidden outbound behavior.",
    offlinePosture:
      "Internal guidance remains useful offline; external references become a study map rather than a live browsing path.",
    upgradePriorities: [
      "Keep the finder biased toward exact sessions and recent useful paths instead of letting it drift into a generic route dump.",
      "Use the Specs lane earlier in risky work so playbooks can start from explicit scope instead of implementation instinct.",
      "Add more panel-level deep links so playbooks and surface audits can land inside exact in-page sections.",
      "Keep using compact cards instead of long prose so this route stays like a control surface, not a document dump.",
      "Expand the capability lane as more support/internal surfaces become first-class.",
      "Keep source intelligence native to Resources so outside ideas are mapped before they become dependencies.",
    ],
    upgradeActions: [
      {
        label: "Open finder",
        href: "/resources?view=finder",
        detail:
          "Jump straight into fast exact-session lookup when you already know the shape of the work.",
      },
      {
        label: "Open source intelligence",
        href: "/resources?view=sources",
        detail:
          "Map outside repos, posts, and tooling ideas into guarded local work before implementation.",
      },
      {
        label: "Open specs lane",
        href: "/resources?view=specs",
        detail:
          "Start risky work from a reusable spec starter before opening broad code surfaces.",
      },
      {
        label: "Open surfaces audit",
        href: "/resources?view=surfaces",
        detail:
          "Start from the cross-tab capability map when deciding what to improve next.",
      },
      {
        label: "Open playbooks",
        href: "/resources?view=playbooks",
        detail:
          "Use the workflow lane when a diagnosis should become a repeatable session.",
      },
      {
        label: "Open finalize loop",
        href: "/resources?view=playbooks&playbook=runtime-finalize-loop",
        detail:
          "Use the bug-check route before pushing, transferring, or calling a visual pass done.",
      },
      {
        label: "Open system design",
        href: "/resources?view=system",
        detail:
          "Anchor improvements in subsystem ownership and failure modes before editing.",
      },
      {
        label: "Open Voice Lab",
        href: "/resources?view=voice-lab",
        detail:
          "Stage local dictation, profiles, and audio projects in one lane.",
      },
    ],
    jumpActions: [
      {
        label: "Open Resources",
        href: "/resources",
        detail: "Land on the workbench route.",
      },
      {
        label: "Open Finder",
        href: "/resources?view=finder",
        detail: "Go directly to the fast local session finder.",
      },
      {
        label: "Open Source Intelligence",
        href: "/resources?view=sources",
        detail: "Go directly to the governed external-idea intake lane.",
      },
      {
        label: "Open Specs",
        href: "/resources?view=specs",
        detail: "Go directly to the spec-first starters.",
      },
      {
        label: "Open surfaces audit",
        href: "/resources?view=surfaces",
        detail: "Go directly to the cross-tab capability map.",
      },
      {
        label: "Open finalize loop",
        href: "/resources?view=playbooks&playbook=runtime-finalize-loop",
        detail: "Start the proven type/verify/build/route/browser-probe loop.",
      },
      {
        label: "Open Voice Lab",
        href: "/resources?view=voice-lab",
        detail: "Go directly to the local voice workflow lane.",
      },
    ],
  },
  {
    id: "security",
    title: "SECURITY",
    route: "/security",
    category: "support",
    tagline: "Controls, AI-surface review, and physical monitoring",
    mission:
      "Use SECURITY when the work is about controls, hardening, or physical-ops posture rather than live vulnerability triage or target-led reconnaissance.",
    strongestAbilities: [
      "Separates controls from AI-surface risk and physical-ops monitoring instead of mixing them into one stream.",
      "Keeps route/auth/prompt/tool concerns visible beside operational physical monitoring.",
      "Useful as a governance and review surface rather than a raw-intel lane.",
    ],
    bestFor: [
      "Security review framing before or after implementation work.",
      "Checking controls and AI-surface coverage gaps.",
      "Physical monitoring context that should stay distinct from cyber triage.",
    ],
    subsections: [
      {
        label: "Controls",
        detail: "Route, auth, input, config, and AI-surface coverage.",
        href: "/security?view=doctrine&focus=security-doctrine",
      },
      {
        label: "AI surface",
        detail: "Prompt, tool, retrieval, and persistence risk framing.",
        href: "/security?view=ai&focus=security-ai-surface",
      },
      {
        label: "Physical ops",
        detail:
          "Camera, perimeter, alerts, and drone-adjacent physical monitoring.",
        href: "/security?view=physical&focus=security-physical",
      },
    ],
    costPosture:
      "Mostly local controls and local monitoring posture. This route is about review and framing more than expensive connector dependence.",
    offlinePosture:
      "Controls remain useful offline; physical monitoring should be treated as retained state if live sensors are unavailable.",
    upgradePriorities: [
      "Tie control cards more directly into playbooks and impact seeds.",
      "Keep physical-ops language distinct from cyber-intel framing so the route stays understandable.",
      "Add more explicit deep links for AI-surface review work.",
    ],
    upgradeActions: [
      {
        label: "Open controls",
        href: "/security?view=doctrine&focus=security-doctrine",
        detail:
          "Start with boundary and protected-action review before broader governance edits.",
      },
      {
        label: "Open AI surface",
        href: "/security?view=ai&focus=security-ai-surface",
        detail: "Jump directly into prompt/tool/retrieval risk framing.",
      },
      {
        label: "Open security audit",
        href: "/resources?view=playbooks&playbook=security-boundary-audit",
        detail:
          "Use the shared security workflow when the controls lane needs implementation follow-through.",
      },
    ],
    jumpActions: [
      {
        label: "Open SECURITY",
        href: "/security",
        detail: "Land on the security controls route.",
      },
      {
        label: "Open AI surface",
        href: "/security?view=ai&focus=security-ai-surface",
        detail: "Go directly to AI-specific risk framing.",
      },
      {
        label: "Open playbook",
        href: "/resources?view=playbooks&playbook=security-boundary-audit",
        detail: "Start the security boundary audit workflow.",
      },
    ],
  },
  {
    id: "skills",
    title: "SKILLS",
    route: "/skills",
    category: "internal",
    tagline: "Workflow forge, adversarial lab, and system learning surfaces",
    mission:
      "Use SKILLS when the goal is to shape operator workflows, run isolated prompt tournaments, or review capability growth rather than work a live operational route.",
    strongestAbilities: [
      "Workflow Forge and Blacksite keep higher-risk experimentation separate from the main operational shell.",
      "System Brain and the library make skill growth and reusable workflow assets visible in one place.",
      "Good internal lane for improving the product’s own workflow capability.",
    ],
    bestFor: [
      "Designing or refining internal workflows.",
      "Running isolated adversarial or prompt-quality experiments.",
      "Reviewing capability growth and reusable knowledge assets.",
    ],
    subsections: [
      {
        label: "Workflow Forge",
        detail: "Workflow graphing and operator process shaping.",
        href: "/skills?view=forge&focus=skills-forge",
      },
      {
        label: "Blacksite Lab",
        detail:
          "Operator-only lab for adversarial tournaments and isolated testing.",
        href: "/skills?view=blacksite&focus=skills-blacksite",
      },
      {
        label: "System Brain",
        detail: "Skill metrics, knowledge graph, and improvement queue.",
        href: "/skills?view=brain&focus=skills-brain",
      },
      {
        label: "Skill Library",
        detail:
          "Reusable capability catalog plus learning log and knowledge base.",
        href: "/skills?view=library&focus=skills-library",
      },
    ],
    costPosture:
      "Internal and local-first. This route is about shaping workflows and learning assets rather than introducing paid dependencies.",
    offlinePosture:
      "Mostly resilient offline because the value is internal process, library, and local state rather than live external feeds.",
    upgradePriorities: [
      "Connect forged workflows more directly into scheduler and HQ mission launches.",
      "Reduce explanation-heavy blocks now that the internal route structure is clearer.",
      "Add stronger continuity from experimentation back into real operator surfaces.",
    ],
    upgradeActions: [
      {
        label: "Open Workflow Forge",
        href: "/skills?view=forge&focus=skills-forge",
        detail:
          "Start on the process-shaping lane when tightening internal workflow continuity.",
      },
      {
        label: "Open Blacksite",
        href: "/skills?view=blacksite&focus=skills-blacksite",
        detail:
          "Use the isolated lab when experimentation needs a clearer home.",
      },
      {
        label: "Open library",
        href: "/skills?view=library&focus=skills-library",
        detail:
          "Review reusable capability assets directly when reducing route sprawl or drift.",
      },
    ],
    jumpActions: [
      {
        label: "Open SKILLS",
        href: "/skills",
        detail: "Land on the internal workflow and learning surface.",
      },
      {
        label: "Open Workflow Forge",
        href: "/skills?view=forge&focus=skills-forge",
        detail: "Go directly to workflow shaping.",
      },
      {
        label: "Open Blacksite Lab",
        href: "/skills?view=blacksite&focus=skills-blacksite",
        detail: "Go directly to the isolated adversarial lab.",
      },
    ],
  },
];

export function getSurfaceCapability(id: string | null | undefined) {
  const resolvedId =
    resolveSurfaceCapabilityId(id) ?? DEFAULT_SURFACE_CAPABILITY_ID;
  return (
    SURFACE_CAPABILITIES.find((entry) => entry.id === resolvedId) ??
    SURFACE_CAPABILITIES[0]
  );
}
