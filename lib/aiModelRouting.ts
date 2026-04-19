// Shared AI task routing map.
// Keep client and server behavior aligned by importing this file everywhere.

export const TASK_MODELS = {
  chat:      "qwen3:8b",
  code:      "qwen2.5-coder:14b",
  vision:    "gemma3:12b",
  reasoning: "deepseek-r1:14b",
  fast:      "qwen3:8b",
  embed:     "nomic-embed-text",
  // JANSKY /meta command — needs multi-step reasoning over learnings
  meta:      "deepseek-r1:14b",
  // NOVA lightweight web fetches and quick research queries
  research:  "qwen3:8b",
} as const;

export type AITask = keyof typeof TASK_MODELS;

export const DEFAULT_LOCAL_MODEL = TASK_MODELS.chat;

/** MiniMax OpenAI-compatible API — see https://platform.minimax.io/docs/api-reference/text-openai-api */
export const MINIMAX_DEFAULT_CHAT_MODEL   = "MiniMax-M2.1";
export const MINIMAX_DEFAULT_AGENT_MODEL  = "MiniMax-M2.1";

// Cloud model defaults — update here to change both the client wrapper and
// the server proxy at the same time.
export const ANTHROPIC_DEFAULT_CHAT_MODEL = "claude-opus-4-5";
export const OPENAI_DEFAULT_CHAT_MODEL    = "gpt-4o-mini";
