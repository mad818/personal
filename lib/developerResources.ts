/**
 * Curated external references for AI engineering, agents, and tooling.
 * All URLs are public GitHub repos or docs; Nexus does not embed their content.
 */
export type ResourceCategory =
  | "certification"
  | "study"
  | "tooling"
  | "ecosystem";

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
}

export const DEVELOPER_RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  certification: "Certification",
  study: "Study & interviews",
  tooling: "Tooling",
  ecosystem: "Agents & plugins",
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
