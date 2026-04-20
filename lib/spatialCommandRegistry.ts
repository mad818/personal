export type SpatialSurface =
  | "hq"
  | "command"
  | "intel"
  | "alpha"
  | "cyber"
  | "recon"
  | "vault"
  | "resources"
  | "security"
  | "skills"
  | "vehicle";

export type SpatialAnchorTone = "steady" | "warning" | "critical";

export interface SpatialAnchorDefinition {
  id: string;
  label: string;
  status: string;
  nextAction: string;
  detail: string;
  href: string;
  tone: SpatialAnchorTone;
}

export interface SpatialSurfaceDefinition {
  kicker: string;
  note: string;
  anchors: SpatialAnchorDefinition[];
}

const SPATIAL_COMMAND_REGISTRY: Record<SpatialSurface, SpatialSurfaceDefinition> = {
  hq: {
    kicker: "Command lattice",
    note: "Chronicle and room remain equal primaries.",
    anchors: [
      {
        id: "hq-front",
        label: "Fronts",
        status: "Bastion compressed",
        nextAction: "Push into COMMAND",
        detail: "Use COMMAND when live runtime or provider posture needs the next operator decision.",
        href: "/command",
        tone: "warning",
      },
      {
        id: "hq-sweep",
        label: "Sweep",
        status: "Signal lanes warm",
        nextAction: "Open INTEL sweeps",
        detail: "Widen into INTEL when the chronicle needs signal, world posture, or active evidence collection.",
        href: "/intel?view=sweeps",
        tone: "steady",
      },
      {
        id: "hq-memory",
        label: "Memory",
        status: "Archive exact",
        nextAction: "Open VAULT archive",
        detail: "Shift into VAULT when the room needs durable continuity, filed evidence, or archived mission memory.",
        href: "/vault?view=archive",
        tone: "steady",
      },
    ],
  },
  command: {
    kicker: "Operations anchor",
    note: "One dispatch front, one support lane, one continuity spine.",
    anchors: [
      {
        id: "command-vector",
        label: "Vector",
        status: "Dispatch live",
        nextAction: "Lock provider health",
        detail: "Use the provider-health focus when operator confidence depends on runtime readiness and fallback posture.",
        href: "/command?focus=provider-health",
        tone: "warning",
      },
      {
        id: "command-efficiency",
        label: "Runtime",
        status: "Pressure bounded",
        nextAction: "Review efficiency lane",
        detail: "Open runtime efficiency to judge cost, tempo, and response quality before widening the mission.",
        href: "/command?focus=runtime-efficiency",
        tone: "steady",
      },
      {
        id: "command-memory",
        label: "Spine",
        status: "Continuity hot",
        nextAction: "Open memory spine",
        detail: "Jump straight to the memory spine when the active dispatch needs archived continuity or exact prior context.",
        href: "/command?focus=memory-spine",
        tone: "steady",
      },
    ],
  },
  intel: {
    kicker: "Signal anchor",
    note: "Widen only where the active front needs more signal.",
    anchors: [
      {
        id: "intel-news",
        label: "News",
        status: "Narrative active",
        nextAction: "Open news lane",
        detail: "Stay in the news view when the mission needs current narrative and live reporting before action.",
        href: "/intel?view=news",
        tone: "steady",
      },
      {
        id: "intel-world",
        label: "World",
        status: "Geopolitics hot",
        nextAction: "Open world picture",
        detail: "Open the world picture when macro posture or geopolitical context changes the current command decision.",
        href: "/intel?view=world",
        tone: "warning",
      },
      {
        id: "intel-sweeps",
        label: "Sweep",
        status: "Collection ready",
        nextAction: "Launch sweeps",
        detail: "Use the sweeps lane when the operator needs collection before the mission can compress back into HQ.",
        href: "/intel?view=sweeps",
        tone: "steady",
      },
    ],
  },
  alpha: {
    kicker: "Decision anchor",
    note: "Market review leads; every other lane supports the thesis.",
    anchors: [
      {
        id: "alpha-review",
        label: "Review",
        status: "Thesis staged",
        nextAction: "Open market review",
        detail: "Start in the market-review focus when the session needs thesis, posture, and next-action discipline.",
        href: "/alpha?focus=alpha-market-review",
        tone: "steady",
      },
      {
        id: "alpha-scanner",
        label: "Scanner",
        status: "Signals queued",
        nextAction: "Open scanner",
        detail: "Use the scanner when the desk needs a wider decision board before sizing or pricing.",
        href: "/alpha?view=scanner",
        tone: "warning",
      },
      {
        id: "alpha-prices",
        label: "Prices",
        status: "Tape live",
        nextAction: "Open price lane",
        detail: "Open prices when the active thesis needs direct market readouts instead of higher-level review.",
        href: "/alpha?view=prices",
        tone: "steady",
      },
    ],
  },
  cyber: {
    kicker: "Containment anchor",
    note: "Keep triage, evidence, and repair under one threat picture.",
    anchors: [
      {
        id: "cyber-triage",
        label: "Triage",
        status: "Containment armed",
        nextAction: "Open triage",
        detail: "Start in triage when urgency, scope, and action priority still need to be compressed.",
        href: "/cyber?view=triage",
        tone: "critical",
      },
      {
        id: "cyber-review",
        label: "Review",
        status: "Repair lane ready",
        nextAction: "Open vuln review",
        detail: "Use vuln review when the operator needs to pivot from signal into remediation and repair guidance.",
        href: "/cyber?view=vuln-review",
        tone: "warning",
      },
      {
        id: "cyber-cves",
        label: "CVEs",
        status: "Advisories hot",
        nextAction: "Open CVE lane",
        detail: "Move into CVEs when the threat picture depends on explicit advisory review and prioritization.",
        href: "/cyber?view=cves",
        tone: "warning",
      },
    ],
  },
  recon: {
    kicker: "Collection anchor",
    note: "The investigation lattice should feel like one quiet collection surface.",
    anchors: [
      {
        id: "recon-osint",
        label: "OSINT",
        status: "Sweep live",
        nextAction: "Open collection lane",
        detail: "Start with OSINT when the operator needs the main collection surface before narrowing into deeper pivots.",
        href: "/recon?view=osint",
        tone: "steady",
      },
      {
        id: "recon-repo",
        label: "Repo intel",
        status: "Metadata staged",
        nextAction: "Open repo lane",
        detail: "Use repo intel when a public codebase needs quick fit, dependency, or competitor framing.",
        href: "/recon?focus=recon-repo-intel",
        tone: "steady",
      },
      {
        id: "recon-opsec",
        label: "OPSEC",
        status: "Containment aware",
        nextAction: "Open OPSEC lane",
        detail: "Open OPSEC when the investigation needs exposure review before collection widens further.",
        href: "/recon?focus=recon-opsec",
        tone: "warning",
      },
    ],
  },
  vault: {
    kicker: "Archive anchor",
    note: "Memory should read as a spine, not a report wall.",
    anchors: [
      {
        id: "vault-archive",
        label: "Archive",
        status: "Continuity exact",
        nextAction: "Open archive",
        detail: "Use the archive view when the session needs durable compiled memory and filed mission evidence.",
        href: "/vault?view=archive",
        tone: "steady",
      },
      {
        id: "vault-relations",
        label: "Relations",
        status: "Graph active",
        nextAction: "Open relations",
        detail: "Move into relations when the archive needs link repair, topology review, or graph-focused continuity.",
        href: "/vault?view=relations",
        tone: "steady",
      },
      {
        id: "vault-publish",
        label: "Publish",
        status: "Exports ready",
        nextAction: "Open publish lane",
        detail: "Open publish when the operator is turning archive material into export or outbound reference artifacts.",
        href: "/vault?view=publish",
        tone: "warning",
      },
    ],
  },
  resources: {
    kicker: "Study anchor",
    note: "Reference lanes stay secondary to the active field.",
    anchors: [
      {
        id: "resources-finder",
        label: "Finder",
        status: "Index live",
        nextAction: "Open finder",
        detail: "Use the finder when the operator needs the quickest route into manuals, playbooks, or system references.",
        href: "/resources?view=finder",
        tone: "steady",
      },
      {
        id: "resources-playbooks",
        label: "Playbooks",
        status: "Workflows staged",
        nextAction: "Open playbooks",
        detail: "Open playbooks when the next move depends on governed process rather than open-ended exploration.",
        href: "/resources?view=playbooks",
        tone: "warning",
      },
      {
        id: "resources-voice",
        label: "Voice",
        status: "Lab armed",
        nextAction: "Open voice lab",
        detail: "Pivot into Voice Lab when spoken workflows or local audio tooling become the active lane.",
        href: "/resources?view=voice-lab",
        tone: "steady",
      },
    ],
  },
  security: {
    kicker: "Control anchor",
    note: "Trust posture stays instrument-like, never the whole view.",
    anchors: [
      {
        id: "security-doctrine",
        label: "Doctrine",
        status: "Controls armed",
        nextAction: "Open doctrine",
        detail: "Keep doctrine open when the route needs policy, controls, and trust posture on the main plane.",
        href: "/security?view=doctrine",
        tone: "steady",
      },
      {
        id: "security-ai",
        label: "AI surface",
        status: "Review ready",
        nextAction: "Open AI surface",
        detail: "Use the AI surface lane when operator risk depends on provider, prompt, or inference posture.",
        href: "/security?view=ai",
        tone: "warning",
      },
      {
        id: "security-physical",
        label: "Physical",
        status: "Monitoring live",
        nextAction: "Open physical ops",
        detail: "Open physical ops only when real-world access, cameras, or local deployment surface matters to the mission.",
        href: "/security?view=physical",
        tone: "warning",
      },
    ],
  },
  skills: {
    kicker: "Forge anchor",
    note: "Workflow capability should feel like an active forge, not a static catalog.",
    anchors: [
      {
        id: "skills-forge",
        label: "Forge",
        status: "Build lane warm",
        nextAction: "Open forge",
        detail: "Use Forge when the next move is shaping or upgrading a reusable workflow pattern.",
        href: "/skills?view=forge",
        tone: "steady",
      },
      {
        id: "skills-blacksite",
        label: "Blacksite",
        status: "Stress tests ready",
        nextAction: "Open blacksite",
        detail: "Open Blacksite when the system needs a more experimental or pressure-tested workflow lane.",
        href: "/skills?view=blacksite",
        tone: "warning",
      },
      {
        id: "skills-brain",
        label: "Brain",
        status: "Memory packed",
        nextAction: "Open brain",
        detail: "Use Brain when lessons, memory, and workflow continuity matter more than immediate creation.",
        href: "/skills?view=brain",
        tone: "steady",
      },
    ],
  },
  vehicle: {
    kicker: "Bridge anchor",
    note: "Bridge posture and readiness should feel like one bridge console.",
    anchors: [
      {
        id: "vehicle-bridge",
        label: "Bridge",
        status: "Readiness live",
        nextAction: "Open bridge status",
        detail: "Use the bridge status focus when the first question is overall system posture and readiness.",
        href: "/vehicle?focus=vehicle-bridge-status",
        tone: "steady",
      },
      {
        id: "vehicle-onboarding",
        label: "Onboarding",
        status: "Connector staged",
        nextAction: "Open onboarding",
        detail: "Open connector onboarding when the next move is bringing a new hardware path into the bridge cleanly.",
        href: "/vehicle?focus=vehicle-connector-onboarding",
        tone: "warning",
      },
      {
        id: "vehicle-artifact",
        label: "Artifacts",
        status: "Bundles exact",
        nextAction: "Open artifact lane",
        detail: "Use the artifact convention when the bridge needs durable bundles, checklists, and field continuity.",
        href: "/vehicle?focus=vehicle-artifact-convention",
        tone: "steady",
      },
    ],
  },
};

export function getSpatialSurfaceDefinition(surface: SpatialSurface): SpatialSurfaceDefinition {
  return SPATIAL_COMMAND_REGISTRY[surface];
}
