/**
 * Curated external references for AI engineering, agents, and tooling.
 * All URLs are public GitHub repos or docs; Nexus does not embed their content.
 */
export type ResourceCategory = 'certification' | 'study' | 'tooling' | 'ecosystem'

export interface DeveloperResource {
  title:       string
  href:        string
  description: string
  category:    ResourceCategory
  /** Optional nuance (e.g. partner-only course) */
  note?: string
}

export const DEVELOPER_RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  certification: 'Certification',
  study:         'Study & interviews',
  tooling:       'Tooling',
  ecosystem:     'Agents & plugins',
}

export const DEVELOPER_RESOURCES: DeveloperResource[] = [
  {
    title:       'Claude Certified Architect — Foundations',
    href:        'https://github.com/paullarionov/claude-certified-architect',
    description: 'Study guides (EN/RU/ZH/JA) and PDFs for Anthropic’s architect certification track — tool design, MCP, structured output, context, reliability.',
    category:    'certification',
    note:        'Official course access may require partner registration; repo is community study material.',
  },
  {
    title:       'AI Engineering Interview Questions',
    href:        'https://github.com/amitshekhariitbhu/ai-engineering-interview-questions',
    description: 'Broad Q&A cheat sheet: LLMs, RAG, agents, fine-tuning, vectors, LLMOps, safety, system design, and coding drills.',
    category:    'study',
  },
  {
    title:       'Maths, CS & AI Compendium',
    href:        'https://github.com/HenryNdubuaku/maths-cs-ai-compendium',
    description: 'Open textbook-style notes from vectors through transformers, vision, speech, multimodal, and systems — intuition-first.',
    category:    'study',
  },
  {
    title:       'Unsloth',
    href:        'https://github.com/unslothai/unsloth',
    description:
      'Unsloth Studio (local web UI) and Unsloth Core — download, run, fine-tune, and export open models (Qwen, DeepSeek, gpt-oss, Gemma, etc.) with optimized kernels and lower VRAM use.',
    category:    'tooling',
    note:        'Runs beside Nexus, not inside it. After `unsloth studio`, point Nexus “Local LLM Endpoint” at any OpenAI-compatible URL the stack exposes, or keep using Ollama.',
  },
  {
    title:       'factory-cursor-bridge',
    href:        'https://github.com/0xSero/factory-cursor-bridge',
    description: 'BYOK proxy: map OpenAI-compatible models into Cursor via custom base URL; multi-provider with protocol translation.',
    category:    'tooling',
    note:        'Advanced setup — protect API keys; follow the repo’s tunnel/security guidance.',
  },
  {
    title:       'OpenAI Codex plugin examples',
    href:        'https://github.com/openai/plugins',
    description: 'Curated Codex plugin samples: manifests, skills, MCP bundles, and richer examples (Figma, Notion, deploy targets).',
    category:    'ecosystem',
  },
  {
    title:       'last30days skill',
    href:        'https://github.com/mvanhorn/last30days-skill',
    description: 'Claude Code / Codex skill: multi-source “what changed lately” research with citations (social, markets, web).',
    category:    'ecosystem',
    note:        'Optional API keys for some sources; read the repo’s privacy table before enabling.',
  },
]
