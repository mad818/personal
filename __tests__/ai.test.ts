import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type Settings, useStore } from "@/store/useStore";
import { DEFAULT_LOCAL_MODEL, TASK_MODELS } from "@/lib/aiModelRouting";
import {
  __aiTestUtils,
  buildDirectCallSystemPrompt,
  buildSystemPrompt,
} from "@/lib/ai";
import { buildAgentPrompt } from "@/components/home/office/prompts";
import {
  parseInlineEvidencePosture,
  parseStructuredEvidenceAnswer,
} from "@/lib/aiStructuredEvidence";

function buildLocalSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    localEndpoint: "http://localhost:11434/v1/chat/completions",
    localModel: "qwen3:8b",
    localApiKey: "test-key",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AI wrapper test utils", () => {
  it("stableHash returns the same value for the same input", () => {
    expect(__aiTestUtils.stableHash("nexus")).toBe(
      __aiTestUtils.stableHash("nexus"),
    );
  });

  it("stableHash returns a different value when the input changes", () => {
    expect(__aiTestUtils.stableHash("nexus")).not.toBe(
      __aiTestUtils.stableHash("vector"),
    );
  });

  it("stableHash handles empty strings", () => {
    expect(() => __aiTestUtils.stableHash("")).not.toThrow();
    expect(typeof __aiTestUtils.stableHash("")).toBe("string");
  });

  it("callLocalModel chooses the task-specific model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "ok" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await __aiTestUtils.callLocalModel(buildLocalSettings(), {
      max_tokens: 128,
      messages: [{ role: "user", content: "hello" }],
      task: "reasoning",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai",
      expect.objectContaining({
        body: JSON.stringify({
          provider: "ollama",
          model: TASK_MODELS.reasoning,
          max_tokens: 128,
          messages: [{ role: "user", content: "hello" }],
          preferRunningModel: false,
          task: "reasoning",
          localEndpoint: "http://localhost:11434/v1/chat/completions",
          localApiKey: "test-key",
        }),
      }),
    );
  });

  it("callLocalModel prefers the active running Ollama model for default chat tasks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "ok" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await __aiTestUtils.callLocalModel(buildLocalSettings(), {
      max_tokens: 128,
      messages: [{ role: "user", content: "hello" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai",
      expect.objectContaining({
        body: JSON.stringify({
          provider: "ollama",
          model: "qwen3:8b",
          max_tokens: 128,
          messages: [{ role: "user", content: "hello" }],
          preferRunningModel: true,
          localEndpoint: "http://localhost:11434/v1/chat/completions",
          localApiKey: "test-key",
        }),
      }),
    );
  });

  it("callLocalModel returns parsed assistant content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "hello from local" } }],
        }),
      }),
    );

    await expect(
      __aiTestUtils.callLocalModel(buildLocalSettings(), {
        max_tokens: 128,
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toBe("hello from local");
  });

  it("callLocalModel returns an empty string when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      __aiTestUtils.callLocalModel(buildLocalSettings(), {
        max_tokens: 64,
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toBe("");
  });

  it("callLocalModel returns an empty string when content is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ choices: [] }),
      }),
    );

    await expect(
      __aiTestUtils.callLocalModel(buildLocalSettings(), {
        max_tokens: 64,
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toBe("");
  });

  it("callLocalModel persists the proxy-recovered local model from response headers", async () => {
    const previousModel = useStore.getState().settings.localModel;
    useStore.getState().updateSettings({ localModel: DEFAULT_LOCAL_MODEL });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Model": "gemma4:latest" }),
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "recovered local answer" } }],
        }),
      }),
    );

    try {
      await expect(
        __aiTestUtils.callLocalModel(buildLocalSettings(), {
          max_tokens: 128,
          messages: [{ role: "user", content: "hello" }],
        }),
      ).resolves.toBe("recovered local answer");

      expect(useStore.getState().settings.localModel).toBe("gemma4:latest");
    } finally {
      useStore.getState().updateSettings({ localModel: previousModel });
    }
  });

  it("buildSystemPrompt includes the shared truth boundary and evidence discipline", () => {
    const prompt = buildSystemPrompt(DEFAULT_SETTINGS);

    expect(prompt).toContain("TRUTH BOUNDARY:");
    expect(prompt).toContain("Never invent a source, citation, URL, file path, tool result");
    expect(prompt).toContain("EVIDENCE DISCIPLINE:");
    expect(prompt).toContain("Observed facts");
    expect(prompt).toContain("Verify next recommendation");
  });

  it("specialist prompts reinforce truthfulness posture for agent runs", () => {
    const prompt = buildAgentPrompt("nova", "BASE PROMPT");

    expect(prompt).toContain("[QUALITY BOUNDARY]");
    expect(prompt).toContain("Use explicit uncertainty when evidence is thin.");
    expect(prompt).toContain("Never present guessed citations, tool outputs, or code-state claims as confirmed.");
    expect(prompt).toContain("VISIBLE EVIDENCE FOOTER:");
  });

  it("buildDirectCallSystemPrompt denies implicit tool use and current-state claims", () => {
    const prompt = buildDirectCallSystemPrompt(DEFAULT_SETTINGS);

    expect(prompt).toContain("This is a direct completion path.");
    expect(prompt).toContain("DIRECT-CALL BOUNDARY:");
    expect(prompt).toContain("do not imply you searched, browsed, clicked, fetched, opened, read files");
    expect(prompt).toContain("If the prompt asks for current facts but does not include retrieved evidence");
  });

  it("parses structured evidence answers from JSON payloads", () => {
    const parsed = parseStructuredEvidenceAnswer(
      JSON.stringify({
        briefing: "BTC is firm and risk sentiment is improving.",
        score: 7.2,
        observed: ["BTC is up 2.1% today.", "Fear & Greed reads Greed."],
        inferred: ["Momentum still favors buyers near term."],
        verifyNext: ["Check whether ETF flow headlines confirm the move."],
        actions: ["Watch ETF flow before adding exposure."],
      }),
      ["briefing"],
    );

    expect(parsed).toEqual({
      summary: "BTC is firm and risk sentiment is improving.",
      observed: ["BTC is up 2.1% today.", "Fear & Greed reads Greed."],
      inferred: ["Momentum still favors buyers near term."],
      verifyNext: ["Check whether ETF flow headlines confirm the move."],
      actions: ["Watch ETF flow before adding exposure."],
      score: 7.2,
    });
  });

  it("returns null when no matching summary key is present", () => {
    expect(
      parseStructuredEvidenceAnswer(
        JSON.stringify({
          analysis: "Something else",
          observed: ["Only this key exists"],
        }),
        ["briefing"],
      ),
    ).toBeNull();
  });

  it("parses inline observed/inferred/verify-next footers from chronicle text", () => {
    const parsed = parseInlineEvidencePosture(`Risk is elevated but manageable.

Observed:
- Runtime eval grade is B.
- Security AI surface is reachable.

Inferred:
- The hardening lane is working, but the chronicle still needs visibility polish.

Verify next:
- Recheck the live HQ route after the patch.`);

    expect(parsed).toEqual({
      mainText: "Risk is elevated but manageable.",
      observed: ["Runtime eval grade is B.", "Security AI surface is reachable."],
      inferred: [
        "The hardening lane is working, but the chronicle still needs visibility polish.",
      ],
      verifyNext: ["Recheck the live HQ route after the patch."],
    });
  });
});
