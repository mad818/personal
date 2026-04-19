/**
 * Curated external references for AI engineering, agents, and tooling.
 * All URLs are public GitHub repos or docs; Nexus does not embed their content.
 */
export type ResourceCategory =
  | "certification"
  | "study"
  | "tooling"
  | "ecosystem";

export type ResourceFit = "fit_now" | "reference" | "defer";
export type ResourceChamberHint =
  | "finder"
  | "start"
  | "study"
  | "system"
  | "launch"
  | "utilities";

export interface DeveloperResource {
  title: string;
  href: string;
  description: string;
  category: ResourceCategory;
  /** Optional nuance (e.g. partner-only course) */
  note?: string;
  costTier?:
    | "free"
    | "limited_free"
    | "open_source"
    | "byok"
    | "free_local"
    | "license_check";
  licenseHint?: string;
  tags?: string[];
  integrationFit?: ResourceFit;
  recommendedChambers?: ResourceChamberHint[];
}

export const DEVELOPER_RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  certification: "Certification",
  study: "Study & interviews",
  tooling: "Tooling",
  ecosystem: "Agents & plugins",
};

export const DEVELOPER_RESOURCE_FIT_LABELS: Record<ResourceFit, string> = {
  fit_now: "Integrate now",
  reference: "Pattern reference",
  defer: "Later lane",
};

export const DEVELOPER_RESOURCES: DeveloperResource[] = [
  {
    title: "Claude Certified Architect — Foundations",
    href: "https://github.com/paullarionov/claude-certified-architect",
    description:
      "Study guides (EN/RU/ZH/JA) and PDFs for Anthropic’s architect certification track — tool design, MCP, structured output, context, reliability.",
    category: "certification",
    note: "Official course access may require partner registration; repo is community study material.",
    costTier: "limited_free",
    licenseHint: "Community study material",
    tags: ["certification", "architect", "study"],
  },
  {
    title: "AI Engineering Interview Questions",
    href: "https://github.com/amitshekhariitbhu/ai-engineering-interview-questions",
    description:
      "Broad Q&A cheat sheet: LLMs, RAG, agents, fine-tuning, vectors, LLMOps, safety, system design, and coding drills.",
    category: "study",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["interviews", "agents", "systems"],
  },
  {
    title: "Maths, CS & AI Compendium",
    href: "https://github.com/HenryNdubuaku/maths-cs-ai-compendium",
    description:
      "Open textbook-style notes from vectors through transformers, vision, speech, multimodal, and systems — intuition-first.",
    category: "study",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["math", "ml", "reference"],
  },
  {
    title: "Unsloth",
    href: "https://github.com/unslothai/unsloth",
    description:
      "Unsloth Studio (local web UI) and Unsloth Core — download, run, fine-tune, and export open models (Qwen, DeepSeek, gpt-oss, Gemma, etc.) with optimized kernels and lower VRAM use.",
    category: "tooling",
    note: "Runs beside Nexus, not inside it. After `unsloth studio`, point Nexus “Local LLM Endpoint” at any OpenAI-compatible URL the stack exposes, or keep using Ollama.",
    costTier: "free_local",
    licenseHint: "Check upstream repo",
    tags: ["local-models", "fine-tune", "studio"],
  },
  {
    title: "Voicebox",
    href: "https://github.com/jamiepine/voicebox",
    description:
      "Local-first voice cloning and synthesis reference for profile management, effect presets, and multi-segment audio project workflows.",
    category: "tooling",
    note: "Pattern reference for Nexus Voice Lab. Keep generated audio and profile state local, with browser TTS remaining the zero-dependency fallback.",
    costTier: "free_local",
    licenseHint: "Check upstream repo",
    tags: ["voice", "audio", "local-runtime", "tts"],
    integrationFit: "fit_now",
    recommendedChambers: ["launch", "utilities"],
  },
  {
    title: "CodeFlow",
    href: "https://github.com/braedonsaunders/codeflow",
    description:
      "Architecture-analysis reference for dependency graphs, ownership, churn hotspots, blast radius, and code health visualization.",
    category: "tooling",
    note: "Reference for the local-only Impact expansion. Keep Nexus analysis repo-local and privacy-first instead of widening into remote code upload.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["architecture", "graph", "ownership", "security"],
    integrationFit: "fit_now",
    recommendedChambers: ["system", "utilities"],
  },
  {
    title: "LLM anonymization",
    href: "https://github.com/zeroc00I/LLM-anonymization",
    description:
      "Reference implementation patterns for masking sensitive identifiers before cloud-bound inference while preserving reversible local surrogates.",
    category: "ecosystem",
    note: "Useful for privacy-shield posture in HQ, CYBER, and RECON. Keep surrogate maps local and session-scoped instead of creating a remote privacy service.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["privacy", "anonymization", "surrogates", "security"],
    integrationFit: "fit_now",
    recommendedChambers: ["system", "utilities"],
  },
  {
    title: "Awesome LLMs for Vulnerability Detection",
    href: "https://github.com/huhusmang/Awesome-LLMs-for-Vulnerability-Detection",
    description:
      "Curated benchmark, paper, and tool index for defensive vulnerability detection with LLMs, evaluation strategies, and prompt patterns.",
    category: "study",
    note: "Use as the benchmark and literature map behind CYBER vulnerability review. Treat it as a defensive evaluation catalog, not an autonomous exploitation lane.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["security", "evals", "vulnerability-detection", "benchmarks"],
    integrationFit: "fit_now",
    recommendedChambers: ["study", "system"],
  },
  {
    title: "factory-cursor-bridge",
    href: "https://github.com/0xSero/factory-cursor-bridge",
    description:
      "BYOK proxy: map OpenAI-compatible models into Cursor via custom base URL; multi-provider with protocol translation.",
    category: "tooling",
    note: "Advanced setup — protect API keys; follow the repo’s tunnel/security guidance.",
    costTier: "byok",
    licenseHint: "Check upstream repo",
    tags: ["proxy", "byok", "cursor"],
  },
  {
    title: "OpenAI Codex plugin examples",
    href: "https://github.com/openai/plugins",
    description:
      "Curated Codex plugin samples: manifests, skills, MCP bundles, and richer examples (Figma, Notion, deploy targets).",
    category: "ecosystem",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["plugins", "mcp", "samples"],
    integrationFit: "reference",
    recommendedChambers: ["start", "utilities"],
  },
  {
    title: "Multica",
    href: "https://github.com/multica-ai/multica",
    description:
      "Managed-agent platform for assigning issues, tracking agent progress, reusing skills, and connecting local or cloud runtimes from one board.",
    category: "ecosystem",
    note: "Strong COMMAND/HQ fit for managed-runtime and teammate-agent posture. Treat as an optional companion, not a shell replacement.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["agents", "runtimes", "board", "skills"],
    integrationFit: "fit_now",
    recommendedChambers: ["launch", "utilities"],
  },
  {
    title: "Lightpanda Browser",
    href: "https://github.com/lightpanda-io/browser",
    description:
      "Headless browser built for AI agents and automation, with a CDP server plus native MCP mode and much lower memory use than Chrome in its published benchmarks.",
    category: "tooling",
    note: "Best fit for browser-ops and sweep execution. Upstream documents Windows support via WSL2 or Docker and calls the browser beta.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["browser", "automation", "mcp", "cdp"],
    integrationFit: "fit_now",
    recommendedChambers: ["system", "launch"],
  },
  {
    title: "Claude-Mem",
    href: "https://github.com/thedotmack/claude-mem",
    description:
      "Persistent memory compression stack with lifecycle hooks, progressive disclosure, hybrid search, and memory citations across sessions.",
    category: "ecosystem",
    note: "Great reference for VAULT/HQ memory posture. Keep Nexus source clean and treat AGPL/PolyForm pieces as companion-pattern inspiration unless we deliberately self-host around that license.",
    costTier: "open_source",
    licenseHint: "AGPL-3.0; ragtime subdirectory is PolyForm Noncommercial",
    tags: ["memory", "progressive-disclosure", "citations", "hooks"],
    integrationFit: "fit_now",
    recommendedChambers: ["study", "system", "utilities"],
  },
  {
    title: "xyOps",
    href: "https://github.com/pixlcore/xyops",
    description:
      "Unified scheduling, workflow automation, monitoring, alerting, and incident-response platform that keeps jobs, telemetry, and remediation context in one place.",
    category: "tooling",
    note: "Strong COMMAND and scheduler-governance reference. Borrow the ops loop and dispatch grammar rather than the whole product shell.",
    costTier: "open_source",
    licenseHint: "BSD-3-Clause",
    tags: ["scheduler", "monitoring", "alerts", "incident-response"],
    integrationFit: "fit_now",
    recommendedChambers: ["launch", "utilities"],
  },
  {
    title: "autoskills",
    href: "https://github.com/midudev/autoskills",
    description:
      "Tech-stack scanner that installs matching AI skills automatically and can summarize them for Claude Code from detected project files.",
    category: "ecosystem",
    note: "Useful for skill-gap discovery. Keep Nexus on the 4-file context spine rather than reviving CLAUDE.md as live truth.",
    costTier: "open_source",
    licenseHint: "CC BY-NC 4.0",
    tags: ["skills", "autodetect", "bootstrap", "claude-code"],
    integrationFit: "reference",
    recommendedChambers: ["start", "system"],
  },
  {
    title: "last30days skill",
    href: "https://github.com/mvanhorn/last30days-skill",
    description:
      "Claude Code / Codex skill: multi-source “what changed lately” research with citations (social, markets, web).",
    category: "ecosystem",
    note: "Optional API keys for some sources; read the repo’s privacy table before enabling.",
    costTier: "byok",
    licenseHint: "Check upstream repo",
    tags: ["skill", "research", "citations"],
  },
  {
    title: "Feynman",
    href: "https://github.com/getcompanion-ai/feynman",
    description:
      "Research-assistant reference for reusable slash workflows, compact cited briefs, and MCP-aware operator research patterns.",
    category: "ecosystem",
    note: "Patterns only — Nexus absorbs the workflow grammar, not the product shell.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["research", "workflow", "briefs"],
  },
  {
    title: "Pentagi",
    href: "https://github.com/vxcontrol/pentagi",
    description:
      "Security workflow reference for evidence-first triage, investigation packaging, and incident playbook structure.",
    category: "ecosystem",
    note: "Defensive inspiration only — no offensive automation or exploit guidance should be ported into Nexus.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["cyber", "triage", "evidence"],
  },
  {
    title: "RTK",
    href: "https://github.com/rtk-ai/rtk",
    description:
      "Reasoning toolkit reference for compact operator response contracts, workflow compression, and structured execution discipline.",
    category: "tooling",
    note: "Use for response-shape ideas and runtime discipline, not as a separate UI stack.",
    costTier: "open_source",
    licenseHint: "Check upstream repo",
    tags: ["reasoning", "workflow", "compression"],
  },
  {
    title: "Flowise",
    href: "https://github.com/FlowiseAI/Flowise",
    description:
      "Visual AI workflow reference for node graphs, execution traces, and reusable templates that informed Workflow Forge.",
    category: "tooling",
    costTier: "open_source",
    licenseHint: "Patterns only — do not vendor blindly",
    tags: ["workflow", "graph", "agent"],
  },
  {
    title: "MoneyPrinterV2",
    href: "https://github.com/FujiwaraChoki/MoneyPrinterV2",
    description:
      "Automation-pipeline reference for recipe-based outputs and scheduler-driven mission packs that informed Mission Foundry.",
    category: "ecosystem",
    costTier: "open_source",
    licenseHint: "Patterns only — remove monetization framing",
    tags: ["automation", "recipes", "foundry"],
  },
  {
    title: "G0DM0D3",
    href: "https://github.com/elder-plinius/G0DM0D3",
    description:
      "Red-team prompt mutation reference for Blacksite Lab, adversarial prompt families, and compare-tournament ideas.",
    category: "ecosystem",
    costTier: "open_source",
    licenseHint: "Operator-only, defensive use",
    tags: ["blacksite", "red-team", "prompts"],
  },
  {
    title: "Crucix",
    href: "https://github.com/calesthio/Crucix",
    description:
      "Intelligence terminal reference for one-command sweeps, live updates, and theater delta tracking.",
    category: "tooling",
    costTier: "open_source",
    licenseHint: "Patterns only — keep Nexus free-first",
    tags: ["sweeps", "intel", "delta"],
  },
  {
    title: "Shelf.nu",
    href: "https://github.com/Shelf-nu/shelf.nu",
    description:
      "Asset-management reference for kits, custody, reminders, saved filters, and audit trails that informed Registry.",
    category: "tooling",
    costTier: "open_source",
    licenseHint: "AGPL — patterns only",
    tags: ["registry", "kits", "audit"],
  },
  {
    title: "OWASP WSTG",
    href: "https://github.com/OWASP/wstg",
    description:
      "Versioned security-testing doctrine for route, auth, SSRF, input validation, and client-side checks.",
    category: "study",
    costTier: "open_source",
    licenseHint: "CC BY-SA 4.0",
    tags: ["security", "wstg", "doctrine"],
  },
  {
    title: "GameDev Resources",
    href: "https://github.com/Kavex/GameDev-Resources",
    description:
      "Curated catalog reference for free/open assets, tools, tutorials, and license posture that informed Field Manual 2.0.",
    category: "tooling",
    costTier: "free",
    licenseHint: "Reference list — inspect individual licenses",
    tags: ["manual", "catalog", "free"],
  },
];
