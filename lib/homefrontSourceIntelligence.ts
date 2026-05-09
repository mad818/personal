export type HomefrontSourceIntelligenceLane = {
  label: string;
  title: string;
  body: string;
  posture: string;
  references: string[];
};

export type HomefrontSourceGovernanceStep = {
  step: string;
  body: string;
};

export type HomefrontSourceActiveQueueItem = {
  lane: string;
  status: "active" | "guarded" | "staged";
  source: string;
  next: string;
};

export type HomefrontSourceType = "github" | "x-post" | "reference";
export type HomefrontSourceSurface =
  | "RESOURCES"
  | "RECON"
  | "CYBER"
  | "COMMAND"
  | "SKILLS"
  | "VAULT"
  | "private ARPG";
export type HomefrontSourceLedgerStatus =
  | "mapped"
  | "candidate"
  | "blocked"
  | "rejected"
  | "private-lane";

export type HomefrontSourceLedgerItem = {
  label: string;
  href: string;
  sourceType: HomefrontSourceType;
  surface: HomefrontSourceSurface;
  status: HomefrontSourceLedgerStatus;
  decisionReason: string;
  nextAction: string;
  vaultHref: string;
};

export type HomefrontSourceIntakeItem = {
  label: string;
  value: string;
  detail: string;
};

export const HOMEFRONT_SOURCE_INTELLIGENCE_LANES: HomefrontSourceIntelligenceLane[] =
  [
    {
      label: "Governance",
      title: "Autonomy stays scoped",
      body: "Autonomous testing standards and agent-permission scanners become review language: scope, oversight, audit trails, and operator stops.",
      posture: "Approval gated",
      references: ["APTS", "AgentShield"],
    },
    {
      label: "Recon",
      title: "Passive-first by default",
      body: "OSINT and security toolkits become taxonomy, checklists, and source trails. Homefront does not bundle exploit suites or arbitrary scanning.",
      posture: "Passive-first",
      references: ["OSINT Arsenal", "GhostTrack", "DeepZero"],
    },
    {
      label: "Taste",
      title: "Design memory, not style drift",
      body: "Design-system specs and taste skills turn the premium language into durable constraints so future screens keep the same command-room voice.",
      posture: "Design contract",
      references: ["design.md", "taste-skill"],
    },
    {
      label: "Tooling",
      title: "Private lanes stay guarded",
      body: "Sprite and asset tooling can inform private production workflows later, but public Homefront remains command intelligence and source discipline.",
      posture: "Private tooling",
      references: ["sprite forge", "pixel snapper"],
    },
  ];

export const HOMEFRONT_SOURCE_GOVERNANCE_STEPS: HomefrontSourceGovernanceStep[] =
  [
    {
      step: "Scan",
      body: "Read the source and decide whether it is useful to Homefront at all.",
    },
    {
      step: "Map",
      body: "Translate the idea into a Nexus surface, doc, guardrail, or later backlog item.",
    },
    {
      step: "Gate",
      body: "Block unsafe automation, unclear licensing, public/private leaks, and unverified dependencies.",
    },
    {
      step: "Record",
      body: "Write the disposition into docs so the next pass starts from proof, not memory fuzz.",
    },
  ];

export const HOMEFRONT_SOURCE_ACTIVE_QUEUE: HomefrontSourceActiveQueueItem[] = [
  {
    lane: "Agent safety",
    status: "active",
    source: "APTS + AgentShield",
    next: "Turn autonomy and permission-review ideas into local checklists before any tool dependency.",
  },
  {
    lane: "Recon taxonomy",
    status: "active",
    source: "OSINT arsenal + security projects",
    next: "Keep the useful lookup categories, drop installer flows, and preserve authorized-use boundaries.",
  },
  {
    lane: "Taste contract",
    status: "active",
    source: "design.md + taste-skill",
    next: "Use design-memory ideas to keep Homefront screens premium, restrained, and consistent.",
  },
  {
    lane: "Private art tooling",
    status: "guarded",
    source: "sprite tooling batch",
    next: "Keep generation and cleanup workflows private until licensing, provenance, and manifest proof are clean.",
  },
  {
    lane: "X link batch",
    status: "staged",
    source: "workflow + security + design posts",
    next: "Review each post before promotion; no implementation from headlines alone.",
  },
];

export const HOMEFRONT_SOURCE_LEDGER: HomefrontSourceLedgerItem[] = [
  {
    label: "OWASP APTS",
    href: "https://github.com/OWASP/APTS",
    sourceType: "github",
    surface: "CYBER",
    status: "mapped",
    decisionReason:
      "Useful as agent-testing posture and audit vocabulary, not as a bypass around local review gates.",
    nextAction: "Convert autonomy checks into CYBER/SKILLS review criteria.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "AgentShield",
    href: "https://github.com/affaan-m/agentshield",
    sourceType: "github",
    surface: "SKILLS",
    status: "mapped",
    decisionReason:
      "Permission-review ideas fit the assistant/tool posture model already in Nexus.",
    nextAction: "Map permission checks into operator workflow receipt language.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "Cybersecurity-Projects",
    href: "https://github.com/CarterPerez-dev/Cybersecurity-Projects",
    sourceType: "github",
    surface: "CYBER",
    status: "candidate",
    decisionReason:
      "Useful as defensive learning taxonomy only; individual projects need authorized-use review.",
    nextAction: "Extract passive checklist patterns, reject exploit-first flows.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "GhostTrack",
    href: "https://github.com/HunxByts/GhostTrack",
    sourceType: "github",
    surface: "RECON",
    status: "blocked",
    decisionReason:
      "Tracking-oriented tooling is too risky for direct integration without a narrow lawful scope.",
    nextAction: "Keep only high-level OSINT boundary notes if reviewed later.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "hackingtool",
    href: "https://github.com/Z4nzu/hackingtool",
    sourceType: "github",
    surface: "CYBER",
    status: "rejected",
    decisionReason:
      "Broad offensive toolkit aggregation conflicts with passive-first CYBER/RECON posture.",
    nextAction: "Do not vendor, install, or expose this as a tool lane.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "sprite-sheet-creator",
    href: "https://github.com/blendi-remade/sprite-sheet-creator",
    sourceType: "github",
    surface: "private ARPG",
    status: "private-lane",
    decisionReason:
      "Potentially useful for private game asset workflow, not public Homefront positioning.",
    nextAction: "Consider only inside the ARPG asset-pipeline ledger after licensing review.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "agent-sprite-forge",
    href: "https://github.com/0x0funky/agent-sprite-forge",
    sourceType: "github",
    surface: "private ARPG",
    status: "private-lane",
    decisionReason:
      "Sprite generation workflow belongs to the private Aether Reliquary lane if provenance is clean.",
    nextAction: "Review later against ARPG asset ledger rules.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "awesome-osint-arsenal",
    href: "https://github.com/rawfilejson/awesome-osint-arsenal",
    sourceType: "github",
    surface: "RECON",
    status: "mapped",
    decisionReason:
      "Curated OSINT categories fit RECON as passive source taxonomy, not automated probing.",
    nextAction: "Translate useful categories into RECON source/evidence lanes.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "spritefusion pixel snapper",
    href: "https://github.com/Hugo-Dz/spritefusion-pixel-snapper",
    sourceType: "github",
    surface: "private ARPG",
    status: "private-lane",
    decisionReason:
      "Pixel tooling may help private game production but should not affect Homefront routes.",
    nextAction: "Hold for ARPG asset-pipeline planning.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "DeepZero",
    href: "https://github.com/416rehman/DeepZero",
    sourceType: "github",
    surface: "CYBER",
    status: "candidate",
    decisionReason:
      "Security-agent patterns need defensive scoping before they can influence Nexus tools.",
    nextAction: "Review for passive triage or eval ideas only.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "taste-skill",
    href: "https://github.com/Leonxlnx/taste-skill",
    sourceType: "github",
    surface: "RESOURCES",
    status: "mapped",
    decisionReason:
      "Design-memory patterns support the Homefront visual contract and route consistency.",
    nextAction: "Keep taste rules in RESOURCES and design-system guidance.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "google-labs design.md",
    href: "https://github.com/google-labs-code/design.md",
    sourceType: "github",
    surface: "RESOURCES",
    status: "mapped",
    decisionReason:
      "Design.md already matches the repo's design-check lane and should stay a governance input.",
    nextAction: "Keep enforcing through design checks, not ad hoc visual drift.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "witr",
    href: "https://github.com/pranshuparmar/witr?ref=opensourceprojects.dev",
    sourceType: "github",
    surface: "RESOURCES",
    status: "candidate",
    decisionReason:
      "Workflow idea needs inspection before it becomes a Nexus playbook or tool.",
    nextAction: "Map it to RESOURCES only after source review.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "Voxyz AI X post",
    href: "https://x.com/Voxyz_ai/status/2045899539526148193",
    sourceType: "x-post",
    surface: "COMMAND",
    status: "candidate",
    decisionReason:
      "Potential command/workflow idea, but X posts are source pointers rather than implementation evidence.",
    nextAction: "Read the full context before mapping to COMMAND or RESOURCES.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "BugBountyCenter X post",
    href: "https://x.com/BugBountyCenter/status/2048390824832938042",
    sourceType: "x-post",
    surface: "CYBER",
    status: "candidate",
    decisionReason:
      "Bug-bounty ideas must stay defensive, scoped, and advisory before entering CYBER.",
    nextAction: "Extract defensive checklist language only after source review.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "heynavtoor X post",
    href: "https://x.com/heynavtoor/status/2048036289367445941",
    sourceType: "x-post",
    surface: "SKILLS",
    status: "candidate",
    decisionReason:
      "Potentially useful for operator workflow and context discipline, but not from headline alone.",
    nextAction: "Map to assistant workflow or RESOURCES playbook only after review.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "Dinosn X post",
    href: "https://x.com/Dinosn/status/2048233843937746973",
    sourceType: "x-post",
    surface: "RESOURCES",
    status: "candidate",
    decisionReason:
      "Idea may be useful, but the repo should not absorb social-post claims without underlying proof.",
    nextAction: "Review for durable pattern, then file only the mapped summary.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "heygurisingh X post",
    href: "https://x.com/heygurisingh/status/2048296376187158600",
    sourceType: "x-post",
    surface: "RESOURCES",
    status: "candidate",
    decisionReason:
      "Potential product/process reference; needs evidence before becoming a Nexus playbook.",
    nextAction: "Promote only if it strengthens an existing RESOURCES lane.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "LearnWithBrij X post",
    href: "https://x.com/LearnWithBrij/status/2048012859062522114",
    sourceType: "x-post",
    surface: "SKILLS",
    status: "candidate",
    decisionReason:
      "Potential learning/workflow reference, but should enter as skill visibility or study guidance only.",
    nextAction: "Review for a bounded SKILLS or RESOURCES checklist.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "tom_doerr X post",
    href: "https://x.com/tom_doerr/status/2048335481205649799",
    sourceType: "x-post",
    surface: "COMMAND",
    status: "candidate",
    decisionReason:
      "Potential operator/productivity pattern, not a dependency and not implementation proof.",
    nextAction: "Map to COMMAND only if it improves route actions or proof receipts.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
  {
    label: "0x0funky X sprite post",
    href: "https://x.com/0x0funky/status/2048433528162193854",
    sourceType: "x-post",
    surface: "private ARPG",
    status: "private-lane",
    decisionReason:
      "Sprite/asset ideas belong to the private RPG lane and require provenance checks.",
    nextAction: "Hold for ARPG asset-pipeline review, not Homefront copy.",
    vaultHref: "/vault?focus=vault-compiled-pages&workflowId=source-intel",
  },
];

export const HOMEFRONT_SOURCE_INTAKE: HomefrontSourceIntakeItem[] = [
  {
    label: "Source posture",
    value: "No vendoring",
    detail: "External repos become mapped patterns, not hidden dependencies.",
  },
  {
    label: "Recon posture",
    value: "Passive-first",
    detail: "Security and OSINT ideas stay advisory until scope is explicit.",
  },
  {
    label: "Approval posture",
    value: "Operator approved",
    detail: "Risky actions, new tools, and private-lane changes stay gated.",
  },
];

export const HOMEFRONT_SOURCE_OPERATOR_GUARDRAILS = [
  "No new runtime dependency without local value, license clarity, and rollback plan.",
  "No offensive automation enters RECON/CYBER without explicit scope and operator approval.",
  "No private RPG or art-tooling lane becomes public Homefront positioning.",
  "No X post becomes implementation until the underlying idea is read and mapped.",
] as const;
