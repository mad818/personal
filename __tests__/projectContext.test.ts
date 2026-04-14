import {
  buildStackContextBlock,
  detectProjectContextSync,
} from "@/lib/projectContext";

describe("projectContext doctrine", () => {
  it("returns the current hardcoded doctrine payload", () => {
    const context = detectProjectContextSync();

    expect(context.stack).toEqual(
      expect.arrayContaining(["Next.js 14 (App Router)", "TypeScript strict"]),
    );
    expect(context.patterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "AI calls" }),
        expect.objectContaining({ name: "Store access" }),
      ]),
    );
    expect(context.constraints).toEqual(
      expect.arrayContaining([
        "tsc --noEmit must pass before any task is marked done.",
      ]),
    );
  });

  it("builds a doctrine block without pretending runtime detection", () => {
    const block = buildStackContextBlock();

    expect(block).toContain("[NEXUS STACK CONTEXT]");
    expect(block).toContain("AI calls");
    expect(block).toContain("Store access");
    expect(block).toContain("Constraints:");
  });
});
