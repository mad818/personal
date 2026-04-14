import { extractInternalAiText } from "@/lib/internalAi";

describe("internal AI helpers", () => {
  it("extracts plain string content", () => {
    expect(extractInternalAiText({ content: "hello" })).toBe("hello");
  });

  it("extracts anthropic-style content arrays", () => {
    expect(
      extractInternalAiText({
        content: [{ text: "one " }, { text: "two" }],
      }),
    ).toBe("one two");
  });

  it("extracts chat choice content", () => {
    expect(
      extractInternalAiText({
        choices: [{ message: { content: "answer" } }],
      }),
    ).toBe("answer");
  });

  it("falls back to text and result fields", () => {
    expect(extractInternalAiText({ text: "fallback" })).toBe("fallback");
    expect(extractInternalAiText({ result: "result" })).toBe("result");
  });

  it("returns an empty string for unsupported payloads", () => {
    expect(extractInternalAiText({})).toBe("");
    expect(extractInternalAiText(null)).toBe("");
  });
});
