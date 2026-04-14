import { describe, expect, it } from "vitest";
import {
  readMarkdownSectionBlock,
  resolveProjectContextSlice,
} from "@/lib/contextSpine";

const STANDARDS_FIXTURE = `# Standards

## Process

Process rule

## Engineering

Engineering rule
`;

describe("context spine slices", () => {
  it("returns a heading-preserving section block", () => {
    const block = readMarkdownSectionBlock(STANDARDS_FIXTURE, "## Process");

    expect(block).toContain("## Process");
    expect(block).toContain("Process rule");
  });

  it("resolves canonical slices from the context spine", () => {
    const block = resolveProjectContextSlice(
      "standards",
      STANDARDS_FIXTURE,
      "engineering",
    );

    expect(block).toContain("## Engineering");
    expect(block).toContain("Engineering rule");
  });
});
