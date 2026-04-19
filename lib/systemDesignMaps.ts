import {
  DEFAULT_SYSTEM_DESIGN_ID,
  resolveSystemDesignId,
} from "@/lib/resourceSessionRegistry";

export type SystemDesignBoundary = "local_only" | "external_proxied" | "hybrid";
export type SystemDesignRisk = "moderate" | "high";

export interface SystemDesignAction {
  label: string;
  href: string;
  detail: string;
}

export interface SystemDesignMap {
  id: string;
  title: string;
  summary: string;
  ownership: string;
  boundary: SystemDesignBoundary;
  changeRisk: SystemDesignRisk;
  primaryRoute: string;
  surfaces: string[];
  entryPoints: string[];
  readFirst: string[];
  dependencies: string[];
  failureModes: string[];
  guardrails: string[];
  performanceHotspots: string[];
  microOptimizations: string[];
  securityAuditChecks: string[];
  nextActions: SystemDesignAction[];
  impactSeedFiles: string[];
}

export const SYSTEM_DESIGN_MAPS: SystemDesignMap[] = [
  {
    id: "hq-mission-flow",
    title: "HQ shell and mission flow",
    summary:
      "Owns the operator’s main starting surface, chronicle flow, mission handoff, and route continuity into the rest of Nexus.",
    ownership: "UI orchestration with local mission routing",
    boundary: "local_only",
    changeRisk: "high",
    primaryRoute: "/hq",
    surfaces: ["HQ", "COMMAND", "VAULT", "VEHICLE"],
    entryPoints: [
      "app/page.tsx",
      "app/hq/page.tsx",
      "components/home/office/OfficeCommandCenter.tsx",
    ],
    readFirst: [
      "components/home/office/OfficeCommandCenter.tsx",
      "components/home/office/HQConsoleShellSection.tsx",
      "lib/missionHandoff.ts",
    ],
    dependencies: [
      "Zustand shell state",
      "mission handoff strip",
      "HQ prelude and terminal sections",
    ],
    failureModes: [
      "Half-rendered shell after auth or stale browser state",
      "Route continuity dead-ends after mission launch",
      "Overloaded HQ render path causing fragile edits",
    ],
    guardrails: [
      "Keep HQ orchestration thin and route helpers centralized",
      "Do not bypass mission handoff helpers for new route jumps",
      "Preserve compact-note and continuation patterns to limit text overload",
    ],
    performanceHotspots: [
      "Large HQ render tree with chronicle, scene shell, and route continuity reacting together",
      "Heavy office-state changes can re-render more chrome than intended",
      "Mission continuity UI can add visual density if kept inline instead of sectioned",
    ],
    microOptimizations: [
      "Keep pure render sections extracted from OfficeCommandCenter before adding new HQ features",
      "Prefer routed intent helpers over repeated inline callbacks for mission actions",
      "Move dense explanatory copy behind compact notes once action flow is clear",
    ],
    securityAuditChecks: [
      "Auth recovery and stale-shell self-heal must not expose unauthenticated chrome states",
      "Mission handoff params should carry intent only, not secrets or sensitive content",
      "Protected local fetches should remain behind apiFetch and session-token boundaries",
    ],
    nextActions: [
      {
        label: "Open HQ chronicle",
        href: "/hq?focus=hq-chronicle",
        detail: "Work from the live chronicle block when tightening mission continuity or answer-to-action flow.",
      },
      {
        label: "Open safe refactor playbook",
        href: "/resources?view=playbooks&playbook=safe-refactor",
        detail: "Use the existing thin-shell refactor workflow before widening HQ edits.",
      },
      {
        label: "Open agent health",
        href: "/command?focus=agent-health",
        detail: "Watch runtime regressions and verification posture while touching the main shell.",
      },
    ],
    impactSeedFiles: [
      "components/home/office/OfficeCommandCenter.tsx",
      "components/home/office/HQTerminalSection.tsx",
      "lib/missionHandoff.ts",
    ],
  },
  {
    id: "ai-runtime-boundary",
    title: "AI runtime and provider boundary",
    summary:
      "Owns model routing, provider normalization, local-first defaults, and the only supported path for AI calls and streaming.",
    ownership: "Server/runtime boundary with local-first defaults",
    boundary: "hybrid",
    changeRisk: "high",
    primaryRoute: "/command",
    surfaces: ["HQ", "COMMAND", "AI routes", "Settings"],
    entryPoints: [
      "lib/ai.ts",
      "lib/agent.ts",
      "app/api/ai/route.ts",
      "lib/aiProviderPreference.ts",
    ],
    readFirst: [
      "lib/ai.ts",
      "lib/agent.ts",
      "lib/aiProviderPreference.ts",
    ],
    dependencies: [
      "provider preference normalization",
      "runtime status and auth session",
      "protected local AI routes",
    ],
    failureModes: [
      "Paid provider drift becomes default by mistake",
      "Client/server provider maps diverge",
      "Direct provider calls bypass shared safeguards",
      "AI answers sound authoritative even when current evidence or tool results were never actually observed",
    ],
    guardrails: [
      "All AI calls must stay inside lib/ai.ts",
      "Preserve ollama/local-first as the default lane",
      "Treat hidden provider values as invalid and normalize them",
      "Prefer explicit uncertainty and verification steps over fabricated confidence",
    ],
    performanceHotspots: [
      "Repeated AI routing or prompt assembly inside hot UI paths can create unnecessary churn",
      "Batch/caching decisions affect scheduler cost and runtime responsiveness together",
      "Status probing across client and server can become noisy if duplicated",
    ],
    microOptimizations: [
      "Centralize provider normalization and reuse parsed runtime config instead of recomputing",
      "Split stable prompt prefixes from volatile deltas before widening scheduled AI usage",
      "Avoid adding new provider branches outside the shared runtime helpers",
      "Keep truth-boundary and evidence-discipline wording in one helper so prompt hardening does not drift across routes",
    ],
    securityAuditChecks: [
      "No direct provider calls outside lib/ai.ts or protected routes",
      "Free-first defaults must not drift silently toward paid providers",
      "Provider settings persisted in the browser must stay normalized and sanitized",
      "Shared prompts must forbid fabricated citations, tool results, and unverified live-state claims",
    ],
    nextActions: [
      {
        label: "Open runtime efficiency",
        href: "/command?focus=runtime-efficiency",
        detail: "Keep provider posture, prompt waste, and verification drift visible while changing AI behavior.",
      },
      {
        label: "Open hallucination audit",
        href: "/resources?view=playbooks&playbook=hallucination-hardening",
        detail: "Use the shared truth-boundary workflow before widening prompt or routing edits.",
      },
      {
        label: "Open AI surface review",
        href: "/security?view=ai&focus=security-ai-surface",
        detail: "Review prompt, tool, retrieval, and persistence risks on the route built for them.",
      },
    ],
    impactSeedFiles: [
      "lib/ai.ts",
      "lib/agent.ts",
      "lib/aiProviderPreference.ts",
      "app/api/ai/route.ts",
    ],
  },
  {
    id: "memory-spine",
    title: "Memory spine and compiled pages",
    summary:
      "Unifies saved clips, learnings, outputs, compiled pages, and local memory search into one protected archive and recall layer.",
    ownership: "Local-only knowledge contract",
    boundary: "local_only",
    changeRisk: "high",
    primaryRoute: "/vault",
    surfaces: ["VAULT", "COMMAND", "HQ", "Scheduler"],
    entryPoints: [
      "lib/memorySpine.ts",
      "lib/memoryPagesStore.ts",
      "app/api/memory/pages/route.ts",
      "components/vault/CompiledMemoryPagesPanel.tsx",
    ],
    readFirst: [
      "lib/memorySpine.ts",
      "lib/memoryPagesStore.ts",
      "app/api/memory/pages/route.ts",
    ],
    dependencies: [
      "visibility classification",
      "memory ask/search routes",
      "compiled-page storage and render surfaces",
    ],
    failureModes: [
      "Restricted content accidentally becomes broad-search visible",
      "Compiled artifacts feel dead-end instead of reusable",
      "Cross-surface filing drift creates inconsistent metadata",
    ],
    guardrails: [
      "Never downgrade restricted/internal visibility through UI convenience",
      "Keep memory routes protected and local-only",
      "Preserve artifact continuity into VAULT, HQ, or memory ask",
    ],
    performanceHotspots: [
      "Cross-surface memory refreshes can cascade into VAULT and COMMAND at the same time",
      "Large compiled-page previews can bloat list rendering if shown by default",
      "Memory derivation helpers sit on a shared contract that many panels consume",
    ],
    microOptimizations: [
      "Prefer compact metadata and lazy page reads over long preview text in lists",
      "Use stable metadata keys instead of full payload stringify comparisons for sync heuristics",
      "Keep memory derivation helpers pure so route and UI layers stay thin",
    ],
    securityAuditChecks: [
      "Restricted content must stay withheld from broad search and generic previews",
      "Manual filing must never lower automatically inferred visibility",
      "All memory APIs should remain protected and no-store",
    ],
    nextActions: [
      {
        label: "Open stewardship",
        href: "/vault?focus=vault-stewardship",
        detail: "Start with archive health before touching broader memory flows.",
      },
      {
        label: "Repair route-less pages",
        href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
        detail: "Jump directly into compiled pages that still need route continuity.",
      },
      {
        label: "Open memory spine",
        href: "/command?focus=memory-spine",
        detail: "Keep sync posture and local-memory readiness visible during archive work.",
      },
    ],
    impactSeedFiles: [
      "lib/memorySpine.ts",
      "lib/memoryPagesStore.ts",
      "components/vault/CompiledMemoryPagesPanel.tsx",
      "app/api/memory/pages/route.ts",
    ],
  },
  {
    id: "scheduler-governance",
    title: "Scheduler and automation governance",
    summary:
      "Controls scheduled mission creation, governance posture, batching, audit exports, and durable writeback into registry and memory.",
    ownership: "Operator-controlled automation boundary",
    boundary: "local_only",
    changeRisk: "high",
    primaryRoute: "/command",
    surfaces: ["Scheduler drawer", "COMMAND", "VAULT"],
    entryPoints: [
      "components/ui/CronSchedulerPanel.tsx",
      "components/ui/CronSchedulerRunner.tsx",
      "lib/schedulerGovernance.ts",
    ],
    readFirst: [
      "components/ui/CronSchedulerPanel.tsx",
      "components/ui/CronSchedulerRunner.tsx",
      "lib/schedulerGovernance.ts",
    ],
    dependencies: [
      "workflow command metadata",
      "batch/cache strategy",
      "recent execution ledger and export payloads",
    ],
    failureModes: [
      "Queued jobs wedge or retry without a clear operator path",
      "Auditability gets lost across batch lanes",
      "Text-heavy controls hide the real state transitions",
    ],
    guardrails: [
      "Keep review-only workflows visibly gated",
      "Treat scheduler artifacts as durable audit surfaces, not just transient results",
      "Prefer compact notes and section splits over new control walls",
    ],
    performanceHotspots: [
      "Scheduler panel can become a rerender hotspot because it mixes composer, job list, audits, and saved views",
      "Batch/cache posture affects both job execution cost and audit clarity",
      "Recent-run history and export features grow in complexity together",
    ],
    microOptimizations: [
      "Keep scheduler UI split into small sections before adding more governance features",
      "Reuse centralized audit/export builders instead of duplicating filtered history logic",
      "Prefer compact default job cards with detail on demand",
    ],
    securityAuditChecks: [
      "Queued/native batch lanes must fail visibly instead of wedging silently",
      "Scheduler exports should include only the intended audit surface, not unrelated state",
      "Automation posture must remain explicit for review-only commands",
    ],
    nextActions: [
      {
        label: "Open scheduler governance",
        href: "/hq?focus=hq-scheduler-governance",
        detail: "Use the exact HQ governance session instead of a broad shell landing while tightening scheduler posture.",
      },
      {
        label: "Open compiled pages",
        href: "/vault?focus=vault-compiled-pages",
        detail: "Review durable scheduler writeback in the archive lane instead of reading around it.",
      },
      {
        label: "Open runtime efficiency",
        href: "/command?focus=runtime-efficiency",
        detail: "Watch batching, prompt cost, and verification posture while adjusting scheduler behavior.",
      },
    ],
    impactSeedFiles: [
      "components/ui/CronSchedulerPanel.tsx",
      "components/ui/CronSchedulerRunner.tsx",
      "lib/schedulerGovernance.ts",
    ],
  },
  {
    id: "recon-boundary",
    title: "RECON protected-route boundary",
    summary:
      "Owns browser-to-server containment for lookups, BYOK connector posture, and degraded handling across reconnaissance lanes.",
    ownership: "Protected local connector boundary",
    boundary: "external_proxied",
    changeRisk: "moderate",
    primaryRoute: "/recon",
    surfaces: ["RECON", "Settings", "Protected API routes"],
    entryPoints: [
      "components/recon/ReconLookup.tsx",
      "app/api/recon/lookup/route.ts",
      "app/api/recon/passive-dns/route.ts",
      "app/api/recon/tor-check/route.ts",
    ],
    readFirst: [
      "components/recon/ReconLookup.tsx",
      "app/api/recon/lookup/route.ts",
      "lib/security/routePolicy.ts",
    ],
    dependencies: [
      "protected api headers",
      "settings contract for BYOK routes",
      "offline/degraded retained results",
    ],
    failureModes: [
      "Browser-direct third-party fetches reappear",
      "Connector failures look like authoritative negatives",
      "BYOK secrets drift into client-persisted state",
    ],
    guardrails: [
      "All third-party reconnaissance must go through protected local routes",
      "Unavailable must stay unavailable, not silently read as negative",
      "Keep secrets server-owned and session-only where applicable",
    ],
    performanceHotspots: [
      "Lookup panels can become noisy if each lane retries independently during degraded sessions",
      "Retained result handling must not trigger extra rerenders or wipe good state on partial failure",
      "Connector-heavy surfaces can regress quickly if browser-direct fetches reappear",
    ],
    microOptimizations: [
      "Reuse protected local routes for all external lookups rather than adding bespoke browser fetches",
      "Preserve last good results on failure to avoid churn and operator confusion",
      "Keep route wrappers consistent so auth/degraded behavior stays shared",
    ],
    securityAuditChecks: [
      "No third-party RECON fetches should originate from the browser",
      "Connector failures must not be interpreted as clean/negative results",
      "BYOK settings should remain server-owned and sanitized out of persisted client state",
    ],
    nextActions: [
      {
        label: "Open RECON OPSEC",
        href: "/recon?view=opsec&focus=recon-opsec",
        detail: "Start with trust-boundary and degraded-mode verification before wider lookup work.",
      },
      {
        label: "Open security boundary audit",
        href: "/resources?view=playbooks&playbook=security-boundary-audit",
        detail: "Use the shared route/policy workflow before touching browser-server connector seams.",
      },
      {
        label: "Open lookup lane",
        href: "/recon?view=osint&focus=recon-lookup",
        detail: "Jump directly into the target-led RECON panel when validating live lookup behavior.",
      },
    ],
    impactSeedFiles: [
      "components/recon/ReconLookup.tsx",
      "app/api/recon/lookup/route.ts",
      "lib/security/routePolicy.ts",
    ],
  },
  {
    id: "vehicle-bridge",
    title: "Vehicle passive bridge and future hardware prep",
    summary:
      "Keeps the drone lane honest before hardware arrives, while preparing telemetry ingest, compliance review, artifacts, and future part-design flows.",
    ownership: "Observer-first vehicle readiness surface",
    boundary: "local_only",
    changeRisk: "moderate",
    primaryRoute: "/internal/vehicle",
    surfaces: ["VEHICLE", "VAULT", "CYBER drone lane"],
    entryPoints: [
      "components/vehicle/DroneOpsLaunchpad.tsx",
      "components/vehicle/VehicleArtifactManifestCard.tsx",
      "lib/vehicle/hardwareReadiness.ts",
      "scripts/vehicle-bridge-stub.mjs",
    ],
    readFirst: [
      "components/vehicle/DroneOpsLaunchpad.tsx",
      "components/vehicle/VehicleArtifactManifestCard.tsx",
      "lib/vehicle/hardwareReadiness.ts",
    ],
    dependencies: [
      "sim telemetry and bridge fallback",
      "future hardware readiness contract",
      "Vault filing and render brief continuity",
    ],
    failureModes: [
      "UX implies live aircraft authority before hardware exists",
      "Bridge readiness and simulation posture get conflated",
      "Future-hardware artifacts disappear into generic archive UX",
    ],
    guardrails: [
      "Nexus must remain non-flight-critical",
      "Simulation and passive bridge posture must stay explicit",
      "Future hardware prep artifacts should look distinct from live ops records",
    ],
    performanceHotspots: [
      "Vehicle session bundles can grow as telemetry history accumulates",
      "Future artifact/export flows should avoid eager serialization in render paths",
      "Bridge and sim posture can create extra UI state churn if mixed together carelessly",
    ],
    microOptimizations: [
      "Generate session or render-brief JSON only on demand, not during steady-state rendering",
      "Keep readiness helpers pure and contract-driven so future hardware flows stay composable",
      "Prefer passive observer updates over broad state rewrites when bridge frames arrive",
    ],
    securityAuditChecks: [
      "Vehicle surfaces must never imply live flight authority before real hardware exists",
      "Passive bridge ingestion should remain observer-first and local-only",
      "Future hardware artifacts should avoid leaking sensitive local file paths or secrets",
    ],
    nextActions: [
      {
        label: "Open connector onboarding",
        href: "/vehicle?focus=vehicle-connector-onboarding",
        detail: "Start future hardware prep at the exact onboarding panel instead of the top of VEHICLE.",
      },
      {
        label: "Open artifact convention",
        href: "/vehicle?focus=vehicle-artifact-convention",
        detail: "Jump directly into session bundles and render-brief continuity for future hardware work.",
      },
      {
        label: "Open drone compliance",
        href: "/cyber?view=drone&focus=cyber-drone",
        detail: "Keep the paired FAA and operational review lane close to the readiness workflow.",
      },
    ],
    impactSeedFiles: [
      "components/vehicle/VehicleArtifactManifestCard.tsx",
      "lib/vehicle/hardwareReadiness.ts",
      "components/vehicle/DroneOpsLaunchpad.tsx",
    ],
  },
];

export function getSystemDesignMap(id: string | null | undefined) {
  const resolvedId = resolveSystemDesignId(id) ?? DEFAULT_SYSTEM_DESIGN_ID;
  return SYSTEM_DESIGN_MAPS.find((entry) => entry.id === resolvedId) ?? SYSTEM_DESIGN_MAPS[0];
}
