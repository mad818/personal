import { describe, expect, it } from "vitest";
import {
  extractOllamaErrorMessage,
  isMissingOllamaModelError,
  resolveInstalledOllamaModelFromCatalog,
} from "@/lib/ollamaModelResolver";

describe("resolveInstalledOllamaModelFromCatalog", () => {
  it("keeps the configured model when it is installed", () => {
    const resolved = resolveInstalledOllamaModelFromCatalog({
      requestedModel: "gemma4:latest",
      task: "default",
      models: [
        {
          name: "gemma4:latest",
          details: { family: "gemma4" },
        },
      ],
    });

    expect(resolved.resolvedModel).toBe("gemma4:latest");
    expect(resolved.reason).toBe("configured");
    expect(resolved.activeModels).toEqual([]);
  });

  it("prefers the currently running Ollama model when active-model preference is enabled", () => {
    const resolved = resolveInstalledOllamaModelFromCatalog({
      requestedModel: "qwen3:8b",
      task: "default",
      models: [
        {
          name: "gemma4:latest",
          details: { family: "gemma4" },
        },
      ],
      activeModels: [
        {
          name: "gemma4:latest",
          model: "gemma4:latest",
          details: { family: "gemma4" },
        },
      ],
      preferActiveModel: true,
    });

    expect(resolved.resolvedModel).toBe("gemma4:latest");
    expect(resolved.reason).toBe("active_runtime");
  });

  it("prefers stable recommended fallbacks over looser family matches when a stale qwen name is requested", () => {
    const resolved = resolveInstalledOllamaModelFromCatalog({
      requestedModel: "qwen3:8b",
      task: "default",
      models: [
        {
          name: "hf.co/Jackrong/Qwen3.5-9B-Claude-4.6-Opus-Reasoning-Distilled-v2-GGUF:Q4_K_M",
          details: { family: "qwen35" },
        },
        {
          name: "gemma4:latest",
          details: { family: "gemma4" },
        },
      ],
    });

    expect(resolved.resolvedModel).toBe("gemma4:latest");
    expect(resolved.reason).toBe("recommended_fallback");
  });

  it("still matches exact family-compatible qwen3.5 installs when they are explicitly requested", () => {
    const resolved = resolveInstalledOllamaModelFromCatalog({
      requestedModel: "qwen3.5:9b",
      task: "default",
      models: [
        {
          name: "hf.co/Jackrong/Qwen3.5-9B-Claude-4.6-Opus-Reasoning-Distilled-v2-GGUF:Q4_K_M",
          details: { family: "qwen35" },
        },
      ],
    });

    expect(resolved.resolvedModel).toContain("Qwen3.5");
    expect(resolved.reason).toBe("configured");
  });

  it("falls back to the detected installed model when no requested family match exists", () => {
    const resolved = resolveInstalledOllamaModelFromCatalog({
      requestedModel: "qwen2.5:7b",
      task: "default",
      models: [
        {
          name: "gemma4:latest",
          details: { family: "gemma4" },
          modified_at: "2026-04-09T22:18:30.6651721-07:00",
        },
      ],
    });

    expect(resolved.resolvedModel).toBe("gemma4:latest");
    expect(resolved.reason).toBe("recommended_fallback");
  });
});

describe("extractOllamaErrorMessage", () => {
  it("reads string error payloads from Ollama", () => {
    expect(
      extractOllamaErrorMessage(
        { error: "model 'qwen2.5:7b' not found" },
        404,
      ),
    ).toBe("model 'qwen2.5:7b' not found");
  });

  it("recognizes model-missing error phrasing", () => {
    expect(
      isMissingOllamaModelError("Configured local model qwen2.5:7b is not installed."),
    ).toBe(true);
    expect(isMissingOllamaModelError("Ollama unreachable at localhost.")).toBe(
      false,
    );
  });
});
