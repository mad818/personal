import { describe, it, expect } from "vitest";
import {
  TASK_MODELS,
  DEFAULT_LOCAL_MODEL,
  ANTHROPIC_DEFAULT_CHAT_MODEL,
  MINIMAX_DEFAULT_CHAT_MODEL,
  MINIMAX_DEFAULT_AGENT_MODEL,
  OPENAI_DEFAULT_CHAT_MODEL,
  type AITask,
} from "@/lib/aiModelRouting";

describe("TASK_MODELS", () => {
  it("has all required task keys", () => {
    const expectedKeys: AITask[] = [
      "chat",
      "code",
      "vision",
      "reasoning",
      "fast",
      "embed",
      "meta",
      "research",
    ];
    for (const key of expectedKeys) {
      expect(TASK_MODELS).toHaveProperty(key);
    }
  });

  it("each model value is a non-empty string", () => {
    for (const [key, value] of Object.entries(TASK_MODELS)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
      // Model names should not contain spaces (they use colons for version)
      expect((value as string)).not.toMatch(/^[^:]+\s/);
    }
  });

  it("chat and fast tasks are the same model (speed optimized)", () => {
    expect(TASK_MODELS.chat).toBe(TASK_MODELS.fast);
  });

  it("code task uses a coder-specialized model", () => {
    // Convention: coder models include 'coder' in the name
    expect(TASK_MODELS.code.toLowerCase()).toContain("coder");
  });

  it("embed task uses an embedding model", () => {
    // Convention: embedding models include 'embed' in the name
    expect(TASK_MODELS.embed.toLowerCase()).toContain("embed");
  });

  it("meta task uses the reasoning-capable local model", () => {
    expect(TASK_MODELS.meta).toBe(TASK_MODELS.reasoning);
  });

  it("research task uses the lightweight chat model", () => {
    expect(TASK_MODELS.research).toBe(TASK_MODELS.fast);
  });
});

describe("DEFAULT_LOCAL_MODEL", () => {
  it("equals TASK_MODELS.chat", () => {
    expect(DEFAULT_LOCAL_MODEL).toBe(TASK_MODELS.chat);
  });

  it("is a non-empty string", () => {
    expect(typeof DEFAULT_LOCAL_MODEL).toBe("string");
    expect(DEFAULT_LOCAL_MODEL.length).toBeGreaterThan(0);
  });
});

describe("MiniMax model constants", () => {
  it("MINIMAX_DEFAULT_CHAT_MODEL is a non-empty string", () => {
    expect(typeof MINIMAX_DEFAULT_CHAT_MODEL).toBe("string");
    expect(MINIMAX_DEFAULT_CHAT_MODEL.length).toBeGreaterThan(0);
  });

  it("MINIMAX_DEFAULT_AGENT_MODEL is a non-empty string", () => {
    expect(typeof MINIMAX_DEFAULT_AGENT_MODEL).toBe("string");
    expect(MINIMAX_DEFAULT_AGENT_MODEL.length).toBeGreaterThan(0);
  });

  it("chat and agent models are the same for MiniMax", () => {
    // Both use the same MiniMax model for consistency
    expect(MINIMAX_DEFAULT_CHAT_MODEL).toBe(MINIMAX_DEFAULT_AGENT_MODEL);
  });
});

describe("cloud model constants", () => {
  it("ANTHROPIC_DEFAULT_CHAT_MODEL is a non-empty string", () => {
    expect(typeof ANTHROPIC_DEFAULT_CHAT_MODEL).toBe("string");
    expect(ANTHROPIC_DEFAULT_CHAT_MODEL.length).toBeGreaterThan(0);
  });

  it("OPENAI_DEFAULT_CHAT_MODEL is a non-empty string", () => {
    expect(typeof OPENAI_DEFAULT_CHAT_MODEL).toBe("string");
    expect(OPENAI_DEFAULT_CHAT_MODEL.length).toBeGreaterThan(0);
  });
});
