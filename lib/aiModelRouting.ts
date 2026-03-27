// Shared AI task routing map.
// Keep client and server behavior aligned by importing this file everywhere.

export const TASK_MODELS = {
  chat: 'qwen3:8b',
  code: 'qwen2.5-coder:14b',
  vision: 'gemma3:12b',
  reasoning: 'deepseek-r1:14b',
  fast: 'qwen3:8b',
  embed: 'nomic-embed-text',
} as const

export type AITask = keyof typeof TASK_MODELS

export const DEFAULT_LOCAL_MODEL = TASK_MODELS.chat
